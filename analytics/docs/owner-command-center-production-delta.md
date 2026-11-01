# FirstLine Analytics branding revision production delta

## Revision and scope

This local-only correction candidate documents the FirstLine Analytics visual-branding revision from the deployed baseline `bd0987722ef8c2a41b8d4f8463410ce41b176910` through the branding candidate `3de90fa195dfd4b615f0f22fb5458d7bbd3edd29` and its evidence/documentation correction. It changes no product behavior or production configuration.

The branding revision contains only the following visual and evidence work:

- Official copied assets, recorded in `docs/firstline-analytics-brand-source.md` and preserved byte-for-byte:
  - `apps/web/public/brand/Logo_Dark.png` — SHA-256 `d1c609c9d183ea3e9e1b9b9cc7cc6f82f48bbf9379e886d3ca18efe2a2e5d30c`
  - `apps/web/public/brand/Logo_Light.png` — SHA-256 `6c5e1fb3f3efa84d1005b7215f8f7c1cf4ad6abaa9ac8f74c8a9a288ca9fec69`
  - `apps/web/public/brand/favicon.png` — SHA-256 `ad8ef6c561fbb890a622c824def725b7d4be54f320eb80f1282c85cf773b30d4`
- `apps/web/index.html`: FirstLine Analytics document title and the official favicon reference.
- `apps/web/src/main.tsx`: FirstLine product naming and official logo treatment in the existing application views.
- `apps/web/src/style.css`: FirstLine visual tokens, surface and control system, responsive rail/drawer presentation, and reduced-motion behavior.
- `docs/firstline-analytics-brand-source.md`: provenance for the visual reference, copied assets, source hashes, and token mapping.
- `qa-evidence/owner-command-center-browser.mjs` and its untracked loopback-only evidence: deterministic branding and responsive-browser verification, including the retained baseline evidence at `qa-evidence/firstline-brand-revamp/before/manifest.json`.

## Explicitly unchanged

This visual-only revision does not change API endpoints or contracts, authentication or authorization, provider queries, registry behavior, Firebase or other cloud configuration, dependencies, billing, DNS, IAM, client sites, or live-data semantics. It does not introduce production mock or evidence code.

If separately authorized, the deployment delta would be static web/Hosting assets only. No Functions or API deployment is required for this visual-only revision unless a future source diff proves otherwise.

## Rollback and external state

The exact visual rollback source is deployed baseline `bd0987722ef8c2a41b8d4f8463410ce41b176910`. No data migration is involved.

No deployment, publication, push, merge, provider read, cloud/Firebase mutation, billing, DNS, IAM, client-site access, or other external mutation occurred while preparing this local candidate.