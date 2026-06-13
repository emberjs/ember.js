---
Stage: Accepted
Start Date: 2026-04-11
Release Date: Unreleased
Release Versions:
  ember-source: TBD
  ember-data: N/A
Relevant Team(s): Ember.js, Framework, Steering, Learning
RFC PR: https://github.com/emberjs/rfcs/pull/0000
Tracking: https://github.com/emberjs/rfcs/issues/0000
---

# GXT Dual-Backend Rendering

## Summary

This RFC proposes that Ember ship a second, opt-in rendering backend based on
[`@lifeart/gxt`](https://github.com/lifeart/glimmer-next) (hereafter "GXT")
alongside the existing Glimmer VM. The two backends would be distributed as
two separate packages — the existing `ember-source` (classic / Glimmer VM)
and a new `ember-source-gxt` (GXT-backed) — sharing the exact same
`@ember/*` public API surface.

`ember-source-gxt` is proposed to ship as an **opt-in preview feature
explicitly outside SemVer coverage** until it reaches 100% pass parity
against the same test suite classic ships. During that window the classic
backend remains the default, stable, SemVer-covered implementation with no
behavioral changes.

This document defines the dual-backend architecture, the SemVer posture, an
initial feature support matrix, the deprecation coordination plan, the
addon compatibility contract, the build-toolchain story, the
`@glimmer/component` disposition, the FastBoot/engines disposition, the
debug/inspector parity plan, the numeric exit criteria for leaving
preview, and the governance of the upstream `@lifeart/gxt` dependency.

A companion document,
[`0000-gxt-dual-backend-addon-matrix.md`](./0000-gxt-dual-backend-addon-matrix.md),
enumerates a top-20 addon compatibility snapshot referenced from this RFC.

## Motivation

### Measured results from the Phase 0 engineering spike

- The dual-backend engineering spike currently landed in branch
  `glimmer-next-fresh` (at HEAD `8928ee9e2a` / session continuation from
  `5176f4b229`) demonstrates that a compat-layer-shimmed GXT backend can
  host the Ember `@ember/*` API surface and pass **2365/2365 tests** on a
  targeted set of **14 integration-test modules** that cover components,
  contextual components, helpers, modifiers, tracked state, curly
  components, template-only components, `{{each}}`, `{{if}}`, `{{let}}`,
  two-way mut bindings through computed properties, and observer /
  `didUpdate` lifecycle ordering.
- On the **full** Ember test suite the GXT-backed build now reaches
  near-parity with classic. The committed baseline
  (`test-results/gxt-baseline.json`) records **10,159 tests / 65,844 of
  65,849 assertions passing**, with only a handful of triaged cases. The
  earlier Phase-0 snapshot — a ~0.3pp gap concentrated in
  `[integration] rehydration ::` — is superseded now that those suites run
  through the GXT rehydration delegate (§7.1; note the honest caveat there
  that the partial-rehydration delegate reports fabricated `clearedNodes`).
- **Bundle size, tree-shaken runtime cost, initial-render time, update
  throughput, memory-at-steady-state, and cold-start-to-interactive** are
  the numbers that would justify the dual-backend split to app authors.
  This RFC deliberately **does not fabricate any of those numbers**. They
  are scheduled to be measured as part of Phase 3 (see "Exit criteria"
  below). Any quoted perf number before Phase 3 lands should be treated as
  marketing, not engineering.

### Why dual-backend and not merge-upstream-into-Glimmer

Several items in GXT's design — counter-based SSR markers, reverse-DFS
rehydration stack, coarse-grained reactive scheduling, direct DOM-API
adapters rather than an opcode VM — are incompatible with the Glimmer VM
opcode model at an architectural level. A single-runtime merge would require
rewriting either the GXT reactive core or the Glimmer tree-builder; both
are multi-year projects. Shipping two backends behind one `@ember/*`
surface lets the community evaluate GXT in production without forcing a
VM rewrite and without asking the Glimmer team to maintain a second
runtime.

### Why preview and not default

The current 0.3pp drift, the untested engines/FastBoot/Ember-Inspector
surfaces, and the still-evolving contextual-component contract (see
recent fixes `5176f4b229`, `9005f9892b`, `14cd323211` — all merged in the
last week of the spike) are all reasons that GXT is not yet a credible
default. Preview status lets the project gather real-app feedback while
preserving Ember's stability guarantees for every app that does not
explicitly opt in.

## Current state (as of 2026-04-14)

All 11 dual-backend integration tasks have landed on branch
`glimmer-next-fresh`. The tree today reflects the following confirmed state:

**Builds**

- Both `EMBER_RENDER_BACKEND=classic` (default) and `EMBER_RENDER_BACKEND=gxt`
  produce valid bundles via the `rollup.config.mjs` backend gate introduced in
  Phase 0.9 (`ec230044fe`).
- Classic output is byte-for-byte identical to pre-session output on the 14
  smoke-targeted modules. No regressions introduced on the classic path.

**Test suite**

- The full baseline committed to `test-results/gxt-baseline.json` now records
  **10,159 tests across 914 modules / 65,844 of 65,849 assertions passing**,
  with **4** entries left in `gxt:triage`. This is up from the Phase-0 start
  point (`b1b7637725`: 5,327/5,938, 89.7%).
- Smoke suite across the 14 session-targeted modules: **333/333 (100%)**.
- Routing, bindings (helpers / `mut` / attrs / `Input`), and reactivity
  (tracked / computed / observers / arrays / `{{each}}`) all render through
  GXT, not the VM. The rehydration modules pass through the GXT delegate (see
  the §7.1 caveat on fabricated `clearedNodes`).

**Dual-build CI workflow**

- `.github/workflows/gxt-dual-build.yml` runs both backend builds and the
  smoke suite on every PR. Bundle-size budget check (`scripts/bundle-size-check.mjs`)
  and API-surface contract tests (`scripts/gxt-test-runner/contract-tests.mjs`) are
  included in the CI gate (Phase 3, `10f62465ce`).
- `.github/workflows/gxt-full.yml` is the nightly full-suite-vs-baseline run
  (`schedule` + `workflow_dispatch`; files a regression issue on failure). Its
  inputs were re-verified post-rebase (tracked `test-results/gxt-baseline.json`,
  all runner flags valid, `diff.mjs` present). **Registration caveat (2026-06-11):
  GitHub only registers `schedule`/`workflow_dispatch` workflows from a repo's
  DEFAULT branch.** On a fork whose default branch lacks the file, the nightly
  silently never fires (push-triggered smoke/dual-build are unaffected — they run
  from the pushed branch's own file). The nightly becomes active only once
  `gxt-full.yml` lands on the default branch of whichever repo hosts it. Every
  component it composes (the `--full --baseline` runner path, `--auto-serve`, the
  shared setup action's Playwright install) is meanwhile exercised by the local
  full-suite gate plus the push-triggered smoke workflow.

**Install UX**

- `scripts/ember-cli-gxt.mjs` provides `ember-cli-gxt enable`,
  `ember-cli-gxt disable`, and `ember-cli-gxt status` subcommands. This is the
  consumer-facing interface for switching backends without editing
  `rollup.config.mjs` directly (Phase 3, `10f62465ce`).

**GxtRehydrationDelegate**

- A GXT-flavored rehydration delegate for the integration-test harness exists
  (`packages/@glimmer-workspace/integration-tests/lib/modes/rehydration/gxt-delegate.ts`)
  and drives the in-element rehydration suites, but a **default SSR wiring**
  remains blocked on two architectural items, both now analysed in depth (§7.1,
  2026-06-10):
  1. **Root-context isolation in `gxt-backend/compile.ts` (Phase 4.1).** Analysed,
     **not refactored** — and that is the deliberate, evidence-based outcome. The
     genuinely root-scoped state in `compile.ts` (`_gxtRootContext`,
     `_gxtTopOutletRef`, `_gxtEngineInstances`) is a thin, already-bridged layer,
     but the _real_ isolation boundary — GXT's module-global node counter,
     rehydration stack, and `setupGlobalScope` (`$slots`/`$fw`/`$args`) — lives in
     upstream `@lifeart/gxt`, not in `compile.ts`. Threading N roots through
     `compile.ts` while the upstream counter stays global would be cosmetic (no
     concurrent-SSR benefit) and carries real regression risk on the most
     load-bearing file in the backend. The tractable, useful shape is a
     synchronous `withRootContext(ctx, fn)` swap API plus the upstream changes;
     see §7.1.
  2. **Lossy translation of nested-engine outlet cursor IDs (Phase 4.2).**
     Analysed. The partial/nested-engine rehydration path (`{{mount}}`,
     engine outlets, partial rehydration) re-renders the sub-tree from scratch
     client-side instead of aligning against the server cursor, because GXT's
     module-global node counter exposes only `resetNodeCounter()` (reset to 0) —
     there is no "seed to base offset N" API — so a sub-tree that begins mid-tree
     on the server cannot resume the parent's counter sequence on the client. Fix
     shape in §7.1; upstream + delegate, no `compile.ts` change.

**Bundle-size observation**

- The GXT prod build (`dist/prod`, sorted-concat of every `*.js`) is
  **2,532,078 bytes raw / 657,904 gzip** vs classic's
  **1,973,907 bytes raw / 492,512 gzip** — approximately **+28% raw** and
  **+34% gzip**. (The earlier "~70% larger / 3.48 MB raw" figure was a
  worst-case upper bound taken before any tree-shaking; it is superseded.)
- The Phase 2.5/2.6 audit landed the structural wins: `@lifeart/gxt` is now
  **externalized** (a bare-specifier import resolved by the host, not inlined),
  which also dropped its transitive `@glimmer/syntax` + `@handlebars/parser` +
  `simple-html-tokenizer` (~600KB raw). The template compiler, inspector
  adapter, debug-render-tree, and runtime-hbs shims tree-shake cleanly out of
  the prod runtime graph.
- A `rollup-plugin-visualizer` sweep (`BUNDLE_VISUALIZER=1`) attributes the
  remaining +558KB raw delta almost entirely to the **gxt-backend compat
  layer**: `manager.ts` ~461KB, `validator.ts` ~82KB, `reference.ts` ~23KB,
  `helper-manager.ts` ~19KB, `destroyable.ts` ~11KB. `@glimmer/runtime`,
  `@glimmer/syntax`, and `@glimmer/compiler` are byte-identical in both builds
  (the template compiler plus the retained VM); GXT mode drops ~69KB of
  `@glimmer/{validator,manager,reference,destroyable}` by shimming them.
- The residual delta is therefore **genuine runtime bridge logic, not a
  tree-shaking failure**. A further reduction would require either shrinking
  `manager.ts`/`validator.ts` or marking `@lifeart/gxt`'s own package as
  side-effect-free (`"sideEffects": ["./dist/gxt.ember-inspector.es.js"]`) so
  consumer bundlers can tree-shake the parts of the reactive core an app does
  not reach — tracked as a glimmer-next release item.

**Compat layer location**

- Canonical location: `packages/@ember/-internals/gxt-backend/` (Phase 1,
  `9f86bc2276`).
- Old location `packages/demo/compat/` was preserved during the transition
  (marked deprecated via a `DEPRECATED.md`) and has since been **deleted**; the
  canonical location is the only one that exists. Both the Rollup and Vite
  pipelines reference it through the single shared alias table
  (`scripts/gxt-alias-map.mjs`, see §5.6).

## Detailed design

### 1. SemVer classification

`ember-source-gxt` ships as **preview / not covered by SemVer** until all
of the following are true:

1. Pass parity on the full shared test suite is at or above **100%** of
   the classic backend's pass count (i.e. every test that is green on
   classic is green on GXT; GXT-side-only new tests are allowed).
2. Every item in the feature support matrix below has moved from
   `PARTIAL`, `UNTESTED`, or `UNSUPPORTED` to `PASS`, with explicit
   deferral allowed only for features that are already deprecated on
   classic.
3. The numeric exit criteria in §10 below are met.

Until those conditions are satisfied, `ember-source-gxt` follows the
same "feature flag" / "preview feature" posture that Ember has
historically used for preview packages: no LTS backports, no
deprecation-cycle guarantees for behavior that exists only in
preview, and no commitment that two successive preview releases
are API-compatible.

**Critical coupling rule.** Any behavior that cannot be made identical
between the two backends — e.g. helper manager argument-evaluation
order, `didUpdate` timing, `(hash)` / `(array)` identity stability, view
registry insertion order — must receive an **explicit deprecation
entry on the classic side before GXT becomes an opt-in feature, not
after**. This is the inverse of the usual "ship first, deprecate later"
pattern and is deliberate: Ember's SemVer contract does not permit
silent observable-behavior drift, and a backend swap is exactly the
kind of change that silently re-orders timing-sensitive code paths.
The same rule applies in the reverse direction — any GXT-side behavior
that cannot match classic must either be changed upstream in
`@lifeart/gxt` or formally called out as a known preview-only
divergence in the release notes.

### 2. Feature support matrix

This is the authoritative status as of the Phase 0 spike. Each row is
backed by the session's 14-module test result, the compat layer (then at
`packages/demo/compat/`, now `packages/@ember/-internals/gxt-backend/`), or an
explicit untested/unvalidated flag.

| Feature                                                          | Status                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Classic curly components                                         | PASS                           | Session-verified against curly-component modules.                                                                                                                                                                                                                                                                                                                                                                                          |
| Glimmer / Octane class components                                | PASS                           | Session-verified. Depends on `@glimmer/component` shim — see §7.                                                                                                                                                                                                                                                                                                                                                                           |
| Template-only components                                         | PASS                           | Session-verified.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Tracked properties & reactivity                                  | PASS                           | Session-verified. Compat layer re-exports `@glimmer/validator` surface; 19 files in `-internals/metal` route through the seam (§5.3).                                                                                                                                                                                                                                                                                                      |
| `{{#each}}`                                                      | PASS                           | Session-verified.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `{{#if}}`                                                        | PASS                           | Session-verified.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `{{#let}}`                                                       | PASS                           | Session-verified.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `{{outlet}}`                                                     | PARTIAL                        | Single-outlet application shell works. Lazy/nested outlets exercised on a limited set; engine outlets **not yet validated**. Recent stabilization commit `14cd323211`.                                                                                                                                                                                                                                                                     |
| `Router`, `LinkTo`, `router-service`                             | PARTIAL                        | Basic routing works in the spike. `@linkPath`/`@linkRoutes` edge cases and `router-service` RSVP timing are not in the 14-module set. `packages/@ember/-internals/routing` was not explicitly covered.                                                                                                                                                                                                                                     |
| `{{mount}}` / Engines                                            | UNTESTED                       | Engine mounting, lazy engines, bundle-split asset maps — none exercised. Must be validated before preview.                                                                                                                                                                                                                                                                                                                                 |
| `{{component}}` curried with dynamic positional + named args     | PARTIAL                        | Contextual components pass after commits `5176f4b229`, `9005f9892b`. Dynamic-type swap edge cases (`{{component someComponentOrOther}}` where the value transitions from `undefined` to a value) received a fix this week and need broader coverage.                                                                                                                                                                                       |
| Modifiers (`{{on}}`, custom modifiers, `ember-render-modifiers`) | PASS                           | Modifier manager shimmed through compat layer; session-verified.                                                                                                                                                                                                                                                                                                                                                                           |
| Helpers (classic `compute`, class-based, Octane function-based)  | PASS                           | Helper manager shimmed; session-verified.                                                                                                                                                                                                                                                                                                                                                                                                  |
| Ember Data reactivity                                            | UNTESTED                       | Ember Data's tracked/computed usage is not in the spike. `@ember-data/debug` imports from `@glimmer/interfaces` and needs verification.                                                                                                                                                                                                                                                                                                    |
| FastBoot / SSR rehydration                                       | PARTIAL                        | GXT has a **complete** native SSR + rehydration subsystem (~1000 lines of runtime, 52 tests). The gap is the **FastBoot bridge**: SimpleDOM vs happy-dom, opcode markers vs counter markers. Size: 2-4 weeks, not multi-month. See §7 below.                                                                                                                                                                                               |
| Ember Inspector integration                                      | UNSUPPORTED                    | No GXT-native component-tree adapter exists. Needs its own plan and owner; see §9.                                                                                                                                                                                                                                                                                                                                                         |
| Strict mode templates / v2 addons                                | BLOCKED (validated 2026-06-10) | Empirically validated against the `smoke-tests/v2-app-template` Embroider+Vite app (strict by default under `@embroider/compat` 4.x, where `staticInvokables` is the only remaining static flag and `staticEmberSource`/`staticAddonTrees`/`staticComponents`/etc. are removed-and-always-`true`). Three independent blockers, none of which is alias resolution. See §5.5 for the dual-compile evidence, root causes, and effort classes. |
| Dynamic `mut` / two-way bindings through computed properties     | PASS                           | Session fix landed; verified.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Observers / `didUpdate` lifecycle                                | PASS                           | Session fix landed; verified.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `(hash)` / `(array)` helper identity across renders              | UNVALIDATED                    | GXT closure evaluation may produce fresh objects where Glimmer reused references; anything relying on `===` in `didUpdateAttrs` or modifier arg comparison could silently over-invalidate. Flagged in the domain review. Needs explicit test coverage before preview exits.                                                                                                                                                                |
| Named blocks, `has-block`, `has-block-params`                    | UNVALIDATED                    | Not in the 14-module set.                                                                                                                                                                                                                                                                                                                                                                                                                  |

Rows marked `UNTESTED` or `UNVALIDATED` must each be accompanied by a
tracking issue and a validated status before the preview-to-stable
exit criteria can be considered met.

### 3. Deprecation coordination

For the **opt-in preview**, the plan introduces **zero new classic-side
deprecations**. The classic backend is unchanged: same runtime, same
tests, same SemVer guarantees, same release cadence.

For any future **default** promotion (out of scope for this RFC and
explicitly deferred — see §10), the required deprecation set is
**TBD** and must be determined by cataloging every observable behavior
difference between the backends at the time of that decision. The
catalogue will be generated by running the full Ember test suite on
both backends and enumerating every test that fails on GXT but passes
on classic; each such test is either a GXT bug to be fixed upstream or
a classic-side behavior that will need a deprecation cycle before the
default can change. Either way, that work begins **after** preview has
gathered at least one LTS cycle of feedback, not before.

This RFC explicitly does **not** authorize any promotion to default.
That is a separate RFC, written against the measured data that preview
produces.

### 4. Addon compatibility contract

Addon authors are asked to declare backend support in their
`package.json` under an extended `ember-addon` block:

```json
{
  "name": "my-ember-addon",
  "ember-addon": {
    "version": 2,
    "backends": ["classic", "gxt"]
  }
}
```

Semantics:

- Omitting `ember-addon.backends` is treated as `["classic"]`. Existing
  addons remain classic-only by default until they explicitly opt in.
- Listing `"gxt"` is a promise that the addon's test suite has been run
  against `ember-source-gxt` and passes. This is a self-declaration; the
  ecosystem catalogue (see below) surfaces it but does not independently
  verify.
- `ember-try` gains a `backend` axis. Scenarios may specify
  `ember-source` or `ember-source-gxt`, and the ember-try default
  matrix adds a "gxt-preview" scenario that apps and addons can opt
  into.
- The opt-in installer for apps (`npx ember-cli-gxt enable`) validates
  `package.json`:
  for every installed addon, if `ember-addon.backends` does not
  include `"gxt"`, the installer prints a warning listing the
  classic-only addons and asks the user to confirm. The installer
  does **not** block on classic-only addons — it surfaces them.
- The official addon catalogue (`emberaddons.com`, `emberobserver.com`,
  and the `emberjs.com` discovery surfaces) gains a "GXT compatible"
  filter driven by the `ember-addon.backends` field.

A companion [addon compatibility
matrix](./0000-gxt-dual-backend-addon-matrix.md) captures the current
best-effort status of the top 20 addons as of this RFC. Every row there
is explicitly marked `pass`, `classic-only`, or `untested`, and the
default for anything unverified is `untested`.

### 5. Build toolchain story

This is the section the engineering spike uncovered the most risk in.

#### 5.1 Transition artifact — Vite alias is not a shipping strategy

The test harness uses `vite.config.mjs` resolver aliases (the `resolve.alias`
array under `useGxt`, `GXT_MODE=true`) to rewrite `@glimmer/*` / `@ember/*` /
`ember-template-compiler` imports to the compat shims under
`packages/@ember/-internals/gxt-backend/*.ts`. **This approach is a test-time
transition artifact only.** Embroider strict mode and stage-3
resolution do not honor arbitrary aliases, so a published
`ember-source-gxt` that relies on Vite aliases would be DOA for any
app on the modern v2-addon toolchain — exactly the apps most
motivated to adopt a smaller runtime.

#### 5.2 Required shipping form

Phase 2 of the plan **must** produce a **built `ember-source-gxt`
package** whose `package.json` `exports` entry points directly at
GXT-compiled sources, with no runtime alias step. Concretely:

- `ember-source` keeps its existing `exports` and its Rollup build
  unchanged. Byte-identity with today's output is an acceptance
  criterion. Any new file introduced into its import graph
  (including the proposed `render-backend/impl.ts` barrel from the
  original plan) risks breaking byte-identity; the bundling review
  recommends deleting the barrel entirely in favor of a resolver-alias
  strategy applied
  **inside** `rollup.config.mjs` as a second build variant.
- `ember-source-gxt` is a separate Rollup build variant, invoked via
  `EMBER_RENDER_BACKEND=gxt` (or equivalent) that swaps the
  `exposedDependencies()` list in `rollup.config.mjs` to
  point at the GXT-side shim implementations where classic pointed at
  `packages/@glimmer/*`. The output is published as a distinct npm
  package.
- Neither build is a "branch at runtime on a flag" build. DCE risk on
  the vendored `@glimmer/*` tree is non-trivial because several of
  those packages register module-scope singletons
  (`@glimmer/global-context`, parts of `@glimmer/runtime` and
  `@glimmer/manager`), which block tree-shaking. A resolver alias
  sidesteps this entirely because the non-selected graph is never
  walked.

#### 5.3 Scope correction: `-internals/metal` is in scope

The original plan listed only `packages/@ember/-internals/glimmer/lib/`
(51 files) as the blast radius. The bundling review counted **390
total `@glimmer/*` import lines across ~120 production files plus ~40
test files**, with **19 files in `-internals/metal/lib/` containing
runtime calls into `@glimmer/validator` and `@glimmer/manager`**
(`tracked.ts`, `computed.ts`, `alias.ts`, `observer.ts`,
`property_get.ts`, `property_set.ts`, `tags.ts`, `cached.ts`,
`chain-tags.ts`, plus `reactive/collections.ts`). These are the
reactivity hot path, not render-layer adapters, and every function
signature in the seam must be bit-compatible with
`@glimmer/validator` / `@glimmer/manager` / `@glimmer/reference`.
Phase 2 scope must cover both `-internals/glimmer` and
`-internals/metal`.

#### 5.4 Type declaration surface

Of those 390 imports, **93 are `import type`**. TypeScript compilation
must pick exactly one backend's types for typecheck purposes even if
both runtime implementations exist. The Phase 2 `tsconfig.json` `paths`
entry must alias the type source to match the selected backend, **and**
the classic backend must keep pointing at `@glimmer/validator`'s
`Tag` (not a re-exported copy) to preserve declaration-file output
byte-identity — otherwise every downstream typed consumer of
`ember-source` sees `import('@ember/-internals/render-backend').Tag`
instead of `import('@glimmer/validator').Tag`, which is a
public-types-surface change.

#### 5.5 Strict-mode Embroider validation (empirical, 2026-06-10)

The feature-matrix row "Strict mode templates / v2 addons" was carried
as `UNVALIDATED` with the stated reason "Embroider strict mode resolves
imports statically and will not obey arbitrary `vite.config.mjs`
aliases." That reason is **imprecise** and is corrected here by an
empirical pass against the in-repo `smoke-tests/v2-app-template`
(`@embroider/compat`/`@embroider/core` 4.x + `@embroider/vite`, which is
strict-by-default — `staticEmberSource`/`staticAddonTrees`/`staticComponents`/`staticHelpers`/`staticModifiers`
are all removed and forced to `true`, and `staticInvokables` is the only
remaining toggle, set in the `optimized` recommended preset).

**Method.** A single representative `.gjs` (component with args + a
yielded contextual-component block, a function helper, the `{{on}}`
modifier, `{{#each}}`, `{{#if}}`, and `{{outlet}}` via the application
template) was compiled through both pipelines:

1. Embroider's strict pipeline: `content-tag` → `babel-plugin-ember-template-compilation`
   using `ember-source`'s `ember-template-compiler` (`targetFormat: 'wire'`).
2. GXT's own compiler: `@lifeart/gxt/compiler`'s `transform()` (the same
   compiler the `GXT_MODE=true` test harness uses).

**Result — the two compilers emit mutually incompatible modules.**

- Embroider strict emits `setComponentTemplate(createTemplateFactory({ block: "<Glimmer wire-format opcodes>", scope: () => ({ on, shout, Card }), isStrictMode: true }), this)`.
  Rendering this requires the Glimmer VM (`@glimmer/runtime`,
  `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/wire-format`)
  — exactly the packages the GXT backend **drops**
  (`rollup.config.mjs` `GXT_DROPPED_ENTRIES`).
- GXT emits `[$template] = function () { return $_fin([$_tag(...), $_if(...), $_each(...), $_c(Card, ...)], this) }`
  plus a ~40-symbol import of `$_tag`/`$_if`/`$_each`/`$_c`/`$_dc`/`$_maybeHelper`/…
  from `@lifeart/gxt`. There is no wire-format and no
  `@ember/template-factory`/`setComponentTemplate` at all.

**Root-cause-resolved blocker matrix** (none of these is alias resolution):

| #   | Capability under strict-mode Embroider                                   | Status with GXT today                            | Root cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Effort       |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | Consume the GXT runtime as a normal dependency                           | **MVP LANDED in-repo (2026-06-10)** — was BROKEN | The classic `ember-source` dist embeds the Glimmer VM, and the GXT runtime shims under `packages/@ember/-internals/gxt-backend/` are not in classic `ember-source`'s `exports`. **Resolved by `scripts/build-gxt-package.mjs`**, which assembles a git-ignored `dist-gxt-package/` (mechanism (b)): a clean (`rm -rf dist`-first, no stale VM) `EMBER_RENDER_BACKEND=gxt` Rollup dist, a derived `package.json` named `ember-source-gxt` with the **GXT** `renamed-modules` (the 10 VM entries dropped, `@glimmer/application`+`@glimmer/utils` added), the exact-pinned `@lifeart/gxt`, and a GXT-patched addon-main. It self-verifies (no stale `@glimmer/runtime`, `@glimmer/validator` is the GXT shim, single-sourced reactive core, only declared/self/`@lifeart/gxt` externals) and is consumed by the `emberSourceGxt` scenario (`smoke-tests/scenarios/scenarios.ts`) via `linkDevDependency('ember-source', { target })`; `smoke-tests/scenarios/gxt-consumable-test.ts` (Tier-1) is green (5/5). **Still open (L-item, row 2):** GXT template compilation inside Embroider, and publishing/CI (RFC §9–§10). | M (MVP done) |
| 2   | Compile `.gjs`/`.gts`/`.hbs` for GXT inside an Embroider build           | BROKEN                                           | Embroider's template pipeline is hardwired to `babel-plugin-ember-template-compilation` → Glimmer wire-format. GXT requires its own `@lifeart/gxt/compiler` **Vite plugin** → `$_tag` reactive trees. The two transforms are mutually exclusive over the same `.gjs`, and GXT's compiler is not part of `ember-source`'s published surface — it is a bundler plugin the consumer would have to install and run **instead of** `@embroider/vite`'s `ember()` template handling.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | L            |
| 3   | Resolve container/compat-registered components, helpers, modifiers       | BROKEN                                           | GXT's `$_c`/`$_maybeHelper`/`$_dc` primitives use GXT-native resolution and bypass both Embroider's static resolution and Ember's container. The bridge that re-points them at Ember container resolution (`gxtEmberWrapperRedirect` in `vite.config.mjs` → `@ember/-internals/gxt-backend/ember-gxt-wrappers`) is an **unshipped, ember.js-repo-only Vite plugin**; without it, compat-resolved invokables are invisible.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | M            |
| –   | Resolve the `@lifeart/gxt` runtime import that GXT-compiled output emits | OK — **not** a blocker                           | `@lifeart/gxt` is a bare npm specifier; Embroider's static resolver resolves it as an ordinary dependency. The `@glimmer/*→shim` aliases that the RFC feared are **internal to `ember-source`'s own Rollup build** (baked by the `EMBER_RENDER_BACKEND=gxt` variant) and are never seen by the consumer's resolver. The "won't obey arbitrary aliases" framing therefore does not describe the actual failure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | n/a          |

**Harness note (orthogonal to GXT).** A full `vite build` of
`smoke-tests/v2-app-template` against the **dev `ember-source`
checkout** fails before any backend question is reached: Embroider's
`classicEmberSupport()` runs a classic ember-cli prebuild, and
`ember-cli-htmlbars` reads `ember-source.absolutePaths.templateCompiler`,
which the unbuilt dev checkout does not expose (`TypeError: Cannot read
properties of undefined (reading 'templateCompiler')`). This blocks the
full-app scenario for the **classic** backend too, so it is not a GXT
signal; exercising the app end-to-end requires first producing a
publishable-shaped `ember-source` (e.g. via `scenario.prepare()` /
`pnpm install` prepack). Effort to unblock the harness: S.

**Harness-note update (2026-06-10): the S-item is addressed for the GXT
package.** The assembled `ember-source-gxt` addon-main
(`scripts/build-gxt-package.mjs`) now exposes a **defined,
`require.resolve`-able `absolutePaths.templateCompiler`**, so
`ember-cli-htmlbars@7`'s
`findAddonByName('ember-source').absolutePaths.templateCompiler` no longer
hits `TypeError: Cannot read properties of undefined`. Tier-1 assertions 4–5
exercise exactly that path and are green. **Honest caveat:** the file it
points at (`dist/ember-template-compiler.js`) is currently a documented
fail-loud **stub**, not the real classic wire-format compiler. A
self-contained CJS extraction of the compiler is not possible from the GXT
Rollup output because that build chunk-merges the ESM-only `@lifeart/gxt`
(reached via `@ember/-internals/metal`'s `@lifeart/gxt/glimmer-compatibility`
import) into the template-compiler's shared-chunk graph; producing the real
CJS compiler needs a dedicated classic (non-GXT) Rollup pass and is
descoped. This is acceptable for the MVP because real template compilation in
GXT mode is the `@lifeart/gxt` Vite plugin's job (the open L-item, row 2),
not this entry's.

**Conclusion.** Strict-mode Embroider + GXT is **blocked, not merely
unvalidated.** The blocker is not Embroider's static resolver rejecting
aliases; it is (1) the absence of a consumable `ember-source-gxt`
runtime, (2) the mutually exclusive template-compiler contract (Glimmer
wire-format vs GXT `$_tag` trees), and (3) the unshipped
container-resolution bridge. All three are the §5.2 "required shipping
form" work and a consumer-side compiler-integration story; none is a
small wiring fix. No forced/hacky workaround was attempted.

#### 5.6 Build-time wiring architecture (2026-06-11)

The two build pipelines describe the SAME `@glimmer/* | @ember/* |
ember-template-compiler` → gxt-backend-shim redirect, in two different
shapes (a Rollup exact-key resolver map vs a Vite `resolve.alias` array). They
historically maintained the table twice, and the rebase onto upstream main
proved the resulting sync-fragility: upstream's vendored `@glimmer/*` migration
introduced deep-path imports (e.g. `@glimmer/validator/lib/tracking`) that the
Vite tree must collapse onto the single shim file, and the prefix-string aliases
present in only one config silently broke. The canonical table now lives once,
in `scripts/gxt-alias-map.mjs` (`GXT_SHIM_ALIASES`), and both configs derive
their own format from it — `rollup.config.mjs` builds the exact-key map (the
`subpathTolerant` flag is Vite-only: deep `@glimmer/*` imports in the Rollup
graph resolve to the real vendored in-repo source), and `vite.config.mjs` builds
the alias array, turning `subpathTolerant` entries into anchored
deep-path-matching regexes. The class of skew the rebase hit is now impossible.

The same module exposes the single "is the GXT backend enabled" predicate,
`isGxtEnabled(env)`, which honors **both** historical flags — `GXT_MODE=true`
(the Vite dev/test harness) and `EMBER_RENDER_BACKEND=gxt` (the Rollup
production build). `vite.config.mjs` reads it, so a bare
`EMBER_RENDER_BACKEND=gxt npx vite` now also enables GXT mode (additive — the CI
harness only ever sets `GXT_MODE`, and the benchmark Vite configs already set
both). Two readers are _intentionally_ NOT folded onto the OR-helper, a
**deliberate, load-bearing asymmetry** documented at the helper:

- `rollup.config.mjs` keys its `USE_GXT_BACKEND` off `EMBER_RENDER_BACKEND`
  _alone_, because `vite.config.mjs` imports `exposedDependencies()` /
  `resolvePackages()` from `rollup.config.mjs` while `GXT_MODE` is set — if
  `USE_GXT_BACKEND` also flipped on `GXT_MODE`, those Rollup helpers would start
  externalizing the `@lifeart/gxt` dist paths and injecting the Rollup overrides,
  both wrong for the Vite dev server (which serves those files and applies its
  own alias).
- `babel.config.mjs` keys its template-precompilation decision off `GXT_MODE`
  _alone_: under the Vite/GXT harness the `@lifeart/gxt` compiler owns template
  compilation (so the classic `babel-plugin-ember-template-compilation` is
  skipped), while the Rollup `EMBER_RENDER_BACKEND=gxt` _publish_ build keeps the
  classic precompile pass. Flipping babel on `EMBER_RENDER_BACKEND` would change
  which plugins run in that publish build — not a provably behavior-preserving
  change — so it is left keyed to `GXT_MODE`.

This asymmetry is _why_ the two flags exist and is preserved on purpose.

### 6. `@glimmer/component` disposition

`@glimmer/component` is published independently of Ember and directly
imports `@glimmer/manager` and `@glimmer/reference`. If an app installs
it alongside `ember-source-gxt`, two copies of the reactive runtime
co-exist and the symbol identity of `Tag`, `createTag`, `CURRENT_TAG`,
`getCustomTagFor` forks across the two copies. The bundling review
explicitly notes:

> Every major framework refactor that ignored this has bled for
> months afterward (React's dual renderer, Ember's own Glimmer 1→2
> migration).

Two options, in order of preference:

1. **Negotiate extraction with the Glimmer team.** Extract the
   `@glimmer/component` public API (the `Component` base class,
   `setComponentTemplate`, `@tracked` field semantics) into a
   **protocol package** — an interface-only package that both the
   classic runtime and GXT implement. The two runtime packages both
   depend on the protocol package. Glimmer-team alignment is required
   before this option can proceed.
2. **Ship `@glimmer/component-gxt` as a sibling.** If protocol extraction
   is rejected or delayed, `ember-source-gxt`'s opt-in installer must
   swap the consumer's `@glimmer/component` dependency for
   `@glimmer/component-gxt`, which re-exports the same named symbols
   but implements them against GXT's reactive core. The installer
   must refuse to proceed if any direct `@glimmer/component` import
   remains reachable. This is a fork path and carries
   symbol-identity-duplication risk if an addon transitively depends
   on `@glimmer/component` by exact version.

Option 1 is the committed target. Option 2 is the fallback if
coordination with the Glimmer team does not conclude by the Phase 3
milestone.

**Status — Option 2 fallback machinery implemented in-repo; protocol
extraction remains the preferred path.** The fallback is no longer a
paper plan: the in-repo pieces that make Option 2 shippable exist and
are tested.

- **Sibling package** — `packages/@glimmer/component-gxt/`
  (workspace-private, like the other in-repo GXT packages). Its `.`
  entry re-exports `@glimmer/component` 2.x's entire public surface
  (the default `Component` base class — that is the whole public API of
  `@glimmer/component` 2.x). Its `./reactive` entry re-exports the
  reactive-runtime symbols the package is built against
  (`createTag`, `CURRENT_TAG`, `tracked`, `cached`, `createCache`,
  `getValue`) from `@ember/-internals/gxt-backend/*` — the same shim
  modules the GXT rollup alias map injects for the rest of the bundle —
  so its symbols are identity-equal with the GXT build's reactive core
  rather than a second copy. The package is thin re-export/delegate, not
  a reimplementation, and (like the `gxt-backend` shims and the `demo`
  workspace) is excluded from the classic root `tsconfig.json`
  type-check because its specifiers only resolve under the GXT alias
  map.
- **Identity test** —
  `packages/@glimmer/component-gxt/__tests__/identity.test.ts` asserts
  `===` between the symbols reached "through `@glimmer/component-gxt`"
  and the same symbols reached through the `gxt-backend` shims
  (`createTag`, `CURRENT_TAG`, `tracked`, `cached`, cache primitives),
  and demonstrates the fork it closes by showing those are NOT the
  classic `@glimmer/validator` copies. (`Tag` is a TS interface, not a
  runtime value; `getCustomTagFor` lives in the heavyweight
  `@glimmer/manager` shim and is out of scope for the lightweight test.)
  It runs through the `demo` workspace's vitest, alongside the
  gxt-backend compat-layer unit tests, via one command:
  `cd packages/demo && pnpm test:gxt-unit` (config:
  `./vitest.gxt-unit.config.mts`).
- **Installer-refusal guard** — `scripts/ember-cli-gxt.mjs`'s `enable`
  path now scans the consumer's `package.json` for a direct
  `@glimmer/component` dependency and (when a srcDir is given) greps app
  source for reachable `@glimmer/component` imports — distinguishing the
  `@glimmer/component-gxt` sibling so it does not false-positive. On a
  hit it prints the RFC-mandated refusal explaining the swap and exits
  non-zero (no package.json mutation); `status` reports the guard state.

**What shipping Option 2 for real still requires:** the consumable
`ember-source-gxt` packaging from §5.5 (the `M` packaging item). Until
that exists, `@glimmer/component-gxt` is in-repo fallback machinery and
is not published, and `ember-addon.backend = 'gxt'` remains the
placeholder read by nothing that §5.5 documents — so the installer
guard is forward-looking: it blocks `enable` from silently introducing
the fork once that packaging lands, but cannot itself perform a real
dependency swap today. The in-repo workspace GXT build does not hit the
fork at all, because it alias-injects the shims for every consumer in
the bundle (`rollup.config.mjs`).

### 7. FastBoot + engines disposition

The earlier internal plan said "GXT has no SSR" and scoped rehydration
as multi-week. **That claim was factually incorrect** and is
corrected by the SSR exploration:

- GXT has a **complete native SSR + rehydration subsystem** under
  `src/core/ssr/` in the upstream `@lifeart/gxt` repository (~1000
  lines of runtime plus ~1000 lines of tests, 52 test cases), wired
  into a published server entry (`src/server.ts`), with a working
  dev server (`pnpm dev:ssr`) and advertised as "Server Side
  Rendering" and "Rehydration" in the README.
- GXT's SSR uses `happy-dom` on the server,
  `data-node-id="${NODE_COUNTER}"` attributes as alignment markers on
  elements, and `$[N]` suffixes inside reactive boundary comments.
  Client rehydration walks the DOM in **reverse depth-first order**
  and relies on a deterministic counter incrementing in the same
  order on client and server.

The **actual** gap is that Ember's FastBoot pipeline uses `SimpleDOM`
plus `@glimmer/node`'s `serializeBuilder`, and Glimmer VM's rehydration
builder consumes opcode-driven markers, not counter markers. These two
are architecturally incompatible: different server DOM, different
serializer, different alignment strategy. Bridging them is 2-4 weeks of
engineering (Option A: abstract GXT's `happy-dom` import behind a
DOM-provider factory and inject SimpleDOM), not multi-month.

**Concrete action items for Phase 4:**

1. **Write a GXT-flavored `RehydrationDelegate`** for
   `packages/@glimmer-workspace/integration-tests/lib/modes/rehydration/delegate.ts`.
   The 393 failing `[integration] rehydration ::` tests are failing
   because that suite drives Glimmer VM's `EvaluationContext` + JIT
   runtime + SimpleDOM directly, which GXT does not plug into. The fix
   is **one delegate file** that drives GXT's native `src/core/ssr/ssr.ts` +
   `withRehydration()`, not 393 individual test fixes. This single
   deliverable unblocks the largest single failure category in the
   Phase 0 spike.
2. **Abstract GXT's happy-dom import behind a DOM-provider factory.**
   Upstream change into `@lifeart/gxt` (`src/core/ssr/ssr.ts:39`) so
   the host can supply either happy-dom or SimpleDOM. This is the
   cleanest integration with FastBoot.
3. **Audit the compat layer for node-safe DOM assumptions.** Hard
   cases are `packages/@ember/-internals/gxt-backend/manager.ts` (uses
   MutationObserver, which neither SimpleDOM nor happy-dom fully models),
   `packages/@ember/-internals/gxt-backend/compile.ts` (mounts temporary DOM
   containers for runtime template compilation), and
   `packages/@ember/-internals/gxt-backend/outlet.gts` (assumes live event
   handlers). Estimate: ~1 week per hard file.
4. **Engines.** `{{mount}}` is currently `UNTESTED`. Lazy engines with
   asset-map-driven bundle splits are a separate risk surface and are
   out of scope for the preview exit unless explicitly validated.

Until (1)-(3) land, `ember-source-gxt` is documented as **not
compatible with FastBoot**, full stop. The exploration correction
replaces the earlier "no SSR" framing but does not weaken the
user-facing constraint: an app that uses FastBoot today cannot opt
into GXT today.

### 7.1 Phase 4 architectural blockers — analysis (2026-06-10)

The two blockers gating a _default_ SSR wiring (root-context isolation,
Phase 4.1; nested-engine outlet cursor-ID translation, Phase 4.2) were
investigated against `gxt-fine-grained` HEAD `47b26701bd`. The outcome is
**analysis + design, not a `compile.ts` refactor**, for the reasons mapped
below. A correct "this is architecturally deep, here is the exact map and
design" is the intended result for this step; forcing a cosmetic,
regression-prone half-refactor of the backend's most load-bearing file
(`compile.ts`, ~17k lines) to claim a win was explicitly rejected.

#### 7.1.1 Phase 4.1 — root-scoped state map (`compile.ts` + leaned-on state)

SSR needs **N isolated render roots** (one per request, plus a separate
client rehydration root) where today there is effectively **one** ambient
root. Every piece of root-scoped singleton state was enumerated and
classified as **(a)** trivially scopable, **(b)** scopable with care, or
**(c)** architecturally global.

**(a) Trivially scopable — genuinely root-scoped, already bridged:**

- `_gxtRootContext` (`compile.ts:965`) — the single ambient GXT `Root` built
  lazily by `_getOrCreateGxtRoot` (`:973`). Read/written through the
  `compilePipeline.getRootContext` / `setRootContext` bridge (`:17132`) by
  four cross-package consumers (`glimmer/lib/renderer.ts:80`,
  `glimmer/lib/templates/root.ts:111/118/271`, `gxt-backend/outlet.gts:172/406`,
  `gxt-backend/runtime-hbs.ts:159`). **The catch:** all four read/write the
  ambient root with **no root-discriminator argument**. Making it per-root
  means threading a root key (or an ambient swap) through that entire
  cross-package surface.
- `_gxtTopOutletRef` (`compile.ts:3525`) — "the current app's top outlet",
  paired get/set bridge; one captured singleton per app.
- `_gxtEngineInstances` (`compile.ts:3811`) — `Map<string, any>` keyed by
  engine mount-point name; for N concurrent apps the names collide. Scopable
  but, like the root, only via a per-root key at each access.

**(b) Scopable with care — transient/reentrancy state, pass-correct today:**

- The ~40 `_gxt*Flag` reentrancy guards (e.g. `_gxtSyncingFlag`,
  `_gxtInOutletRenderFlag:3495`, `_gxtMorphRenderInProgressFlag:3457`,
  `_gxtCurrentlyRenderingFlag:3245`), each wrapped in a `_gxtWith…(fn)`
  save/restore. Within a single **synchronous** render pass they are correct.
  They would only leak across requests if two renders interleaved at an
  `await`. GXT SSR renders synchronously (`renderInBrowser`/`render` in
  `@lifeart/gxt`'s `src/core/ssr/ssr.ts` build a string in one pass), so
  per-pass they are safe; true N-concurrent-request isolation in one Node
  process would need these to become per-render-context (AsyncLocalStorage-
  style) — a deep change with no current consumer.
- The deferred drain queues (`_inElementDeferQueue:1590`,
  `_deferredCascadeQueue:3022`, `_pendingIfWatcherNotifications:3006`,
  `_pendingEachRebindHolders:6220`, `_pendingInverseOldRowFinalize:6389`) —
  drained within the pass; same reasoning.
- Monotonic ID counters used for markers: `_contextId:125` (component-id
  namespace, starts at 100), `_gxtCommentCounter:4612`,
  `manager.ts:emberViewIdCounter:277`, `manager.ts:_managedComponentGeneration:12135`.
  For SSR↔client **marker alignment** these must reset deterministically per
  document — which is the same requirement as Phase 4.2 (see below).
- A few owner-keyed memoizations in `manager.ts` (`_cachedManagerOwner:8189`,
  `_lastOwnerForInteractive:3499`, `_isInteractiveCached:3478`) cache "the
  current ambient owner"; per-root they would need re-keying by owner identity.

**(c) Architecturally global — correct as-is, or not isolable from `compile.ts`:**

- **Pure compile-time caches** — `templateCache:12717`, `_functionCodeCache:12877`,
  `_tagHelperInstanceCache:7847`, and the builtin/allow-list `Set`s
  (`_GXT_STRICT_ALLOWED_NAMES:1195`, `_GXT_ATTR_QUOTED_HELPER_BUILTINS:13022`,
  `_GXT_BODY_BARE_BUILTINS:13422`, `_HTML_BOOLEAN_ATTRS:2253`, the `_SANITIZE_*`
  sets `:2174`). These are pure functions of template source; sharing them
  across roots is _correct_ and desirable.
- `_gxtComponentContexts` (`compile.ts:1001`) — a `WeakMap` keyed by component
  / controller instance. Because a given instance belongs to exactly one root,
  the map is already partitioned by instance identity and does **not** need
  per-root duplication. Safe to remain global.
- **Upstream `@lifeart/gxt` module-global state — the real "one root" boundary.**
  This is the decisive finding. The state that actually forces a single render
  root lives in the GXT runtime package, not in `compile.ts`:
  - the **node counter** (`incrementNodeCounter` / `resetNodeCounter` /
    `getNodeCounter`, `dist/src/core/dom.d.ts`) that drives SSR
    `data-node-id` markers and the rehydration walk;
  - the **rehydration stack + scheduling state**
    (`isRehydrationScheduled` / `setRehydrationScheduled`,
    `dist/src/core/ssr/rehydration-state.d.ts`; the reverse-DFS stack in
    `rehydration.ts`);
  - the **parent-context stack** (`pushParentContext` / `popParentContext` /
    `getParentContext` / `setParentContext`, `tracking.d.ts`) and
    `RENDERING_CONTEXT` / `ROOT_CONTEXT`;
  - `setupGlobalScope`'s `globalThis.$slots` / `$fw` / `$args` / `$_MANAGERS`
    contract surface (reset in `compile.ts:_gxtClearOnSetup:7706`).
    `compile.ts` **cannot** isolate any of these from outside the package. They
    are global by GXT's design.

**Verdict: the map is (c)-dominated for the purpose of real SSR isolation.**
The root-scoped items inside `compile.ts` are thin and already bridged, but
(1) making them per-root requires a wide cross-package signature change
(`renderer.ts`, `root.ts`, `outlet.gts`, `runtime-hbs.ts`, `route.ts`), and
(2) it would be **cosmetic** — concurrent SSR stays impossible while the
upstream node counter, rehydration stack, and global scope remain module-global
in `@lifeart/gxt`. The integration suites all run in a single-root browser, so
such a refactor would change zero observable behavior while adding real
regression surface to `compile.ts`. **Decision: analysis-only; do not refactor
`compile.ts`.** (No `compile.ts` change ⇒ the full GXT gate is not triggered;
this section is documentation-only.)

**Design for when it is implemented** (smallest correct shape, in order):

1. **Upstream `@lifeart/gxt`:** make the node counter _seedable_ — add
   `setNodeCounter(n)` alongside the existing `resetNodeCounter()` — and expose
   the rehydration stack + `setupGlobalScope` slots as a `RenderRoot`-scoped
   context object rather than module globals (or guard them with an
   AsyncLocalStorage-style "current render context"). This is the same
   "abstract the global behind an injectable context" move already begun for
   happy-dom (Phase 4 action item §7(2), `src/core/ssr/dom-provider.ts`).
2. **`compile.ts` (only after step 1):** add a synchronous
   `compilePipeline.withRootContext(ctx, fn)` that swaps `_gxtRootContext`,
   `_gxtTopOutletRef`, `_gxtEngineInstances` (and calls the upstream
   counter/stack reset) for the duration of `fn`, restoring on exit. The
   browser path never calls it, so the module-globals remain the default
   ambient root and single-root behavior is byte-identical. Each SSR request
   becomes `withRootContext(freshCtx, () => render(...))`.
3. **The cross-package bridge** keeps its existing get/set shape; only the
   four lazy-init writers gain "read the current ambient (swapped) root,"
   which they already do.

**Wave 3 status (2026-06-10; binding refreshed 2026-06-11) — step 1 ✅ upstream,
step 2 ✅ LANDED (consumer plumbing).** Step 1 shipped upstream in two parts:
the seedable counter (`setNodeCounter` / `getNodeCounter`) in `@lifeart/gxt`
0.0.64, and the per-render-root primitives (`withRenderRoot` /
`createRenderRootState`, plus the `RenderRootState` type) in **0.0.65**. Ember
now pins and consumes **0.0.67** (exact, lockstep). Because the published 0.0.64
lacked the
per-root primitives, the consumer initially resolved them off a namespace import
with `undefined`-tolerance (so a named import of a missing export could not take
down the module at link time). With 0.0.65 publishing them in both the runtime
ESM and the `.d.ts`, that degradation was removed: `compile.ts` now binds
`withRenderRoot` / `createRenderRootState` via a plain **named import** and calls
them unconditionally. Step 2 is implemented as
`compilePipeline.withRootContext(ctx, fn)` (`compile.ts`, beside the
`getRootContext`/`setRootContext` bridge, dual-published on
`globalThis.__gxtWithRootContext` for an out-of-package SSR driver). It snapshots
the three (a)-class singletons (`_gxtRootContext`, `_gxtTopOutletRef`, the
`_gxtEngineInstances` _contents_ — the `const` Map identity is preserved by
clear+repopulate), runs the body inside
`withRenderRoot(createRenderRootState(), fn)` so the upstream node-counter /
parent-context / rendering-context globals are isolated too, and restores the
outer ambient state on exit **including on throw**, checkpointing the mutated
per-root state back into `ctx` (mirroring `withRenderRoot`'s own idiom). It is
**ADDITIVE**: no browser/render-path caller exists, so single-root behavior is
byte-identical; it is dormant until a FastBoot/SSR driver wraps each request.
Verified by runtime probe under the gxt vite server (two sequential
`withRootContext` invocations each see a fresh node counter at 0 — isolated, not
leaking the prior root's mutation; outer counter restored on normal AND throw
exit; `ctx` checkpointed). This is the RFC §5.1 test-2/3/4 shape exercised against
the live consumer. Step 3 (cross-package signature change) remains unneeded — the
four lazy-init writers already read the ambient (now-swappable) root through the
unchanged get/set bridge.

The earlier "deliberately not landed speculatively" caveat (no consumer ⇒ no dead
API) is now satisfied: the SSR program's per-request driver is the waiting
consumer, the additive seam carries zero behavioral risk, and node-testing the
seam in isolation is impractical (compile.ts's import graph needs the full gxt
vite build; the repo's `vitest` harness rejects the root `vite.config.mjs`
`resolvePackages` plugin), so correctness is established by the runtime probe plus
the full GXT suite gate that the `compile.ts` touch already mandates.

#### 7.1.2 Phase 4.2 — nested-engine outlet cursor-ID translation

**Where the information is lost.** Classic Ember partial rehydration — the
mechanism engines use to rehydrate a server-rendered sub-tree (a `{{mount}}`
target / engine outlet) — starts its cursor **mid-document**, at the boundary
element, and walks the existing server DOM aligning against block markers:
`PartialRehydrationDelegate.renderComponentClientSide`
(`…/rehydration/partial-rehydration-delegate.ts`) does
`let cursor = { element: placeholder, nextSibling: null }` and lets Glimmer
VM's rehydration builder resume the counter at the boundary.

The GXT delegate cannot do this today. `GxtPartialRehydrationDelegate`
(`…/rehydration/gxt-delegate.ts:1733`) instead does
`(element as Element).innerHTML = ''` and **re-renders the component from
scratch** (`:1742-1747`), then reports `rehydrationStats = { clearedNodes: [] }`
— a fabricated "zero clears". The delegate header states this directly
(`:20-22`): _"Real counter-based alignment. We re-run the template client-side
against a fresh cursor; any `rehydrationStats.clearedNodes` assertions will be
reported as zero clears."_

**Root cause.** GXT's SSR alignment uses a single module-global node counter
that emits `data-node-id="${N}"` on elements and `$[N]` suffixes in reactive
boundary comments, with the client rehydration walking in reverse DFS and
relying on the **same counter incrementing in the same order** on both sides.
The exported surface (`dom.d.ts`) is `resetNodeCounter()` (reset to **0**),
`incrementNodeCounter()`, and `getNodeCounter()` — there is **no
`setNodeCounter(n)` / seed-to-base-offset**. So when a nested engine outlet (or
any `{{mount}}`ed / partially-rehydrated sub-tree) is rendered:

- On the **server** the sub-tree's `data-node-id`s are minted within the
  **parent document's** continuous counter sequence (offset by however many
  nodes preceded the mount point).
- On the **client** the engine is a _separate_ render boundary; GXT would
  begin its node counter at **0** for that boundary, so the local IDs no
  longer match the server `data-node-id`s. The parent offset — the only thing
  that ties the engine's local sequence to the document namespace — is the
  information that is lost.

This is GXT-runtime-internal and applies equally to non-engine nested
boundaries (the in-element delegate sidesteps it only by emitting and
re-parsing Glimmer-VM-style `%cursor:N%` / `%+b:N%` block markers via a
**separate** per-pass depth counter, `__gxtInElementBlockDepth`,
`gxt-delegate.ts:778/1150` — it does not use the GXT node counter at all).

**Shape of the fix** (upstream + delegate; no `compile.ts` change):

1. **Upstream `@lifeart/gxt`:** add the seedable counter from §7.1.1 step 1
   (`setNodeCounter(n)`), and have `withRehydration(...)` accept a **base
   offset** so a nested boundary can resume the parent's namespace instead of
   resetting to 0. Concretely: record each render-boundary's starting node-id in
   the server output (the mount/outlet boundary element carries its
   `data-node-id`), and on the client read that attribute to seed the local
   counter before walking the sub-tree.
2. **Delegate:** `GxtPartialRehydrationDelegate.renderComponentClientSide`
   replaces the `innerHTML = ''` re-render with a real boundary-seeded
   `withRehydration(component, args, boundaryEl, root)` call, reading the
   boundary element's recorded base offset, and reports the _true_
   `clearedNodes` from the rehydration walk.

This unblocks the `partial rehydration ::` suite's `clearedNodes`/stable-node
assertions and is the prerequisite for real `{{mount}}`/engine SSR, which §7(4)
otherwise leaves `UNTESTED`.

**Wave 3 status (2026-06-10) — step 1 ✅ upstream; step 2 ⛔ DESCOPED to this
addendum (two consumer-side blockers, empirically verified).** Upstream step 1
landed: `withRehydration(cb, args, target, root?, { baseOffset })` is present in
0.0.64 (the dist `rehydration` chunk seeds `setNodeCounter(options?.baseOffset ?? 0)`
on entry, saves/restores the outer counter, and reports the unmatched-node residue
as the cleared set). The delegate rewrite (step 2) was attempted and **descoped**
because the ember GXT delegate's _runtime-compile_ architecture violates the two
preconditions the recipe assumes. Both were confirmed by live probe against the
gxt vite server:

- **(B1) No `data-node-id` markers at the runner's page path.** GXT emits
  `data-node-id`/`$[N]` markers only when `IN_SSR_ENV` is true, and in the
  then-consumed 0.0.64 dist `IN_SSR_ENV` was baked as `location.pathname === "/tests.html"` (a
  free identifier, no `define` override in GXT mode). The GXT test runner navigates
  to `http://localhost:5180/?module=…` — pathname `/` — so `IN_SSR_ENV` is **false**
  during every gated run. Probe: the delegate's server-render path
  (`__gxtCompileTemplate(...).render(...)`) emits `<section><b>hi</b></section>`
  (no markers) at `/`, but `<section data-node-id="2"><b data-node-id="1">…` at
  `/tests.html`. The partial-rehydration boundary therefore carries **no**
  `data-node-id` at gate time, so `baseOffset` is always `0` and `withRehydration`
  has nothing to align against — it would walk an unmarked tree, mis-align, and
  either throw `Rehydration failed…` / `withRehydrationStack is not empty` or clear
  every server node (regressing both `clearedNodes.length === 0` and
  `assertStableNodes`).
- **(B2) No `renderComponent`-compatible component for `withRehydration`.**
  `withRehydration(comp, …)` requires `comp: typeof Component` and internally calls
  `renderComponent(comp, { args, element, owner })`. The delegate registers and
  renders templates through the _runtime-compile_ path (`__gxtCompileTemplate` →
  `templateFn` → `itemToNode` → `appendChild`, `compile.ts:render()`), which never
  produces a GXT `Component` subclass. Probe: feeding the runtime-compiler's output
  to `renderComponent` throws `Cannot read properties of undefined (reading 'push')`
  (`protoComponent: false`). Bridging a runtime-compiled template to a
  `$template`/`$_fin`-wired `Component` is a substantial `compile.ts`-scale feature,
  not a delegate edit — exactly the regression-prone deep refactor §7.1 rejects.

**Consequence.** The committed baseline already records all rehydration modules
(`partial rehydration` 2/2, `rehydration` 123/123, `chaos-*` 2/2, `{{in-element}}`
8/8) as **passing**, because the current delegate fabricates `clearedNodes: []` and
the `clearedNodes.length === 0` assertions are satisfied trivially. There is thus
**no failing test to flip green**, and any live `withRehydration` call would turn a
green module **red** at the `/` gate. The honest outcome is to keep the delegate's
runtime behavior unchanged (no regression) and record the precise blocker map here.
A real boundary-seeded rehydration on the consumer side is gated on EITHER serving
the suite at a `IN_SSR_ENV`-true path (so the server pass emits markers) AND adding
a template→`Component` bridge, OR re-architecting the delegate's server+client
passes onto GXT-native `renderComponent`/`withRehydration` end-to-end (so both
sides share the node-counter sequence). Both are out of scope for a consumer-side
wave; the upstream mechanism itself is validated by glimmer-next's own
`ssr/rehydration.test.ts` boundary-seeding test (RFC §5.2 test 7).

### 8. Debug and Ember Inspector parity

Ember Inspector's component tree, render-tree tab, and "why did this
rerender" features are how working Ember engineers debug production
apps. Losing them is a material productivity hit and deserves its own
plan.

**Status: no owner, no timeline.** This section is an explicit TODO,
not a hand-wave. The required work is:

1. A GXT-native component-tree adapter that talks the Ember Inspector
   devtools protocol. Size estimate: **multi-week**, probably 4-6
   engineer-weeks based on the size of the existing Glimmer-VM-side
   adapter.
2. A GXT-native render-tree reporter that can answer "which cells
   invalidated this frame and which components re-rendered because
   of them". GXT's reactive scheduler has the information internally
   (`$_ucw`, the cell dependency graph) but does not currently expose
   it in a shape the Inspector consumes.
3. A source-map pipeline for GXT-compiled templates so the Inspector's
   "jump to source" action points at the `.hbs` / `.gts` file, not
   the compiled JS.

**Owner: TBD.** Until a named owner is assigned, `ember-source-gxt`
releases must ship with a warning printed on app boot in development
mode stating "Ember Inspector integration is not yet available for
this backend", and the RFC merge cannot proceed to preview release
without an owner.

### 9. Exit criteria: preview → stable

Leaving preview status is a numeric decision, not a discretionary one.
All of the following must be true simultaneously, on the same release:

1. **Test parity: 100%.** Every test that is green on `ember-source` at
   the target Ember minor is also green on `ember-source-gxt` at the
   same commit. No `baseline - 0.5%` drift budget. Per-test diff gating,
   monotonic ratchet.
2. **Addon matrix: at least the top 20 addons (per the companion
   matrix document) are green.** No `untested` rows remain among the
   top 20.
3. **Production adoption floor: M = 5 apps** running `ember-source-gxt`
   in production as declared in a public tracking issue, each for at
   least **30 days** with no backend-attributable production
   incidents.
4. **FastBoot bridge merged and released.** The GXT-flavored
   `RehydrationDelegate` from §7(1) must be shipping, and at least
   one of those 5 production apps must be exercising FastBoot.
5. **Ember Inspector parity: owner assigned, protocol work merged,
   component tree working against GXT.** The source-map and
   render-tree pieces may lag by one minor.
6. **One full LTS cycle of preview feedback.** `ember-source-gxt` must
   have been available as preview for at least one completed LTS
   window so that LTS-tracking consumers have had the chance to
   exercise it.
7. **`@lifeart/gxt` governance: established** (see §10).

Anything short of all seven is **not** exit criteria; it is a progress
report. No "core team discretion" knob.

### 10. Governance of `@lifeart/gxt`

`@lifeart/gxt` is currently effectively a solo project authored by one
maintainer. Pinning Ember's release train to another project's single
maintainer is a governance risk the original plan addressed with a
"vendor-fork as fallback" mitigation. That mitigation is the wrong
direction: it treats vendoring as an escape hatch instead of a baseline
arrangement.

The proposed governance posture is one of the following, in order of
preference:

1. **Ember co-owns the `@lifeart/gxt` repository.** The Ember
   Framework team gains commit/merge rights on `@lifeart/gxt` in
   exchange for the same on `ember-source-gxt`'s GXT-facing shims.
   Release cadence for `@lifeart/gxt` aligns with Ember minors (every
   6 weeks) when an Ember release is cut. The current maintainer
   remains the architectural lead. This is the cleanest arrangement
   and is the committed target.
2. **Fork-by-default with upstream sync.** If co-ownership cannot be
   negotiated, `ember-source-gxt` depends on an Ember-hosted fork of
   `@lifeart/gxt` (e.g. `@ember/gxt-runtime`), with an automated
   weekly sync from upstream. Upstream commits are merged into the
   fork, CI runs the Ember gate against the merged result, and any
   regression blocks the sync. The fork is not an escape hatch — it
   is the baseline path. This is the fallback.
3. **Vendor as escape hatch only.** If neither (1) nor (2) works, the
   project does not ship. The risk of running Ember's release train
   on a non-co-owned single-maintainer upstream with no
   institutional support is not acceptable for a preview feature,
   let alone a default.

**Version pinning.** Regardless of governance choice, the
`@lifeart/gxt` dependency must be an **exact pin** (not a range) in
`ember-source-gxt`'s `dependencies` — never `peerDependencies` — with
lockstep release policy. Every `ember-source-gxt` release is a
coordinated release with a specific `@lifeart/gxt` version. Tools:
`changesets` linked package groups or `lerna publish --force-publish`.

**Contract tests.** A ~50-test suite exercising every GXT API Ember
depends on (`cellFor`, `$_ucw`, `destroyBranchSync`, modifier/helper/
component manager registration, reactive cell evaluation, destructor
order) runs **first** on every CI run. If contract tests fail, the
full-suite gate is skipped with a `gxt:upstream-regression` label.
This gives sub-minute
feedback on upstream breakage and prevents a broken upstream bump
from burning engineering hours on irrelevant downstream failures.

### 11. LTS cadence interaction

Ember ships a minor every 6 weeks and supports 4 LTS versions. Preview
features land only on non-LTS minors; `ember-source-gxt` is no
exception. The first LTS that includes `ember-source-gxt` as a
supported preview target is the LTS **immediately following** the
minor in which the preview first ships. Backports of upstream
`@lifeart/gxt` fixes into earlier LTS lines are not supported — apps on
an LTS that pins an older `@lifeart/gxt` must upgrade to the current
minor to receive upstream fixes.

## How we teach this

During preview, `ember-source-gxt` is documented in the Ember guides as
a **preview feature**, not as a coequal backend. The documentation
pages describe:

- What the backend is, and what tradeoffs it makes.
- The current feature support matrix (linking to the canonical version
  in this RFC).
- The opt-in flow: `npx ember-cli-gxt enable`, the addon compatibility
  warning surface, the one-command disable.
- Known limitations, prominently including FastBoot incompatibility and
  Ember Inspector gap.
- A direct link to the addon compatibility matrix document.
- An explicit statement that preview features are outside SemVer, and
  that consumers opting in accept that observable-behavior drift may
  occur between minors.

After exit from preview (not before), the guides are restructured to
treat the two backends as peers. That restructuring is out of scope
for this RFC.

## Drawbacks

- **Two runtimes to maintain.** Ember core-team attention is finite.
  Dual-backend means two sets of regression reports, two sets of CI
  matrices, two sets of integration questions. The plan's mitigation is
  the narrow `@ember/*` seam, but narrow seams bleed at the edges.
- **Addon-author burden.** Even a self-declaration contract costs
  addon authors time. Some addons will simply never opt in, which
  over time creates a de-facto split ecosystem.
- **Governance coupling.** Even with co-ownership (§10 option 1),
  Ember's release cadence becomes partly dependent on upstream
  decisions that Ember does not make unilaterally.
- **Preview-for-how-long risk.** Exit criteria are numeric (§9), but
  nothing guarantees any specific calendar date for meeting them. The
  preview window could extend for multiple years. That is acceptable
  — preview is better than rushed default — but it should be
  acknowledged.

## Alternatives

1. **Do nothing.** Keep Glimmer VM as the sole runtime. This is the
   status-quo option and has zero risk. It also means the community
   cannot evaluate an alternative runtime in production.
2. **Replace Glimmer VM outright with GXT.** Rejected as far too risky
   without the feature parity, ecosystem compatibility, and governance
   foundations this RFC proposes to build first.
3. **Runtime feature flag inside a single `ember-source`.** Runtime
   dispatch between two backends in one build doubles bundle size and
   makes debugging significantly harder. Rejected explicitly in the
   bundling review.
4. **Merge GXT concepts upstream into Glimmer VM incrementally.**
   Architecturally incompatible at the rehydration and reactive
   scheduler layers. Not feasible on any useful timeline.
5. **Ship GXT as an Ember addon instead of a second `ember-source`.**
   Tried early in the Phase 0 spike; failed because the required hooks
   reach deep into `-internals/metal` and `-internals/glimmer`, which
   are not addon-accessible. A second source package is the minimum
   shape that can work.

## Unresolved questions

- **Owner for the Ember Inspector parity work (§8).** Must be named
  before preview ships.
- **Glimmer team position on `@glimmer/component` protocol extraction
  (§6).** Determines whether the sibling-package fork path is
  required.
- **`@lifeart/gxt` co-ownership negotiation outcome (§10).** Must
  conclude in option (1) or (2) before preview ships.
- **Exact list of classic-side deprecations, if any, that the preview
  cycle will expose.** Generated from the full-suite behavioral diff
  once the GXT-flavored `RehydrationDelegate` lands and the
  categorized-allowlist QA infrastructure is in place.
- **Perf numbers.** Bundle size (gzip + brotli), initial render, update
  throughput, memory-at-steady-state. Phase 3 deliverable. This RFC
  intentionally does not state any perf claim.
- **Embroider v2-addon + strict-mode integration exact contract
  (§5).** Partially resolved by the 2026-06-10 validation pass (§5.5):
  the failure mode is now root-caused (no consumable `ember-source-gxt`
  runtime; mutually exclusive template-compiler contract; unshipped
  container-resolution bridge) and is **not** the alias-resolution risk
  originally stated. What remains open is the affirmative contract — a
  shipped `ember-source-gxt` plus a consumer-side mechanism that swaps
  Embroider's `babel-plugin-ember-template-compilation` step for GXT's
  compiler and re-points GXT's invokable primitives at container
  resolution. Not yet proven against a real v2 addon graph.

---

_Engineering spike references:_

- `scripts/gxt-alias-map.mjs` — the single canonical specifier→shim table
  (`GXT_SHIM_ALIASES`) and `isGxtEnabled()` predicate consumed by both build
  pipelines (see §5.6)
- `vite.config.mjs` — the `GXT_MODE=true` `resolve.alias` array, derived from
  the shared table (transition artifact only)
- `rollup.config.mjs` — `exposedDependencies()`, where the classic-vs-GXT build
  variant branch lives (the GXT overrides are derived from the shared table)
- `packages/@ember/-internals/metal/lib/` — 19 files missing from the
  original Phase 2 scope
- `packages/@ember/-internals/glimmer/lib/` — 51 files in the
  original Phase 2 scope
- `packages/@ember/-internals/gxt-backend/` — the compat shim layer
  (validator.ts, reference.ts, destroyable.ts, manager.ts, compile.ts,
  outlet.gts, and the supporting files)
- Commits `5176f4b229`, `9005f9892b`, `14cd323211` — recent
  contextual-component and outlet stabilization
