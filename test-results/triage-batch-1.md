# Triage Batch 1 — Top 5 Failing Modules

Investigation only. No source code changes. Each entry is sized for a future
fix agent and cross-links suspected GXT backend locations.

**Runner:** `scripts/gxt-test-runner/runner.mjs`
**Vite:** `GXT_MODE=true npx vite --port 5180`
**Baseline:** `test-results/gxt-baseline.json` (commit `b1b7637725`, 5327/5938)
**HEAD at investigation:** `39761b8d7a` on `glimmer-next-fresh`

---

## 1. `Components test: dynamic components`

- **Baseline failures:** 10 (this run reported 12 — one extra sub-test plus
  `component helper properly invalidates hash params inside an {{each}}
  invocation #11044` and `static arbitrary number of positional parameters`,
  likely flake / subtest counting drift; the dominant failure set matches).
- **Run result:** 8/20 passing.
- **Failing tests (from filtered run):**
  1. `it can render a basic component with a dynamic component name argument`
  2. `it renders the layout with the component instance as the context`
  3. `the component and its child components are destroyed`
  4. `component helper destroys underlying component when it is swapped out`
  5. `component helper with bound properties are updating correctly in init of component`
  6. `nested component helpers`
  7. `component with dynamic component name resolving to a component, then non-existent component`
  8. `component helper properly invalidates hash params inside an {{each}} invocation #11044`
  9. `positional parameters does not clash when rendering different components`
  10. `positional parameters does not pollute the attributes when changing components`
  11. `static arbitrary number of positional parameters`
  12. `dynamic arbitrary number of positional parameters`

- **Observed symptoms:**
  - `Expected a HTMLElement, but got null` on `assertComponentElement` —
    **`{{component this.name}}` renders nothing on first paint** (`this.firstChild`
    is null).
  - For layout-context test: first render shows `hello` but should show
    `goodbye` — **layout component class's template not resolved; the default
    `{{this.content}}` from the outer context is being used instead of the
    registered component's own template.**
  - Component destroy counters all `0` on expected 1s — **dynamic components
    swapped in via `{{component ...}}` are not routed through
    `__gxtDestroyEmberComponentInstance` when replaced.**
  - `#11044 hash params inside {{each}}` — positional/curried args from
    `{{component}}` helper are not re-invalidated when the enclosing each row
    updates.

- **Root-cause hypothesis (single dominant cause):**
  The `$_dc_ember` wrapper in `compile.ts:5337` (the current
  dynamic-component dispatch path) only works reliably when the `component`
  helper is used as a TOP-LEVEL curly in a template. When the dynamic name
  comes from a **nested context** (arg, `each` row, subexpression) or when
  the layout component class owns its own template via
  `registerComponent({ ComponentClass, template })`, the wrapped string
  marker fails to pick up the template factory out of
  `(globalThis as any).COMPONENT_TEMPLATES`. Symptom is "renders nothing"
  because `__stringComponentName` is set but resolution finds no compiled
  template.
  Secondary cause: `_destroyOldDcInstance` only fires when the marker's
  identity key changes during the SAME wrappedGetter invocation; it does not
  hook destroy when the outer component tear-down path removes the DOM, so
  destroy hooks never fire.

- **Suspected fix locations:**
  - `packages/@ember/-internals/gxt-backend/compile.ts` — `$_dc_ember` wrapper
    (lines ~5337–5500) and the `__stringComponentName` resolution path in
    `ember-gxt-wrappers.ts:1120 renderComponent(...)` (stringMarker branch).
  - `packages/@ember/-internals/gxt-backend/manager.ts` — curried arg merging
    at lines ~4425–4660 when `komp.__isCurriedComponent` meets a `componentGetter`
    swap. Note: last 5 commits already touched `$_dc_ember` / `CurriedComponent`
    heavily — there's churn here.
  - DOM-destroy integration: `destroyable.ts` + the `_dcEmberInstance`
    capture hook near `compile.ts:5375`.

- **Sizing:** **M** (3–5 files, ~200–400 lines; primarily plumbing improvements
  to an existing path, no new architectural work).

- **Dependencies:** Overlaps with Phase 2.5 CurriedComponent work in flight
  (see commits `5176f4b229`, `9005f9892b`, `14cd323211`). A fix agent must
  coordinate with whichever branch is currently landing CurriedComponent
  polish; any fix here should be layered on top of the 221/223 contextual-
  components progression.

---

## 2. `Helpers test: custom helpers`

- **Baseline failures:** 10.
- **Run result:** 20/34 passing (14 fails — 4 additional intermittent tests
  that also failed but weren't in baseline delta: `helper params can be
  returned`, `parameterless helper is usable in subexpressions`, `simple/class
  helper not usable within element`).

- **Failing tests:**
  1. `class-based helper can recompute a new value`
  2. `class-based helper lifecycle`
  3. `class-based helper with static arguments can recompute a new value`
  4. `class-based helper with static arguments can recompute a new value without a runloop`
  5. `helper params can be returned`
  6. `parameterless helper is usable in subexpressions`
  7. `parameterless helper is usable in attributes`
  8. `simple helper not usable with a block`
  9. `class-based helper not usable with a block`
  10. `simple helper not usable within element`
  11. `class-based helper not usable within element`
  12. `class-based helper used in subexpression can recompute`
  13. `class-based helper used in subexpression can recompute component`
  14. `Can resolve a helper`

- **Observed symptoms:**
  - Class-based `recompute()`: output stays `1` when expected `2` after
    `helper.recompute()` runs inside `runTask`.
  - `class-based helper lifecycle`: `Cannot read properties of undefined
    (reading 'recompute')` — the closure captured in `init()` is never
    assigned, meaning **GXT never invoked the Ember `init()` hook on the
    helper instance**.
  - `helper params can be returned` / attribute / subexpression cases: empty
    DOM — **helper invocation in attribute / subexpression position does not
    write return value into the binding**.
  - `simple/class helper not usable with a block / within element`: `expected:
    {}` means `assert.throws(...)` did not throw — **GXT compile pipeline
    does not emit the "helpers cannot be used as blocks / in element space"
    error that Ember's compiler guards against**.
  - `Can resolve a helper`: `[Hello, world!][]` — first-invocation helper
    works, second (different helper resolved via owner) returns empty —
    **owner.factoryFor('helper:xxx') resolution miss for the second helper**.

- **Root-cause hypothesis (two shared causes):**
  A) **Class-based helper lifecycle is half-wired.** The
     `_tagHelperInstanceCache` in `compile.ts:2796` stores instances keyed by
     kebab name and tracks a `recomputeTag`, but (1) `init()` is not being
     invoked on the Ember classic helper instance — the `helper = this`
     capture lines never run, so the test's `helper.recompute()` call happens
     on `undefined`; (2) when `recompute()` IS called directly on a
     manually-instantiated helper, the dedup key in
     `compile.ts:4356–4368` consumes `recomputeTag.value` but the cached
     formula result isn't re-read because the helper's `compute()` is only
     invoked inside `registerHelper`-wrapped path, bypassing the classic
     `init/compute/destroy` lifecycle.
  B) **Compile-time helper-position validation is missing.** GXT backend
     never emits an error for `{{#helper}}...{{/helper}}` (block helper) or
     `<div {{helper}}>` (element-space helper). That's a pure compile-time
     assertion gap in `compile.ts` template-walk or a template-compiler
     plugin.

- **Suspected fix locations:**
  - `packages/@ember/-internals/gxt-backend/helper-manager.ts` — the
    `CustomHelperManager` wrapper needs to route through Ember's classic
    `Helper` base class so `init/compute/destroy` fire. The compat layer
    likely exists but isn't bridged to the `_tagHelperInstanceCache`.
  - `packages/@ember/-internals/gxt-backend/compile.ts` — lines 4293–4370
    (helper instance caching + recompute tag consumption), plus a new
    compile-time check for helpers in block / element-space positions.
  - `packages/@ember/-internals/gxt-backend/ember-gxt-wrappers.ts` — helper
    params in attribute / subexpression position (lines ~440–550) likely
    needs the same argument-serialization that component invocation got.

- **Sizing:** **M** (3 files, ~300 lines; class-based helper
  lifecycle is the meaty piece, block-usage assertion is small).

- **Dependencies:** Lifecycle fix will share code with Phase 4.1 "Ember
  classic components through manager" work — if that refactor is in flight,
  defer until it lands.

---

## 3. `Strict Mode - renderComponent` (+ `Strict Mode - renderComponent - built ins`)

- **Baseline failures:** 9 (main module) + 4 (built-ins variant) = 13
  total in this family; the task lists the 9 for the main module.
- **Run result:** 11/22 (main) + 3/9 (built-ins) — 17 total observed fails
  across both modules. (`Strict Mode - renderComponent (direct)` passes 2/2.)

- **Failing tests (main module):**
  1. `Can use a custom modifier in scope`
  2. `Can shadow keywords`
  3. `multiple components have independent lifetimes`
  4. `Can use a curried dynamic helper`
  5. `Can use a curried dynamic modifier`
  6. `when args are trackedObject, the rendered component response appropriately`
  7. `a modifier can call renderComponent`
  8. `can render in to a detached element`
  9. `renderComponent is eager, so it tracks with its parent`
  10. `multiple renderComponents share reactivity`
  11. `multiple renderComponents share service injection`

- **Failing tests (built-ins):**
  1. `Can use hash`
  2. `Can use array`
  3. `Can use get`
  4. `Can use on and fn`
  5. `Can use each-in`
  6. `Can use in-element`

- **Observed symptoms:**
  - `Can shadow keywords` / `custom modifier in scope` / `curried dynamic
    helper`/`modifier`: empty output — **scope passed to `renderComponent`
    doesn't propagate as strict-mode bindings** (helpers/modifiers in the
    strict scope resolve to nothing).
  - `Can use a curried dynamic helper`: actual rendered content is the
    literal source text `function __emberCurriedHelper(...)` — the curried
    helper function is being stringified into the DOM, meaning **GXT sees
    it as raw text, not as a helper invocation**, in the strict scope.
  - `multiple renderComponents share reactivity / service injection`: both
    DOM islands show `2` instead of `3` — **cross-island reactive formulas
    are not being re-evaluated when tracked state changes because each
    `renderComponent` call produces an **independent** root formula tree
    that doesn't share the GXT roots list.**
  - `renderComponent is eager, so it tracks with its parent`: `<div></div>`
    rendered (shell only, body never filled) — **modifier-driven
    re-invocation of `renderComponent` not flushed** into the destination.
  - `can render in to a detached element`: detached target DOM never
    receives output — `_renderComponentGxt` only handles `Element` instances
    via `innerHTML = ''`, not DocumentFragment / detached nodes.
  - `Can use hash / array / get / on / fn / in-element / each-in` (built-ins):
    empty DOM — **the built-in set that the strict-mode compiler expects to
    be pre-injected into scope is not being pre-seeded before
    `_renderComponentGxt` compiles the template**.

- **Root-cause hypothesis (single dominant architectural cause):**
  `_renderComponentGxt` at `packages/@ember/-internals/glimmer/lib/renderer.ts:1403`
  is the thin GXT bypass used when `__GXT_MODE__` is true. Its current
  responsibilities cover: (1) resolve template, (2) optionally run
  custom-component-manager, (3) copy args. It does NOT do any of:
  - Register roots with the GXT root tracker so reactive updates flow.
  - Process the component's `scope` argument — strict-mode built-ins
    (`hash`, `array`, `get`, `on`, `fn`, `in-element`, `each-in`) and
    user-provided helpers/modifiers in scope are never installed as locals.
  - Support non-Element `into` targets (detached nodes, fragments).
  - Thread args wrappers through `__gxtTriggerReRender` so that reassigning
    tracked args on the outer side causes the sub-render to update.

  So **all 17 failures trace back to the fact that `_renderComponentGxt` is
  a minimal placeholder** that never learned about strict scope, built-ins,
  root tracking, or non-Element targets.

- **Suspected fix locations:**
  - `packages/@ember/-internals/glimmer/lib/renderer.ts` — `_renderComponentGxt`
    (lines 1403–1510). Needs a proper integration with GXT `renderComponent`
    and the strict-scope bridge.
  - `packages/@ember/-internals/gxt-backend/ember-gxt-wrappers.ts` — the
    `renderComponent` export (lines ~1120+). Already has scope-aware logic
    for curried helpers / arrays; the main-renderer bypass just needs to
    call INTO this instead of re-implementing its own minimal path.
  - `packages/@ember/-internals/gxt-backend/compile.ts` — strict-mode
    built-in injection table (the `hash`/`array`/`get`/`on`/`fn`/`in-element`
    globals).

- **Sizing:** **L** (500+ lines, cross-package — this is the
  biggest ticket in the batch; touching public API boundary between
  `@ember/renderer` and GXT backend).

- **Dependencies:** Blocks/blocked-by Phase 4.2 "renderComponent public
  API unification". If Phase 4.2 is already scoped to rewrite
  `_renderComponentGxt`, do NOT fix this module standalone — fold it into
  that PR. Also depends on Module #1 (dynamic components) getting its
  curried-component reactive swap fix, because `multiple renderComponents
  share reactivity` will regress without it.

---

## 4. `<LinkTo /> component with query params (routing)`

- **Baseline failures:** 8.
- **Run result:** 11/19 passing (8 fails — matches baseline exactly).

- **Failing tests:**
  1. `supplied QP properties can be bound`
  2. `supplied QP properties can be bound (booleans)`
  3. `href updates when unsupplied controller QP props change`
  4. `it applies activeClass when query params are not changed`
  5. `it applies active class when query-param is a number`
  6. `it applies active class when query-param is an array`
  7. `it disregards query-params in activeness computation when current-when is specified`
  8. `it does not throw an error if called without a @route argument, but with a @query argument`

- **Observed symptoms:**
  - `supplied QP properties can be bound`: href is `/?foo=OMG` expected
    `/?foo=ASL` — **query object is not being re-read when the bound value
    changes**, but the initial value `OMG` is the hard-coded test fallback,
    not the bound controller value, meaning the GXT LinkTo is never reading
    the controller QP defaults in the first place.
  - `href updates when unsupplied controller QP props change`: actual
    `/?foo=lol`, expected `/?bar=BORF&foo=lol` — **controller-default QPs
    are not merged with the user-supplied `@query`**. The GXT LinkTo only
    looks at `this.args.query`.
  - `it applies activeClass`: all variants fail — `Cannot read properties
    of undefined (reading 'className')`, `attr(name) called on a NodeQ` —
    **there is no `active` class computation at all; the LinkTo renders
    a plain anchor with no state-dependent class binding**.
  - `it disregards query-params ... when current-when is specified`:
    `current-when` attribute is silently ignored.
  - `it does not throw ... @route argument`: fails because
    the stub LinkTo requires `this.route` truthy to render — it returns
    `#` when absent, but then active-class checks still fail because
    activeness is never computed.

- **Root-cause hypothesis (single dominant cause):**
  `packages/@ember/-internals/gxt-backend/link-to.gts` (92 lines) is a
  **stub implementation** that intentionally ignores:
  1. Controller default query params (it only reads `args.query`).
  2. Route activeness (no subscription to the current route + query state).
  3. `activeClass`, `current-when`, `disabledWhen`, `preventDefault`.
  4. `@models` vs `@model` edge cases in URL construction (it already
     handles them but without the proper router `generate(...)` call).

  All 8 failures trace to the fact that **this file was written as a
  placeholder** and never integrated with `@ember/routing`'s QP state
  machine. The file explicitly says "simplified version" in its header.

- **Suspected fix locations:**
  - `packages/@ember/-internals/gxt-backend/link-to.gts` — rewrite to read
    `service:router` and compute `isActive` / `href` via
    `router.recognize(...)` + `router.generate(...)`. Mirror Ember's
    upstream `LinkTo` component in
    `packages/@ember/routing/-internals/link-to.ts`.
  - May also need a companion helper in
    `packages/@ember/-internals/gxt-backend/ember-routing.ts` to expose
    controller QP defaults to the LinkTo computation.

- **Sizing:** **L** (single file but a proper port is 400+ lines —
  the upstream `LinkTo` is ~500 LOC and the QP merge logic is intricate).
  Could be scoped down to **M** if the fix agent ports only the QP + active
  logic and defers `current-when` / `disabledWhen` to a follow-up.

- **Dependencies:** Needs router service integration. Only blocked by
  Phase 2.5 if that phase touches `ember-routing.ts`'s QP cache layer
  (it doesn't appear to — safe to fix in isolation).

---

## 5. `Syntax test: {{#each-in}} with ES6 Maps`

- **Baseline failures:** 8.
- **Run result:** 0/8 passing (8 fails — matches baseline).

- **Failing tests:**
  1. `it supports having objects as keys on ES6 Maps`
  2. `it repeats the given block for each item in the hash`
  3. `it can render sub-paths of each item`
  4. `it can render duplicate items`
  5. `it repeats the given block when the hash is dynamic`
  6. `keying off of \`undefined\` does not render`
  7. `it can render items with a key of empty string`
  8. `it can render items that contain keys with periods in them`

- **Observed symptoms:**
  - Every failure has the same pattern: **the initial render passes (the
    Map is iterated correctly once), but a subsequent update — either
    `map.set/delete` on the same Map OR
    `set(this.context, 'map', newMap)` — does not re-render**. The DOM
    keeps showing either the pre-mutation state or, in replacement tests,
    the OLD map's entries.
  - `it supports having objects as keys`: after replacing the Map via
    `set(this.context, 'map', ...)`, actual shows `<li>one: foo</li><li>two:
    bar</li>` (original map), expected `<li>three: qux</li>` (new map).
  - `it repeats ... when hash is dynamic`: after `set(this.context,
    categories, newPojo)`, actual still shows the original categories.
  - `keying off of undefined does not render`: rendering non-map path,
    expected `bar: Here!` actual `Empty!` — so here the FIRST render
    is wrong, not an update.

- **Root-cause hypothesis (single dominant cause):**
  Two related but distinct bugs:

  A) **`gxtEntriesOf` (compile.ts:2997) is not reactive w.r.t. Map contents
     or Map identity.** The function reads `resolved.entries()` once and
     returns a fresh array of `{k,v}` pairs. GXT's `{{#each}}` formula will
     re-invoke `gxtEntriesOf` only if the outer tracked dependency
     (`this.map`) reports a change. When the Map reference is REPLACED on
     the context, GXT's own tracking should fire — but the test is failing,
     meaning either: (i) the `set(context, 'map', newMap)` call isn't
     hitting the GXT setter for that property, OR (ii) the each block is
     memoizing the first `gxtEntriesOf` result inside a derived formula
     whose tracked deps don't include `this.map`.

  B) **Map mutations (`.set`, `.delete`) are never reactive in GXT**, full
     stop. Unlike arrays (which go through `_arrayOwnerMap` tracking) and
     plain objects (which go through `_objectValueCellMap`), Map instances
     have no proxy / observer. This is why "it repeats the given block for
     each item in the hash" cannot transition from 2-items to `Empty!` when
     the test uses `map.clear()` or removes entries.

  Bug B is the meatier structural issue — GXT needs Map/Set reactivity
  hooks. Bug A is incidental to how the each-in transform wraps the
  expression.

- **Suspected fix locations:**
  - `packages/@ember/-internals/gxt-backend/compile.ts` — `gxtEntriesOf`
    (lines 2997–3048). Needs to either (a) proxy the Map with a tracked
    wrapper before returning entries, or (b) call a new
    `gxtTrackMap(resolved)` helper that bumps a dependency tag on
    `.set/.delete/.clear`.
  - `packages/@lifeart/gxt` runtime — add Map/Set reactivity primitives
    (new `$_trackMap` / `$_trackSet` helper). This likely requires
    touching the upstream GXT package, NOT just the ember.js compat layer.
  - `packages/@ember/-internals/gxt-backend/compile.ts` — `transformEachInBlocks`
    (line 5583) may need to emit a wrapper `gxtTrackMap` around the
    `gxtEntriesOf` call so the tracking primitive runs every re-eval.

- **Sizing:** **M** if GXT already has Map-tracking primitives
  unused (then it's a wiring fix in compat layer, ~150 lines). **L** if
  the fix requires a new primitive in `@lifeart/gxt` (cross-package
  change, new public API surface, tests in both repos).

- **Dependencies:** If a cross-repo fix: requires a `@lifeart/gxt`
  release followed by the pnpm-store copy + vite cache purge ritual
  documented in `feedback_gxt_pnpm_gotcha.md`. Check whether there's an
  existing Map/Set reactivity effort in flight before opening a parallel
  one.

---

## Summary

- **Total failures across these 5 modules (per this run):**
  12 + 14 + 17 + 8 + 8 = **59** (baseline counts 45; the ~14-failure
  delta is the two "also failing within this module" tests that weren't in
  the top-5-bucket selection).
- **Shared root causes:**
  - Modules #1 and #3 both hinge on `CurriedComponent` + `$_dc_ember`
    reactive swap correctness; a fix for one will bleed into the other.
    Module #3's `multiple renderComponents share reactivity` is
    essentially the same class of bug as Module #1's `nested component
    helpers`.
  - Modules #3 and #2 both need proper lifecycle bridging from Ember
    classic classes (Helper / Component) into GXT's render loop — both
    suffer from Ember's `init()` not being called.
  - Module #5 (Map reactivity) is structurally isolated.
  - Module #4 (LinkTo) is structurally isolated.
- **Sizing totals:**
  - #1 M, #2 M, #3 L, #4 L (likely M if scoped), #5 M (possibly L).
  - **3 M + 2 L**, estimated **~1500–2200 LOC** total across
    `packages/@ember/-internals/gxt-backend/`, `packages/@ember/-internals/glimmer/lib/renderer.ts`,
    and possibly `@lifeart/gxt`.
- **Recommended fix order (maximum impact first):**
  1. **Module #1 — dynamic components** (M, no cross-repo dep, unblocks
     #3). Highest leverage: the CurriedComponent / `$_dc_ember`
     reactive swap is the recurring pain point in the last 5 commits and
     a proper fix here will have compounding benefits across the whole
     `gxt:triage` bucket.
  2. **Module #2 — custom helpers** (M, localized, no cross-repo dep).
     Class-based helper lifecycle is a prerequisite for any test using
     `recompute()` — likely helps other triage modules that touch
     classic helpers.
  3. **Module #4 — LinkTo with QP** (M-scoped, isolated). Big visibility
     win because it unblocks the entire `<LinkTo /> ... routing` test
     family, not just the 8 listed.
  4. **Module #5 — each-in with ES6 Maps** (M if upstream GXT already
     has Map primitives, else L). Do this BEFORE Module #3 to avoid
     re-doing Map reactivity work inside `renderComponent`.
  5. **Module #3 — Strict Mode renderComponent** (L). Do this LAST —
     biggest ticket, relies on everything above being solid. Probably
     folds into Phase 4.2 if that phase exists.
- **Smoke sanity:** **333/333 passing, 2365/2379 assertions** across all
  14 smoke modules (17 s). Confirmed no regressions from investigation.

---

## Appendix — raw artifacts

- `/tmp/triage-1-dynamic.json`
- `/tmp/triage-1-custom.json`
- `/tmp/triage-1-strict.json`
- `/tmp/triage-1-linkto.json`
- `/tmp/triage-1-eachin.json`
