import express, { type Request, type Response } from 'express';
import { parseRange, type AuthorizedSite, type DateRange, type Ga4AggregateAdapter, type Ga4Overview, type OwnerIdentity } from '@firstline/contracts';
import { authorizeVerifiedToken, firebaseVerifier, type TokenVerifier } from './auth.js';
import { runtimeConfig, type RuntimeConfig } from './config.js';
import { applicationDefaultAccessToken, DisabledGa4Adapter, Ga4DomainError, LiveGa4Adapter } from './ga4.js';
import { createRegistry, isReportableSite, privateRegistry, registeredSiteFor, sitesFor, type RegisteredSite, type SiteRegistry } from './registry.js';

export interface AppOptions { adapter?: Ga4AggregateAdapter; verifier?: TokenVerifier; config?: RuntimeConfig; registry?: SiteRegistry; }
function noStore(res: Response) { res.set('Cache-Control', 'private, no-store').set('X-Content-Type-Options', 'nosniff').set('Referrer-Policy', 'no-referrer').set('X-Frame-Options', 'DENY'); }
function error(res: Response, status: number, code: string) { noStore(res); return res.status(status).json({ error: code }); }
function rangeFrom(req: Request): DateRange { return parseRange({ start: req.query.start, end: req.query.end }); }
function identity(res: Response): OwnerIdentity { return res.locals.identity as OwnerIdentity; }
function unavailable(site: AuthorizedSite, range: DateRange, mode: RuntimeConfig['mode']): Ga4Overview { return { siteId: site.id, range, mode, status: 'unconfigured', provenance: 'GA4 reporting is unavailable; no provider request was made.', metrics: null }; }
function ga4Failure(site: RegisteredSite, range: DateRange, cause: unknown, mode: RuntimeConfig['mode']): Ga4Overview {
  const status = cause instanceof Ga4DomainError ? cause.code : 'provider_error';
  return { siteId: site.id, range, mode, status, provenance: 'GA4 reporting is unavailable; no metrics are substituted.', metrics: null };
}
function ga4Error(res: Response, cause: unknown) {
  const code = cause instanceof Ga4DomainError ? cause.code : 'provider_error';
  return error(res, code === 'permission_denied' ? 403 : code === 'quota' ? 429 : 503, code);
}

export function createApp(options: AppOptions = {}) {
  const config = options.config ?? runtimeConfig();
  const adapter = options.adapter ?? (config.externalAccess && config.ga4Mode === 'live'
    ? new LiveGa4Adapter(applicationDefaultAccessToken(), fetch)
    : new DisabledGa4Adapter(config.mode, 'unconfigured'));
  const verifier = options.verifier ?? firebaseVerifier;
  const registry = options.registry ? createRegistry(options.registry.entries) : privateRegistry;
  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '4kb' }));
  app.get('/api/config', (_req, res) => {
    noStore(res);
    if (!config.firebaseWebConfig) return res.status(503).json({ error: 'unconfigured' });
    return res.json({ firebase: config.firebaseWebConfig });
  });
  app.get('/api/v1/health', (_req, res) => { noStore(res); return res.json({ mode: config.mode, authentication: config.firebaseProjectId ? 'configured' : 'unconfigured', analytics: config.externalAccess && config.ga4Mode === 'live' ? 'configured' : 'unconfigured' }); });
  app.use('/api/v1', async (req, res, next) => {
    noStore(res); const header = req.header('authorization'); const token = header?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return error(res, 401, 'unauthenticated');
    if (!config.firebaseProjectId) return error(res, 503, 'unconfigured');
    try { res.locals.identity = authorizeVerifiedToken(await verifier(token), config); return next(); } catch (cause) { const known = cause as { status?: number; code?: string }; return error(res, known.status === 503 ? 503 : known.status === 403 ? 403 : 401, known.code ?? 'unauthenticated'); }
  });
  app.get('/api/v1/me', (_req, res) => res.json(identity(res)));
  app.get('/api/v1/sites', (_req, res) => res.json(sitesFor(identity(res).email, registry)));
  app.get('/api/v1/portfolio', async (req, res) => {
    if (Object.keys(req.query).some((key) => !['start', 'end'].includes(key))) return error(res, 400, 'invalid_request');
    let range: DateRange;
    try { range = rangeFrom(req); } catch { return error(res, 400, 'invalid_request'); }
    const sites = sitesFor(identity(res).email, registry);
    const reports = await Promise.all(sites.map(async (site) => {
      const registered = registeredSiteFor(identity(res).email, site.id, registry);
      if (!registered || !isReportableSite(registered)) return unavailable(registered ?? site, range, config.mode);
      try { return await adapter.getOverview(registered, range); } catch (cause) { return ga4Failure(registered, range, cause, config.mode); }
    }));
    const ready = reports.filter((report) => report.status === 'ready' && report.metrics).map((report) => report.metrics!);
    const sessions = ready.reduce((total, metrics) => total + metrics.sessions, 0);
    const aggregate = ready.length ? { users: null, sessions, views: ready.reduce((total, metrics) => total + metrics.views, 0), eventCount: ready.reduce((total, metrics) => total + metrics.eventCount, 0), engagementRate: sessions ? ready.reduce((total, metrics) => total + metrics.engagementRate * metrics.sessions, 0) / sessions : 0 } : null;
    return res.json({ mode: config.mode, provenance: 'Server-owned registry and GA4 adapter boundary; unavailable sites are retained without zero metrics.', authorizedSiteCount: sites.length, range, aggregate, sites: reports });
  });
  app.get('/api/v1/sites/:siteId/ga4-overview', async (req, res) => {
    if (Object.keys(req.query).some((key) => !['start', 'end'].includes(key))) return error(res, 400, 'invalid_request');
    const registered = registeredSiteFor(identity(res).email, req.params.siteId, registry); if (!registered) return error(res, 404, 'not_found');
    let range: DateRange;
    try { range = rangeFrom(req); } catch { return error(res, 400, 'invalid_request'); }
    if (!isReportableSite(registered)) return res.json(unavailable(registered, range, config.mode));
    try { return res.json(await adapter.getOverview(registered, range)); } catch (cause) { return ga4Error(res, cause); }
  });
  app.use('/api/v1', (_req, res) => error(res, 404, 'not_found'));
  return app;
}
