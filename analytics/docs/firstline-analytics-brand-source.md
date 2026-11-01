# FirstLine Analytics brand-source record

## Authority and provenance

- Live visual reference inspected: `https://firstlinedev.com/` on 2026-11-01 UTC at the browser desktop viewport (1280px wide) and representative mobile layout. The live page title was `FirstLine Development | Web Design & Development for Small Businesses` and used `/Logo_Light.png` in the light sticky header and `/favicon.png` as the compact mark.
- Local public-site source read: `/srv/node01/projects/firstline-development/index.html` and `/srv/node01/projects/firstline-development/styles.css`, local `main` HEAD `f484411488a5b3d044977185b200baaf40f6f6fe`.
- The public-site checkout is documented as behind its configured remote. It is supporting source, not a claim that this local commit exactly equals the live deployment. The live page and checked-out source agreed on the logo assets, light sticky header, blue/ink/light-surface visual language, uppercase hierarchy, and responsive menu pattern.
- Shared standards read: `/srv/node01/projects/FirstLine-System/DESIGN_SYSTEM.md`, `MOBILE_RULES.md`, and `QA_CHECKLIST.md`, HEAD `35f0c47a64a36192d1bc18a8f044370f593fc4d9`.

## Observed live and source visual language

- The live desktop header is a light, sticky navigation with the `Logo_Light.png` wordmark, an intense blue lower edge, black keyline, uppercase heavy navigation, and an uppercase blue-gradient primary action.
- The layout uses a white to pale-blue-gray foundation, high-contrast near-black ink, saturated FirstLine blue, subdued slate text, editorial uppercase headings, blue spaced eyebrows, and a modest blue grid/line accent rather than glass effects.
- Buttons are compact, heavy uppercase controls: primary blue gradient with a restrained lift; secondary white with a dark outline. Visible focus is a three-pixel blue outline with offset.
- Cards and control surfaces use white or pale-panel fills, one-pixel cool-gray borders, 8px corners, and restrained ink shadows. The live site has deliberate large-section rhythm; Analytics uses the same grammar with denser operational spacing.
- At narrow width, the public navigation becomes a bounded menu control; source rules require stable logo bounds, controlled drawer geometry, mobile density, and no document overflow. The application drawer retains its tested focus, Escape, and focus-return behavior.

## Official asset intake

| Source | Destination | SHA-256 | Use |
| --- | --- | --- | --- |
| `/srv/node01/projects/firstline-development/Logo_Light.png` | `apps/web/public/brand/Logo_Light.png` | `6c5e1fb3f3efa84d1005b7215f8f7c1cf4ad6abaa9ac8f74c8a9a288ca9fec69` | Light sign-in and light product surfaces |
| `/srv/node01/projects/firstline-development/Logo_Dark.png` | `apps/web/public/brand/Logo_Dark.png` | `d1c609c9d183ea3e9e1b9b9cc7cc6f82f48bbf9379e886d3ca18efe2a2e5d30c` | Dark application shell |
| `/srv/node01/projects/firstline-development/favicon.png` | `apps/web/public/brand/favicon.png` | `ad8ef6c561fbb890a622c824def725b7d4be54f320eb80f1282c85cf773b30d4` | Browser favicon and compact product mark |

The copied files are exact bytes. `connect/fl-logo.png` was intentionally not copied because it is byte-identical to `favicon.png`.

## Analytics token mapping and adaptation

| Source token | Analytics token | Adaptation |
| --- | --- | --- |
| `#f6f7f9` background | `--fl-bg` | Application canvas |
| `#ffffff` paper | `--fl-paper` | Panels, controls, authenticated main surface |
| `#eef3f8` panel | `--fl-panel` | Data-dense supporting surfaces |
| `#05090c` ink | `--fl-ink` | Shell, headings, high-contrast controls |
| `#202832` soft ink / `#586575` muted | `--fl-ink-soft` / `--fl-muted` | Operational body and metadata text |
| `#0057d9` / `#0043aa` | `--fl-blue` / `--fl-blue-dark` | Navigation state, primary controls, chart bars, focus |
| `#d8dee7` line | `--fl-line` | Tables, cards, inputs, rules |
| `0 18px 34px rgba(5,9,12,.08)` | `--fl-shadow` | Restrained card elevation |
| `8px` / `180ms ease` | `--fl-radius` / `--fl-transition` | Controls and motion, disabled under reduced motion |

Analytics intentionally uses a fixed dark product rail rather than a marketing header, more compact heading and card spacing, semantic status colors distinct from the brand blue, responsive table-to-labeled-row treatment, and no marketing hero or claims. It intentionally does not import public-site portfolio imagery, contact copy, pricing composition, decorative mockups, external assets, web fonts, or marketing-page scale.

## Evidence gate

Before tracked application edits, the deterministic isolated local/mock harness completed against baseline `bd0987722ef8c2a41b8d4f8463410ce41b176910`; its copied baseline images and SHA-256 manifest are under `qa-evidence/firstline-brand-revamp/before/`. The harness uses loopback local mock transport only; no provider or external request is part of this evidence.
