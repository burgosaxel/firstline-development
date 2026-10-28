# FirstLine Development production analytics — Stage 1 candidate

## Status and immutable baseline

This is an undeployed, fail-closed local candidate. It starts from Packet-B commit `d50533b7ab86678177a1656d897a8637f307a496` on branch `firstline-development/stage1-firstlinedev-production-analytics`. Canonical `main` and `origin/main` were both verified at `f484411488a5b3d044977185b200baaf40f6f6fe` before implementation.

No deployment, Firebase Hosting release, live provider receipt, production milestone, provider-resource creation, Search Console verification, billing change, authenticated-provider access, or credential use occurred in this Stage 1 work.

## Live-source reconciliation

Read-only public assets were retrieved on 2026-10-28 UTC from:

- `https://firstlinedev.com/`
- `/script.js`, `/styles.css`, `/privacy.html`, `/pricing.html`, `/terms.html`, and `/connect/`

The public home, pricing, terms, privacy, and connect content matched the corresponding source intent. Public `script.js` was older than the Packet-B candidate: it lacked the owned analytics seam, safe invalid-hash containment, and inquiry outcome events. The candidate preserves public portfolio rendering, smooth navigation, mobile menu, contact endpoint and form workflow, reveal behavior, and year rendering; Packet-B's safety/semantics fixes are retained. No unrelated live-only behavior needed a path outside the authorized write scope.

The public extraction mechanism did not expose response ETag or Last-Modified metadata. Candidate SHA-256 values and the exact local commit are recorded below after finalization; public raw response hashes are intentionally not inferred from rendered extraction.

## Privacy and event contract

The implementation is basic opt-in. Before affirmative consent, it loads no Google provider script and sends no provider requests. The only persisted value is the first-party `firstline-analytics-consent` choice (`accepted` or `rejected`). Reject prevents provider loading. Privacy Preferences reopens the equivalent Accept analytics and Reject analytics controls; rejection/withdrawal selects `rejected`, sends a Google consent update to denied only when the provider was previously loaded, and prevents future event dispatch.

The configuration has one deliberately non-working measurement-ID placeholder in `script.js`: `G-PRODUCTION-ID-REQUIRED`. It is not an actual identifier and is never an activation value. A final verified production web-stream measurement ID must replace it only after owner-side creation and verification.

Production hosts are exactly `firstlinedev.com`, `www.firstlinedev.com`, and `firstline-development.web.app`; localhost, loopback, preview, GitHub Pages, and unrelated hosts fail closed. The only test configuration injection is accepted on exact loopback hosts. It never loads a network script.

`script.js` is the sole manual page-view owner. It configures `send_page_view=false`, disables Google Signals and ad-personalization signals, clears `page_referrer`, and sends at most one manual page view after valid consent/configuration. Page location is sanitized to `https://firstlinedev.com` plus the path; query strings and document referrers are not read or sent. The consent-gated loader has one path to `https://www.googletagmanager.com/gtag/js?id=…` and applies `referrerPolicy="no-referrer"`. Event names and parameters remain the strict Packet-B allowlist in `ANALYTICS_EVENT_CONTRACT.md`; the only adapter-added fields are sanitized `page_location` and empty `page_referrer` on `page_view`.

No form values, free text, contact data, URL query, raw hash, document referrer, user ID, user property, or unapproved identifier is dispatched.

## Owner-side gates before any deployment

1. Create or identify exactly one verified GA4 property and web stream under account `405718522` as approved: FirstLine Development — firstlinedev.com Production, America/New_York, USD, stream name `firstlinedev.com Production`, URL `https://firstlinedev.com`.
2. Supply the verified GA4 property ID and production web-stream measurement ID to Director. The measurement ID has one placeholder location in `script.js`; Stage 1 must also receive the verified activation-gate decision before it can be considered activatable.
3. Configure Enhanced Measurement off; manual page views only; event-level retention two months; minimal data sharing; email and URL-query redaction; no Ads linking, advertising features, Google Signals, ad personalization, or ad-user-data features.
4. Owner must verify the authorized `firstlinedev.com` Search Console Domain property manually and provide verification evidence. Search Console must not add a visitor tag.
5. Obtain separate Stage 2 deployment authorization and repeat independent QA against the exact final candidate.

The missing owner-side activation bundle is: verified GA4 property ID, verified production web-stream measurement ID, explicit activation-gate authorization, and verified `firstlinedev.com` Search Console Domain ownership. Automated verification of the alternate authorized Google account was rejected by Google before any password entry; no credential was requested or used.

## Future deployment and rollback procedure (not executed)

1. Record the current Firebase Hosting release identifier, timestamp, target, and the current deployed commit before changing anything.
2. Review the final measurement ID, target host, provider settings, privacy text, consent behavior, and clean working tree; run the documented local tests.
3. Deploy only after explicit Stage 2 authorization. Validate no pre-consent provider request, one manual page view after consent, no query/referrer/form-data payload, and no site regression.
4. Stop immediately for a pre-consent request, wrong property or host, duplicate page view, forbidden payload, consent failure, or any site regression.
5. Website rollback: release the captured prior Firebase Hosting release, or deploy the captured prior approved commit using a separately authorized deployment procedure.
6. Provider-binding rollback: remove or disable the FirstLine production tag binding independently of the website rollback; retain the fail-closed placeholder code until a new authorized candidate exists.

## Candidate evidence

- Candidate implementation commits: `c6ae1b22d1b1e32bfedbec7eb37ecc2dbee4f7b9` and `dd02ac9887db6d52a9989af3376b33fb580d9211`
- Final candidate SHA-256 (before this evidence-record update):
  - `script.js`: `d428d216f9bd34ec246239a1ffb612b1da11adea2ffc7df6bd42db65f77ff41d`
  - `index.html`: `5ebb27a51c8ea65effae2eae7019d108d69b8874724421721c77dd22d287a4ef`
  - `styles.css`: `ff58f2ad46afe93d6e7799babbd1d55c5aac58380d2b0a4dbafb94f7197b8aeb`
  - `privacy.html`: `4936b08b2d2abeff726805a4f1f7876d6acb7bc24e05b998f877002800a5d538`
  - `ANALYTICS_EVENT_CONTRACT.md`: `8ed98d57c3b0eab66defc23d0ef1f834c74be5d418e08bbf7b7e150436646155`
  - `tests/analytics.test.mjs`: `34daa93d4d8c544ae178e248615a251b462e7ed95dbac70c1dc4f0faa7249679`
- Tests: `node --test tests/analytics.test.mjs` (22/22), `node --check script.js`, `npm run lint --prefix functions`, and `git diff --check` all passed; the loopback DOM harness captures scripts instead of allowing any authentic provider network request.
