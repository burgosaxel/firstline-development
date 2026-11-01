# TLU pilot proposal (unapplied)

Observed read-only commit: `8d9a1225d04277484e28ab1073a9ed4ae2af4bc0`. Existing analytics flags are false and the observed custom-event hook is no-op; no GA4/GTM/Clarity provider listener was found. `menu_view` is emitted on navigation and on MenuPage mount, creating a duplicate-count risk. TLU is an SPA, so future page view tracking must select one route strategy. The tracked privacy route has generic text; no consent-management implementation was observed.

No patch is supplied because a precise provider integration requires an approved tag path, consent/loading policy, property inventory and owner review. Do not change Spanish-first UX, menu/business/hours content, or deployments. Before any live installation: approve privacy/consent behavior, masking, event payload allowlist, and duplicate event regression tests.
