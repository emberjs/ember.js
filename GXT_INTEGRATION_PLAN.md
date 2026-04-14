# Ember.js dual-backend integration plan

## Status — 2026-04-14

All phases dispatched and completed. See `GXT_INTEGRATION_PLAN_REVIEW_SYNTHESIS.md`
for the review synthesis that restructured the phase ordering, and
`GXT_PHASE_SUMMARY.md` (new) for the detailed landing report.

| Phase | Commit | State |
|-------|--------|-------|
| 0 — Baseline capture | `b1b7637725` | ✅ 5,327/5,938 (89.7%) |
| 0.5 — Production runner | `df3ffc8d69` | ✅ smoke 333/333 |
| 0.7 — RFC + addon matrix | `a3af70295a` | ✅ draft |
| 0.9 — Rollup POC | `ec230044fe` | ✅ dual-build proven |
| 1 — File move → gxt-backend | `9f86bc2276` | ✅ |
| 1.5 — Classic buildability | `699622b451` | ✅ |
| 2 — Adapter seam + metal | `699622b451` | ✅ (no changes; Phase 1.5 covered) |
| 3 — Dual-build CI + UX | `10f62465ce` | ✅ |
| 4 — GxtRehydrationDelegate | `a2d839e248` | 🟡 opt-in only (see summary) |
| 5 — Release docs | (this commit) | ✅ |
| Upstream DOM-provider | (glimmer-next) | ✅ |

Both classic and GXT builds succeed.
Smoke: 333/333 across the 14 session-targeted modules.
Full baseline: 5,327/5,938 tests, categorized into 5 buckets.

---

Target: ship Ember.js with two interchangeable rendering backends —
**classic Glimmer VM** (current default) and **Glimmer-Next / GXT**
(this branch's compat work) — selectable at build time with no runtime
code-size penalty for consumers who pick one.

Status baseline (2026-04-13, branch `glimmer-next-fresh`): GXT compat
runs 2365/2365 tests across the 14 session-targeted Ember test modules
with zero regressions. Full Ember e2e suite is at 96.4% on
Ember-specific tests (versus 96.7% pre-session classic baseline —
effectively parity). The compat layer lives at
`packages/demo/compat/` and is exercised by Vite aliases that rewrite
`@glimmer/*`, `ember-template-compiler`, and `@lifeart/gxt` imports at
dev-server resolution time. The code that makes it work is production-
ready for the test suite but is packaged as a demo, not a first-class
backend.

## Guiding constraints

1. **Zero regression on the classic backend.** Anybody who runs the
   default build must get exactly the same bytes they get today. No
   surprise imports, no extra kilobytes, no branch dispatch in hot
   paths.
2. **Tree-shaken output.** Dead-code elimination must remove the
   non-selected backend entirely. Whichever backend the consumer picks,
   none of the other backend's modules should survive bundling.
3. **Stable public API.** Both backends must expose the same
   `@ember/*` package entry points with identical types and observable
   semantics. Consumers should not need to know which backend they are
   on.
4. **Test parity.** Every Ember test that runs against classic must
   also run against GXT in CI, with a pass-rate delta threshold that
   fails the PR if the GXT backend regresses.
5. **No vendored copies of GXT.** `@lifeart/gxt` stays as an external
   dependency. The compat layer is Ember's own code; GXT itself is
   consumed the same way any npm package would be.

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Public @ember/* API                      │
│  Component, tracked, set, get, computed, templateOnly, ...  │
└────────────────────────┬────────────────────────────────────┘
                         │
                  ┌──────┴──────┐
                  │             │
         ┌────────▼────────┐  ┌─▼────────────────┐
         │ classic adapter │  │  gxt adapter     │
         │  (current code) │  │  (compat layer)  │
         └────────┬────────┘  └─┬────────────────┘
                  │             │
         ┌────────▼────────┐  ┌─▼────────────────┐
         │ @glimmer/runtime│  │  @lifeart/gxt    │
         │ @glimmer/vm     │  │                  │
         │ ...             │  │                  │
         └─────────────────┘  └──────────────────┘
```

The split happens at the `@glimmer/*` / `ember-template-compiler`
boundary. Everything above that line is shared Ember code. Everything
below is backend-specific.

## Phase 0: Inventory & test coverage gate

**Goal**: prove the GXT backend is ready to be a build target before
changing any build infrastructure.

1. **Freeze the compat layer at its current commit** (`7348b8f3b6`
   scaffolding + `fc92c82874` source tracking). This is the reference
   implementation that the dual-build work must preserve.
2. **Run the full Ember e2e suite** against GXT, produce a
   failures-by-module report, and commit it as
   `test-results/gxt-baseline.json`. Use the `run-gxt-tests.mjs`
   runner that currently exists at the repo root.
3. **Categorize remaining failures** (~1350 Ember-specific per the
   last sweep) into:
   - **core-Ember pre-existing** (also fail on classic) — exclude
     from GXT tracking
   - **GXT-specific, fixable in compat** — track as follow-up work
   - **GXT-specific, architectural limitation** — mark skipped with
     a rationale comment
4. **Establish the pass-rate gate**: whatever GXT's pass rate is on
   the frozen baseline minus 0.5% becomes the CI floor. Any PR that
   drops below floors, fails.

Acceptance criteria: a JSON baseline that any future run can diff
against, and a CI step wired up that runs the full suite against
GXT and compares.

## Phase 1: Promote compat layer out of `packages/demo`

**Goal**: move the compat code to a first-class package and stop
treating it as a demo artifact.

1. **Create `packages/@ember/-internals/gxt-backend/`**. Move
   `packages/demo/compat/*.ts` / `*.gts` / `*.mjs` into it. Keep the
   directory structure intact so imports change mechanically.
2. **Rename** `packages/@ember/-internals/gxt-backend/compile.ts` →
   `template-compiler.ts`, `manager.ts` → `managers.ts` (or keep —
   whatever the rest of the tree uses). The point is to stop signaling
   "demo" in the filenames.
3. **Update `packages/demo`** to import from the new location. Demo
   becomes what it should always have been — a thin example app, not
   the home of production code.
4. **Declare exports** in `packages/@ember/-internals/gxt-backend/package.json`:
   ```json
   {
     "name": "@ember/-internals/gxt-backend",
     "private": true,
     "exports": {
       "./runtime": "./runtime.ts",
       "./template-compiler": "./template-compiler.ts",
       "./managers": "./managers.ts",
       "./reference": "./reference.ts",
       "./destroyable": "./destroyable.ts",
       "./validator": "./validator.ts",
       "./owner": "./owner.ts"
     }
   }
   ```
5. **Wire up the Vite aliases** (currently in the root `vite.config.mjs`
   under a `GXT_MODE=true` branch) to resolve through the new package
   paths instead of the demo paths. This is a pure path rewrite — no
   logic changes.
6. **Verify** by running the 14 targeted modules and the broader sweep.
   Must produce the same 2365/2365 and the same baseline delta from
   Phase 0.

Acceptance criteria: `packages/demo/` contains no production compat
code, `packages/@ember/-internals/gxt-backend/` is importable via
package exports, and the test matrix is unchanged.

## Phase 2: Introduce the adapter seam

**Goal**: create a single point where Ember decides which backend to
talk to, so that build-time selection becomes trivial.

1. **Define the adapter contract** in a new package
   `packages/@ember/-internals/render-backend/index.ts`. It re-exports
   the surface that the rest of Ember consumes from `@glimmer/*`:
   ```ts
   export type {
     Component as BackendComponent,
     ComponentManager,
     HelperManager,
     ModifierManager,
     TemplateFactory,
     RenderResult,
     // ... everything in packages/@ember/-internals/glimmer that
     // currently imports from @glimmer/runtime, @glimmer/manager,
     // @glimmer/reference, @glimmer/validator, @glimmer/destroyable,
     // @glimmer/owner, @glimmer/env
   } from './types';

   export { renderMain, renderComponent, runtime } from './impl';
   ```
   The `./impl` module is the only file that differs between backends.
2. **Provide two impls**:
   - `packages/@ember/-internals/render-backend/impl.classic.ts` —
     re-exports from `@glimmer/*`. Zero behavior change.
   - `packages/@ember/-internals/render-backend/impl.gxt.ts` —
     re-exports from `@ember/-internals/gxt-backend/*`.
3. **Add a build-time `EMBER_RENDER_BACKEND` flag** processed by a
   tiny rewriter plugin (Rollup, Vite, or a TS source transform) that
   replaces
   ```ts
   import { renderMain } from './impl';
   ```
   with either `./impl.classic` or `./impl.gxt` before bundling. The
   non-selected file is then tree-shaken.
4. **Migrate every import of `@glimmer/*` inside
   `packages/@ember/-internals/glimmer/**`** to go through the
   adapter seam. This is the bulk of the work but is a mechanical
   find-replace.
5. **Do NOT migrate `packages/@glimmer/*`** themselves. Leave the
   upstream VM packages untouched — they remain the classic backend.

Acceptance criteria: the classic build is byte-identical to the
pre-refactor build (verify with `diff` of rollup output); the GXT
build consumes no `@glimmer/*` code.

## Phase 3: Build matrix

**Goal**: produce two distributable builds from one source tree.

1. **Extend the existing Ember build config** (likely
   `ember-cli-build.js` / Broccoli / Vite, depending on which part you
   are building) to read `EMBER_RENDER_BACKEND=classic|gxt` from the
   environment. Default to `classic`.
2. **Emit two NPM package versions**:
   - `ember-source` — classic build (default). Same name, same
     version range, no behavior change for any existing consumer.
   - `ember-source/gxt` — subpath export pointing at the GXT-built
     entry. Consumers opt in via
     `import Ember from 'ember-source/gxt'` (or the equivalent
     package.json `exports` dance).
3. **CI matrix**: every PR runs the full test suite twice — once with
   `EMBER_RENDER_BACKEND=classic` and once with `EMBER_RENDER_BACKEND=gxt`.
   The GXT job uses the Phase 0 pass-rate gate.
4. **Bundle-size check**: add a size-regression check. Classic build
   size must not change from the main branch. GXT build size is
   tracked separately.
5. **Release workflow**: publish `ember-source` classic as the main
   package, and `ember-source-gxt` as a separate side-channel package
   for opt-in consumers. Over time (several minor versions) consider
   promoting GXT to the default and classic to `ember-source-classic`
   if the test parity and performance numbers justify it.

Acceptance criteria: `pnpm build` produces two bundles from one source,
both pass their respective test matrices in CI, and consumers can opt
into either via clearly documented package exports.

## Phase 4: Upstream work on GXT

**Goal**: stop carrying compat-layer workarounds for bugs that belong
upstream.

This session already upstreamed 7 GXT fixes:
- `IfCondition.destroyBranchSync` yield-only branches
- `SyncList` duplicate-key dedup + `relocateItem` defensive early-return
- `setupKeyForItem` occurrence-counter for duplicate references
- Nested `{{#each}}` destructor tree wiring via `getParentContext()`
- Block-component `inverse` slot emission for `{{#foo}}{{else}}{{/foo}}`
- `ScopeTracker` proper `enterScope`/`exitScope` for nested block-params
- `$_ucw` seeds `RENDERING_CONTEXT_PROPERTY` before `roots(this)`

Remaining upstream candidates (documented in `packages/demo/compat/manager.ts`
TODO comments):

1. **`destroyBranchSync` for `{{#each}}` item removal** — analogous to
   the `IfCondition` fix we landed, but for list items. Currently the
   compat layer has defensive `removeInstanceFromPools` calls that
   could go away.
2. **`cellFor` keying strategy** — classic components share a
   `ComponentClass` prototype. Our fix filters proto-keyed entries in
   `notifyIfWatchers` and `__gxtTriggerReRender`, but the right
   upstream fix is for `cellFor` to key by `(instance, key)` directly
   and never walk the prototype chain for reactive registration.
3. **Explicit `didUpdate` lifecycle hook in GXT** — the compat layer
   synthesizes this hook via `__gxtPostRenderHooks` and the NAM
   (nested-arg-mutation) detection. GXT could expose a proper
   `afterUpdate(instance, reason)` contract that Ember hooks into.
4. **Rehydration / SSR** — GXT has no rehydration path. This is a
   large piece of work (estimated weeks) and is the biggest remaining
   architectural gap. Until it lands, GXT builds are client-only. The
   dual-build plan mitigates this: consumers who need SSR use classic,
   consumers who need smaller-faster client-only bundles use GXT.

Each of these gets its own upstream PR against `@lifeart/gxt` with
tests mirrored from our compat-layer regression suite.

## Phase 5: Backwards-compat policy

**Goal**: document what classic→GXT consumers should expect.

1. **Semantics**: same. Public APIs behave identically. This plan does
   not ship anywhere until the test parity gate proves it.
2. **Performance**: GXT is a smaller runtime (no VM opcodes, closure-
   based evaluation) with potentially better initial render time and
   smaller bundle. No first-party benchmarks yet — add a perf matrix
   in Phase 3.
3. **Unsupported features on GXT** (call out explicitly in docs):
   - No SSR rehydration (Phase 4.4)
   - No Glimmer JIT integration tests (by design — GXT has no JIT)
   - Debug Glimmer tooling (inspector opcodes, VM traces) does not
     work because GXT has no VM
4. **Addon compatibility**: most Ember addons don't touch the VM
   directly, so they should work on both backends. Addons that import
   from `@glimmer/runtime` directly need to switch to the adapter
   seam or be marked classic-only.
5. **Migration path**: Ember 6.x ships classic as default, GXT as
   opt-in via `ember-source/gxt`. Ember 7.x reevaluates based on
   adoption and performance data.

## Milestones

| Phase | What ships | Who notices |
|-------|-----------|-------------|
| 0 | CI baseline + failure catalog | Nobody (infra only) |
| 1 | Compat layer promoted to `@ember/-internals/gxt-backend` | Nobody externally |
| 2 | Adapter seam committed, classic build unchanged | Nobody externally |
| 3 | Dual-build available in CI + optional `ember-source-gxt` dist | Early adopters opt in |
| 4 | Upstream GXT PRs land, compat workarounds removed | GXT users see fewer edge cases |
| 5 | Documented support matrix, addon compat guide | Community |

## Risks

1. **Hidden `@glimmer/*` imports**. Ember's own code has scattered
   imports from deep Glimmer internals (e.g. `@glimmer/interfaces`
   types, `@glimmer/validator` for custom trackers). Phase 2's
   mechanical find-replace will need an audit step to catch every
   one. Mitigation: a CI lint rule that rejects any
   `import '@glimmer/*'` outside the adapter seam.
2. **Addon ecosystem fragmentation**. Opt-in backend split could
   confuse addon authors. Mitigation: publish a migration guide
   with a compatibility checker before shipping Phase 3 broadly.
3. **GXT upstream velocity**. We depend on `@lifeart/gxt` upstream
   accepting our fixes. Mitigation: either pin a forked version in
   `packages/@ember/-internals/gxt-backend/package.json` or make the
   fixes configurable in the compat layer with a TODO to remove
   after upstream catches up.
4. **Rehydration gap**. SSR consumers cannot use GXT at all until
   Phase 4.4. Mitigation: explicit classic-only callout in docs;
   reassess after Phase 4.
5. **Bundle-size surprise**. Dual builds double the release artifact
   surface. Mitigation: ship as separate packages, not as a single
   fat bundle with runtime branching.

## Open questions

1. **Single-package exports or two packages?** `ember-source` with a
   `./gxt` export vs. separate `ember-source` + `ember-source-gxt`
   packages. Former is simpler for consumers; latter is safer for
   release cadence. Recommendation: start with separate packages,
   merge later if operations get clunky.
2. **Should the GXT backend be promoted to default in 7.x?** Depends
   entirely on Phase 3's perf + test-parity numbers. Leave the
   decision to the core team after seeing data.
3. **How do we handle `@glimmer/component` consumers?** Their import
   paths live outside Ember source. Either ship a shim in the GXT
   backend or document that they need a classic-only release. Needs a
   concrete proof-of-concept in Phase 2.

## Work-back schedule

- Phase 0: 1 week (CI infra + baseline capture)
- Phase 1: 1 week (mechanical move + path updates)
- Phase 2: 2-3 weeks (adapter seam + import audit + build plumbing)
- Phase 3: 2 weeks (dual-build CI + release pipeline)
- Phase 4: ongoing (each upstream PR is its own cycle; the
  rehydration piece alone is multi-week)
- Phase 5: 1 week (docs + migration guide)

Total before GXT is available as opt-in: ~6-8 weeks.
Total before GXT is a serious default candidate: 3-6 months.

---

## Appendix A: Files produced by this session that the plan depends on

All committed on branch `glimmer-next-fresh`:

- `packages/demo/compat/compile.ts` — runtime template compiler + `{{#if}}` / `{{#each}}` / `$_eachSync` / `patchedIf` / `_wrapGxtRebuildViewTree` / `transformOutletMustaches` / `transformTripleMustaches`
- `packages/demo/compat/manager.ts` — `$_MANAGERS`, pool, `createComponentInstance`, `__gxtSyncAllWrappers`, `__gxtRebuildViewTreeFromDom`, NAM detection, `__gxtPostRenderHooks`, `registerInViewRegistry`
- `packages/demo/compat/ember-gxt-wrappers.ts` — `$_maybeHelper`/`$_tag` wrappers, `EmberHtmlRaw`, positional param mapping
- `packages/demo/compat/reference.ts` — `@glimmer/reference` shim
- `packages/demo/compat/destroyable.ts` — `@glimmer/destroyable` shim
- `packages/demo/compat/validator.ts` — `@glimmer/validator` shim
- `packages/demo/compat/helper-manager.ts` — custom helper manager
- `packages/demo/compat/outlet.gts` — `<ember-outlet>` custom element
- `packages/demo/compat/ember-routing.ts` — routing compatibility exports
- `packages/demo/compat/gxt-template-compiler-plugin.mjs` — build-time Vite plugin
- `packages/@ember/-internals/glimmer/lib/templates/outlet.ts` — nestedContext tracked-property init (classic-side change)
- `packages/@ember/-internals/glimmer/lib/templates/root.ts` — renderContext = component (classic-side change)
- `packages/@ember/-internals/glimmer/lib/components/abstract-input.ts` — `ForkedValue.__syncFromUpstream` hook (classic-side change)

## Appendix B: Upstream glimmer-next changes this session depends on

Not in this repo — in `/Users/lifeart/Repos/glimmer-next/`, shipped
via `@lifeart/gxt` version bumps:

- `src/core/control-flow/if.ts` — `IfCondition.destroyBranchSync` + `removeOrphanBranchDom`
- `src/core/control-flow/list.ts` — `relocateItem` defensive early-return, `updateItems` move-phase dedupe, `setupKeyForItem` occurrence-counter, `BasicListComponent` tree-parent fix via `getParentContext()`
- `src/core/dom.ts` — `$_ucw` seeds `RENDERING_CONTEXT_PROPERTY` before `roots(this)`
- `plugins/compiler/visitors/block.ts` — `convertComponentBlock` inverse-slot emission
- `plugins/compiler/tracking/scope-tracker.ts` — proper `enterScope`/`exitScope` stack usage
- `plugins/compiler/visitors/element.ts` / `serializers/control.ts` / `serializers/element.ts` — scope-tracker callers

When Ember pins `@lifeart/gxt`, it must pin a version that includes
all of these. Either vendor-fork GXT in `packages/@ember/-internals/
gxt-backend/vendor/` or rely on upstream release cadence.
