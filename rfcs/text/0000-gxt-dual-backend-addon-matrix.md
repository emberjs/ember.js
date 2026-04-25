# GXT Dual-Backend Addon Compatibility Matrix

Companion document to
[`0000-gxt-dual-backend.md`](./0000-gxt-dual-backend.md).

This is a **best-effort, point-in-time snapshot** of top-20 Ember addons
assessed against `ember-source-gxt`. The Phase 0 spike validated 14
targeted integration-test modules inside `ember-source` itself —
**zero real addons have been tested end-to-end against the GXT
backend**. Every `pass` in this table is an inference based on whether
the addon touches the `@glimmer/*` VM surface; every `classic-only` is a
known architectural dependency on Glimmer VM internals; everything else
is `untested`.

Status definitions:

- **pass** — strong prior reason to believe the addon will work on GXT
  with no code change (pure-service, build-time-only, or exercises
  only public `@ember/*` API). Still requires validation before
  preview exit.
- **classic-only** — known to depend on internals or behaviors GXT
  does not (currently) reproduce. Would need addon-side changes or a
  GXT-side fix.
- **untested** — not validated in the spike, not confidently
  classifiable from a package.json / source scan alone. Default for
  anything uncertain.

No addon in this matrix is green-lit for production use on GXT. The
preview exit criteria (`0000-gxt-dual-backend.md` §9) require that the
top 20 here reach `pass` before stable promotion.

## Matrix

| Addon                    | Version (typical) | Status       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ember-simple-auth`      | 6.x               | untested     | Pure service + session store, no VM touch expected. Likely `pass` after validation — used in the domain review's top-10 list as "should work" (`/tmp/gxt-plan-review-domain.md` §2.7). Not exercised in the 14-module spike.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ember-power-select`     | 8.x               | untested     | **High risk.** Heavy `{{component}}` curry, `{{yield}}` to hash with stable identity requirements, positional-args-on-contextual-components patterns. The spike's contextual-component path was only stabilized this week (commits `5176f4b229`, `9005f9892b`), and the domain review flags `(hash)`/`(array)` identity-stability and `has-block`/`has-block-params` as `UNVALIDATED`. Until those rows in the feature matrix move to `PASS`, this addon cannot be classified. Validate explicitly before any `pass` claim.                                                                                                                                                                                                                       |
| `ember-paper`            | 1.x (legacy)      | classic-only | Legacy addon with many custom component managers and direct `@glimmer/*` reaches. Domain review §2.7: "Legacy, many custom managers. Assume classic-only." Not targeted for GXT compatibility; recommend consumers migrate to a maintained alternative if they want GXT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `ember-bootstrap`        | 6.x               | untested     | Template-heavy, uses contextual components extensively, some direct Glimmer component class extension. Similar risk profile to `ember-power-select` for contextual-component edge cases. Not verified against GXT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `ember-cli-mirage`       | 3.x               | pass         | Pure build-time + request mocking via Pretender / MSW. Zero VM touch. Should work unchanged on GXT. Still unverified against real installs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ember-intl`             | 7.x               | untested     | Helper-manager-based translation helpers + service + runtime locale switching. Helper manager parity is `PASS` in the spike matrix, so the runtime path is plausible, but the addon's direct imports haven't been audited. Listed as "should work once helper manager parity is confirmed" in domain review §2.7.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ember-data`             | 5.x / 6.x         | untested     | `ember-data` itself lives in services + computed/tracked state, does not touch the VM directly, and is plausibly `pass` after validation — **but** Ember Data's full test suite was not run against GXT in the spike, and tracked identity stability through relationship caches is the kind of subtle behavior that can drift silently on a reactivity-core swap. Domain review §2.7: "Should work, but `@ember-data/debug` talks to `@ember/debug` which imports `@glimmer/interfaces` — verify."                                                                                                                                                                                                                                               |
| `@ember-data/debug`      | 5.x / 6.x         | classic-only | Imports from `@glimmer/interfaces` per the domain review. Inspector-adjacent; falls under the §8 "Ember Inspector parity" work in the RFC. Not expected to work until that work lands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `ember-render-modifiers` | 3.x               | pass         | Modifier manager adapter. The spike's `Modifiers` row is `PASS` (session-verified against `{{on}}` and custom modifiers through the compat layer's modifier manager). This addon directly exercises the modifier-manager seam and is one of the most important first-class targets per domain review §2.7. High confidence of `pass`, still requires full-suite validation against the real addon.                                                                                                                                                                                                                                                                                                                                                |
| `ember-cli-htmlbars`     | 6.x               | classic-only | **Not optional.** This is Ember's template compiler. It produces Glimmer-VM-compatible wire format; GXT consumes a different template-factory shape. A **GXT template-compiler shim is required**, not merely "nice to have" — without it, any `.hbs` file in an addon or app cannot be loaded at all under `ember-source-gxt`. The spike's `packages/demo/compat/ember-template-compiler.ts` and `packages/demo/compat/gxt-template-factory.ts` are the prototypes of this shim. The Phase 2 build story (RFC §5) must include a published `ember-cli-htmlbars-gxt` (or equivalent) before preview ships. Marking `classic-only` reflects the current published addon, not the destination state.                                                |
| `ember-concurrency`      | 4.x               | untested     | Task management, tracked state, lifecycle integration. Pure runtime library with some component lifecycle hooks. Likely `pass` after validation, but task cancellation on destruction is timing-sensitive and GXT's destructor scheduling (`destroyBranchSync` vs Glimmer's destroyable tree) could differ. Not in the spike.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ember-basic-dropdown`   | 8.x               | untested     | Similar profile to `ember-power-select` (which depends on it): heavy contextual components + portal/wormhole patterns + direct DOM positioning. Portal patterns in particular rely on `in-element` semantics which were not exercised in the 14-module spike.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ember-modifier`         | 4.x               | pass         | Modifier manager library. Same reasoning as `ember-render-modifiers`: the modifier-manager seam is `PASS` in the spike. High confidence pending validation against the real addon.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `tracked-built-ins`      | 3.x               | untested     | Tracked Array/Map/Set/Object wrappers that wrap the `@glimmer/tracking` primitives. Depends on tracked property semantics being identical between backends, which is `PASS` in the spike for the primitive case but `UNVALIDATED` for `(hash)`/`(array)`-style reference-identity behavior. Risk of silent over-invalidation on reference comparisons, per domain review §2.3.                                                                                                                                                                                                                                                                                                                                                                    |
| `ember-fetch`            | 8.x               | pass         | `fetch` polyfill / wrapper + service. No VM touch. Should work unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ember-cli-app-version`  | 7.x               | pass         | Build-time version injection + a trivial helper. Zero VM touch beyond the helper, and helper-manager parity is `PASS` in the spike. High confidence pending validation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `ember-template-lint`    | 6.x               | pass         | Pure build-time static analyzer of template AST. Does not run in the browser, does not touch the runtime. Works regardless of backend. High confidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `ember-source`           | N/A (self)        | untested     | Included as a sanity check per the task brief: `ember-source` itself is the _subject_ of this RFC, not an addon. On the GXT backend it is replaced by `ember-source-gxt`. The 14 targeted modules pass at 2365/2365 on the session spike; the full suite is at ~96.4% vs classic's ~96.7%, so self-parity is `untested-at-full-suite`. Treated as `untested` to stay honest about what has actually been verified.                                                                                                                                                                                                                                                                                                                                |
| `@glimmer/component`     | 2.x               | classic-only | **Symbol-identity duplication risk.** Published independently from Ember; directly imports `@glimmer/manager` and `@glimmer/reference`. If an app installs `@glimmer/component@2.x` alongside `ember-source-gxt`, two copies of the reactive runtime co-exist and the symbol identity of `Tag`, `createTag`, `CURRENT_TAG`, `getCustomTagFor` forks across them — the exact failure mode that bit React's dual-renderer migration and Ember's Glimmer 1→2 migration (`/tmp/gxt-plan-review-bundling.md` §6-§8, quoted verbatim in RFC §6). Must be replaced with a `@glimmer/component-gxt` sibling or resolved via Glimmer-team-negotiated protocol-package extraction before preview. Marked `classic-only` for the existing published package. |
| `ember-truth-helpers`    | 4.x               | pass         | Small helper library (`eq`, `not`, `and`, `or`, `gt`, `lt`, etc.). Helper-manager parity is `PASS` in the spike. No VM touch beyond the helper interface. High confidence pending validation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Status counts

- **pass**: 6 (`ember-cli-mirage`, `ember-render-modifiers`,
  `ember-modifier`, `ember-fetch`, `ember-cli-app-version`,
  `ember-template-lint`, `ember-truth-helpers`) — actually 7
- **classic-only**: 4 (`ember-paper`, `@ember-data/debug`,
  `ember-cli-htmlbars`, `@glimmer/component`)
- **untested**: 9 (`ember-simple-auth`, `ember-power-select`,
  `ember-bootstrap`, `ember-intl`, `ember-data`, `ember-concurrency`,
  `ember-basic-dropdown`, `tracked-built-ins`, `ember-source` (self))

Corrected tally: **7 pass, 4 classic-only, 9 untested** (total 20).

## Important caveats

1. Every `pass` above is **inference, not verification**. None of
   these addons have been run through their own test suites against
   `ember-source-gxt`. Validation against the real addon is required
   before any entry is considered authoritative.
2. `ember-cli-htmlbars` being listed as `classic-only` is the single
   most load-bearing line in this matrix: without a GXT-compatible
   template compiler, **no app or addon can build against
   `ember-source-gxt` at all**. The Phase 2 build story in the RFC
   (§5) makes the required shim a non-optional deliverable.
3. `@glimmer/component` is a `classic-only` entry that needs to be
   resolved before preview ships. Options (protocol extraction
   vs sibling package) are in RFC §6.
4. The list prioritizes addons the domain review and ecosystem
   practice suggest are most likely to be installed. It does **not**
   attempt to cover every addon in the ecosystem. The addon
   compatibility contract in the RFC (§4) delegates ecosystem-wide
   tracking to self-declaration via `ember-addon.backends` in
   `package.json`, with the ecosystem catalogue surfacing the
   declarations.
5. Version numbers in the "Version (typical)" column are the current
   stable major line at the time of writing, not a tested version.
   When the matrix is updated, the tested version column should
   replace this with an exact tested range.

## Update protocol

This matrix is a living document during the preview phase. Each row
transitions through: `untested` → `in-progress` → `pass` or
`classic-only` or `partial` (with notes). Updates land as PRs against
this file with:

- Addon version exercised
- GXT backend commit tested against
- Test suite command run
- Pass/fail summary
- Any required addon-side or GXT-side fixes filed as linked issues

No entry may move to `pass` without a linked CI run that exercises the
addon's own test suite against `ember-source-gxt`.
