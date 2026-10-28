# Consent-gated analytics event contract

## Status and boundary

This is a fail-closed browser event seam for FirstLine Development. By default it has no provider transport, does not load provider code, and does not transmit analytics data. `window.FirstLineAnalytics.setOfflineSink()` is accepted only when the current hostname is an exact loopback host (`localhost`, `127.0.0.1`, or `[::1]`) for local tests; production origins reject it. A sink exception is contained at the analytics boundary and cannot affect visitor workflows.

The candidate persists only an affirmative/rejected first-party consent choice. Provider activation remains impossible unless affirmative consent, an explicit activation gate, a valid non-placeholder measurement ID, and an approved host all exist. The checked-in production measurement ID is deliberately non-working pending owner verification. Enabling a provider, attaching a resource, publishing source, and observing provider receipt remain separate approval gates.

## Record shape and immutability

Every accepted record is a fresh, frozen object:

- `schema_version`: `1`
- `name`: one of the allowlisted event names below
- `params`: a fresh frozen object containing exactly the allowed keys and enum values

The seam rejects unknown event names, parameter keys, missing/extra keys, and values outside the listed enums. It never retains the caller object. Records and params are frozen before the optional sink is invoked. Consequently, this contract cannot include free text, form fields, names, business names, emails, phone numbers, messages, error text, endpoint URLs, query strings, arbitrary fragments, referrers, IP/location values, identifiers, or arbitrary labels.

## Allowlisted events

| Event | Exact allowed params | Meaning |
| --- | --- | --- |
| `page_view` | `page`: `home`, `pricing`, `privacy`, `terms` | One manual document view for the actual local document identity. The adapter adds only a sanitized canonical `page_location` (`https://firstlinedev.com` plus approved path) and an empty `page_referrer`; it never sends a query string or document referrer. |
| `section_navigation` | `section`: `work`, `services`, `process`, `about` | An intentional same-document navigation to an existing approved section. |
| `contact_cta_click` | `placement`: `nav`, `hero`, `sales`, `final`, `pricing` | A click on an existing `/connect` call-to-action. It is not a consultation, booking, lead, sale, or contact completion. |
| `portfolio_project_click` | `project`: `bloom_infive`, `ebanisteria_cad`, `tripletas_la_union` | A click on a source-owned existing portfolio outbound action. No URL or link text is recorded. |
| `inquiry_submit_attempt` | none | One valid existing form submission entering the existing request flow. Browser-invalid interactions are not attempts. |
| `inquiry_submit_success` | none | Only emitted after the existing request has both HTTP success and `result.ok === true`. It means the application received that endpoint acknowledgement only; it does not prove a lead, sale, booking, client, or delivered email. |
| `inquiry_submit_error` | `reason`: `network`, `server`, `response` | A coarse outcome only. `network` is an actual request rejection, `server` is an HTTP non-success response, and `response` is malformed or negative HTTP-success response data. No exception, server message, response body, or form value is recorded. |

No social event is present because the current source has no real social link callsite.

## Page and hash rules

`script.js` owns manual document views for the first-party document allowlist shown above: home forms (``, `/`, `/index.html`), deployed clean URLs (`/pricing`, `/privacy`, `/terms`), and their `.html` aliases. It records a document only once per document object, including repeated script initialization. Hash navigation is not a document view; unknown paths are rejected.

Existing approved `#work`, `#services`, `#process`, and `#about` navigation retains the established smooth-scroll and `history.pushState` behavior. A section event is emitted only after an approved target exists and is intentionally selected. Unrecognized, nonexistent, and invalid selector hashes do not emit a section event. Separate genuine reactivations may emit again; duplicate setup/listeners cannot double emit.

If a future GA4 tag is separately approved, its automatic `page_view` behavior must be reconciled or disabled, and enhanced history/hash page-view behavior must be disabled or otherwise deduplicated. The manual owner must remain the sole owner for these document views; hash actions must not become page views.

## Approval gates before any enablement

1. Owner approval for the exact analytics purpose and privacy notice/consent approach.
2. Authorized provider resource and host binding, with no browser credential or provider ID added until approved.
3. Explicit enablement and tag implementation review, including page-view deduplication.
4. Independent offline QA of the exact candidate, then separate publishing/deployment approval.
5. Any production observation or controlled event requires its own authorization; no local test record is provider evidence.
