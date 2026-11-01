# Analytics snapshot integration candidate — local only

## Status, provenance, and limits

This branch is a reversible, local-only snapshot-import candidate, not a cutover. On 2026-11-01 UTC it imports the tracked tree of the standalone Analytics source beneath `analytics/`; it does not import Analytics Git history.

- Parent baseline (local `origin/main` snapshot, not a fresh remote observation): `edd92bc60c65c1b1b90ac603f738218922ea7c03`.
- Standalone source repository: `/srv/node01/projects/firstline-org/firstline-analytics`.
- Source revision: `dc1a6879e0c5761f22ab35eec318d7b93ed1d956`; source tree: `b2b0b877ad3df85b3a47de0cd2f3f324751e9611`.
- Target child path and imported scope: `analytics/`, containing only the source revision's tracked files, subject only to the three documented integration adaptations below.

The parent repository is shallow. This candidate neither fetches nor reconciles remote history and makes no claim that the local `origin/main` snapshot is current remote state. The Analytics source revision is not an ancestor of this candidate: traceability is by the recorded source SHA, source tree hash, child path, and retained rollback repositories, not reachable imported commit history.

Director supplied historical (not newly observed) production evidence: Hosting release `1793554187838000`, version `72c356260085afd8` for source revision `dc1a6879e0c5761f22ab35eec318d7b93ed1d956`.

## Scope and preservation

The snapshot includes tracked Analytics workspace manifests and lockfile, `apps/web`, `apps/api`, `packages/contracts`, tests, scripts, documentation, official brand assets, tracked QA tooling/evidence, Firebase templates, and historical Firestore rules. It excludes credentials; environment files other than tracked examples; ignored dependencies; generated build output; `functions-source`; caches; debug logs; administrative `.worktrees`; untracked release/QA evidence; and held branch history.

The only allowed child paths adapted for this parent candidate are:

- `analytics/.gitignore`
- `analytics/README.md`
- `analytics/qa-evidence/owner-command-center-browser.mjs`

The original repository and its worktrees remain rollback/audit artifacts at `/srv/node01/projects/firstline-org/firstline-analytics`. The prior subtree candidate remains separately preserved at `/srv/node01/projects/firstline-development/.worktrees/t_a5b3bdd6`, SHA `be61edf2c206097209ffc5e1a3f018bde89208a0`; it is not an ancestor of this snapshot candidate and its object reachability must not be represented as snapshot ancestry.

The child `analytics/firebase.json`, `.firebaserc`, `firebase.production.example.json`, and `firestore.rules` are non-authoritative standalone-source provenance only. Parent-root `.firebaserc`, `firebase.json`, `firestore.rules`, and `firestore.indexes.json` are the sole candidate deployment authority. Parent Firestore rules and indexes remain unchanged. The parent root has no npm workspace; run Analytics tooling only from `analytics/`.

## Candidate architecture and local validation

The prospective deployment lanes are:

- Hosting `public` -> `firstline-development`, public root `.`; Firebase CLI `listFiles` must exactly equal the 19-file allowlist, with symlink rejection.
- Hosting `analytics` -> `firstline-analytics`, public root `analytics/apps/web/dist`; `/api/**` rewrites to `analyticsApi` in `us-central1` before the SPA fallback, with no `pinTag`.
- Functions `default` -> `functions`, Node.js 22, preserving `submitContactForm`.
- Functions `analytics` -> `analytics/functions-source`, Node.js 22, preserving `analyticsApi` and its region.

`firebase.local.json` and the Hosting scripts are local static validation only. They use the ignored generated `.hosting-public/` 19-file staging root and must run inside a `bwrap --unshare-all` loopback-only/no-route namespace. This is not a deployment or provider observation.

The browser harness is test-only and mock-only, runs on loopback, blocks and records external requests, checks widths 1440/1024/768/430/390/375/360, and verifies listener shutdown.

## Rollback, non-adoption, and remaining gates

Immediate rollback is non-adoption: stop candidate-only local listeners, retain this branch/worktree and evidence, and continue using the unchanged standalone source and existing live release. No production rollback is needed because this candidate changes no external state. Do not reset, delete, clean, or decommission retained artifacts without separate authorization.

Remaining gates are independent QA against the exact final SHA; owner approval; parent-main integration and remote reconciliation; snapshot-content disclosure/security review; live Hosting/Functions runtime-identity and update-safety review; routing/source-of-truth cutover; deployment authorization; a retained rollback interval; and separate standalone-repository/worktree decommission authority.

## Future parent-main, publication, and production commands — not authorized now

1. Obtain separate authorization for remote reconciliation and publication.
2. Fetch `origin` without changing remotes and compare fresh `origin/main` with `edd92bc60c65c1b1b90ac603f738218922ea7c03`.
3. If unchanged, require canonical parent tracked-clean status, fast-forward local `main` to `origin/main`, fast-forward `main` to the exact approved snapshot candidate, verify, and push normal `main` to existing `origin` without force.
4. If `origin/main` advanced, do not merge or push this stale-base candidate; regenerate a new one-commit snapshot candidate on the fresh base and rerun QA.
5. Before publication, perform disclosure/security review of snapshot contents. This candidate publishes no Analytics Git history.
6. Routing/source-of-truth cutover, deployment, and standalone-repository decommission require separate approvals.

After the preceding gates and separate authorization, only explicit parent-root scopes are acceptable:

    ./analytics/node_modules/.bin/firebase deploy --project firstline-development --config firebase.json --only hosting:analytics
    ./analytics/node_modules/.bin/firebase deploy --project firstline-development --config firebase.json --only hosting:public
    ./analytics/node_modules/.bin/firebase deploy --project firstline-development --config firebase.json --only functions:analytics:analyticsApi
    ./analytics/node_modules/.bin/firebase deploy --project firstline-development --config firebase.json --only functions:default:submitContactForm

Do not use bare `firebase deploy`, `--only hosting`, or `--only functions`; do not deploy Firestore for this source relocation.
