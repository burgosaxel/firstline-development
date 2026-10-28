# FirstLine Development production analytics — Stage 1 candidate

## Status and immutable baseline

This is an undeployed, consent-gated local candidate. It starts from Packet-B commit `d50533b7ab86678177a1656d897a8637f307a496` on branch `firstline-development/stage1-firstlinedev-production-analytics`. Canonical `main` and `origin/main` were both verified at `f484411488a5b3d044977185b200baaf40f6f6fe` before implementation. Its local production activation gate is authorized and set to true, but that does not authorize publication, deployment, live tracking, or provider receipt.

No deployment, Firebase Hosting release, live provider receipt, production milestone, provider-resource creation, Search Console verification, billing change, authenticated-provider access, or credential use occurred in this Stage 1 work.

## Live-source reconciliation

Read-only public assets were retrieved on 2026-10-28 UTC from:

- `https://firstlinedev.com/`
- `/script.js`, `/styles.css`, `/privacy.html`, `/pricing.html`, `/terms.html`, and `/connect/`

The public home, pricing, terms, privacy, and connect content matched the corresponding source intent. Public `script.js` was older than the Packet-B candidate: it lacked the owned analytics seam, safe invalid-hash containment, and inquiry outcome events. The candidate preserves public portfolio rendering, smooth navigation, mobile menu, contact endpoint and form workflow, reveal behavior, and year rendering; Packet-B's safety/semantics fixes are retained. No unrelated live-only behavior needed a path outside the authorized write scope.

The public extraction mechanism did not expose response ETag or Last-Modified metadata. Candidate SHA-256 values and the exact local commit are recorded below after finalization; public raw response hashes are intentionally not inferred from rendered extraction.

## Privacy and event contract

The implementation is basic opt-in. Before affirmative consent, it loads no Google provider script and sends no provider requests. The only persisted value is the first-party `firstline-analytics-consent` choice (`accepted` or `rejected`). Reject prevents provider loading. Privacy Preferences reopens the equivalent Accept analytics and Reject analytics controls; rejection/withdrawal selects `rejected`, sends a Google consent update to denied only when the provider was previously loaded, and prevents future event dispatch.

The configuration has one auditable runtime measurement-ID location in `script.js`: `G-BLK8DL1WDG`. It is the verified measurement ID for the mapped production stream. The local activation gate is true, but the approved-host and affirmative-consent checks remain mandatory; no provider code loads before consent.

Production hosts are exactly `firstlinedev.com`, `www.firstlinedev.com`, and `firstline-development.web.app`; localhost, loopback, preview, GitHub Pages, and unrelated hosts fail closed. The only test configuration injection is accepted on exact loopback hosts. It never loads a network script.

`script.js` is the sole manual page-view owner. It configures `send_page_view=false`, disables Google Signals and ad-personalization signals, clears `page_referrer`, and sends at most one manual page view after valid consent/configuration. Page location is sanitized to `https://firstlinedev.com` plus the path; query strings and document referrers are not read or sent. The consent-gated loader has one path to `https://www.googletagmanager.com/gtag/js?id=…` and applies `referrerPolicy="no-referrer"`. Event names and parameters remain the strict Packet-B allowlist in `ANALYTICS_EVENT_CONTRACT.md`; the only adapter-added fields are sanitized `page_location` and empty `page_referrer` on `page_view`.

No form values, free text, contact data, URL query, raw hash, document referrer, user ID, user property, or unapproved identifier is dispatched.

## Verified provider mapping and remaining deployment gate

1. Verified GA4 account: `accounts/405718522` (FirstLine Development); property: `properties/561169935` (FirstLine Development — firstlinedev.com Production), timezone America/New_York, currency USD.
2. Verified sole web stream: `properties/561169935/dataStreams/16223419464`, named `firstlinedev.com Production`, canonical URL `https://firstlinedev.com`, measurement ID `G-BLK8DL1WDG`. The ID appears in one auditable runtime configuration location in `script.js`.
3. Verified property settings: event-level retention `TWO_MONTHS`; Google Signals disabled; Enhanced Measurement master stream switch off; global ads personalization disallowed. The website continues to set `send_page_view=false`, `allow_google_signals=false`, `allow_ad_personalization_signals=false`, and denied `ad_storage`, `ad_user_data`, and `ad_personalization` before the consent-gated tag loader.
4. Verified Search Console Domain property: `sc-domain:firstlinedev.com`, permission level `siteOwner`. Its Google verification TXT is already publicly present; this record does not reproduce the token. Search Console provides aggregate search performance and does not add a visitor tracking tag.
5. The sole remaining gate is separate Stage 2 authorization to deploy/publish this exact independently QA-approved candidate. No deployment, production-site modification, live provider request, or live receipt occurred during Stage 1.

## Future deployment and rollback procedure (not executed)

1. Record the current Firebase Hosting release identifier, timestamp, target, and the current deployed commit before changing anything.
2. Review the final measurement ID, target host, provider settings, privacy text, consent behavior, and clean working tree; run the documented local tests.
3. Deploy only after explicit Stage 2 authorization. Validate no pre-consent provider request, one manual page view after consent, no query/referrer/form-data payload, and no site regression.
4. Stop immediately for a pre-consent request, wrong property or host, duplicate page view, forbidden payload, consent failure, or any site regression.
5. Website rollback: release the captured prior Firebase Hosting release, or deploy the captured prior approved commit using a separately authorized deployment procedure.
6. Provider-binding rollback: remove or disable the FirstLine production tag binding independently of the website rollback; retain the fail-closed placeholder code until a new authorized candidate exists.

## Candidate evidence

- Candidate implementation lineage: `c6ae1b22d1b1e32bfedbec7eb37ecc2dbee4f7b9`, `dd02ac9887db6d52a9989af3376b33fb580d9211`, `56fb39d9a7176ab1cc723d7371606b4b40e13b8d`, and `9220b8cb2f98b7ff89043692f245e09181a0a9f3`; the ID-complete local commit follows this record.
- The final local commit SHA and final SHA-256 hashes for the authorized candidate files are captured in the Stage 1 handoff after this document is committed. This document does not embed its own hash to avoid a self-referential evidence value.
- Tests: `node --test tests/analytics.test.mjs` (26/26), `node --check script.js`, `npm run lint --prefix functions`, `npm test --prefix functions --if-present`, and `git diff --check` passed before commit; the loopback DOM harness captures scripts instead of allowing any authentic provider network request.
