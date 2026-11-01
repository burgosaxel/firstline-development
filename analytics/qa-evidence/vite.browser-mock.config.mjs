import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../apps/web', import.meta.url));
const mockAuth = fileURLToPath(new URL('./mock-firebase-auth.ts', import.meta.url));
const sites = [
  { id: 'harbor', displayName: 'Harbor Operations', canonicalOrigin: 'https://harbor.example', status: 'active', capabilities: ['ga4-aggregate-overview'], ga4Enabled: true },
  { id: 'meadow', displayName: 'Meadow Services', canonicalOrigin: 'https://meadow.example', status: 'active', capabilities: ['ga4-aggregate-overview'], ga4Enabled: true },
  { id: 'summit', displayName: 'Summit Studio', canonicalOrigin: 'https://summit.example', status: 'active', capabilities: ['ga4-aggregate-overview'], ga4Enabled: false },
  { id: 'cedar', displayName: 'Cedar Partners', canonicalOrigin: 'https://cedar.example', status: 'active', capabilities: ['ga4-aggregate-overview'], ga4Enabled: true }
];
const range = { start: '2026-10-02', end: '2026-10-31' };
const metrics = { users: 48, sessions: 72, views: 186, engagementRate: 0.61, eventCount: 14 };
const ready = {
  siteId: 'harbor', range, mode: 'production', status: 'ready', provenance: 'GA4 aggregate response returned by local contract transport.', metrics,
  daily: [{ date: '2026-10-29', sessions: 18, views: 44 }, { date: '2026-10-30', sessions: 26, views: 63 }, { date: '2026-10-31', sessions: 28, views: 79 }],
  topPages: [{ path: '/services', views: 71 }, { path: '/', views: 59 }], events: [{ name: 'generate_lead', count: 9 }, { name: 'contact_submit', count: 5 }]
};
// Test-only contract response for GA4's provider-reported threshold/data-loss warning.
const partial = {
  siteId: 'cedar', range, mode: 'production', status: 'ready', provenance: 'GA4 aggregate response returned by local contract transport.',
  warning: 'GA4 reported data loss from the other row; this response is partial and may exclude thresholded values.',
  metrics: { users: 31, sessions: 47, views: 119, engagementRate: 0.57, eventCount: 8 },
  daily: [{ date: '2026-10-29', sessions: 12, views: 32 }, { date: '2026-10-30', sessions: 17, views: 41 }, { date: '2026-10-31', sessions: 18, views: 46 }],
  topPages: [{ path: '/consulting', views: 45 }, { path: '/', views: 38 }], events: [{ name: 'consultation_request', count: 5 }, { name: 'form_submit', count: 3 }]
};
const reports = {
  harbor: ready,
  meadow: { siteId: 'meadow', range, mode: 'production', status: 'no_data', provenance: 'GA4 aggregate response returned no rows for this local contract state.', metrics: null },
  summit: { siteId: 'summit', range, mode: 'production', status: 'unconfigured', provenance: 'GA4 aggregate reporting is not configured for this authorized registry entry.', metrics: null },
  cedar: partial
};
const portfolio = { mode: 'production', provenance: 'GA4 aggregate results from local contract transport.', authorizedSiteCount: sites.length, range, aggregate: { users: null, sessions: 72, views: 186, engagementRate: 0.61, eventCount: 14 }, sites: Object.values(reports) };

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

export default defineConfig({
  root,
  plugins: [react(), {
    name: 'local-browser-contract-transport',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
        if (pathname === '/api/config') return json(res, { firebase: { apiKey: 'local-browser-mock', authDomain: 'localhost', projectId: 'local-browser-mock', appId: 'local-browser-mock' } });
        if (pathname === '/api/v1/sites') return json(res, sites);
        if (pathname === '/api/v1/portfolio') return json(res, portfolio);
        const site = pathname.match(/^\/api\/v1\/sites\/([^/]+)\/ga4-overview$/)?.[1];
        if (site && reports[site]) return json(res, reports[site]);
        return next();
      });
    }
  }],
  resolve: { alias: [{ find: './firebase-auth.js', replacement: mockAuth }] },
  server: { host: '127.0.0.1', port: 5177, strictPort: true }
});
