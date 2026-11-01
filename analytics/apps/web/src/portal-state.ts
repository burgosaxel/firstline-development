export type PortalErrorCode = 'unauthenticated' | 'forbidden' | 'unconfigured' | 'disconnected' | 'permission_denied' | 'quota' | 'provider_error' | 'invalid_request' | 'internal_error' | 'authentication_unavailable' | 'no_data';

export class ApiError extends Error {
  constructor(readonly code: PortalErrorCode) { super(code); }
}

export function describePortalError(code: string): { title: string; detail: string } {
  const states: Record<string, { title: string; detail: string }> = {
    unauthenticated: { title: 'Sign-in required', detail: 'Your session is missing or expired. Sign in again.' },
    forbidden: { title: 'Owner access denied', detail: 'The signed-in account is not authorized for this portal.' },
    unconfigured: { title: 'Analytics is not configured', detail: 'The server has no enabled analytics connection for this request.' },
    disconnected: { title: 'Analytics connection is unavailable', detail: 'The configured analytics identity is unavailable.' },
    permission_denied: { title: 'Analytics permission denied', detail: 'The server identity cannot read this registered property.' },
    quota: { title: 'Analytics quota reached', detail: 'Google Analytics temporarily rejected this report due to quota.' },
    provider_error: { title: 'Analytics provider error', detail: 'Google Analytics could not provide this report. No zero values are substituted.' },
    invalid_request: { title: 'Invalid report request', detail: 'Choose a valid date range and try again.' },
    authentication_unavailable: { title: 'Authentication unavailable', detail: 'The server cannot verify owner identity right now.' },
    no_data: { title: 'No analytics data for this range', detail: 'Google Analytics returned no aggregate rows. No zero values are substituted.' },
    internal_error: { title: 'Request unavailable', detail: 'The portal could not complete this request.' }
  };
  return states[code] ?? states.internal_error;
}

export class RequestEpoch {
  private current = 0;
  begin(): () => boolean { const value = ++this.current; return () => value === this.current; }
  invalidate() { this.current += 1; }
}

export function clearedPortalState() { return { sites: [], selected: '', portfolio: undefined, report: undefined, error: undefined }; }
