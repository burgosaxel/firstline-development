export const MAX_RANGE_DAYS = 90;

export type SiteId = string;
export type SiteStatus = 'active' | 'paused';
export type Ga4Status = 'ready' | 'no_data' | 'unconfigured' | 'disconnected' | 'permission_denied' | 'quota' | 'provider_error';
export type PortalMode = 'demo' | 'production';

export interface DateRange {
  start: string;
  end: string;
}

export interface AuthorizedSite {
  id: SiteId;
  displayName: string;
  canonicalOrigin: string;
  timezone?: string;
  status: SiteStatus;
  capabilities: readonly ['ga4-aggregate-overview'];
  ga4Enabled: boolean;
}

export interface Ga4AggregateMetrics {
  users: number;
  sessions: number;
  views: number;
  engagementRate: number;
  eventCount: number;
}

/** Provider-returned daily aggregates; the UI must not infer these from period totals. */
export interface Ga4DailyMetric {
  date: string;
  sessions: number;
  views: number;
}

export interface Ga4TopPage {
  path: string;
  views: number;
}

export interface Ga4EventBreakdown {
  name: string;
  count: number;
}

export interface Ga4Overview {
  siteId: SiteId;
  range: DateRange;
  timezone?: string;
  mode: PortalMode;
  status: Ga4Status;
  provenance: string;
  metrics: Ga4AggregateMetrics | null;
  daily?: readonly Ga4DailyMetric[];
  topPages?: readonly Ga4TopPage[];
  events?: readonly Ga4EventBreakdown[];
  warning?: string;
}

export interface PortfolioOverview {
  mode: PortalMode;
  provenance: string;
  authorizedSiteCount: number;
  range: DateRange;
  aggregate: (Omit<Ga4AggregateMetrics, 'users'> & { users: null }) | null;
  sites: Ga4Overview[];
}

export interface OwnerIdentity {
  uid: string;
  email: string;
  authorizedSiteIds: SiteId[];
}

export interface Ga4AggregateAdapter {
  getOverview(site: AuthorizedSite, range: DateRange): Promise<Ga4Overview>;
}

export function parseRange(input: unknown): DateRange {
  if (!input || typeof input !== 'object') throw new Error('range required');
  const { start, end } = input as Record<string, unknown>;
  if (typeof start !== 'string' || typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('range must use YYYY-MM-DD');
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || new Date(startTime).toISOString().slice(0, 10) !== start || new Date(endTime).toISOString().slice(0, 10) !== end) throw new Error('range must contain real calendar dates');
  const days = (endTime - startTime) / 86400000 + 1;
  if (!Number.isInteger(days) || days < 1 || days > MAX_RANGE_DAYS) throw new Error('range must be 1-90 inclusive days');
  return { start, end };
}