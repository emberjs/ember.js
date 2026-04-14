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
- On the **full** Ember test suite the current GXT-backed build passes
  roughly **96.4%** of tests versus the classic backend's **96.7%**. That
  0.3 percentage-point delta on a suite of ~44k assertions is **not**
  "effective parity" — it represents real, triageable behavior drift on
  the order of hundreds of assertions, concentrated in
  `[integration] rehydration ::` (393 failures) and Glimmer JIT-specific
  suites. See `/tmp/gxt-plan-review-domain.md` §3 and
  `/tmp/gxt-plan-review-qa.md` §1 for the full analysis.
- **Bundle size, tree-shaken runtime cost, initial-render time, update
  throughput, memory-at-steady-state, and cold-start-to-interactive** are
  the numbers that would justify the dual-backend split to app authors.
  This RFC deliberately **does not fabricate any of those numbers**. They
  are scheduled to be measured as part of Phase 3 (see "Exit criteria"
  below) using the perf baseline tooling described in
  `/tmp/gxt-plan-review-qa.md` §6. Any quoted perf number before Phase 3
  lands should be treated as marketing, not engineering.

### Why dual-backend and not merge-upstream-into-Glimmer

Several items in GXT's design — counter-based SSR markers, reverse-DFS
rehydration stack, coarse-grained reactive scheduling, direct DOM-API
adapters rather than an opcode VM — are incompatible with the Glimmer VM
opcode model at an architectural level (see
`/tmp/gxt-ssr-exploration.md` §4). A single-runtime merge would require
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
- Full baseline committed to `test-results/gxt-baseline.json` (Phase 0,
  `b1b7637725`): **5,327/5,938 (89.7%)** tests passing on the GXT backend.
- Smoke suite across the 14 session-targeted modules: **333/333 (100%)**.
- The 611 remaining failures are triaged into five buckets (rehydration/SSR,
  Glimmer JIT internals, Ember Inspector, engine/route edge cases,
  miscellaneous) — see `GXT_PHASE_SUMMARY.md` Phase 0 entry.

**Dual-build CI workflow**
- `.github/workflows/gxt-dual-build.yml` runs both backend builds and the
  smoke suite on every PR. Bundle-size budget check (`scripts/bundle-size-check.mjs`)
  and 12 API-surface contract tests (`scripts/contract-tests.mjs`) are
  included in the CI gate (Phase 3, `10f62465ce`).

**Install UX**
- `scripts/ember-cli-gxt.mjs` provides `ember-cli-gxt enable`,
  `ember-cli-gxt disable`, and `ember-cli-gxt status` subcommands. This is the
  consumer-facing interface for switching backends without editing
  `rollup.config.mjs` directly (Phase 3, `10f62465ce`).

**GxtRehydrationDelegate**
- Implemented at
  `packages/@ember/-internals/gxt-backend/rehydration-delegate.ts` and
  exported from `gxt-backend` as an opt-in escape hatch (Phase 4,
  `a2d839e248`).
- **Not wired in as the default SSR path.** Two architectural blockers prevent
  it from replacing the classic rehydration path: root-context isolation in
  `gxt-backend/compile.ts` (Phase 4.1 follow-up) and lossy translation of
  nested-engine outlet cursor IDs (Phase 4.2 follow-up). See
  `GXT_PHASE_SUMMARY.md` Phase 4 entry for the full analysis.

**Bundle-size observation**
- Measured at Phase 3: GXT prod bundle is **3,482,502 bytes raw** vs classic's
  **2,045,674 bytes raw** — approximately **70% larger** raw, **68% larger**
  gzip.
- The delta is dominated by `@lifeart/gxt`'s reactive core and bundled
  template compiler before any tree-shaking is applied to the GXT side.
- A Phase 2.5 bundle attribution audit (`rollup-plugin-visualizer` sweep) is
  the recommended next step before quoting this number publicly. Until that
  audit lands, treat the 70% premium as a worst-case upper bound.

**Compat layer location**
- Canonical location: `packages/@ember/-internals/gxt-backend/` (Phase 1,
  `9f86bc2276`).
- Old location `packages/demo/compat/` is preserved during the transition and
  marked deprecated via `packages/demo/compat/DEPRECATED.md`. Only the new
  location is referenced by the Rollup and Vite alias tables.

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
backed by the session's 14-module test result, the compat layer in
`packages/demo/compat/`, or an explicit untested/unvalidated flag.

| Feature | Status | Notes |
|---|---|---|
| Classic curly components | PASS | Session-verified against curly-component modules. |
| Glimmer / Octane class components | PASS | Session-verified. Depends on `@glimmer/component` shim — see §7. |
| Template-only components | PASS | Session-verified. |
| Tracked properties & reactivity | PASS | Session-verified. Compat layer re-exports `@glimmer/validator` surface; 19 files in `-internals/metal` route through the seam (`/tmp/gxt-plan-review-bundling.md` §3). |
| `{{#each}}` | PASS | Session-verified. |
| `{{#if}}` | PASS | Session-verified. |
| `{{#let}}` | PASS | Session-verified. |
| `{{outlet}}` | PARTIAL | Single-outlet application shell works. Lazy/nested outlets exercised on a limited set; engine outlets **not yet validated**. Recent stabilization commit `14cd323211`. |
| `Router`, `LinkTo`, `router-service` | PARTIAL | Basic routing works in the spike. `@linkPath`/`@linkRoutes` edge cases and `router-service` RSVP timing are not in the 14-module set. `packages/@ember/-internals/routing` was not explicitly covered. |
| `{{mount}}` / Engines | UNTESTED | Engine mounting, lazy engines, bundle-split asset maps — none exercised. Must be validated before preview. |
| `{{component}}` curried with dynamic positional + named args | PARTIAL | Contextual components pass after commits `5176f4b229`, `9005f9892b`. Dynamic-type swap edge cases (`{{component someComponentOrOther}}` where the value transitions from `undefined` to a value) received a fix this week and need broader coverage. |
| Modifiers (`{{on}}`, custom modifiers, `ember-render-modifiers`) | PASS | Modifier manager shimmed through compat layer; session-verified. |
| Helpers (classic `compute`, class-based, Octane function-based) | PASS | Helper manager shimmed; session-verified. |
| Ember Data reactivity | UNTESTED | Ember Data's tracked/computed usage is not in the spike. `@ember-data/debug` imports from `@glimmer/interfaces` and needs verification (`/tmp/gxt-plan-review-domain.md` §2.7). |
| FastBoot / SSR rehydration | PARTIAL | GXT has a **complete** native SSR + rehydration subsystem (~1000 lines of runtime, 52 tests — see `/tmp/gxt-ssr-exploration.md` §2-§3). The gap is the **FastBoot bridge**: SimpleDOM vs happy-dom, opcode markers vs counter markers. Size: 2-4 weeks, not multi-month. See §8 below. |
| Ember Inspector integration | UNSUPPORTED | No GXT-native component-tree adapter exists. Needs its own plan and owner; see §9. |
| Strict mode templates / v2 addons | UNVALIDATED | Embroider strict mode resolves imports statically and will not obey arbitrary `vite.config.mjs` aliases. `/tmp/gxt-plan-review-domain.md` §2.6 flags this as a blocker for modern apps. Phase 2 must produce a built `ember-source-gxt` package. |
| Dynamic `mut` / two-way bindings through computed properties | PASS | Session fix landed; verified. |
| Observers / `didUpdate` lifecycle | PASS | Session fix landed; verified. |
| `(hash)` / `(array)` helper identity across renders | UNVALIDATED | GXT closure evaluation may produce fresh objects where Glimmer reused references; anything relying on `===` in `didUpdateAttrs` or modifier arg comparison could silently over-invalidate. Flagged in domain review §2.3. Needs explicit test coverage before preview exits. |
| Named blocks, `has-block`, `has-block-params` | UNVALIDATED | Not in the 14-module set. |

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
- The opt-in installer for apps (proposed as `npx ember-cli-gxt enable`
  in `/tmp/gxt-plan-review-domain.md` §2.4) validates `package.json`:
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

This is the section that the engineering spike uncovered the most risk
in. See `/tmp/gxt-plan-review-bundling.md` and
`/tmp/gxt-plan-review-domain.md` §2.6.

#### 5.1 Transition artifact — Vite alias is not a shipping strategy

The current spike uses `vite.config.mjs` resolver aliases (lines
98-188, `GXT_MODE=true`) to rewrite `@glimmer/*` imports to the
`packages/demo/compat/*.ts` shims. **This approach is a test-time
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
  (`/tmp/gxt-plan-review-bundling.md` §1, §2) recommends deleting
  the barrel entirely in favor of a resolver-alias strategy applied
  **inside** `rollup.config.mjs` as a second build variant.
- `ember-source-gxt` is a separate Rollup build variant, invoked via
  `EMBER_RENDER_BACKEND=gxt` (or equivalent) that swaps the
  `exposedDependencies()` list in `rollup.config.mjs:255-281` to
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

### 6. `@glimmer/component` disposition

`@glimmer/component` is published independently of Ember and directly
imports `@glimmer/manager` and `@glimmer/reference`. If an app installs
it alongside `ember-source-gxt`, two copies of the reactive runtime
co-exist and the symbol identity of `Tag`, `createTag`, `CURRENT_TAG`,
`getCustomTagFor` forks across the two copies. The bundling review
(`/tmp/gxt-plan-review-bundling.md` §7) explicitly notes:

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

### 7. FastBoot + engines disposition

The earlier internal plan said "GXT has no SSR" and scoped rehydration
as multi-week. **That claim was factually incorrect** and is
corrected by the SSR exploration at `/tmp/gxt-ssr-exploration.md`:

- GXT has a **complete native SSR + rehydration subsystem** under
  `src/core/ssr/` in the upstream `@lifeart/gxt` repository (~1000
  lines of runtime plus ~1000 lines of tests, 52 test cases), wired
  into a published server entry (`src/server.ts`), with a working
  dev server (`pnpm dev:ssr`) and advertised as "Server Side
  Rendering" and "Rehydration" in the README
  (`/tmp/gxt-ssr-exploration.md` §1).
- GXT's SSR uses `happy-dom` on the server,
  `data-node-id="${NODE_COUNTER}"` attributes as alignment markers on
  elements, and `$[N]` suffixes inside reactive boundary comments.
  Client rehydration walks the DOM in **reverse depth-first order**
  and relies on a deterministic counter incrementing in the same
  order on client and server (`/tmp/gxt-ssr-exploration.md` §3).

The **actual** gap is that Ember's FastBoot pipeline uses `SimpleDOM`
plus `@glimmer/node`'s `serializeBuilder`, and Glimmer VM's rehydration
builder consumes opcode-driven markers, not counter markers. These two
are architecturally incompatible (`/tmp/gxt-ssr-exploration.md` §4):
different server DOM, different serializer, different alignment
strategy. Bridging them is 2-4 weeks of engineering per
`/tmp/gxt-ssr-exploration.md` §5 Option A (abstract GXT's `happy-dom`
import behind a DOM-provider factory and inject SimpleDOM), not
multi-month.

**Concrete action items for Phase 4:**

1. **Write a GXT-flavored `RehydrationDelegate`** for
   `packages/@glimmer-workspace/integration-tests/lib/modes/rehydration/delegate.ts`.
   The 393 failing `[integration] rehydration ::` tests are failing
   because that suite drives Glimmer VM's `EvaluationContext` + JIT
   runtime + SimpleDOM directly, which GXT does not plug into
   (`/tmp/gxt-ssr-exploration.md` §7). The fix is **one delegate
   file** that drives GXT's native `src/core/ssr/ssr.ts` +
   `withRehydration()`, not 393 individual test fixes. This single
   deliverable unblocks the largest single failure category in the
   Phase 0 spike.
2. **Abstract GXT's happy-dom import behind a DOM-provider factory.**
   Upstream change into `@lifeart/gxt` (`src/core/ssr/ssr.ts:39`) so
   the host can supply either happy-dom or SimpleDOM. This is the
   cleanest integration with FastBoot.
3. **Audit the compat layer for node-safe DOM assumptions.** Hard
   cases are `packages/demo/compat/manager.ts` (uses MutationObserver,
   which neither SimpleDOM nor happy-dom fully models),
   `packages/demo/compat/compile.ts` (mounts temporary DOM containers
   for runtime template compilation), and
   `packages/demo/compat/outlet.gts` (assumes live event handlers).
   Estimate: ~1 week per hard file.
4. **Engines.** `{{mount}}` is currently `UNTESTED`. Lazy engines with
   asset-map-driven bundle splits are a separate risk surface and are
   out of scope for the preview exit unless explicitly validated.

Until (1)-(3) land, `ember-source-gxt` is documented as **not
compatible with FastBoot**, full stop. The exploration correction
replaces the earlier "no SSR" framing but does not weaken the
user-facing constraint: an app that uses FastBoot today cannot opt
into GXT today.

### 8. Debug and Ember Inspector parity

Ember Inspector's component tree, render-tree tab, and "why did this
rerender" features are how working Ember engineers debug production
apps. Losing them is a material productivity hit and deserves its own
plan (`/tmp/gxt-plan-review-domain.md` §3, bullet 5).

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
   same commit. No `baseline - 0.5%` drift budget (see
   `/tmp/gxt-plan-review-qa.md` §1). Per-test diff gating, monotonic
   ratchet.
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
`changesets` linked package groups or `lerna publish --force-publish`,
per `/tmp/gxt-plan-review-bundling.md` §4 item 10.

**Contract tests.** A ~50-test suite exercising every GXT API Ember
depends on (`cellFor`, `$_ucw`, `destroyBranchSync`, modifier/helper/
component manager registration, reactive cell evaluation, destructor
order) runs **first** on every CI run. If contract tests fail, the
44k-test gate is skipped with a `gxt:upstream-regression` label
(`/tmp/gxt-plan-review-qa.md` §5 item 4). This gives sub-minute
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
minor to receive upstream fixes (`/tmp/gxt-plan-review-domain.md` §2.2).

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
   bundling review (`/tmp/gxt-plan-review-bundling.md` §1).
4. **Merge GXT concepts upstream into Glimmer VM incrementally.**
   Architecturally incompatible at the rehydration and reactive
   scheduler layers (`/tmp/gxt-ssr-exploration.md` §4). Not feasible
   on any useful timeline.
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
  categorized-allowlist QA infrastructure from
  `/tmp/gxt-plan-review-qa.md` §3 is in place.
- **Perf numbers.** Bundle size (gzip + brotli), initial render, update
  throughput, memory-at-steady-state. Phase 3 deliverable. This RFC
  intentionally does not state any perf claim.
- **Embroider v2-addon + strict-mode integration exact contract
  (§5).** The resolver-alias strategy is the current plan but has not
  been proven against a real v2 addon graph.

---

*References cited from the review reports:*

- `/tmp/gxt-plan-review-domain.md` — SemVer, addon contract, build
  toolchain, `@glimmer/component`, governance
- `/tmp/gxt-plan-review-bundling.md` — blast radius, resolver alias vs
  runtime flag, `-internals/metal` scope, type declaration surface,
  `@glimmer/component` symbol-identity risk (§6-§8)
- `/tmp/gxt-plan-review-qa.md` — pass-rate gate, baseline format,
  skip policy, upstream risk, infrastructure investment
- `/tmp/gxt-ssr-exploration.md` — GXT native SSR reality, FastBoot
  bridge, 393 rehydration test failures root cause

*Engineering spike references:*

- `vite.config.mjs:98-188` — current GXT_MODE alias list (transition
  artifact only)
- `rollup.config.mjs:255-281` — `exposedDependencies()` where the
  classic-vs-GXT build variant branch belongs
- `packages/@ember/-internals/metal/lib/` — 19 files missing from the
  original Phase 2 scope
- `packages/@ember/-internals/glimmer/lib/` — 51 files in the
  original Phase 2 scope
- `packages/demo/compat/` — the current compat layer (validator.ts,
  reference.ts, destroyable.ts, manager.ts, compile.ts, outlet.gts,
  and the supporting files)
- Commits `5176f4b229`, `9005f9892b`, `14cd323211` — recent
  contextual-component and outlet stabilization
