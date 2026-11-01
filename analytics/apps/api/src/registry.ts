import type { AuthorizedSite, SiteId } from '@firstline/contracts';
import { OWNER_EMAIL } from './config.js';

export interface RegisteredSite extends AuthorizedSite {
  ownerEmails: readonly string[];
  ga4: { accountId: string; propertyId: string; webStreamId: string; measurementId: string };
}

export interface SiteRegistry {
  readonly entries: readonly RegisteredSite[];
}

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const numeric = /^\d+$/;
const measurement = /^G-[A-Z0-9]+$/;
const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isStringArray(value: unknown): value is readonly string[] { return Array.isArray(value) && value.every((entry) => typeof entry === 'string'); }

function hasExpectedFieldShapes(site: unknown): site is RegisteredSite {
  if (!isRecord(site) || typeof site.id !== 'string' || typeof site.displayName !== 'string' || typeof site.canonicalOrigin !== 'string' || typeof site.status !== 'string' || typeof site.ga4Enabled !== 'boolean' || (site.timezone !== undefined && typeof site.timezone !== 'string') || !isStringArray(site.capabilities) || !isStringArray(site.ownerEmails) || !isRecord(site.ga4)) return false;
  return typeof site.ga4.accountId === 'string' && typeof site.ga4.propertyId === 'string' && typeof site.ga4.webStreamId === 'string' && typeof site.ga4.measurementId === 'string';
}

export function validateRegistry(registry: readonly RegisteredSite[]): readonly RegisteredSite[] {
  if (!Array.isArray(registry)) throw new Error('invalid site registry');
  const seen = new Set<string>();
  const bindings = new Set<string>();
  for (const site of registry) {
    if (!hasExpectedFieldShapes(site)) throw new Error('invalid site registry entry');
    let canonicalOrigin: URL;
    try { canonicalOrigin = new URL(site.canonicalOrigin); } catch { throw new Error('invalid site registry origin'); }
    if (!slug.test(site.id) || !site.displayName || canonicalOrigin.protocol !== 'https:' || canonicalOrigin.origin !== site.canonicalOrigin || !['active', 'paused'].includes(site.status) || site.capabilities.length !== 1 || site.capabilities[0] !== 'ga4-aggregate-overview' || !site.ownerEmails.length) throw new Error('invalid site registry entry');
    if (new Set(site.ownerEmails).size !== site.ownerEmails.length || site.ownerEmails.some((owner) => !email.test(owner))) throw new Error('invalid site owner grants');
    if (site.timezone) { try { Intl.DateTimeFormat(undefined, { timeZone: site.timezone }); } catch { throw new Error('invalid site timezone'); } }
    if (![site.ga4.accountId, site.ga4.propertyId, site.ga4.webStreamId].every((value) => numeric.test(value)) || !measurement.test(site.ga4.measurementId)) throw new Error('invalid GA4 registry identifiers');
    const binding = `${site.ga4.propertyId}:${site.ga4.webStreamId}`;
    if (seen.has(site.id) || bindings.has(binding)) throw new Error('duplicate site registry binding');
    seen.add(site.id); bindings.add(binding);
  }
  return registry;
}

export function createRegistry(entries: readonly RegisteredSite[]): SiteRegistry { return { entries: validateRegistry(entries) }; }

export const privateRegistry = createRegistry([{ id: 'firstline-development', displayName: 'FirstLine Development', canonicalOrigin: 'https://firstlinedev.com', status: 'active', capabilities: ['ga4-aggregate-overview'], ga4Enabled: true, ownerEmails: [OWNER_EMAIL], ga4: { accountId: '405718522', propertyId: '561169935', webStreamId: '16223419464', measurementId: 'G-BLK8DL1WDG' } }]);

export function sitesFor(owner: string, registry = privateRegistry): AuthorizedSite[] { return registry.entries.filter((site) => site.ownerEmails.includes(owner)).map((site) => ({ id: site.id, displayName: site.displayName, canonicalOrigin: site.canonicalOrigin, timezone: site.timezone, status: site.status, capabilities: site.capabilities, ga4Enabled: site.ga4Enabled })); }
export function registeredSiteFor(owner: string, id: string, registry = privateRegistry): RegisteredSite | undefined { return registry.entries.find((site) => site.id === id && site.ownerEmails.includes(owner)); }
export function isReportableSite(site: RegisteredSite): boolean { return site.status === 'active' && site.ga4Enabled && site.capabilities.includes('ga4-aggregate-overview'); }
export function reportableSiteFor(owner: string, id: string, registry = privateRegistry): RegisteredSite | undefined { const site = registeredSiteFor(owner, id, registry); return site && isReportableSite(site) ? site : undefined; }
export function grantedSiteIds(owner: string, registry = privateRegistry): SiteId[] { return sitesFor(owner, registry).map((site) => site.id); }
