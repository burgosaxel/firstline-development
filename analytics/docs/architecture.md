# Architecture and data flow

Browser Firebase Google sign-in -> same-origin Express API -> Firebase Admin token verification and exact owner allowlist -> server-owned site registry -> disabled-by-default or fixed-shape GA4 Data API adapter. The browser never supplies provider identifiers or authorization decisions.

The API has fixed v1 endpoints for owner identity, registry projection, portfolio and site aggregate overview. Requests accept only an authorized site slug and capped dates. They do not accept GA4 property IDs, provider URLs, report expressions, or credentials. Authentication precedes each registry/report read. Health and authenticated responses carry `Cache-Control: private, no-store`.

Firebase and GA4 remain unconfigured and unexercised locally. The live adapter is implemented but selected only with explicit server configuration; it lazily obtains an ADC token scoped to Analytics read-only and has no fixture fallback. The Functions v2 entrypoint exports Express without opening a listener or acquiring credentials at import time. `firebase.production.example.json` is an inert Hosting/Functions rewrite template.

Aggregation: sessions/page views/actions are only property totals where compatible/non-overlapping. Users/visitors are displayed by property and never agency-summed. CTR requires click/impression weighting; zero denominator is null. Phone/map/order actions remain clicks, never outcomes.
