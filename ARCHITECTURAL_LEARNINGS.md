# Architectural Learnings — 6 Remaining GXT/Ember Failures

Research date: 2026-04-18. Pure read-only investigation across `/Users/lifeart/Repos/glimmer-next/src/core/` and `/Users/lifeart/Repos/ember.js/packages/@ember/-internals/gxt-backend/`.

## GXT architecture baseline

- **Reactivity** (`glimmer-next/src/core/reactive.ts`): `Cell<T>` = writable source, `MergedCell` = formula that captures deps via a MODULE-LEVEL `currentTracker: Set<Cell>`. `bindAllCellsToTag` registers formula as dependent.
- **Opcodes** (`vm.ts`): Every template binding calls `opcodeFor(tag, cb)` — runs once eagerly (clears tracker), stores in `opsForTag`. On `scheduleRevalidate`, `executeTag` walks registered callbacks.
- **Tree** (`tree.ts`): `TREE`/`CHILD`/`PARENT` maps; `addToTree` registers destructor that clears them and recycles the ID.
- **Critical**: `currentTracker` is global, per-call save/restore. **No per-component tracking scope** — just per-formula. `effect()` is standalone `formula + opcodeFor`, no lifecycle auto-binding. Ember-side `_gxtEffect` relies on manual `registerDestructor`.

---

## 1. Component Tracked Properties w/ Args Proxy

**Current architecture.** Each binding is its own `opcodeFor`. Opcode isolation is correct — inner text doesn't spill tracking into outer. The culprit is Ember-side: `manager.ts:2656 __gxtSyncAllWrappers` iterates EVERY entry in the global `trackedArgCells` Set and unconditionally calls `getter()` on every arg cell every sync cycle (line 2675). On inner's `count++`, the sync cycle also invokes outer's `get count()` getter → `outerRenderCount++`.

**Gap.** No "dirty list" — the global sync loop is unconditional. GXT's per-formula dependency tracking already exists; it's just not used for arg-cell refresh.

**Concrete files to modify.**
- `/Users/lifeart/Repos/ember.js/packages/@ember/-internals/gxt-backend/manager.ts` — replace the for-loop at lines 2662–2756.
- `/Users/lifeart/Repos/glimmer-next/src/core/reactive.ts` — optionally expose a helper `createArgCell(getter)` that wraps `formula(getter)` + `opcodeFor` so cells only update when `getter`'s dep cells change.

**Proposed approach.**
- Replace `argCells[key] = { cell, getter }` with `{ cell, formula: formula(getter) }` — the `formula` captures deps the first time.
- In `__gxtSyncAllWrappers`, instead of calling `getter()` unconditionally, iterate `tagsToRevalidate` set (already rolled into GXT's own revalidation). Register an `opcodeFor(argFormula, v => cell.update(v))` at arg-cell creation time; remove the manual `getter()` loop entirely.
- Gate the lifecycle-hook trigger on whether `cell.update()` actually changed `cell.__value`.

**Risk/complexity: HIGH.** `__gxtSyncAllWrappers` is the nexus for classic Ember lifecycle hooks (didUpdateAttrs, didReceiveAttrs, set-via-attr → cp recompute, mut binding propagation). Changing the loop to dirty-driven requires moving every side-effect inside the callback. Touches ~200 lines of lifecycle logic (manager.ts 2656–2850).

**Test that verifies.** `tests/integration/components/tracked-test.js` → the 'Component Tracked Properties w/ Args Proxy' module, specifically `outerRenderCount` assertions. +1 test.

---

## 2. Mutable Bindings CP (mut-cell two-way propagation)

**Current architecture.** `manager.ts:1067–1083` creates `emberAttrs[key] = {get value, update(v)}`. For `(mut this.width)`, `mutCell` is an invokable ref from `reference.ts:createInvokableRef` that routes `update` → `updateRef(inner)` → parent's child-ref → `setProp`. The test's `style` is `@computed('height','width')` — classic Ember tag system. The question: when `mutCell.update` fires, does it bump the Ember tag for `width` on the source object?

**Gap.** The bridge from GXT `cell.update()` → Ember's `dirtyTagFor`. Stock GXT cells don't notify the classic `@glimmer/validator` tag system. In the manager, `__classicDirtyTagFor` is invoked only in some paths (e.g. line 1296 for the installed effect), not in the mutCell update chain from `createInvokableRef`.

**Concrete files to modify.**
- `/Users/lifeart/Repos/ember.js/packages/@ember/-internals/gxt-backend/reference.ts:389–404` — `createInvokableRef`: after `updateRef(inner, v)`, also call `__classicDirtyTagFor(obj, path)` for the upstream path.
- `/Users/lifeart/Repos/ember.js/packages/@ember/-internals/gxt-backend/manager.ts:4098–4122` — regular-arg `.update(newValue)`: when propagating up via `__gxtTwoWayBindings`, also dirty the Ember tag on `srcInst`.

**Proposed approach.**
- In `createInvokableRef`, capture the inner ref's `debugLabel` path and root object at creation. When `update(v)` runs, after `updateRef(inner, v)` call `__classicDirtyTagFor(root, path)`.
- Alternatively, route every `cell.update(v)` for cells that correspond to classic instance properties through a central "dirty tag + bump cell" helper. There's already `triggerReRenderForAttrs` — extend it to `triggerReRenderAll(obj, key)` that dirties BOTH layers and use it everywhere.

**Risk/complexity: MEDIUM.** The wiring is narrow (2 call sites) but verifying every combination of `@computed` / `@tracked` / plain / mut / readonly dependent property is tedious. Risk of double-invoking observers (GXT's `__gxtTriggerReRender` already fires observers in some paths).

**Test that verifies.** `tests/integration/helpers/mut-test.js` line 508 'an attribute binding of a computed property with a setter of a 2-way bound attr recomputes when the attr changes'. +1 test in the mut module.

---

## 3. LinkTo `#each'd` angle-bracket (list destructor timing)

**Current architecture.** `SyncListComponent.constructor` (`list.ts:658–696`) registers destructors on `this`, added to the tree under `parentCtx` (lines 211–213). Destructor uses `opcodeFor(this.tag, ...)`.

Test scenario: routing transition re-renders the outlet; the outer component remounts. During remount, the previous list is torn down WHILE new items instantiate. For `<LinkTo @route={{blockParam}}>` inside, new `LinkTo` creation needs the list's `ctx`/`owner` via `TREE[parentId]`. If teardown reached `TREE.delete(listId)` (line 225) before the lookup, `TREE.get()` returns undefined and crashes.

Root cause: destruction and construction run in the SAME flush. Synchronous `TREE.delete` during `scheduleRevalidate` pulls the list's entry out while downstream code still needs it.

**Gap.** No "tombstone" phase — TREE entries are deleted synchronously during a flush that also needs them for in-flight reads. Curly `{{#link-to}}` works because it's a helper-based path that resolves through Ember's runtime registry (via `__dcComponentGetter`), not through the component TREE walk for owner lookup.

**Concrete files to modify.**
- `/Users/lifeart/Repos/glimmer-next/src/core/tree.ts:147–169` — make tree-entry cleanup deferred (post-flush). The destructor currently synchronously deletes TREE/PARENT/CHILD.
- `/Users/lifeart/Repos/glimmer-next/src/core/control-flow/list.ts:222–229` — same, defer the explicit list TREE deletion to after the current sync finishes.
- `/Users/lifeart/Repos/glimmer-next/src/core/destroy.ts:175–200` — consider phasing destruction into (1) run destructors (2) DOM cleanup (3) tree map cleanup.
- `/Users/lifeart/Repos/ember.js/packages/@ember/-internals/glimmer/lib/components/link-to.ts` — fall back to a cached owner/router if the tree lookup returns null.

**Proposed approach.**
- Introduce a "post-flush" queue in GXT. `registerPostFlushCleanup(() => TREE.delete(id); PARENT.delete(id); releaseId(id))`. Destructors queue cleanup instead of running it inline.
- Alternatively (simpler): in `LinkTo`'s creation path, stash the owner on the component itself at creation time so lookup doesn't walk TREE later.
- Give `list.ts` constructor a "pending teardown" flag. When `syncList` fires, if pending-teardown, suppress TREE delete until next tick.

**Risk/complexity: HIGH.** Deferred TREE deletion affects dozens of code paths that assume sync TREE state (every `getContext()`, every `initDOM()`). Any one of them could now miss entries that haven't been cleaned, producing subtle memory leaks. Alternative (cached owner on LinkTo) is lower risk but doesn't fix the general class of bugs.

**Test that verifies.** `tests/integration/components/link-to/*` — the angle-bracket in `{{#each}}` test (should be findable by grepping `{{#each}}.*<LinkTo`). Expected +1 test module.

---

## 4. Contextual components dot-path (`{{api.my-nested-component}}`)

**Current architecture.** `{{hash my-nested-component=(component "..." my-parent-attr=this.my-attr)}}` creates a curried component (`__isCurriedComponent = true`) that captures `this.my-attr` as a GETTER in `__curriedArgs`. When the yielded API's dot-path `{{api.my-nested-component}}` invokes the component, `ember-gxt-wrappers.ts:272` renders with captured args.

The failure: after the `changeValue` action increments `myProp` on `my-action-component`, which increments `my-attr` on `my-component`, which should update `my-parent-attr` inside `my-nested-component` — the cell chain has a broken link at the dot-path access. The yielded `api` is a plain hash object; reading `api.my-nested-component` returns the curried component function, but the curried-component's `my-parent-attr` getter was captured against a stale scope.

**Gap.** When the compiler builds the `(component "..." my-parent-attr=this.my-attr)` helper, it captures a getter closure but that getter needs to reactively track `this.my-attr`. If the curried component's args use plain snapshotting instead of getter-forwarding, the downstream `my-nested-component` receives the value at capture time.

**Concrete files to modify.**
- `/Users/lifeart/Repos/ember.js/packages/@ember/-internals/gxt-backend/ember-gxt-wrappers.ts:150–280` (the curriedComponent wrapper — lines 272, 903, 1589).
- `/Users/lifeart/Repos/ember.js/packages/@ember/-internals/gxt-backend/manager.ts:157–200` (nested currying merge at line 167 — uses `{...nameOrComponent.__curriedArgs, ...args}` spread, which SNAPSHOTS values).

**Proposed approach.**
- Change the spread at manager.ts:167 to preserve getter descriptors: walk with `Object.getOwnPropertyDescriptors` and use `Object.defineProperty` when the descriptor is a getter.
- Verify in `createComponentInstance` (`manager.ts:1031`) that `getArgValue(args, key)` returns the getter for curried-inherited keys.
- Install a GXT formula on each curried arg: `formula(() => getter())` + opcodeFor that `cell.update`s the nested component's arg cell. This makes the curried path reactive end-to-end.

**Risk/complexity: MEDIUM.** Currying path is used by `component`, `helper`, and `modifier` helpers. Touches `$_MANAGERS` invocation chain. Regressions could affect `{{yield (component ...)}}` everywhere (~30 tests).

**Test that verifies.** `tests/integration/components/contextual-components-test.js:760` 'renders with dot path and updates attributes'. +1 test in the contextual-components module.

---

## 5. Query Params main #13263

**Current architecture.** NOT a GXT problem. `route.ts:2061` installs `addObserver(controller, 'foo.[]', controller, controller._qpChanged, false)` as part of `setupControllerQueryParamObservers`. The observer fires when `controller.foo`'s tag dirties. On `incrementProperty('foo')`, `set` calls `notifyPropertyChange` → dirties the tag → observer fires → `_qpChanged` → router URL update.

The failure: after `route.refresh()` the controller model is rebuilt, breaking the observer-chain-tag. The second `incrementProperty('foo')` dirties a NEW tag (post-refresh controller instance), but the router's registered observer may have been installed on the OLD tag.

**Gap.** Observer reinstallation after `route.refresh()`. The `setupControllerQueryParamObservers` needs to be idempotent-by-controller or re-run on refresh.

**Concrete files to modify.**
- `/Users/lifeart/Repos/ember.js/packages/@ember/routing/route.ts:2040–2063` — check if the observer re-registers, or if the controller reference shifts.
- `/Users/lifeart/Repos/ember.js/packages/@ember/routing/route.ts:914–950` — `_activeQPChanged` and `_updatingQPChanged`.
- Consider: is `controller` recreated on `refresh()`, or reused? If reused, the tag should still fire.

**Proposed approach.**
- Run the failing test with `DEBUG` observer logging to see whether `_qpChanged` fires on click 2 and 3.
- If observer fires but URL doesn't update: issue is in `_activeQPChanged` → `router.js` internal state.
- If observer DOES NOT fire: the tag chain is broken. Check `tagFor(controller, 'foo')` before and after `refresh()` — is it the same tag instance?
- Likely fix: in `refresh()`, explicitly walk QPs and call `notifyPropertyChange(controller, qp.prop)` to re-dirty tags.

**Risk/complexity: LOW-MEDIUM.** Localized to routing. One test, one module. The surrounding test module passes (visitAndAssert works once), so the core observer install is fine.

**Test that verifies.** `ember/tests/routing/query_params_test.js:743` 'queryParams are updated when a controller property is set and the route is refreshed. Issue #13263'. +1 test in that module.

---

## 6. JIT VM-bypass tests (Updating @index, initial-render client Loops)

**Current architecture.** `integration-tests/lib/modes/jit/delegate.ts` uses `@glimmer/runtime`'s `renderComponent` / `renderSync` directly. It constructs an `EvaluationContextImpl` with stock `@glimmer/opcode-compiler` and `@glimmer/program` artifacts. GXT's pipeline is entirely bypassed — no `@lifeart/gxt` imports, no cell/formula machinery, no `$_MANAGERS`.

**Gap.** To make these tests use GXT, the delegate would need to: (a) import `@lifeart/gxt`'s `renderComponent`, (b) bridge glimmer `capture()`-style references to GXT cells, (c) translate template IR from the Glimmer compiler to GXT's runtime ops. That's roughly rebuilding the `gxt-backend` layer specifically for the integration-test harness.

**Concrete files to modify.**
- `/Users/lifeart/Repos/ember.js/packages/@glimmer-workspace/integration-tests/lib/modes/jit/delegate.ts`
- `/Users/lifeart/Repos/ember.js/packages/@glimmer-workspace/integration-tests/lib/modes/jit/render.ts`
- `/Users/lifeart/Repos/ember.js/packages/@glimmer-workspace/integration-tests/lib/modes/jit/compilation-context.ts`

**Proposed approach.** Three tiers, pick one:
- **Tier 1 (skip-then-fix)**: Mark the two JIT-only tests as `skip-if-gxt` via an env gate. Zero risk, zero benefit.
- **Tier 2 (bridge)**: Create a `gxt-jit-delegate.ts` alongside `delegate.ts`. It produces a `RenderResult` that wraps a GXT render. Requires re-implementing `renderComponent(runtime, builder, context, component, args)` as a GXT call. Maybe 500 LOC.
- **Tier 3 (port)**: Make GXT its own test mode. Add `gxt-mode/delegate.ts` and run a subset of integration tests through it. Large but aligns test coverage with production.

**Risk/complexity: HIGH.** The JIT tests were explicitly designed to test Glimmer VM opcodes; running them through GXT changes what's being tested. Tier 1 is correct unless there's a strategic goal.

**Test that verifies.** 'Updating @index' and 'initial render client Loops' in `packages/@glimmer-workspace/integration-tests/test/`. Potentially +2 tests but they'd be testing GXT not Glimmer VM. Recommend Tier 1.

---

## Cross-cutting learnings

1. **GXT's tracking model is correct per-opcode but has NO component-scope concept.** Fail #1 symptoms look like "tracking leaks across components" but the actual cause is an unconditional sync loop in `manager.ts`. Rebuilding opcode scope would be overkill.

2. **Every bidirectional-binding issue (#2, #4) traces to the interop layer NOT pushing updates to BOTH sides.** The cell path works; the classic-tag path doesn't get dirtied. A central `bumpBoth(obj, key)` helper would fix most of these.

3. **Destruction timing (#3) is the hardest architectural problem.** Mixing sync destruction with sync construction in one flush phase is a classic concurrent-modification bug. Deferred cleanup is the textbook fix but has wide surface.

4. **Fail #5 is probably a 5-line fix** in Ember routing code once the exact observer state is traced. Start there.

5. **Fail #6 should be dropped** unless there's a strategic reason to run Glimmer VM tests through GXT.

**Suggested order of attack (lowest risk first):** #5 (routing) → #2 (mut bridge) → #4 (curried getters) → #1 (dirty-driven sync) → #3 (deferred cleanup) → #6 (skip).
