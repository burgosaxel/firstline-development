# Onboarding, security, and production gates

Onboard a client only through reviewed server config: immutable client id/display name, allowed origins, display/provider timezones, config version, exact provider bindings, enabled panels and explicit staff UID grants. Validate schema, reject duplicate/overlapping bindings, run an approved read-only connectivity test, then enable. Never accept provider IDs from browsers.

Threat controls: the local fixture-owner boundary does not accept browser-supplied provider IDs or credentials. Unknown/unauthorized resources return 404 after authentication. Responses are no-store; sanitized logs must exclude bearer/provider tokens and visitor data. Reports are single-site, immutable, authorization-checked at reopen, and proposed to expire after 90 days.

Production is NOT executed. It requires Axel approval for a dedicated Firebase/GCP project, Blaze/billing, region, retention, budget alerts, staff UID grants, GA4 Viewer/Data API, exact GSC property/read-only access, optional Clarity secret in Secret Manager, privacy/consent review, isolated deploy identity, separate DNS approval and independent QA. Rollback: disable API/live-provider configuration, revoke grants as needed, preserve sanitized evidence; never modify TLU to remediate this application.

Cost assumption: local MVP creates no charges. A future small internal pilot may be low cost but $0–10/month is a monitoring envelope, not a cap; billing alerts do not cap spend.

## Current local-only dependency gate

The root Node contract is `>=22.22.2 <23.0.0`; the 22.22.2 floor is derived from every lockfile engine constraint, including development and optional entries. The local regression suite is exercised on Node 22.23.3. `apps/api` remains constrained to Node 22.

The former browser screenshot/PDF evidence workflow is retired. Supported validation is limited to the TypeScript suites and the documented loopback Express API/Vite proxy smoke; no browser-check script or generated custom browser evidence is part of this candidate.

Production audit uses a root npm override only for `firebase@12.7.0` → `@firebase/firestore@4.9.3` → `@grpc/grpc-js`, pinning the nested gRPC package to `1.13.6`. This is the smallest jointly fixed version for GHSA-m9gg-hp2v-232j and GHSA-f596-whhp-79r4; it replaces the former vulnerable `1.9.16` copy despite Firestore's declared `~1.9.0` range. The override is an explicitly approved compatibility exception, not a supported upstream Firestore range update, and must be independently validated for the generated Functions artifact. Static tracing identifies no current application server route to these server-side gRPC flaws, and the nested package is not exercised by this local candidate. That static observation is neither a waiver nor risk acceptance: production remains blocked pending normal security and independent-QA gates.
