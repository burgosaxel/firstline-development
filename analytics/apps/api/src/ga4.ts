import type { DateRange, Ga4AggregateAdapter, Ga4Overview } from '@firstline/contracts';
import type { RegisteredSite } from './registry.js';

export type Transport = (url: string, init: RequestInit) => Promise<Response>;
export type AccessToken = () => Promise<string>;
export class Ga4DomainError extends Error { constructor(readonly code: 'unconfigured' | 'disconnected' | 'permission_denied' | 'quota' | 'provider_error') { super(code); } }

export class DisabledGa4Adapter implements Ga4AggregateAdapter {
  constructor(private readonly mode: 'production' | 'demo', private readonly reason: 'unconfigured' | 'disconnected' = 'unconfigured') {}
  async getOverview(site: RegisteredSite, range: DateRange): Promise<Ga4Overview> { return { siteId: site.id, range, mode: this.mode, status: this.reason, provenance: 'GA4 external access is intentionally disabled; no provider request was made.', metrics: null }; }
}

export class LiveGa4Adapter implements Ga4AggregateAdapter {
  constructor(private readonly token: AccessToken, private readonly transport: Transport) {}
  async getOverview(site: RegisteredSite, range: DateRange): Promise<Ga4Overview> {
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${site.ga4.propertyId}:runReport`;
    let response: Response;
    try { response = await this.transport(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8_000), headers: { Authorization: `Bearer ${await this.token()}`, 'content-type': 'application/json' }, body: JSON.stringify({ dateRanges: [{ startDate: range.start, endDate: range.end }], metrics: ['activeUsers', 'sessions', 'screenPageViews', 'engagementRate', 'eventCount'].map((name) => ({ name })), dimensionFilter: { filter: { fieldName: 'streamId', stringFilter: { matchType: 'EXACT', value: site.ga4.webStreamId } } } }) }); } catch (cause) { if (cause instanceof Ga4DomainError) throw cause; throw new Ga4DomainError('provider_error'); }
    if (response.status === 401) throw new Ga4DomainError('disconnected'); if (response.status === 403) throw new Ga4DomainError('permission_denied'); if (response.status === 429) throw new Ga4DomainError('quota'); if (!response.ok) throw new Ga4DomainError('provider_error');
    let body: { rows?: Array<{ metricValues?: Array<{ value?: string }> }>; metadata?: { timeZone?: string; dataLossFromOtherRow?: boolean } };
    try { body = await response.json() as typeof body; } catch { throw new Ga4DomainError('provider_error'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || (body.metadata !== undefined && (!body.metadata || typeof body.metadata !== 'object' || Array.isArray(body.metadata)))) throw new Ga4DomainError('provider_error');
    const metadata = body.metadata;
    if (metadata?.dataLossFromOtherRow !== undefined && typeof metadata.dataLossFromOtherRow !== 'boolean') throw new Ga4DomainError('provider_error');
    if (metadata?.timeZone !== undefined && (typeof metadata.timeZone !== 'string' || !isIanaTimezone(metadata.timeZone))) throw new Ga4DomainError('provider_error');
    const warning = metadata?.dataLossFromOtherRow ? 'GA4 reported thresholding or data loss; totals may be incomplete.' : undefined;
    if (!body.rows?.length) return { siteId: site.id, range, timezone: metadata?.timeZone, mode: 'production', status: 'no_data', provenance: 'GA4 Data API aggregate response.', metrics: null, warning };
    if (body.rows.length !== 1) throw new Ga4DomainError('provider_error');
    const raw = body.rows[0]?.metricValues?.map((value) => value.value);
    if (!raw || raw.length !== 5 || raw.some((value) => typeof value !== 'string' || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value))) throw new Ga4DomainError('provider_error');
    const values = raw.map(Number);
    if (values.some((value) => !Number.isFinite(value))) throw new Ga4DomainError('provider_error');
    const [daily, topPages, events] = await Promise.all([
      this.getBreakdown(site, range, ['date'], ['sessions', 'screenPageViews'], (row) => ({ date: formatGa4Date(row[0]), sessions: Number(row[1]), views: Number(row[2]) })),
      this.getBreakdown(site, range, ['pagePath'], ['screenPageViews'], (row) => ({ path: row[0], views: Number(row[1]) })),
      this.getBreakdown(site, range, ['eventName'], ['eventCount'], (row) => ({ name: row[0], count: Number(row[1]) })),
    ]);
    return { siteId: site.id, range, timezone: metadata?.timeZone, mode: 'production', status: 'ready', provenance: 'GA4 Data API aggregate response.', metrics: { users: values[0], sessions: values[1], views: values[2], engagementRate: values[3], eventCount: values[4] }, daily, topPages, events, warning };
  }

  private async getBreakdown<T>(site: RegisteredSite, range: DateRange, dimensions: string[], metrics: string[], map: (row: string[]) => T): Promise<T[]> {
    let response: Response;
    try {
      response = await this.transport(`https://analyticsdata.googleapis.com/v1beta/properties/${site.ga4.propertyId}:runReport`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8_000), headers: { Authorization: `Bearer ${await this.token()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ dateRanges: [{ startDate: range.start, endDate: range.end }], dimensions: dimensions.map((name) => ({ name })), metrics: metrics.map((name) => ({ name })), dimensionFilter: { filter: { fieldName: 'streamId', stringFilter: { matchType: 'EXACT', value: site.ga4.webStreamId } } }, limit: 100, orderBys: [{ metric: { metricName: metrics[0] }, desc: true }] }),
      });
    } catch { throw new Ga4DomainError('provider_error'); }
    if (!response.ok) throw new Ga4DomainError(response.status === 401 ? 'disconnected' : response.status === 403 ? 'permission_denied' : response.status === 429 ? 'quota' : 'provider_error');
    let body: { rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }> };
    try { body = await response.json() as typeof body; } catch { throw new Ga4DomainError('provider_error'); }
    if (!body || typeof body !== 'object' || !Array.isArray(body.rows)) throw new Ga4DomainError('provider_error');
    return body.rows.map((entry) => {
      const values = [...(entry.dimensionValues ?? []), ...(entry.metricValues ?? [])].map((value) => value.value);
      if (values.length !== dimensions.length + metrics.length || values.some((value, index) => typeof value !== 'string' || (index >= dimensions.length && !/^(?:0|[1-9]\d*)$/.test(value)))) throw new Ga4DomainError('provider_error');
      return map(values as string[]);
    });
  }
}

/** Lazily obtains an Application Default Credential only if live reporting is called. */
export function applicationDefaultAccessToken(): AccessToken {
  let clientPromise: Promise<{ getAccessToken(): Promise<{ token?: string | null }> }> | undefined;
  return async () => {
    clientPromise ??= import('google-auth-library').then(async ({ GoogleAuth }) =>
      new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/analytics.readonly'] }).getClient()) as unknown as Promise<{ getAccessToken(): Promise<{ token?: string | null }> }>;
    const result = await (await clientPromise).getAccessToken();
    if (!result.token) throw new Ga4DomainError('disconnected');
    return result.token;
  };
}

function formatGa4Date(value: string): string {
  if (!/^\d{8}$/.test(value)) throw new Ga4DomainError('provider_error');
  const formatted = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
  if (new Date(`${formatted}T00:00:00Z`).toISOString().slice(0, 10) !== formatted) throw new Ga4DomainError('provider_error');
  return formatted;
}

function isIanaTimezone(value: string): boolean {
  try { return Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone === value; } catch { return false; }
}
