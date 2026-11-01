# FirstLine Analytics — private owner portal candidate

This source is retained under `analytics/` in a local-only FirstLine Development migration candidate. It is not a production cutover and does not replace the retained standalone Analytics repository until a separately authorized parent-main integration and source-of-truth transition. Run all child tooling from this directory; the parent root intentionally is not an npm workspace.

This local candidate implements a production-shaped Firebase Google sign-in boundary, server-side exact owner verification, a server-owned FirstLine Development registry, and a fixed GA4 Data API adapter boundary. It makes no provider request by default.

## Local behavior

`FIRSTLINE_MODE=production`, `FIRSTLINE_EXTERNAL_ACCESS=false`, and `FIRSTLINE_GA4_MODE=disabled` are fail-closed defaults. The UI can initialize Firebase Google sign-in only after the public `VITE_FIREBASE_*` values are configured; the API accepts only a Firebase Admin verified token for `firstlinedevnt@gmail.com`, with a verified email and Google sign-in provider. Browser email, site IDs, GA4 IDs, and report expressions do not authorize access.

The initial server-only registry entry is FirstLine Development / `https://firstlinedev.com`. It contains the supplied GA4 account/property/web-stream/measurement identifiers but exposes none of them to the browser. Future sites require a reviewed server configuration entry, explicit owner grant, valid unique property+stream binding, and remain paused until enabled.

GA4 live mode has a fixed Data API endpoint, fixed aggregate metrics, exact registry stream filter, timeout, and sanitized error mapping. It has no fixture fallback. Local tests use injected verifiers/transports only.

## Validate

```sh
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:contracts
npm run test:security
npm run test:e2e
```

## Future authorized deployment

`firebase.production.example.json` is an inert historical standalone template, not a deployment entrypoint for this parent candidate. Parent-root `firebase.json` is the only prospective deployment authority: it declares Analytics static output and a same-origin `/api/**` rewrite before SPA fallback. Its Functions input is the generated `functions-source/` directory, not the root npm package; `npm run check:function-package` rebuilds that exact source artifact and verifies its lockfile, compiled entrypoint, contracts, and retired-entrypoint exclusion offline. An authorized operator must confirm the existing Firebase project/site/region and runtime identity; configure web Firebase settings and Google Auth; add `analytics.firstlinedev.com` to authorized domains; grant the runtime GA4 Viewer/API prerequisites; resolve the documented Firebase dependency-security hold; then separately approve deploy and DNS/TLS actions. No credentials, project IDs, DNS records, deployment commands, or resource mutations are included here.
