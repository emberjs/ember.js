# 07 — Reactivity

This chapter defines the reactivity model of the Ember template language. It has five parts:

1. An **abstract model** (§07-1) of tracked storage, reactive computations, validity, and
   invalidation. It uses no tags, references, or revisions. Every other chapter describes
   template updates in terms of this model.
2. A **[Proposed] reactive core** (§07-2): `tracked` for root state, `cached` for derived state,
   `effect` for consumption, plus `isValid`, `isConst` and `untrack`. The existing
   `createCache` / `getValue` / `isConst` and `@cached` become thin layers over `cached`. The
   chapter shows that the core is enough to express everything the renderer needs.
3. A **normative specification of the user-facing reactivity APIs** that exist today (§07-3):
   `tracked` in all its forms, `TrackedValue`, `@cached`, the cache primitives,
   `@ember/reactive/collections`, and the interop with the classic Ember object model.
4. **How template evaluation maps onto the model** (§07-4): granularity, path evaluation,
   argument laziness, helpers, modifiers, components, and iteration.
5. **Open questions / inconsistencies** (§07-5).

Unless marked **[Proposed]**, everything here describes behavior that exists in the current
implementation (Ember 7.5 alpha). **[Proposed]** text describes new API that a conforming
implementation MAY provide. Where other chapters rely on a proposed primitive, they rely only on
its *semantics*, and those semantics are always expressible in terms of existing behavior.

---

## 07-0 Terminology

These terms are normative across the whole specification. Other chapters SHOULD use them
verbatim.

| Term | Meaning |
|---|---|
| **tracked storage** (also **storage cell**, or just **cell**) | An atomic unit of root reactive state. It supports two operations: *read* and *write*. Examples: the backing store of one `@tracked` property on one object; a `TrackedValue`; one key of a `trackedMap`; the "any property of this object" cell of an Ember object. |
| **read** (of a cell) | Returns the cell's current value and **consumes** the cell. |
| **write** (of a cell) | Replaces the cell's value and, subject to the cell's **equality policy**, **invalidates** the cell. |
| **consume** | Records the cell as a **dependency** of the **active computation**, if there is one. With no active computation, consuming has no effect. |
| **invalidate** (also "dirty") | Marks the cell as changed. Every computation whose dependency set contains the cell becomes **invalid**. |
| **reactive computation** (also **computation**) | A function evaluated inside a **tracking frame**. The evaluation records the set of cells consumed, directly or through nested computations. |
| **tracking frame** | The dynamic extent of one evaluation of a computation. Frames nest. The innermost open frame is the **active computation**. |
| **untracked frame** | A dynamic extent where there is *no* active computation, even when an enclosing tracking frame exists. Reads inside it consume nothing. |
| **dependency set** | The cells consumed during a computation's most recent evaluation. This includes, transitively, the dependencies of nested computations whose values it read. |
| **valid / invalid** | An evaluated computation is *valid* iff no cell in its dependency set has been invalidated since that evaluation began. See §07-1.5 for the exact point in time. |
| **constant** | An evaluated computation whose dependency set is empty. It can never become invalid. |
| **equality policy** | A per-cell rule that decides whether a write of a value "equal" to the current one invalidates. |
| **render transaction** | One synchronous render or revalidation pass of a renderer over all its roots, including the commit phase (§07-1.10). |
| **revalidation** | A render transaction that brings the DOM up to date after invalidations. It re-reads computations and updates the DOM positions whose computations were invalid. §05 calls one revalidation of a render root an *update pass* (or *re-render*); the terms are synonyms. |
| **commit phase** | The final step of a render transaction, after all DOM updates of the transaction: component `didCreate`/`didUpdate` hooks, then modifier installs, then modifier updates. The order is specified in §06-11. |
| **component region** | Everything consumed while one component invocation was created and rendered, including its layout, blocks rendered inside it, and descendants. It is valid iff none of those cells has been invalidated. §05-1.6 defines it (as the *component update region*) and its skipping rule. §07-2.4.7 gives its reactive skeleton. A region is **revalidated** (§06 also writes "re-validated") when a revalidation finds it invalid and descends into it. |
| **write-after-consume assertion** (the **backtracking rerender assertion**) | The development-mode error thrown when a cell that was already consumed during the current render transaction (or the current outermost tracking frame) is written (§07-1.9). |
| **invalidation hook** | The notification the core receives on every invalidation. Today it is the host callback with which Ember schedules revalidation (§07-1.10). Under the **[Proposed]** core it is internal and drives effect scheduling (§07-2.2.5); it is not public API. |
| **effect** **[Proposed]** | A reactive computation that the core runs again, through its scheduler, after something it read has changed (§07-2.2.5). |

Informal mapping to the current implementation, for readers of the source (non-normative):
cell ≈ `DirtyableTag`/`UpdatableTag` plus its value slot; computation ≈ `track()` /
`createCache` / compute `Reference`; dependency set ≈ the combined tag returned by
`endTrackFrame()`; valid ≈ `validateTag(tag, snapshot)`; invalidation hook ≈ the global-context
`scheduleRevalidate`. None of these internal names is normative.

---

## 07-1 The abstract model

### 07-1.1 Tracked storage cells

1. A cell holds exactly one JavaScript value at any time. Some cells hold *no* value and exist
   only for their change signal (for example the "collection" cell of a tracked collection, or
   the recompute cell of a classic helper). For those, a read returns nothing and a write means
   "invalidate".
2. **Read.** Reading a cell MUST return its current value and MUST consume the cell (§07-1.3).
   A read MUST NOT invalidate anything.
3. **Write.** Writing a cell MUST store the new value *before* any subsequent read can observe
   it. Unless the cell's equality policy (§07-1.6) says the value is unchanged, the write MUST
   invalidate the cell.
4. Invalidation has immediate effect on validity. Any computation that depends on the cell is
   invalid as soon as the write returns (§07-1.7).
5. Every invalidation MUST call the invalidation hook (§07-1.10), whether or not any
   computation currently depends on the cell.
   *Source:* `DIRTY_TAG` increments the global revision and calls `scheduleRevalidate()`
   unconditionally (`packages/@glimmer/validator/lib/validators.ts:204-227`).
6. Cells have identity. Two reads of "the same" cell (for example `obj.x` twice on the same `obj`)
   consume the same cell. Cells MAY be created lazily on first read or first write. A write to a
   cell that has never been read has no observable effect other than updating the value and
   calling the invalidation hook.
   *Source:* `dirtyTagFor` returns early when no tag exists yet
   (`packages/@glimmer/validator/lib/meta.ts:29-32`). Note that it then does **not** call
   `scheduleRevalidate` for an object/key pair that has never been read. See §07-5, item 1.

### 07-1.2 Reactive computations and tracking frames

A reactive computation is evaluated by the following abstract algorithm:

```
evaluate(computation C):
  push a new tracking frame F for C (F becomes the active computation)
  try:
    result := C.fn()
  finally:
    pop F (the previous active computation, if any, is restored)
    C.dependencies := F.consumed          // the set of cells consumed while F was active
    if there is an enclosing active computation P:
      P.consumed := P.consumed ∪ C.dependencies      // nesting (§07-1.3)
  return result
```

- Frames nest strictly (LIFO). A conforming implementation MUST restore the previous active
  computation even when `fn` throws.
  *Source:* `beginTrackFrame` / `endTrackFrame`
  (`packages/@glimmer/validator/lib/tracking.ts:59-83`), and `track`, which uses `try/finally`
  (`tracking.ts:233-245`).
- After an unrecoverable render error, the implementation resets all open frames.
  *Source:* `resetTracking` (`tracking.ts:99-109`), called from the render error paths
  (`packages/@glimmer/runtime/lib/vm/update.ts:60-66`, `packages/@glimmer/runtime/lib/vm/append.ts:763`).

### 07-1.3 Consumption and nesting

1. Reading a cell while a computation `C` is active adds that cell to `C`'s consumed set.
   *Source:* `consumeTag` (`tracking.ts:115-119`), `Tracker.add` (`tracking.ts:17-27`).
2. **Nesting.** When a computation `C` is evaluated, or its cached value is returned, while an
   outer computation `P` is active, `C`'s entire dependency set is added to `P`'s consumed set.
   `P` therefore becomes invalid whenever any cell that `C` depends on is invalidated. This holds
   *even if `C` is not re-evaluated*, i.e. when `C`'s cached value is returned.
   *Source:* `getValue` consumes the cache's combined tag on both the recompute path and the
   cached path (`tracking.ts:172-185`). `valueForRef` does the same
   (`packages/@glimmer/reference/lib/reference.ts:153-183`). Tests:
   `packages/@glimmer/validator/test/tracking-test.ts:324` ("nested memoizations work, and
   automatically propogate"), `:84` ("it works for nested tags").
3. Nesting is by *dependency set*, not by *identity of the inner computation*. An outer
   computation that read an inner cached computation does not "depend on the inner computation"
   as an entity. It depends on the inner computation's cells, as of the moment it read the inner
   value.
4. Consuming the same cell more than once in a frame has the same effect as consuming it once.
5. Invalidation does **not** propagate by value equality. When a dependency of `C` is
   invalidated, every computation that consumed `C`'s dependencies is also invalid, *even if
   re-evaluating `C` would return an identical value*. The current implementation has no
   "equality cut-off" for derived computations. (Individual DOM update sites may skip DOM writes
   when a recomputed value is unchanged. That is a per-site policy specified in §05, not part of
   this model.)
   *Test:* `packages/@ember/-internals/metal/lib/cached.ts:74-91` documents this for `@cached`.

### 07-1.4 Untracked reads

1. Inside an untracked frame there is no active computation. Reads consume nothing, and
   `isTracking()` is false.
   *Source:* `beginUntrackFrame` sets the current tracker to `null` (`tracking.ts:85-96`);
   `untrack(fn)` (`tracking.ts:251-259`).
   *Tests:* `tracking-test.ts:42` ("it ignores tags consumed within an untrack frame"),
   `:139` ("nested tracks and untracks work").
2. A tracking frame opened *inside* an untracked frame is a fresh computation. Its consumption
   does not propagate outward past the untracked frame, because there is no active outer
   computation at that point.
3. Untracked frames do **not** suppress the write-after-consume assertion for *writes*. A write
   inside an untracked frame to a cell that was consumed earlier in the same transaction still
   asserts. Reads inside an untracked frame are not recorded as consumed for the purposes of the
   assertion.
   *Tests:* `tracking-test.ts:547` ("it ignores untrack for consumption"), `:563` ("it does not
   ignore untrack for dirty").
4. Some framework code paths evaluate user code in an untracked frame. They are listed where
   they occur. Examples: the getter of a classic computed property with explicit dependent keys
   (§07-3.6.4); the `equals` comparison of an equality-guarded `@tracked` setter (§07-3.1.6);
   modifier hooks when the manager has `disableAutoTracking` (§07-4.9).

### 07-1.5 Validity, invalidation, and constants

1. A computation that has never been evaluated has no dependency set and is neither valid nor
   constant.
2. An evaluated computation `C` is **valid** iff no cell in `C.dependencies` has been
   invalidated at or after the moment `C`'s evaluation *completed*. More precisely, the
   implementation snapshots validity at the end of the evaluation. A write to a dependency that
   happens *during* the evaluation, after the cell was read, is a write-after-consume
   (§07-1.9). In production builds it is unspecified whether such a write leaves `C` valid or
   invalid.
   *Source:* the snapshot is taken after `endTrackFrame()` (`tracking.ts:178-180`).
3. An evaluated computation whose dependency set is **empty is constant**. It MUST never become
   invalid, so its cached value is final. Consumers MAY treat a constant computation as a static
   value and MAY discard any machinery for updating it.
   *Source:* `Tracker.combine` returns `CONSTANT_TAG` for an empty set (`tracking.ts:29-39`);
   `isConst` (`tracking.ts:190-198`); `isConstRef` checks
   (`packages/@glimmer/runtime/lib/compiled/opcodes/content.ts:109-120`: no updating operation
   is installed for a constant text position). *Test:* `tracking-test.ts:383`.
4. **Constant is decided per evaluation.** A computation that was non-constant can become
   constant after a re-evaluation that consumes nothing. From then on it is final.
   *Source:* `valueForRef` short-circuits permanently once `ref.tag === CONSTANT_TAG`
   (`reference.ts:158-160`).
5. Re-evaluation is **lazy (pull-based)**. Invalidating a cell MUST NOT synchronously
   re-evaluate any computation. Re-evaluation happens only when someone next asks for the
   computation's value (§07-2.2) or when the renderer revalidates (§07-1.10).

### 07-1.6 Equality policy on write

Each kind of cell has an equality policy. The policy decides whether a write whose new value is
"equal" to the current value invalidates. The current policies are listed below. This table is
normative.

| Cell kind | Default policy | Configurable? | Source / test |
|---|---|---|---|
| `@tracked` property (any decorator form) and classic `tracked()` | **Always invalidate**, even when the new value is identical (`===`) to the old | Yes: `@tracked({ equals })`. When `equals(old, new)` returns true, the write is skipped entirely (the value is *not* stored and nothing is invalidated) | `packages/@ember/-internals/metal/lib/tracked.ts:351-364`, `:429-442`; tests `packages/@ember/-internals/metal/tests/tracked/options_test.js:9,29,44` |
| Standalone `tracked(value, options)` (`TrackedValue`) | `Object.is`: equal writes do not invalidate and do not store | Yes: `options.equals` | `packages/@glimmer/validator/lib/tracked-value.ts:67-85,103-111`; tests `packages/@ember/-internals/metal/tests/tracked/standalone_test.js:37,50,63`, `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:281` |
| `trackedArray` element / `length`, `trackedObject` property, `trackedMap`/`trackedWeakMap` value, `trackedSet`/`trackedWeakSet` membership | `Object.is` against the current value | Yes: `options.equals` (per collection) | §07-3.5 |
| Plain (untracked) property written with Ember `set()` | Invalidate iff `currentValue !== newValue` (strict inequality, so `NaN → NaN` invalidates and `+0 → -0` does not) | No | `packages/@ember/-internals/metal/lib/property_set.ts:85-103` |
| `notifyPropertyChange(obj, key)` | Always invalidate (it is an explicit invalidation with no value) | No | `packages/@ember/-internals/metal/lib/property_events.ts:50-81` |
| Classic computed property with setter | Invalidate unless the setter returns a value `===` to the cached value (and a cached value exists) | No | `packages/@ember/-internals/metal/lib/computed.ts:522-547` |
| Template iteration item (`{{#each}}` item value) | Invalidate iff `!==` | No | `packages/@glimmer/reference/lib/iterable.ts:162-178` |

When a write is suppressed by its equality policy, it MUST NOT call the invalidation hook, and
the write-after-consume assertion MUST NOT fire. (For `@tracked({equals})` the suppressed path
returns before calling `dirtyTagFor`, `tracked.ts:352-360`. For `TrackedValue` it returns before
`DIRTY_TAG`, `tracked-value.ts:76-78`.)

### 07-1.7 Coherence

Computation results are **always coherent**. After a write returns, any subsequent read of a
computation that depends (directly or transitively) on the written cell MUST return a value
computed from the current value of that cell. There is no batching of *values*. Only *DOM
updates* are batched (§07-1.10).

```js
class P { @tracked first = 'a'; @tracked last = 'b'; @cached get full() { return `${this.first} ${this.last}`; } }
let p = new P();
p.full;            // 'a b' (evaluated)
p.first = 'x';     // write: `full` is now invalid
p.full;            // MUST be 'x b' (re-evaluated synchronously on this read)
```

*Source:* `internal-docs/guides/reactivity/laws.md` (axiom and laws 1–2),
`internal-docs/guides/reactivity/system-phases.md` ("Batched Updates with a Coherent Data Model").

### 07-1.8 Errors thrown inside a computation

1. When a computation's function throws, the frame is still closed (§07-1.2) and the error
   propagates to the caller.
2. The **cells consumed before the throw are still propagated** to the enclosing computation
   (the frame's consumed set is combined and returned in `finally`).
3. After a throw, the two existing mechanisms behave differently:
   - `getValue(cache)`: the cache *records* the partial dependency set and keeps its **previous**
     cached value. A later `getValue` while those dependencies are still valid returns the
     previous value (or `undefined` if there was none) **without re-running the function and
     without rethrowing**. (`tracking.ts:175-182`: `LAST_VALUE` is not assigned on a throw, but
     `TAG` and `SNAPSHOT` are.)
   - Template value computations: the dependency set is *not* recorded, so the next read
     re-evaluates (`reference.ts:168-175`: `ref.tag` is assigned only after `track()` returns).
   A new implementation MUST preserve the `getValue` behavior for the public cache API. See
   §07-5, item 3.
4. In development builds, after a hard error during a render transaction, the renderer stops
   re-rendering that root. It logs `Attempted to rerender, but the Ember application has had an
   unrecoverable error occur during render. You should reload the application after fixing the
   cause of the error.` via `console.warn` on each later attempt.
   *Source:* `errorLoopTransaction`
   (`packages/@ember/-internals/glimmer/lib/base-renderer.ts:43-67`). **[Dev]**

### 07-1.9 Writing storage that was already consumed (write-after-consume assertion) **[Dev]**

This is the "backtracking rerender" assertion.

**Rule.** Development builds track a *consumption transaction*, which is the dynamic extent of
the outermost open tracking frame, *or* of a render transaction (whichever is outermost). When a
cell is invalidated, if that cell was consumed by *any* tracking frame since the transaction
began (including frames that have already closed), the implementation MUST throw an assertion
error. The write happens anyway in production builds.

*Source:* every `beginTrackFrame` begins a debug transaction and every `endTrackFrame` ends one.
The consumed set is cleared only when the outermost transaction ends
(`packages/@glimmer/validator/lib/debug.ts:66-89`). Consumption is recorded in `Tracker.add`
(`tracking.ts:22-24`, `debug.ts:180-197`). The check happens in `dirtyTagFor`
(`meta.ts:37-43`) and `DIRTY_TAG` (`validators.ts:218-222`). Render transactions are wrapped
with `debug.runInTrackingTransaction` (`packages/@glimmer/runtime/lib/render.ts:31-38` for
initial render; `packages/@glimmer/runtime/lib/vm/update.ts:46-70` for revalidation).
*Tests:* `tracking-test.ts:489,516,530`; `packages/@ember/-internals/metal/tests/tracked/validation_test.js:372`;
`packages/@ember/-internals/glimmer/tests/integration/components/curly-components-test.js:2680-2785`;
`packages/@ember/-internals/glimmer/tests/integration/helpers/helper-manager-test.js:350-404`.

Consequences, all normative for development builds:

1. Reading and then writing the same cell inside one computation asserts:
   `track(() => { obj.value; obj.value = 123; })` throws.
2. Reading a cell in one computation and writing it in a *later sibling* computation in the
   same render transaction asserts. The canonical case is a child component's constructor
   writing state that an ancestor's template already rendered. Tests: "when a shared dependency
   is changed during children's rendering (tracked)", `curly-components-test.js:2740-2785`.
3. Reads made in an untracked frame are *not* recorded (§07-1.4, item 3).
4. Reads made with *no* open tracking frame at all are not recorded.
5. The **commit phase** of a render transaction runs *after* the render transaction's debug
   transaction has closed: modifier `install`/`update`, `didCreate`/`didUpdate` component
   hooks, and classic `didInsertElement`/`didRender`. Writes made there do **not** trigger this
   assertion on account of reads made during rendering. They are allowed, and they schedule
   another revalidation (§07-1.10, §07-1.11). Each modifier `install`/`update` call is its own
   tracking frame, so reading and then writing the same cell *within one* modifier hook still
   asserts.
   *Source:* `renderSync`/`renderRoots` call `inTransaction`, which runs `env.commit()` after the
   render body returns (`packages/@glimmer/runtime/lib/environment.ts:218-229`,
   `packages/@glimmer/runtime/lib/render.ts:41-48`). The modifier hooks are wrapped in `track`
   (`environment.ts:61-100`). Test: `packages/@ember/-internals/glimmer/tests/integration/custom-modifier-manager-test.js:307`.
6. Writing a cell that was **not** consumed earlier in the transaction is allowed during render.
   For example, a component constructor may initialize its own tracked fields.

**Message format.** The thrown error's message MUST match:

```
You attempted to update `<key>` on `<objectDescription>`, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.

`<key>` was first used:

<tracking stack>

Stack trace for the update:
```

(There are two spaces after "computation.".)

- `<objectDescription>` in Ember is `getDebugName(obj)`
  (`packages/@ember/-internals/glimmer/lib/environment.ts:91-101`). The Glimmer default is
  `(an instance of ClassName)`, a function's name, or `(an unknown tag)` for key-less cells
  (`debug.ts:41-62`).
- When there is no key (for example a `TrackedValue` or a collection cell), the first sentence is
  ``You attempted to update `<objectDescription>`, but…``. In practice it reads
  `` `undefined` `` because the key-less path passes no object (test `tracking-test.ts:516-527`
  matches `` /You attempted to update `undefined`/ ``). The `` `<key>` was first used: `` line then
  prints `` `undefined` ``.
- `<tracking stack>` lists the debug labels of the open frames at the moment of first
  consumption, outermost first, each indented two more spaces than its parent. Render
  transactions contribute the label `- While rendering:`. Component frames contribute the
  component's debug name, and value computations contribute a label derived from the template
  expression (e.g. `this.value`, ``(result of a `TEST_HELPER` helper)``).
  Tests: `packages/@ember/-internals/glimmer/tests/utils/debug-stack.js:1-38` pins the shape:
  `- While rendering:\n  {ROOT}\n    x-outer\n      this.wrapper.content`.
- The implementation removes the assertion machinery's own stack frames from the error's
  `stack` below "Stack trace for the update:" (`debug.ts:209-224`). This is cosmetic.

*Rationale.* Values read during a render must stay stable for the rest of that render
("Transactional Consistency", `internal-docs/guides/reactivity/laws.md`). Production builds
assume the rule holds and do not check it.

### 07-1.10 Timing: when invalidation schedules a re-render, and when revalidation happens

This section specifies the Ember renderer's scheduling. It is observable through the timing of
DOM updates, `renderSettled()`, and the run loop.

1. **Invalidation hook → run loop.** Every invalidation calls the invalidation hook. In Ember the
   hook ensures that a run loop exists. If no run loop is currently open, one is started, and an
   *autorun* is scheduled to flush it on a **microtask** (`Promise.resolve().then(flush)`).
   *Source:* `scheduleRevalidate() { _backburner.ensureInstance(); }`
   (`packages/@ember/-internals/glimmer/lib/environment.ts:22-25`); backburner `_ensureInstance`
   / `buildNext` (`node_modules/backburner.js/dist/backburner.js:7-35,1013-1020`).
   *Test:* "tracked properties rerender when updated outside of a runloop",
   `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:336`.
2. **Run loop begin → schedule revalidation.** Whenever a run loop begins, every registered
   renderer (every renderer with at least one root) schedules its `revalidate` into the
   `'render'` queue, at most once per run loop.
   *Source:* `_backburner.on('begin', loopBegin)`; `loopBegin` calls `renderer.rerender()`,
   which calls `scheduleOnce('render', …, revalidate)` (`base-renderer.ts:153-157,217,370-372,684-686`).
3. **Queue order.** The run loop queues are, in order: `actions`, `routerTransitions`, `render`,
   `afterRender`, `destroy`, plus an internal RSVP error queue (`packages/@ember/runloop/index.ts:72-90`).
   DOM updates caused by writes in `actions` are applied when the `render` queue flushes, before
   `afterRender`.
4. **Revalidate.** `revalidate` is a no-op if the renderer is *valid*. Otherwise it runs a
   render transaction over all its roots. A renderer is valid iff it is destroyed, it has no
   roots, or **no cell anywhere has been invalidated** since the end of its last render
   transaction. (This is a global check. The current implementation compares the global
   revision counter.)
   *Source:* `isValid` (`base-renderer.ts:374-378`), `revalidate` (`:380-385`).
   A conforming implementation MAY use a finer-grained validity check (for example, only cells
   the renderer depends on). The observable DOM result MUST be the same, and
   `renderSettled()`/loop-end behavior (items 6–7) MUST still hold with respect to cells the
   renderer actually depends on. See §07-5, item 4.
5. **Render transaction.** A render transaction:
   1. Renders each non-destroyed root in insertion order. Roots added *during* the pass are
      rendered before the pass ends: the loop repeats while the root count grew. Each
      iteration is its own runtime transaction with its own commit phase, and a repeated
      iteration renders the new roots and revalidates the earlier ones again
      (`base-renderer.ts:320-355`). So the adding call (e.g. `renderComponent`) returns
      before its root has rendered (§08-14 Q9).
   2. Records "last validated" as *now*, at the end of the render body and **before** the commit
      phase (`base-renderer.ts:353`).
   3. Runs the **commit phase** (component `didCreate` then `didUpdate` hooks, then modifier
      `install`s, then modifier `update`s, in scheduling order; `environment.ts:50-100`). The
      scheduling order is specified in §06-11.
   Because "last validated" is recorded before the commit phase, any cell invalidated by commit
   phase code (or later in `afterRender`) leaves the renderer invalid. That is handled by
   item 6.
   If the render transaction throws, "last validated" is still set to the current time
   (`base-renderer.ts:308-317`). The failed changes are therefore not re-attempted until
   something is invalidated again.
6. **Run loop end → settle.** When a run loop ends, if any registered renderer is invalid, a new
   run loop is started immediately (`_backburner.join(null, NO_OP)`). By item 2, it schedules
   another revalidation. When all renderers are valid, the pending `renderSettled()` promise
   resolves (inside a run loop) and the loop counter resets.
   *Source:* `loopEnd` (`base-renderer.ts:199-215`).
7. **Infinite invalidation detection.** If run loops are re-entered for invalidity more than
   `ENV._RERENDER_LOOP_LIMIT` times in a row (default `1000`,
   `packages/@ember/-internals/environment/lib/env.ts:133-139`), the renderer is destroyed and
   `Error('infinite rendering invalidation detected')` is thrown (`base-renderer.ts:203-207`).
   This check is **not** debug-only.
8. **`renderSettled()`** (`@ember/renderer`, `base-renderer.ts:174-188`) returns a promise that
   resolves at the end of the first run loop after which all renderers are valid. Repeated calls
   before resolution return the *same* promise. If no run loop is open when it is called, it
   schedules a no-op into `actions` to start one.
   *Tests:* `packages/@ember/-internals/glimmer/tests/integration/render-settled-test.js:11-46`.
9. **Revalidation re-reads, it does not re-run everything.** Within a revalidation, only the
   computations that are invalid are re-evaluated. Valid computations return their cached value
   (§07-4). Revalidation visits dynamic positions in document (tree) order, as specified in §05.
10. **Initial render is synchronous** relative to its entry point (e.g. `renderComponent`,
    `Renderer#render`, `appendTo`). It is a render transaction as in item 5.

*Non-normative summary:* **write → (microtask autorun or current run loop) → `render` queue →
revalidate once → commit hooks → (if they wrote: another loop) → settle.**

### 07-1.11 Reentrancy and writes from commit hooks

- A write made from a modifier's `install`/`update` or from `didInsertElement`/`didRender`
  invalidates cells *after* "last validated" was recorded. The current run loop's `loopEnd` then
  sees the renderer invalid and runs another loop (§07-1.10, item 6). The DOM therefore reaches
  a fixed point within the same macrotask, before `renderSettled()` resolves.
- A cycle where each commit writes state that the next render reads, which in turn writes again,
  hits the loop limit (item 7).

---

## 07-2 The consumption primitive

### 07-2.1 Goals

The rest of this specification needs a way to say "this DOM position shows the result of this
expression and updates when needed", without referring to tags or references. This section
proposes a small public core with one primitive for each role:

| Role | Primitive | Status |
|---|---|---|
| Root state | `tracked(value, options?)` | Exists (RFC 1071, §07-3.2) |
| Derived state | `cached(fn, options?)` | **[Proposed]** (RFC 1218, not yet accepted) |
| Consumption (side effects) | `effect(fn, options?)` | **[Proposed]** |
| Introspection of derived state | `isValid(c)`, `isConst(c)` | **[Proposed]** (`isConst` exists for `createCache` caches) |
| Untracked reads | `untrack(fn)` | **[Proposed]** public (exists internally) |

The existing public API has three gaps that this closes:

1. **Two derived-state APIs.** `@cached` and `createCache`/`getValue` (RFC 0615) do the same
   thing at two levels. The proposal makes the function form `cached(fn)` *the* derived
   primitive. `createCache`, `getValue` and the `@cached` decorator remain, as thin layers over
   it (§07-2.2.6).
2. **No way to ask "is this still valid?"** without re-running. Renderers need it to skip
   regions and to decide whether a side effect must run again. Today that is done with private
   tag APIs (`validateTag`, `JumpIfNotModifiedOpcode`, `UpdateModifierOpcode`). `isValid` is a
   low-level free function for this, not a method, because ordinary code should only read
   values.
3. **No way to react to change.** A host (a renderer, a test harness, a non-Ember embedding)
   learns that something changed only through the private global-context hook
   `scheduleRevalidate` (`packages/@glimmer/global-context/index.ts:42,150,181`). Building
   effects on a global "something changed" hook would make every effect implementation
   debounce every write and poll `isValid` on its own. The proposal moves that work into the
   core, once, behind `effect` (§07-2.2.5). The renderer is itself an effect (§07-2.4.10). The
   invalidation hook of §07-1.1 item 5 becomes an internal detail of the core, not public API.

*Rationale* (the plan author's feedback of 2026-10-07, commit `391b17239c`): two
derived-state primitives at different levels are confusingly redundant, so the user-facing
`cached()` should be powerful enough to be the only one. Effects belong in the core so that
the scheduling and validity checks are done once, with a declarative API whose effects run
only when necessary.

### 07-2.2 API

The prototype in `spec/prototype/reactive/` implements every **[Proposed]** function below on
top of the current `@glimmer/validator`, and its tests (`test.mjs`) check each rule of this
section.

#### 07-2.2.1 Root state: `tracked(value, options?)`

The standalone form of `tracked` (§07-3.2) is the root primitive:

```ts
const cell = tracked(initialValue, { equals?: (a, b) => boolean, description?: string });
cell.value; cell.value = v;       // read / write per §07-1.1
```

Wherever this spec says "a private tracked storage cell", an implementation MAY use any
mechanism with the semantics of §07-1.1. For example, `{{#each}}` item values use `!==`
equality (§07-4.7.2). The decorator forms of `@tracked` (§07-3.1) are sugar over cells with the
"always invalidate" policy (§07-1.6).

#### 07-2.2.2 **[Proposed]** Derived state: `cached(fn, options?)`

RFC 1218, "Overload `cached` to work outside of classes" (proposed, not yet accepted;
`NullVoxPopuli/rfcs@1f99b3a6`, `text/1218-overload-cached-for-non-class-use.md`). Module:
`@glimmer/tracking`, the same export as the `@cached` decorator, which dispatches on its
arguments like `tracked` does (§07-3.1.1).

```ts
interface ReadOnlyReactive<T> {
  readonly value: T;           // read: evaluate if needed, consume (below)
  get: () => T;                // same as reading .value; an own property, works detached
}
function cached<T>(fn: () => T, options?: { description?: string }): ReadOnlyReactive<T>;
```

Reading `value` (or calling `get()`) is the canonical way to *evaluate a reactive
computation*:

1. `cached` does not call `fn`.
2. If the value has never been read, or is invalid (§07-1.5), a read evaluates `fn` with no
   arguments as a reactive computation (§07-1.2) and stores the result. Otherwise it returns the
   stored result without calling `fn`.
3. In both cases the read consumes the computation's dependency set into the active computation
   (§07-1.3, item 2).
4. If `fn` throws, the read rethrows. The computation records the dependencies consumed before
   the throw and keeps its previous result. A later read while those dependencies are valid
   returns the previous result (or `undefined`) without calling `fn` and without rethrowing.
   This is today's `getValue` behavior (§07-1.8, item 3); see §07-5, item 15 for whether
   `cached()` should instead cache and rethrow the error.
5. `value` has no setter. Writing it throws in strict-mode code.
6. There is no equality cut-off (§07-1.3, item 5). RFC 1218 defers an `equals` option.
7. `description` is used only in development, for debug labels (the tracking stack of
   §07-1.9).
8. Calling `cached` with a non-function throws a `TypeError` (the exact message is not
   specified).

*Example.*

```js
import { tracked, cached } from '@glimmer/tracking';

const count = tracked(0);
const doubled = cached(() => count.value * 2);
// {{doubled.value}} in a template re-renders when count changes
```

#### 07-2.2.3 **[Proposed]** Introspection: `isValid(c)` and `isConst(c)`

```ts
function isValid(c: ReadOnlyReactive<unknown>): boolean;
function isConst(c: ReadOnlyReactive<unknown>): boolean;
```

Both take a value returned by `cached()` (which includes a `createCache` cache, §07-2.2.6).
For any other value they throw a `TypeError`. They are free functions, not methods: they are
low-level tools for renderers and library authors, not the first thing application code should
reach for.

**`isValid(c)`**

- Returns `true` iff `c` has been read at least once and is valid (§07-1.5).
- Returns `false` for a never-read value. (The asymmetry with `isConst`, which throws, is
  deliberate. "Not valid" is the correct answer for "would reading `c` call `fn`?")
- MUST NOT evaluate `fn`, MUST NOT consume anything, and MUST NOT invalidate anything. It is
  safe to call in any frame, including during a render transaction.
- Invariant: `isValid(c) === true` ⇒ the next read of `c.value` returns the stored result
  without calling `fn`.
- Equivalent in the current implementation to `validateTag(tag, snapshot)` on the cache's tag.

**`isConst(c)`**

- **[Dev]** Throws if `c` has never been read (the message of §07-3.4, with "read" in place of
  "`getValue()` has been called").
- Returns `true` iff the most recent evaluation consumed nothing (§07-1.5, item 3). Such a value
  can never become invalid.

#### 07-2.2.4 **[Proposed]** `untrack(fn)` made public

```ts
function untrack<T>(fn: () => T): T;
```

Runs `fn` in an untracked frame (§07-1.4) and returns its result. This already exists
internally (`tracking.ts:251-259`), and Ember uses it for equality checks and classic computed
getters. It is public so that other chapters can say "evaluated untracked" and have a
user-visible equivalent, and so that effects can read state without depending on it.

#### 07-2.2.5 **[Proposed]** Consumption: `effect(fn, options?)`

```ts
interface EffectOptions {
  schedule?: (flush: () => void) => void;   // default: the host's (a microtask outside Ember)
  description?: string;
}
type Effect = object;                       // opaque; a destroyable
function effect(fn: () => void | (() => void), options?: EffectOptions): Effect;
```

An effect is a reactive computation that is run again, by the core, whenever something it read
has changed. It is how reactive state reaches the outside world: the DOM (the renderer is an
effect, §07-2.4.10), a modifier's element (§07-2.4.6), a network request, a log.

1. **Creation.** `effect` does not call `fn`. It records the effect as *stale* and schedules it
   (item 4). Creating an effect consumes nothing, even inside an active computation.
2. **Run.** Running an effect:
   1. calls the cleanup returned by its previous run, if any, in an untracked frame;
   2. evaluates `fn` as a reactive computation in a **fresh root frame**: what it reads becomes
      the effect's dependency set and is *not* consumed by any frame that is active outside it;
   3. stores `fn`'s return value as the next cleanup if it is a function.

   Dependencies are re-collected on every run, so an effect that stops reading a cell stops
   depending on it.
3. **Staleness.** After a run, the effect is stale iff its run is invalid (§07-1.5). An effect
   whose run consumed nothing is constant: it never runs again, though its cleanup still runs
   on destruction.
4. **Scheduling.** When a cell is invalidated, the core MUST schedule every live effect that
   became stale and is not already scheduled. Scheduling an effect adds it to the pending batch
   for its `schedule` function. When a batch goes from empty to non-empty, the core calls
   `schedule(flush)` once, synchronously, inside the write that caused it. `schedule` MUST NOT
   call `flush` synchronously; it exists to pick *when* the batch runs (a microtask, a run-loop
   queue, a renderer's commit phase).
   - The core MAY also schedule effects that are not stale. An implementation without reverse
     dependency edges (as with today's tags) cannot tell which effects a write affects, so it
     schedules them all. Item 5 makes this unobservable, except through extra `schedule`
     calls.
   - All writes until the batch runs are coalesced: an effect runs at most once per batch.
5. **Flush.** Calling `flush` takes the batch (later scheduling starts a new batch) and, for
   each of its effects in **creation order**, skips it if it was destroyed or is no longer
   stale, and otherwise runs it (item 2). Calling `flush` a second time does nothing.
6. **Writes inside a run.** A run is its own consumption transaction for the write-after-consume
   assertion (§07-1.9): reading and then writing the same cell in one run asserts **[Dev]**.
   Writing a cell the run did not read is allowed, and schedules the effects that read it in a
   new batch (an effect that keeps invalidating itself loops through its scheduler; a host
   SHOULD bound this, as Ember's run loop does, §07-1.10 item 7).
7. **Errors.** If `fn` throws, the effect keeps the dependencies read before the throw (so a
   change to them runs it again) and stays live. The flush runs the rest of the batch, then
   throws the error; if several runs threw, it throws an `AggregateError` of them.
8. **Destruction.** The returned handle is a destroyable (`@ember/destroyable`; §06). `destroy`
   stops the effect at once: it is removed from any pending batch and never runs again. Its
   last cleanup runs as a destructor. An effect destroyed during its own run finishes that
   run, and the cleanup that run returns is called immediately. To tie an effect to an owner,
   use `associateDestroyableChild(owner, effect)`.

*Example.*

```js
import { tracked } from '@glimmer/tracking';
import { effect } from '@ember/reactive';
import { associateDestroyableChild } from '@ember/destroyable';

class Title {
  constructor(owner, page) {
    associateDestroyableChild(owner, effect(() => {
      document.title = page.title;            // re-runs when page.title changes
    }));
  }
}
```

*Rationale.* Doing the scheduling in the core means a write costs one check ("is anything
unscheduled?") once every live effect is scheduled, and validity is checked once per effect per
batch, however many effect implementations exist. Effects are scheduled, not run on creation,
so that creating one during a render (for example in a component constructor) never runs user
code in the middle of that render. The per-effect `schedule` lets a host put different effects
at different points of its own cycle (§07-2.4.6, §07-2.4.10).

#### 07-2.2.6 Compatibility layer

The existing APIs remain, with their current observable behavior (§07-3.3, §07-3.4), and are
specified in terms of `cached()`:

| Existing API | In terms of the core |
|---|---|
| `createCache(fn, label)` | `cached(fn, { description: label })`, after the `createCache` **[Dev]** type check |
| `getValue(cache)` | `cache.value`, after the `getValue` **[Dev]** type check |
| `isConst(cache)` from `@glimmer/tracking/primitives/cache` | `isConst(cache)` (§07-2.2.3), with the `createCache` error messages |
| `@cached get x()` | one `cached(() => getter.call(this))` per instance, created on first access; every access reads `.value` (RFC 1218, "Re-implementing `@cached`") |
| `invokeHelper(...)` (§07-3.4) | returns a `cached()` value |

So a `createCache` cache *is* a `cached()` value: `isValid`, `isConst` and `.value` all work
on it, and `getValue` accepts any `cached()` value. The prototype's `compat.mjs` implements
this table and passes the `createCache`/`@cached` tests in `test.mjs`.

#### 07-2.2.7 Module placement (proposal)

| Export | Module |
|---|---|
| `tracked`, `cached` (both forms) | `@glimmer/tracking` (as today) |
| `effect`, `untrack`, `isValid`, `isConst` | `@ember/reactive` (today an empty module, `packages/@ember/reactive/index.ts:9-10`) |
| `createCache`, `getValue`, `isConst` | `@glimmer/tracking/primitives/cache` (compatibility) |

A host-level setting chooses the default `schedule` of effects created without one. Ember sets
it; how and to what is a review point (§07-5, item 14).

### 07-2.3 Reference semantics of the primitive (non-normative sketch)

The abstract model can be implemented with a global monotonically increasing clock. This is how
the current implementation works, and it is given only to show that the proposal is cheap:

```
clock := 1
cell.changedAt := clock at last invalidation
computation.deps := set of cells;  computation.validatedAt := clock at end of evaluation
isValid(c) := c evaluated ∧ ∀ d ∈ c.deps: d.changedAt ≤ c.validatedAt
invalidate(cell) := clock += 1; cell.changedAt := clock; notifyEffects()

live := effects not destroyed and not constant;  unscheduled := live effects in no batch
notifyEffects() := if unscheduled ≠ ∅: for e in unscheduled: add e to batch[e.schedule]
                   (calling e.schedule(flush) when that batch was empty)
flush(batch) := for e in batch, by creation order: if e live ∧ ¬isValid(e): run(e)
```

With no reverse edges, `notifyEffects` schedules every live effect and `flush` filters with
`isValid`. After the first write, every effect is scheduled, so later writes until the flush cost
O(1). Implementations MAY use any other technique (dirty flags, push/pull graphs with reverse
edges, signals) that is observably equivalent; a push-based one schedules only effects that
are actually stale.

### 07-2.4 Sufficiency: expressing every renderer need

Below, `C(expr)` means `cached(() => evaluate(expr))`, read with `.value`. Each subsection names the current
mechanism it replaces. Detailed DOM semantics live in §05. Only the reactive skeleton is given
here.

#### 07-2.4.1 Content (text / dynamic content)

```
initial:  c := C(expr); v := c.value; append DOM for v;
          if isConst(c): done (the position is static)
update:   if !isValid(c): v' := c.value; if content *type* changed → re-render the
          enclosing block (§05); else apply the §05 update rule for v' (text: write only if
          normalized string differs)
```

Replaces `DynamicTextContent` (`packages/@glimmer/runtime/lib/vm/content/text.ts:7-36`) and the
content-type `AssertFilter` (`packages/@glimmer/runtime/lib/compiled/opcodes/content.ts:71-87`,
`vm.ts:266-284`). Reading `c.value` unconditionally on every revalidation is equivalent to
the `isValid` check, because a valid computation returns its old value.

#### 07-2.4.2 Attributes and properties

The same pattern: `c := C(valueExpr)`. On update, if `!isValid(c)`, recompute and hand the new
value to the attribute's update policy. (The current policy writes `setAttribute` on every
recomputation for plain attributes, and writes properties only when `!==` the last written
value. See §05 and `packages/@glimmer/runtime/lib/vm/attributes/dynamic.ts:97-136`.) Replaces
`UpdateDynamicAttributeOpcode` (`packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:421-443`).

#### 07-2.4.3 Conditionals

`c := C(toBool(condExpr))`. On update, if `!isValid(c)` and `c.value` differs from the last
branch decision, tear down and re-render the block. Otherwise descend into the current branch.
Replaces `VM_TO_BOOLEAN_OP` + `Assert` (`vm.ts:209-264`).

#### 07-2.4.4 Argument laziness

Each argument expression at an invocation site becomes `cᵢ := C(argExprᵢ)`, created when the
invocation is first rendered and **not** evaluated at that time. Every consumer of the argument
reads `cᵢ.value`: `@name` in the callee's template, `this.args.name` through the args proxy,
a helper reading `named.name`, and so on. Consequences:

- An argument that is never read is never evaluated, and one read many times while valid is
  evaluated once. This describes the current implementation; evaluation counts are not part
  of the contract (§00-0.1 "Evaluation is not part of the contract").
- A consumer that reads an argument depends on the argument expression's cells. This is why
  inner state changes do not re-run outer getters: test "downstream property changes do not
  invalidate upstream component getters/arguments",
  `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:745-816`.

Replaces the per-argument compute references and `argsProxyFor`
(`packages/@glimmer/manager/lib/util/args-proxy.ts:59-188`).

#### 07-2.4.5 Helper re-evaluation

For a helper with a value (`hasValue`): `bucket := manager.createHelper(def, argsProxy)` once,
eagerly, when the invocation is first rendered. Then `c := cached(() => manager.getValue(bucket))`.
The helper's value position reads `c.value`. The manager's `getValue` runs again iff any cell
it consumed (including arguments it read) is invalidated. Replaces `createComputeRef(() =>
manager.getValue(bucket))` (`packages/@glimmer/manager/lib/public/helper.ts:122-150`).
`invokeHelper` already works exactly this way on top of `createCache`
(`packages/@glimmer/runtime/lib/helpers/invoke.ts:48-98`).

#### 07-2.4.6 Modifiers

Modifier hooks are side effects, not values. Each modifier instance is an effect (§07-2.2.5)
whose first run is `install` and whose later runs are `update`. Its `schedule` hands the run to
the renderer's commit phase:

```
element closed (render):  m.effect := effect(
                              () => m.installed ? manager.update(state)
                                                : (manager.install(state), m.installed := true),
                              { schedule: flush => renderer.queueModifier(m, flush) })
queueModifier(m, flush):  record (m, flush) for the commit phase of the open render
                          transaction, or of the next one (scheduling it if none is pending)
commit phase:             call the recorded flushes: installs in record order, then updates in
                          document pre-order (§06-11)
element removed:          destroy(m.effect), then manager.destroyModifier (§05-11)
```

Each modifier has its own `schedule` closure, so its flush is a batch of one and the renderer,
not the core, decides the order (§07-5, item 17). The effect rules give the current behavior:
each hook is its own tracking frame in the commit phase, so it may write state the render read
but not state it read itself (§07-1.9, item 5); a write that the render read schedules the
renderer again (§07-1.11); and a manager with `disableAutoTracking` runs its hook inside
`untrack`, so the effect is constant and `update` never runs because of tracked state
(§07-4.9). With today's tag-based core every write schedules every modifier, and the flush
skips the valid ones (§07-2.2.5, item 5): the same work as today's revalidation walk over
`UpdateModifierOpcode`s.

Replaces the modifier `UpdatableTag` + `updateTag(modifierTag, track(install))`
(`packages/@glimmer/runtime/lib/environment.ts:61-100`) and `UpdateModifierOpcode`
(`dom.ts:321-341`).

#### 07-2.4.7 Component regions, `updateComponent`, and `didUpdate`

The current implementation wraps each component invocation in a *cache group*. The group's
dependency set is the union of everything consumed while creating the component and rendering
its template, including nested components. During revalidation, a valid group is skipped
entirely (`vm.ts:286-326`, `append.ts:351-385`,
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts:311,374`). The same
thing can be expressed by re-arming:

```
initial:  g := cached(() => renderComponentRegion()); g.value
update:   if isValid(g): skip region (its dependencies are still consumed by the enclosing region)
          else g := cached(() => { manager.update?(state); revalidateChildren(); }); g.value
```

This matters for observable hooks. A manager's `update` hook (capability `updateHook`), and the
`didUpdate` hooks queued by the region, run **when the region is invalid**. That happens when
any cell consumed anywhere in the region changed, *including in descendants*. It does not
depend only on the component's own arguments (`component.ts:440-445,940-966`). The classic
(curly) manager filters `didUpdateAttrs`/`didReceiveAttrs` by its own argument validity
(`packages/@ember/-internals/glimmer/lib/component-managers/curly.ts:443-471`). It still fires
`didUpdate`/`didRender` for every invalid region (`curly.ts:479-483`); this coarse granularity is
required (§06-4.4, §08-6.7).

Skipping a valid region is **required only for its observable effects** (the hooks above). An
implementation MAY skip or MAY descend. Descending is harmless because every inner position is
itself cached.

#### 07-2.4.8 `{{#each}}` iteration change detection

```
list := C(() => toIterator(evaluate(listExpr)))   // obtaining the iterator happens INSIDE the computation
initial:  iterate list's result; for each item create an item cell (tracked, `!==` policy)
          holding the item value, and a memo/index cell
update:   if !isValid(list): obtain the new iterator via list.value and run the keyed diff
          (§05): retained items get their item cell written with the new value; new items
          render; removed items are destroyed
          then revalidate each item region
```

Obtaining the iterator inside the computation is what makes tracked collections work. For
arrays, reading `length` consumes the collection cell. For native iterables, calling
`[Symbol.iterator]()` consumes it. Reads made later while iterating (item values) may happen
outside the list computation. Replaces `createIteratorRef`, `createIteratorItemRef`, and
`ListBlockOpcode` (`packages/@glimmer/reference/lib/iterable.ts:141-178`;
`packages/@glimmer/runtime/lib/vm/update.ts:204-253`). A retained item whose value changed
(`!==`) invalidates only the positions inside that item that read it.

#### 07-2.4.9 Dynamic components, helpers, and modifiers

The *definition* expression is its own computation. When it is invalid and yields a different
definition, the old instance is destroyed and a new one is created. When it yields the same
definition, the instance is kept. (`packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:95-170`;
`dom.ts:206-319,343-405`.)

#### 07-2.4.10 The renderer loop

The renderer is an effect around its re-rendering logic:

```
renderer.effect := effect(
    () => for each root r, in insertion order: revalidate r's region (§07-2.4.7),
    { schedule: flush => scheduleOnce('render', flush) })     // Ember: the run loop's render queue
commit phase:  after each run, outside the effect's frame (§06-11, §07-2.4.6)
```

This reproduces §07-1.10:

- A write schedules the renderer through its `schedule`. Outside a run loop, `scheduleOnce`
  starts one and flushes it in a microtask autorun, as the invalidation hook does today
  (items 1–3).
- The effect's run is the render body, so its validity snapshot is taken at the end of the
  body and *before* the commit phase, exactly where "last validated" is recorded today
  (item 5.2). A commit-phase write to state the render read leaves the effect stale, and it is
  scheduled again in the same run loop (item 6). Bounding that loop (item 7) stays the host's
  job (§07-2.2.5, item 6).
- The renderer's validity check (item 4) becomes the effect's staleness. That is *finer* than
  the current global clock comparison (only cells the renderer read count), which item 4
  allows, and it is equivalent for DOM output. `renderSettled()` resolves when neither the
  renderer nor any modifier effect has a pending batch.
- A root added outside a render renders synchronously (item 10) and then writes a private cell
  that the effect reads, so the next run consumes the new root's region. Roots added during a
  run are handled inside that run, as today (item 5.1).

**Conclusion.** `tracked`, `cached` with `isValid` and `isConst`, `untrack`, and `effect` are
sufficient to express every update behavior of the renderer. No other chapter needs tags,
references, revisions, or a global invalidation hook.

### 07-2.5 Design context: comparison with the TC39 Signals proposal (non-normative)

| Concept | This model | TC39 Signals (stage 1) |
|---|---|---|
| Root state | tracked storage cell; `tracked(v, {equals})` | `new Signal.State(v, {equals})` |
| Derived | `cached(fn)` + `.value` [Proposed] | `new Signal.Computed(fn, {equals})` + `.get()` |
| Untracked read | `untrack(fn)` [Proposed public] | `Signal.subtle.untrack(fn)` |
| Constant detection | `isConst(c)` | none (introspection: `Signal.subtle.introspectSources`) |
| Validity check without recompute | `isValid(c)` [Proposed] | none directly. Watchers get notified instead |
| Change notification | `effect(fn, { schedule })` [Proposed]: the core schedules stale effects in batches and runs them | `new Signal.subtle.Watcher(notify)` + `watch(signal)`, `getPending()`: per-signal, synchronous, push; effects are left to libraries |
| Equality cut-off for derived values | **none** (§07-1.3, item 5) | yes. A `Computed` whose recomputed value is `equals` to the previous one does not invalidate its dependents |
| Default equality for root writes | per API: `@tracked` always invalidates; `tracked(v)` and collections use `Object.is` (§07-1.6) | `Object.is` |
| Writes during computation | dev-mode assertion (§07-1.9) | throws when writing inside a `Computed` |

A future implementation could build the model on Signals. `tracked(v)` would map to `State`
(with `equals` forced to "always different" for `@tracked`), and `cached` to `Computed`
with `equals: () => false`, which reproduces the lack of cut-off. `isValid` would be implemented
through a watcher's dirty bit, and `effect` as a `Computed` watched by one watcher per
`schedule` function, whose `notify` calls `schedule(flush)` and whose `flush` re-reads the
`getPending()` effects in creation order. The core then does with Signals what the TC39
proposal leaves to each library.

### 07-2.6 Explicitly not part of the model

Tags, tag combinators, updatable tags, "volatile" and "current" tags, revisions, snapshots,
`validateTag`, `valueForTag`, `tagFor`, `dirtyTagFor`, `tagMetaFor`, references,
`valueForRef`, `childRefFor`, `ALLOW_CYCLES`, and the cycle assertion
`'Cycles in tags are not allowed'` (`validators.ts:126-131`) are all implementation details.
`@glimmer/validator` exports these (`packages/@glimmer/validator/index.ts:11-69`), but that
package is not public Ember API.

Some addons nevertheless import it directly: ember-modifier (classic modifier argument
consumption), `tracked-built-ins` and ember-resources use `consumeTag`, `tagFor` and
`dirtyTagFor`. A new implementation SHOULD provide a compatibility shim for these where that
is cheap. It is not required: the main users are packages the project can influence, and they
can be required to migrate to the public core (§07-2.2: `tracked`, `cached`, `effect`, …)
before they run on a new renderer (author ruling, 2026-09-30). ember-resources in particular
maps onto `cached` and `effect`, and §07-2.7 builds an asynchronous resource from them.

### 07-2.7 Asynchronous consumption (non-normative exploration)

A reactive computation tracks what it reads on the synchronous stack: its frame is open from
the call of `fn` until `fn` returns (§07-1.2). An `async` function returns at its first
`await`, so reads made after it happen with no frame open and consume nothing. This holds for
`cached` and `effect` alike.

The core does not commit to one strategy for asynchronous work, because the right answer
depends on the use: what to do with a run that is in flight when an input changes (cancel it,
or let it finish), and what readers see meanwhile (the previous result, or nothing). This
section shows that the core is enough to build such strategies in a library. The prototype
`spec/prototype/reactive/async.mjs` implements the design below; its tests are in `test.mjs`.

**Strategy 1: track the synchronous prefix.** `cached(() => load(this.id))` tracks the reads
made before `load`'s first `await` and returns a new promise whenever they change. A library
wraps the promise in tracked state (pending, value, error). The pitfall is silent: a read after
the first `await` is not tracked, and the result goes stale (test "a plain read after an
await is not tracked").

**Strategy 2: explicit reads across `await`.** The run receives a `read` function and wraps
later reads in it:

```js
let r = resource(async ({ signal, read }) => {
  let id = this.id;                           // before the first await: tracked
  let res = await fetch(`/items/${id}`, { signal });
  let filter = read(() => this.filter);       // after an await: tracked through read()
  return (await res.json()).filter(filter);
}, { onChange: 'restart' });

r.value; r.error; r.isPending;                // tracked state, usable in templates
```

It is built from the core like this:

1. Each run records the computations it read as `cached()` values: one for the synchronous
   prefix of `fn`, and one per `read(thunk)`, which creates `cached(thunk)`, reads it untracked
   and appends it to the run's list (a tracked cell).
2. A per-run **watcher effect** reads that list. For each recorded value it asks `isValid`. If
   one is invalid, an input of the run has changed since the run read it, and the watcher
   applies the change policy. Otherwise it reads `.value`, which re-runs nothing and consumes
   that value's dependencies, so the watcher runs again when any of them changes.
3. A `read` made later appends to the list, so the watcher runs again and starts watching it.
   Because the check is `isValid` and not "has the watcher seen a change", a change that
   happens between a `read` and the watcher's next run is not lost (test "a change between a
   read and the watcher's first run is still seen").
4. Change policies decide what stays stable:

   | `onChange` | Run in flight | Its result | Next run |
   |---|---|---|---|
   | `'restart'` | aborted through its `AbortSignal` | discarded | starts at once |
   | `'finish'` | runs to completion | published | starts when it settles |

   In both, `value` keeps the last published result while a run is pending
   (stale-while-revalidate). Other policies (drop changes until the run settles, queue runs, a
   debounce in `schedule`) fit the same shape.
5. The resource is a destroyable. Destroying it aborts the run and destroys the watcher.

Each primitive does one job: `cached` turns each read into a value with its own dependency
set; `isValid` asks "changed since it was read?" without re-running the read; `effect` lets
the core schedule the watcher, so the resource neither polls nor hooks writes; and `untrack`
keeps the run's own reads out of the watcher's frame and out of whatever frame started the
run.

**Strategy 3: implicit tracking across `await`.** Tracking later reads without `read()` needs
the active tracking frame carried across `await`, for example in a TC39 `AsyncContext`
variable. The core cannot provide that, and it would change what a frame is: frames of
concurrent runs would interleave instead of nesting (§07-1.2); a frame would close when its
promise settles, not when `fn` returns; and the write-after-consume transaction (§07-1.9) would
span `await`s. It is recorded as a review point (§07-5, item 19).

---

## 07-3 User-facing reactivity APIs (normative)

### 07-3.1 `tracked` (`@glimmer/tracking`)

`import { tracked } from '@glimmer/tracking'`. It is re-exported from
`packages/@ember/-internals/metal/lib/tracked.ts` (`packages/@glimmer/tracking/index.ts:1`).
One function serves six roles. The form is selected from the call's arguments.

#### 07-3.1.1 Argument dispatch

```
tracked(...args):
  1. if args look like a standard (stage 3) decorator call (value, context) → §07-3.1.4 / 3.1.5
  2. [Dev] if args are (target, key, desc, meta, true) — i.e. bare `tracked` used as a classic
     decorator — assert "@tracked can only be used directly as a native decorator. If you're
     using tracked in classic classes, add parenthesis to call it like a function: tracked()"
  3. if args are a legacy element descriptor (target: object|function, key: string,
     desc: object|undefined; exactly 3 args) → legacy field decorator §07-3.1.2
  4. if args.length === 0, or args.length === 1 and args[0] is "decorator options"
     → decorator factory §07-3.1.3
  5. otherwise → standalone value: tracked(initialValue, options?) §07-3.2
```

*Source:* `tracked.ts:171-240`. Step 1 uses `isModernDecoratorArgs`
(`packages/@ember/-internals/metal/lib/decorator-util.ts`). Step 3 uses `isElementDescriptor`
(`packages/@ember/-internals/metal/lib/decorator.ts:32-46`).

**Decorator options** (step 4): a non-null object whose prototype is `Object.prototype` or
`null`, and whose own enumerable keys are all drawn from
`value`, `initializer`, `equals`, `description` (`tracked.ts:242-256`). Consequences:

- `tracked({})` is the decorator factory, not a standalone value wrapping `{}`.
- `tracked({ value: 5 })` is a decorator factory. To wrap such an object as a standalone value,
  pass a second argument: `tracked({ value: 5 }, {})` (documented at
  `packages/@glimmer/tracking/index.ts:194-199`).
- `tracked(someClassInstance)` and `tracked([1,2])` are standalone values.
- `tracked(0)`, `tracked('x')`, `tracked(null)`, `tracked(undefined, …)` are standalone values.
  **Caution:** `tracked(undefined)` has `args.length === 1`, but `undefined` is not decorator
  options, so it is a standalone value. `tracked()` (zero args) is the factory.

Step 5 **[Dev]** asserts that `options` is `undefined` or a non-null object:
``tracked() may only receive an options object containing 'equals' or 'description' as its second argument, received ${options}``
(`tracked.ts:220-223`).

**[Dev]** In development builds `tracked` is itself marked as a classic decorator, so that step 2 can run
(`tracked.ts:321-325`).

#### 07-3.1.2 Legacy (experimental/TypeScript) field decorator: `@tracked x = init`

Called as `(prototype, key, desc)`, where `desc.initializer` is the field initializer if there is
one.

1. **[Dev]** If `desc` has `value`, `get`, or `set`, assert: ``You attempted to use @tracked on
   ${key}, but that element is not a class field. @tracked is only usable on class fields. Native
   getters and setters will autotrack add any tracked fields they encounter, so there is no need
   mark getters and setters with @tracked.`` (`tracked.ts:331-334`, sic).
2. Defines on the **prototype** an accessor `{ enumerable: true, configurable: true, get, set }`
   (`tracked.ts:366-379`). It also registers a descriptor in Ember meta, so that Ember `get`/`set`
   and chains treat it as a pass-through (`tracked.ts:377,382-397`).
3. **Per-instance storage cell** keyed by (instance, key), created lazily.
4. **get:**
   1. Consume the cell (`packages/@glimmer/validator/lib/tracked-data.ts:14-15`).
   2. If an initializer exists and the instance has no stored value yet, call the initializer with
      `this` = the instance, *inside the current frame*, and store the result. Initialization is
      therefore **lazy, on first read**, and reads made by the initializer are consumed by
      whoever triggered the first read (`tracked-data.ts:19-26`).
   3. If the value is a native array or an Ember array, also consume that array's
      **`[]` collection cell** (§07-3.6.6) (`tracked.ts:339-349`).
   4. Return the value (`undefined` if never set and no initializer).
5. **set(v):**
   1. If an `equals` option is present (§07-3.1.3): compute `equals(untrack(() => get
      stored-or-initialized value), v)`. If it returns true, return without storing or
      invalidating. The comparison runs the lazy initializer if needed (test `options_test.js:44`).
   2. Otherwise invalidate the cell, then store `v`, then invalidate the instance's
      **object-level cell** (the "any tracked property changed" cell, §07-3.6.1) (`tracked.ts:351-364`; `tracked-data.ts:31-34`).
   A set with no `equals` option **always** invalidates. Test: `options_test.js:29`.
   **Initializer skipped:** if the property is set before it is ever read, the initializer is
   never called (`tracked-data.ts:20` checks `values.has(self)`).
6. The setter is registered as a "computed setter", so that Ember `set(obj, key, v)` assigns
   directly (§07-3.6.3) (`tracked.ts:375`).

Test for lazy initialization order: `packages/@ember/-internals/metal/tests/tracked/validation_test.js:46-87`
(`first = \`first: ${this.second}\`` yields `'first: second'` with legacy decorators).

#### 07-3.1.3 Decorator factory / classic field: `tracked()`, `tracked({ … })`, `@tracked({ equals })`

`tracked(opts?)` returns a decorator (`tracked.ts:258-319`). **[Dev]** assertions, with messages
pinned by `options_test.js:65-76`:

- not both `value` and `initializer`: ``The options object passed to tracked() may only contain a 'value' or an 'initializer' property, not both. Received: [${keys}]``
- ``The initializer passed to tracked must be a function. Received ${initializer}``
- ``The 'equals' option passed to tracked must be a function. Received ${equals}``
- ``The 'description' option passed to tracked must be a string. Received ${description}``

Uses:

1. **Classic class field**: `EmberObject.extend({ name: tracked(), songs: tracked({ initializer: () => [] }), x: tracked({ value: 1 }) })`,
   or `defineProperty(obj, 'x', tracked())`. When applied as a classic decorator, the field's
   initializer is `opts.initializer`, or else `() => opts.value` (which is `undefined` when
   neither is given). Semantics are otherwise those of §07-3.1.2 (lazy initialization on first
   read) (`tracked.ts:311-313`). Tests:
   `packages/@ember/-internals/metal/tests/tracked/classic_classes_test.js`.
2. **Native class with options**: `@tracked({ equals }) x = 0`. The same as §07-3.1.2 or
   §07-3.1.4, plus the `equals` guard.
3. **[Dev]** Using `value`/`initializer` on a native class field asserts:
   ``You attempted to set a default value for ${key} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';``
   (`tracked.ts:298-309`).
4. `description` is accepted and validated, but it has no runtime effect for decorator forms.

#### 07-3.1.4 Standard (stage 3) field decorator: `@tracked x = init`

1. `context.addInitializer` registers, per instance, a step that runs after the field has been
   defined. That step reads the field's initial own value (which the class field initializer has
   already evaluated eagerly), then **redefines the property on the instance** as an own
   accessor with the same get/set semantics as §07-3.1.2. Its initializer returns the captured
   initial value (`tracked.ts:405-417`).
2. Observable differences from the legacy form. Both behaviors are required, each for its own
   decorator implementation; the difference is accepted (author ruling, 2026-09-30) and is a
   property of `@tracked`, independent of the renderer (`validation_test.js:46-87` asserts
   different results for the two builds):
   - Initialization is **eager** (normal class-field order). In the `validation_test.js:46` case
     the result is `'first: undefined'`.
   - The accessor is an **own, enumerable, configurable property of the instance**, not a
     prototype accessor.
   - The initializer's reads happen during construction, in whatever frame is active then.
     For a component, that is the component region's frame (§07-4.8).

#### 07-3.1.5 Standard auto-accessor: `@tracked accessor x = init`

Returns `{ get, set }` wrapping the native accessor storage (`tracked.ts:418-444`):

- **get:** consume the (instance, key) cell, read the native private storage, and, for arrays,
  also consume the array's `[]` cell.
- **set:** if `equals` is present and `equals(untrack(read), v)` is true, return. Otherwise
  invalidate the (instance, key) cell **and** the instance's object-level cell, as §07-3.1.2
  does, and write the native storage (`tracked.ts:439-441`). (Before emberjs/ember.js#21636 the
  object-level cell was not invalidated; test `smoke-tests/scenarios/stable-decorator-files.ts`,
  "Unit | tracked object tag".)
- Initialization follows native accessor semantics (eager).

Any other decorator kind (method, getter, setter, class) throws
``unimplemented: tracked on ${kind} ${name}`` (`tracked.ts:444-445`).

#### 07-3.1.6 Common semantics

- Every form creates one storage cell **per (instance, property)**. Different instances never
  share cells.
- Reading a tracked property with no active computation is an ordinary property read.
- Tracked properties are reactive through *any* access path: `this.x` in JS, `{{this.x}}` in
  templates, Ember `get`, getters, methods, and so on. Test:
  `packages/@ember/-internals/glimmer/tests/integration/helpers/tracked-test.js:15-142`.
- Ordinary getters that read tracked properties are reactive without any annotation (they are
  plain code inside the reader's computation). Tests: `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:426`,
  `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:495`.

### 07-3.2 Standalone `tracked(value, options?)` → `TrackedValue`

(RFC 1071 "overloaded tracked", implemented in commit `22ece72b2a`. The implementation is in
`packages/@glimmer/validator/lib/tracked-value.ts`. Types are exported from `@glimmer/tracking`
as `TrackedValue`, `Reactive`, `ReadOnlyReactive`, `packages/@glimmer/tracking/index.ts:4-8`.)

```ts
interface TrackedValue<V> {
  value: V;                          // getter: read (consume); setter: set(v)
  get(): V;                          // same as reading .value
  set(v: V): boolean;                // true iff it stored & invalidated
  update(fn: (current: V) => V): void;   // set(fn(current)) where `current` is read WITHOUT consuming
  freeze(): void;                    // all later set/update throw
}
tracked<V>(initial: V, options?: { equals?: (a: V, b: V) => boolean; description?: string }): TrackedValue<V>
```

- `equals` defaults to `Object.is`. When `equals(current, v)` is true, `set` returns `false` and
  does nothing (§07-1.6).
- `get`, `set`, `update`, and `freeze` are own arrow-function properties, so they work detached
  (test `packages/@glimmer/validator/test/tracked-value-test.ts:104`).
- After `freeze()`, `set`/`update` (and `.value =`) throw
  ``Error(`Cannot update a frozen TrackedValue${description ? ` (\`${description}\`)` : ''}`)``.
  This check happens **before** the equality check, so setting an equal value on a frozen
  instance also throws (`tracked-value.ts:67-74`).
- The value is not copied or wrapped. `tracked(obj)` holds a reference to `obj`, and mutating
  `obj`'s own properties is not tracked (test `standalone_test.js:96`).
- `tracked` used as a **template helper** (`(tracked 0)`) works through the default function
  helper manager. The helper computation consumes nothing, so it is constant: the same
  `TrackedValue` persists for the life of the helper invocation (test
  `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:313-334`).

### 07-3.3 `@cached` (`@glimmer/tracking`)

(`packages/@ember/-internals/metal/lib/cached.ts`.)

- Applies to a **getter**. It memoizes the getter's result **per instance** with one cache per
  (instance, decorated getter), created lazily on first access with the getter bound to the
  instance (`cached.ts:124-133`, `:140-146`). Every access is `getValue(thatCache)`, so all of
  §07-3.4 applies: lazy, memoized until invalid, consumes dependencies into the reader, and has
  no equality cut-off.
- Legacy form **[Dev]** errors:
  - `@cached()` with parentheses: `You attempted to use @cached(), which is not necessary nor supported. Remove the parentheses and you will be good to go!`
  - Wrong shape: ``You attempted to use @cached on with an argument ( @cached('a')), which is not supported. Dependencies are automatically tracked, so you can just use `@cached` `` (with "arguments" when more than one is passed; `cached.ts:163-172`).
  - Not a getter: ``The @cached decorator must be applied to getters. '${key}' is not a getter.``
- Standard-decorator form on anything other than a getter throws
  ``unsupported use of @cached on ${kind} ${name}`` (`cached.ts:148-150`).
- Any setter on the same property is left untouched.
- Tests: `packages/@ember/-internals/metal/tests/cached/get_test.js:7,49`.
- **[Proposed]** (RFC 1218, §07-2.2.2.) `cached(fn)` or `cached(fn, options)` with a function as
  the first argument, and not in a decorator's argument shape, returns a `ReadOnlyReactive`.
  The 2023 decorator shape is recognized by a second argument with a `kind` property
  (`packages/@ember/-internals/metal/lib/decorator-util.ts:93-95`), which an options object
  does not have. Today, `cached(fn)` throws the **[Dev]** "with an argument" error above, and in
  production it fails with a `TypeError` on `descriptor.get`. The decorator itself becomes sugar
  over the function form (§07-2.2.6).

### 07-3.4 Cache primitives (`@glimmer/tracking/primitives/cache`)

(RFC 0615, `rfcs/text/0615-autotracking-memoization.md`. Implementation `tracking.ts:123-223`.)

**`createCache(fn, debuggingLabel?)`**

- **[Dev]** If `fn` is not a function, throws
  ``createCache() must be passed a function as its first parameter. Called with: ${String(fn)}``.
- Does not call `fn`.
- `debuggingLabel` is used only in development, and it is currently unused by `getValue` (see
  §07-5, item 5).

**`getValue(cache)`**

- **[Dev]** If `cache` was not created by `createCache`, throws
  ``getValue() can only be used on an instance of a cache created with createCache(). Called with: ${String(cache)}``.
- If the cache has never been evaluated, or is invalid, evaluates `fn()` with no arguments as a
  reactive computation and stores the result. Otherwise returns the stored result.
- Always consumes the cache's dependency set into the active computation (§07-1.3).
- If `fn` throws, see §07-1.8, item 3.
- Reentrancy: calling `getValue(c)` from inside `c`'s own `fn` recurses and calls `fn` again
  (there is no cycle guard). That is unspecified and SHOULD be avoided.

**`isConst(cache)`**

- **[Dev]** Not a cache: ``isConst() can only be used on an instance of a cache created with createCache(). Called with: …``.
- **[Dev]** Never evaluated: ``isConst() can only be used on a cache once getValue() has been called at least once. Called with cache function:\n\n${String(fn)}``.
- Returns `true` iff the most recent evaluation consumed nothing (§07-1.5, item 3).

Tests: `packages/@glimmer/validator/test/tracking-test.ts:275-434`.

**[Proposed]** `isValid(cache)`: §07-2.2.3. Under the proposal, these functions are a
compatibility layer over `cached()` (§07-2.2.6): a `createCache` cache is a `cached()` value.

**`invokeHelper(context, definition, computeArgs?)`** (`@ember/helper`, RFC 0626) returns a
`Cache` read with `getValue`. The arguments are computed lazily through a nested cache over
`computeArgs(context)`. The helper instance is created eagerly, and its destruction is tied to
`context`. **[Dev]** `getValue` after destruction throws `You attempted to get the value of a
helper after the helper was destroyed, which is not allowed`
(`packages/@glimmer/runtime/lib/helpers/invoke.ts:19-98`).

### 07-3.5 `@ember/reactive` and `@ember/reactive/collections`

`@ember/reactive` currently exports only an empty default object
(`packages/@ember/reactive/index.ts:9-10`). `@ember/reactive/collections` (RFC 1068,
`rfcs/text/1068-tracked-collections.md`) exports the factories below, from
`packages/@glimmer/validator/lib/collections/*`. All of them **copy** their input (so mutations
do not affect the original) and accept `options = { equals = Object.is, description }`.
`description` currently has no effect.

Each collection has one **collection cell**. Some kinds also have **per-key cells**, created
lazily on first keyed read.

#### 07-3.5.1 `trackedArray(data = [], options)`

Returns a `Proxy` over a copy (`data.slice()`), with `getPrototypeOf` reporting
`TrackedArray.prototype` (which inherits from `Array.prototype`), so both `Array.isArray(x)` and
`x instanceof Array` are true (`array.ts:73-153,195-198`).

| Operation | Consumes | Invalidates |
|---|---|---|
| integer-index read `a[i]` | per-index cell `i` **and** the collection cell | — |
| `a.length` (user read) | collection cell | — |
| `a.length` read internally by `push`/`unshift`/`fill` immediately after the call | nothing | — |
| any of `Symbol.iterator, concat, entries, every, filter, find, findIndex, flat, flatMap, forEach, includes, indexOf, join, keys, lastIndexOf, map, reduce, reduceRight, slice, some, values` | collection cell (when called) | — |
| other property reads (e.g. `at`, `findLast`, `toSorted`, custom props) | nothing directly. Native methods run with the proxy as receiver and hit the traps above | — |
| `a[i] = v`, when `!equals(a[i], v)` | — | per-index cell `i`, collection cell, and **all per-index cells are discarded** |
| `a.length = n`, when `!equals(length, n)` | — | collection cell (and discards per-index cells) |
| other property sets, when not equal | — | nothing (the value is stored) |
| mutator methods (`push`, `pop`, `splice`, `sort`, …) | per the reads they perform | per the sets they perform |

Because every index read also consumes the collection cell, **any** index or length write
invalidates **every** reader of the array. The per-index cells do not currently narrow
invalidation (see §07-5, item 6). Methods not in the list above that read indices (`at`, for
example) read through the index trap and so still consume.

#### 07-3.5.2 `trackedObject(data = {}, options)`

Proxy over a clone. The clone has the same prototype as `data` and copies all own property
descriptors. `getPrototypeOf` reports an internal `TrackedObject.prototype`, **not** the
original prototype (`object.ts:37-105`; see §07-5, item 7).

| Operation | Consumes | Invalidates |
|---|---|---|
| `o[k]` (get) | per-key cell `k` | — |
| `k in o` (has) | per-key cell `k` | — |
| `Object.keys`/`for…in`/`ownKeys` | collection cell | — |
| `o[k] = v`, when `!equals(o[k], v)` | — | per-key cell `k`, collection cell |
| `delete o[k]`, when `k in o` | — | per-key cell `k` (then discards it), collection cell |

#### 07-3.5.3 `trackedMap(data?, options)` / `trackedWeakMap(data?, options)`

Proxy over a new `Map` (or `WeakMap`). `instanceof Map` holds (`map.ts:11-133`, `weak-map.ts`).

| Operation | Consumes | Invalidates |
|---|---|---|
| `get(k)`, `has(k)` | per-key cell `k` | — |
| `size` (Map only) | collection cell | — |
| any other method (e.g. `forEach`, `keys`, `values`, `entries`, `[Symbol.iterator]`) on Map | collection cell | — |
| `set(k, v)` on an existing key with `equals(old, v)` true | — | nothing |
| `set(k, v)` otherwise | — | per-key cell `k`, and on Map the collection cell (even when replacing an existing key) |
| `delete(k)` on a present key | — | per-key cell `k`, and on Map the collection cell |
| `clear()` (Map only, non-empty) | — | every existing per-key cell, collection cell |

`trackedWeakMap` has no collection cell. Its other methods are bound to the target and consume
nothing.

#### 07-3.5.4 `trackedSet(data?, options)` / `trackedWeakSet(data?, options)`

(`set.ts:11-114`, `weak-set.ts`.)

| Operation | Consumes | Invalidates |
|---|---|---|
| `has(v)` | per-value cell `v` | — |
| `size` / other methods (Set only) | collection cell | — |
| `add(v)` where `v` is already present and `equals(v, v)` | — | nothing |
| `add(v)` where `v` is new | — | collection cell (Set only), per-value cell `v` |
| `add(v)` where present but `equals(v, v)` is false | — | per-value cell `v` only (Set: *not* the collection cell) |
| `delete(v)` on a present value | — | per-value cell `v`, collection cell (Set only) |
| `clear()` (Set, non-empty) | — | every existing per-value cell, collection cell |

### 07-3.6 Interop with the Ember object model **[Legacy]**

#### 07-3.6.1 The object-level cell

Every object has an **object-level cell** ("this object changed in some way"). It is
invalidated by `notifyPropertyChange(obj, anyKey)` and by the setter of legacy/classic
`@tracked` properties (§07-3.1.2). It is consumed by Ember internals that depend on "the whole
object", such as proxies (`ObjectProxy` links its object cell to its content's), `{{#each-in}}`,
and chains ending at an object. *Source:* `SELF_TAG`, `tagForObject`, `markObjectAsDirty`
(`packages/@ember/-internals/metal/lib/tags.ts:22,45-65`).

#### 07-3.6.2 `get(obj, key)` / `get(obj, 'a.b.c')` (`@ember/object`)

(`packages/@ember/-internals/metal/lib/property_get.ts:79-156`.) Per segment (`_getProp`):

1. If `obj` is `null`/`undefined`, return `undefined`. For a path, a `null`/`undefined` **or
   `isDestroyed`-truthy** intermediate object ends the path with `undefined` (`:143-146`).
2. If `obj` is an object or function: `value = obj[key]`. **[Dev]** For a proxy, the read goes
   to the proxy content via `Reflect.get` (`getPossibleMandatoryProxyValue`, `:15-27`). If
   `value === undefined`, `obj` is an *object* (not a function), `!(key in obj)`, and
   `obj.unknownProperty` is a function, then `value = obj.unknownProperty(key)`.
3. **Then**, only if there is an active computation: consume the **(obj, key) property cell**.
   If `value` is a native or Ember array, also consume `value`'s `[]` cell (`:123-131`). The
   consumption happens *after* the value has been computed (test
   `validation_test.js:390`, "get() does not entangle in the autotracking stack until after
   retrieving the value").
4. If `obj` is a primitive (string, number, …), read `obj[key]` and consume nothing.

The (obj, key) property cell is the same cell a legacy/classic `@tracked` property uses. For
plain properties it is the cell invalidated by `set`/`notifyPropertyChange`. **Development
assertions** (`:80-95`): exactly two arguments; `obj` not null/undefined (``Cannot call get with
'${keyName}' on an undefined object.``); key is a string or a non-NaN number; key does not start
with `this.`.

`get` on an args proxy (`get(this.args, 'foo')`) works and is reactive (tests
`packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:874,899`).

#### 07-3.6.3 `set(obj, key, value)` / `trySet` (`@ember/object`)

(`packages/@ember/-internals/metal/lib/property_set.ts:41-147`.)

1. If `obj.isDestroyed`: **[Dev]** assert ``calling set on destroyed object: ${obj}.${key} = ${value}``
   unless tolerant (`trySet`), then return `value` without writing.
2. Path keys set on the object that the path resolves to. A missing intermediate throws
   ``Property set failed: object in path "${parts}" could not be found.`` unless tolerant.
3. If the property's setter is a tracked or computed setter: plain assignment
   `obj[key] = value`. The tracked setter's policy applies (**always invalidates**), and
   `notifyPropertyChange` is **not** called (`:73-76`).
4. Else if the current value is `undefined`, `!(key in obj)`, and `obj.setUnknownProperty` is a
   function: call it, with no automatic notification.
5. Else assign, and if `currentValue !== value` call `notifyPropertyChange(obj, key)`.

#### 07-3.6.4 `notifyPropertyChange(obj, key)` (`@ember/object`)

(`packages/@ember/-internals/metal/lib/property_events.ts:50-81`.)

- No-op if `obj`'s meta is initializing (during `EmberObject.create`/`init`) or is a
  prototype's meta.
- Otherwise invalidates the (obj, key) property cell **and** the object-level cell. It then
  flushes sync observers (unless inside `changeProperties`), then calls the object's internal
  property-did-change hook if present (classic components use this).
- It invalidates only cells that already exist (§07-1.1, item 6). It is subject to the
  write-after-consume assertion like any write.
- `key` is used verbatim. There is no path splitting (`'a.b'` invalidates the cell named
  `'a.b'`).

#### 07-3.6.5 Classic computed properties

(`packages/@ember/-internals/metal/lib/computed.ts:397-600`.) This is a reactive-model reading
of `computed()`:

- **With dependent keys** (`computed('a', 'b.c', fn)` / `@computed('a')`): the getter runs
  **untracked**. Its result is cached per instance, and the property's validity is derived only
  from the **dependent key chains**: the cells of each path segment (resolved when the property
  is computed), with `@each` expanding to each item's property cell plus the array's `[]` cell.
  Reading the computed property consumes its (obj, key) cell, which is linked to those chains.
  If the value is an array, reading also consumes the array's `[]` cell (`:397-447`). Tracked
  properties used *inside* the getter but not listed as dependent keys do **not** invalidate it.
  (Interop rule from `rfcs/text/0478-tracked-properties-updates.md`: tracked properties and
  `@dependentKeyCompat` getters can be dependent keys.)
- **Without dependent keys** (`computed(fn)` with no keys): the getter still runs untracked,
  and the value is cached forever unless it is `set` or `notifyPropertyChange` is called.
- **Auto-tracked computed** (internal `autoComputed`, used by some reduce-computed macros): the
  getter runs **tracked**, and the property is valid until anything it consumed changes
  (`:560-601`).
- **[Dev]** Reading a computed property with dependent keys on a destroyed object throws
  ``Attempted to access the computed ${obj}.${keyName} on a destroyed object, which is not allowed``
  (`:411-414`).
- Setting: the setter runs with observers suspended. If a value was cached and the setter
  returns the identical (`===`) value, there is no notification. Otherwise `notifyPropertyChange`
  (`:522-547`).
- Dependent keys that end in a classic computed property whose cached value is invalid are
  resolved **lazily**: the chain is completed the next time that property is computed
  (`packages/@ember/-internals/metal/lib/chain-tags.ts:19-33,174-195`). This is an internal
  detail with one observable consequence: a chain through an uncomputed computed property does
  not force its evaluation.
- Tests: `validation_test.js:168,209,260`,
  `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:454,818,844`.

#### 07-3.6.6 Arrays and the `[]` cell

- Every array (native or Ember) has a `[]` cell. Reading an array-valued property through a
  tracked getter, Ember `get`, a classic computed property, or a template path also consumes
  the array's `[]` cell (§07-3.1.2, item 4.3; §07-3.6.2, item 3).
- Native in-place mutations (`arr.push(x)`) do **not** invalidate `[]`. Ember's array
  mutation APIs (`pushObject`, `replace`, `arrayContentDidChange`, …) call
  `notifyPropertyChange(array, '[]')` and `notifyPropertyChange(array, 'length')`
  (`packages/@ember/-internals/metal/lib/array_events.ts:55-58`). So does calling
  `notifyPropertyChange(arr, '[]')` manually (test `validation_test.js:326-370`).
- For tracked arrays (§07-3.5.1), the `[]` cell is irrelevant. They consume and invalidate their
  own collection cell.

#### 07-3.6.7 `@dependentKeyCompat` (`@ember/object/compat`)

(`packages/@ember/object/compat.ts:22-193`.) It wraps a native getter (legacy, stage-3, or
classic `dependentKeyCompat({ get })`). Each read evaluates the getter as a fresh tracked
computation (it is **not** memoized). It then **links** the (obj, key) property cell to the
getter's dependencies and consumes them. As a result, classic computed properties and observers
that name this key as a dependent key are invalidated when the getter's tracked inputs change.
**[Dev]** assertions:

- Already decorated with `@computed`/`@tracked`: `You attempted to use @dependentKeyCompat on a property that already has been decorated with either @computed or @tracked. @dependentKeyCompat is only necessary for native getters that are not decorated with @computed.`
- Not a getter/setter (native): `The @dependentKeyCompat decorator must be applied to getters/setters when used in native classes`.
- Classic misuse: `The @dependentKeyCompat decorator may only be passed a method when used in classic classes. You should decorate getters/setters directly in native classes` / `The dependentKeyCompat() decorator must be passed a getter or setter when used in classic classes`.

#### 07-3.6.8 Proxies and `unknownProperty`

`ObjectProxy`/`ArrayProxy` forward unknown reads through `unknownProperty`
(`packages/@ember/-internals/runtime/lib/mixins/-proxy.ts:121-124`). That code is ordinary code
running in the reader's computation, so it consumes the proxy's `content` and the content's
property cells. In addition, dependent-key chains through a proxy use a custom cell resolution
that combines the proxy's own (proxy, key) cell, its `content` cell, and the content's (content,
key) cell (`-proxy.ts:32-61`). Nothing beyond "the code that runs is tracked" needs to be
specified for templates.

#### 07-3.6.9 Mandatory setter **[Dev]**

When a **dependent-key chain** or an observer (not a template read) consumes a plain data
property, development builds replace it with an accessor whose setter asserts:

``You attempted to update ${obj}.${key} to "${value}", but it is being tracked by a tracking context, such as a template, computed property, or observer. In order to make sure the context updates properly, you must invalidate the property when updating it. You can mark the property as `@tracked`, or use `@ember/object#set` to do this.``

It is not installed for array index keys, for accessors, or for non-configurable or non-writable
properties. `set()` bypasses it (`packages/@ember/-internals/utils/lib/mandatory-setter.ts:27-110`;
installed from `tags.ts:38-40`, `chain-tags.ts:122,142`). Template path reads do **not** install
it (test `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:659-691`).
Plain properties read by templates and then assigned directly (without `set`) silently fail to
update. That is expected behavior, not an error.

#### 07-3.6.10 `changeProperties` / `beginPropertyChanges` / `endPropertyChanges`

These defer *sync observer* flushing only. Invalidation is still immediate
(`property_events.ts:88-127`).

### 07-3.7 Classic `Helper#recompute()` (`@ember/component/helper`) **[Legacy]**

Each classic helper instance has a private value-less cell. It is consumed after every
`compute()` call. `recompute()` invalidates it inside `join()` (it ensures a run loop), which
forces the helper's value computation to re-run
(`packages/@ember/-internals/glimmer/lib/helper.ts:141-191,249-256`).

### 07-3.8 Arguments proxies

The `args` object that custom component, helper, and modifier managers receive (and so
`this.args` of `@glimmer/component`) is a pair of proxies over the invocation's lazy argument
computations (`packages/@glimmer/manager/lib/util/args-proxy.ts:139-188`):

- `named[k]` (get): if `k` was passed, returns `getValue(argComputationₖ)` (lazy evaluation,
  memoized, dependencies consumed). Otherwise `undefined`, with nothing consumed.
- `k in named`, `Object.keys(named)`, `for…in`: reflect the *set of argument names*. That set is
  fixed for the lifetime of the invocation, so these consume nothing. Property descriptors are
  `{ enumerable: true, configurable: true }` with no value. **[Dev]** Calling
  `getOwnPropertyDescriptor` for a key that was not passed throws ``args proxies do not have real
  property descriptors, …``.
- `positional[i]` for `0 ≤ i < length`: lazy per-index evaluation. `length` is fixed.
  **[Dev]** `Object.keys(positional)` throws ``Object.keys() was called on the positional arguments array for a ${type}, which is not supported. …``.
- **[Dev]** Any assignment throws ``You attempted to set ${key} on the arguments of a component, helper, or modifier. Arguments are immutable and cannot be updated directly; they always represent the values that are passed down. If you want to set default values, you should use a getter and local tracked state instead.``
  (Production builds: the proxies are non-extensible and assignment has no effect.)
- Dependent-key chains may name `args.foo` (e.g. `@computed('args.foo')`). The (argsProxy, key)
  cell resolves to "the argument computation's dependencies" (`args-proxy.ts:32-56,180-181`;
  tests `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:818-872`).
  For positional arguments, the key `'[]'` means all positional arguments.

---

## 07-4 How template evaluation maps onto the model

### 07-4.1 Granularity

1. **Every dynamic position is its own reactive computation.** A dynamic position is: each
   `{{…}}` content position; each dynamic attribute or property value (including each
   concatenated attribute); each block condition; each `{{#each}}` list; each dynamic
   component, helper, or modifier *definition*; each helper invocation's value; each modifier
   hook call; and each argument expression. These are evaluated with the semantics of reading
   a `cached()` value (§07-2.2.2), which are those of `getValue` (§07-3.4).
2. **Sub-expressions are nested computations.** A helper call `(h a b)` inside a content
   position is its own computation (§07-4.5). Each argument is its own computation (§07-4.4).
   Each path segment is its own computation (§07-4.2). The enclosing position depends on the
   union of its sub-computations' dependencies (§07-1.3).
3. **Literals are constants.** String, number, boolean, `null`, and `undefined` literals, and
   positions built only from them, are constant (§07-1.5, item 3). No update machinery is
   required for them.
4. Re-evaluation during revalidation affects only positions whose computation is invalid; a
   position whose computation is valid does not re-run user code. (Tests: evaluation counts in
   `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:281-311,745-816`.)
   An implementation SHOULD avoid needless re-evaluation, but the counts are not part of the
   contract (§00-0.1).

### 07-4.2 Path evaluation

For a path `head.s₁.s₂…sₙ`, where the head is `this`, a local, an `@arg`, or a lexical or
free-variable value:

```
head computation H:
  this       → the component's self value; constant for the lifetime of the component
  @arg       → the argument's computation (§07-4.4)
  local      → whatever the block parameter / let binding is bound to (itself a computation)
  lexical    → constant (the captured JS value)
segment computation Sᵢ (i ≥ 1) := cached(() => {
    let parent = Sᵢ₋₁.value              // consumes the parent's dependencies
    if (parent === null || parent === undefined) return undefined
    return getProp(parent, sᵢ)            // Ember `_getProp` semantics, §07-3.6.2
})
the position's value = Sₙ.value
```

- `getProp` is exactly Ember's per-segment `get` (§07-3.6.2). It reads the property with a normal
  JS `[[Get]]` (running getters, tracked accessors, proxy traps), falls back to
  `unknownProperty`, and then consumes the (object, key) property cell. For array values it
  also consumes the array's `[]` cell. Primitives are read, but nothing is consumed.
  *Source:* global-context `getProp: _getProp`
  (`packages/@ember/-internals/glimmer/lib/environment.ts:30`); `childRefFor`
  (`packages/@glimmer/reference/lib/reference.ts:193-246`).
- Unlike `get('a.b')`, template paths do **not** stop at `isDestroyed` objects. The
  `isDestroyed` short-circuit exists only in `_getPath` (§07-3.6.2, item 1), which template paths
  do not use (see §07-5, item 8).
- So `{{this.a.b}}` depends on the (this, 'a') cell, the (this.a, 'b') cell, anything read by
  getters for `a` and `b`, and, if a value is an array, its `[]` cell.
- **Sharing.** Within one evaluation scope, the computation for `X.s` is created once per (parent
  computation `X`, segment name `s`) and is reused by every position that uses the same path from
  the same parent. So `{{this.foo}} {{this.foo}}`, or `{{this.foo}}` next to `{{#if this.foo}}`,
  evaluate the `foo` getter **once** per validity period (`reference.ts:198-207`, children map).
  Sharing extends across component boundaries when the parent computation is shared, e.g. the
  caller's `this.user` passed as `@user`, with the callee reading `@user.name`. This sharing is
  an optimization of the current implementation, not a requirement: evaluation counts and getter
  side effects are not part of the contract (§00-0.1), so an implementation MAY share more, less,
  or not at all.
- Paths used as **update targets** (two-way bindings such as `mut`, `<Input @value=…>`) set
  through `setProp` (Ember `_setProp`, §07-3.6.3) on the parent value. That is outside this
  chapter.

### 07-4.3 `this.args.x` vs `@x`

Both evaluate the same argument computation. `@x` reads it directly. `this.args.x` is the path
`this` → `args` → `x`: it consumes the (component, 'args') property cell (never invalidated),
then the args proxy returns `getValue(argComputation)`, which consumes its dependencies, plus
the (argsProxy, 'x') property cell (also never invalidated). The two forms are therefore
reactively equivalent (`packages/@glimmer/manager/lib/util/args-proxy.ts:32-56`). No test
compares the two forms directly. `packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:529-580`
exercises `this.args` reactivity only.

### 07-4.4 Arguments

1. At each invocation, every argument expression becomes a computation (§07-2.4.4). Its scope is
   the *caller's* scope.
2. Argument computations are created when the invocation is first rendered, and they are
   evaluated **lazily**: first by whichever consumer reads them, then again only when they are
   invalid.
3. What counts as eager evaluation is manager-defined (see §06), in reactive terms:
   - The default function-helper manager spreads `...positional`, so it evaluates **all
     positional arguments** on each helper evaluation. It passes the named-args proxy as the last
     argument, which keeps **named** arguments lazy
     (`packages/@glimmer/manager/lib/internal/defaults.ts:32-50`).
   - Classic `Helper`/`helper()` receive the positional/named proxies, which are lazy.
   - The curly (classic) component manager eagerly reads all arguments during create and update,
     inside its own tracked frame (`packages/@ember/-internals/glimmer/lib/component-managers/curly.ts:270-290,443-471`).
4. **Curried arguments** (`(component …)`, `(helper …)`, `(modifier …)`) keep their argument
   computations. Curried named arguments are merged *under* the invocation's own named arguments
   (the invocation's arguments win), and curried positional arguments come first
   (`expressions.ts:115-122`, `dom.ts:237-249`).
5. `(hash)` produces an object whose *properties* are the named-argument computations. Reading
   `h.k` through a path evaluates only argument `k`, but reading the `hash` value itself reifies
   every named argument (`packages/@glimmer/runtime/lib/helpers/hash.ts`). `(array)` reifies all
   of its positional arguments.

### 07-4.5 Helper invocations

1. The helper **definition** is resolved when the invocation is first rendered. A static helper
   is resolved once. A dynamic helper, `{{(this.h) …}}` or `(helper …)`, keeps the definition
   as a computation (§07-2.4.9).
2. `createHelper` runs once per invocation instance, eagerly at first render, in the enclosing
   frame. Its tracked reads are consumed by the enclosing region. This holds for static
   helpers. Dynamic helpers are created lazily inside the definition's computation, and the
   creation order is specified in §05-1.1 and §06-6.2.
3. For `hasValue` managers, the helper value is a computation over `getValue(bucket)`
   (§07-2.4.5). It re-runs iff something it consumed changed, including argument computations it
   read.
4. A helper value computation that consumes nothing is **constant**. The helper is never called
   again, even if the JS code it would call reads non-tracked state that has since changed. Test:
   "functional helpers autotrack based on non-argument tracked props that are accessed",
   `packages/@ember/-internals/glimmer/tests/integration/helpers/tracked-test.js:274`.
5. **[Dev]** Reading and then writing the same cell inside a helper's value computation throws
   the write-after-consume assertion, with the helper's debug label in the stack
   (`helper-manager-test.js:379-404`).

### 07-4.6 Constants and optimizations

- An implementation MAY evaluate each position once at first render and, if the computation is
  constant (`isConst`), emit no update logic.
- An implementation MUST NOT re-evaluate a constant computation. For example, a helper that
  consumed nothing on first render stays at its first value forever.
- Compile-time knowledge (literals, `this` with no further segments) MAY be used to skip creating
  computations at all.

### 07-4.7 Blocks and control flow

#### 07-4.7.1 `{{#if}}` / `{{#unless}}` / inline `(if)`

The condition is a computation over `toBool(value)` (Ember `toBool` is specified in §05/§08).
On revalidation, when the condition is invalid and its *truthiness* changed, the current branch
is torn down and the other branch is rendered. When the truthiness is unchanged, the current
branch is revalidated in place (`vm.ts:209-264`).

#### 07-4.7.2 `{{#each}}`

See §07-2.4.8 and §05 for keys and diffing. Reactive details:

- The list computation evaluates the list expression **and** converts it to an iterator in the
  same frame. For Ember-array and forEachable inputs, that conversion reads `length` or calls
  `forEach`. For native iterables it calls `[Symbol.iterator]()` and the first `next()`
  (`packages/@ember/-internals/glimmer/lib/utils/iterator.ts:36-52,85-117,195-237`). Reads that
  happen later while stepping the iterator are not guaranteed to be in the list's frame.
- Key functions run during the diff. `key="path"` uses Ember `get` (`getPath`) on each item
  (`iterable.ts:53-63`).
- Each rendered item's value and index (memo) are held in tracked storage with `!==` equality
  (`iterable.ts:162-178`). On a re-diff, retained items have their cells written. Positions
  inside a retained item re-evaluate only if they read a cell that changed.
- A plain native array mutated in place (`arr.push`) without `notifyPropertyChange(arr, '[]')`
  does not update the list (§07-3.6.6). A `trackedArray` does.

#### 07-4.7.3 `{{#each-in}}`

The iteration computation reads the object's own keys and values. For plain objects it consumes
the (obj, key) cell of every key, and the `[]` cell of array values
(`iterator.ts:119-141`). Adding a *new* key to a plain object is therefore not observed unless
the object-level cell or an existing key cell is invalidated. `trackedObject`, `trackedMap`, and
Ember objects via `notifyPropertyChange` do cause updates
(`packages/@ember/-internals/glimmer/tests/integration/helpers/tracked-test.js:369,391`).

#### 07-4.7.4 `{{#let}}`, block params, `{{yield}}`

These bind names to computations and do not evaluate them. A bound value is evaluated when
something reads it (lazily). A yielded value that is a path shares its computation with the
yielder (§07-4.2 "Sharing"; tests
`packages/@ember/-internals/glimmer/tests/integration/components/tracked-test.js:581-657`).

### 07-4.8 Components

1. **Create.** The component manager's `create` (e.g. a class constructor) runs inside the
   component's region frame, so its tracked reads become dependencies of the region
   (`components.ts:311-319`). **[Dev]** A write in the constructor to a cell that an *ancestor*
   position already consumed in this render transaction asserts (§07-1.9, item 2).
2. **Self.** For custom managers, `getContext(component)` is evaluated once, and the resulting
   `this` is constant (`packages/@glimmer/manager/lib/public/component.ts:186-188`).
3. **Region validity** drives `updateComponent` and `didUpdate*` hooks (§07-2.4.7).
4. **Destruction** of a component does not invalidate anything by itself.

### 07-4.9 Modifiers

1. `createModifier` runs at element construction during render (in the render transaction).
   `installModifier` runs in the **commit phase** as its own tracked frame (§07-2.4.6).
2. A custom modifier manager's `installModifier`/`updateModifier` are tracked unless the
   manager's capabilities set `disableAutoTracking: true`, in which case the hooks run
   untracked (`packages/@glimmer/manager/lib/public/modifier.ts:26-39,145-162`). Arguments are
   **lazy**: only arguments the hook actually reads (through the args proxy) become
   dependencies.
3. On revalidation, if the last hook call's computation is invalid, `updateModifier` is
   scheduled and runs in that transaction's commit phase, after all `install`s
   (`dom.ts:321-341`, `environment.ts:61-100`).
4. For a *dynamic* modifier, a changed definition destroys the old instance and installs a new
   one. An unchanged definition goes through the ordinary update path (`dom.ts:343-405`).
5. Modifiers do not run in non-interactive environments (SSR), so nothing is tracked for them
   there (`dom.ts:209-215`; `environment.ts:164-174`).

### 07-4.10 Ordering within a revalidation

1. Positions are revalidated in tree order (§05). A computation read by several positions
   (sharing, §07-4.2) is evaluated at the first position that reads it while it is invalid.
2. All DOM updates of a transaction happen before any commit-phase hook of that transaction.
3. Commit-phase order is: component `didCreate`, component `didUpdate`, modifier `install`,
   modifier `update`, each in scheduling order (`environment.ts:50-100`). §06-11 specifies
   the scheduling order.

---

## 07-5 Open questions / inconsistencies

1. **Writes to never-read cells do not schedule a run loop.** `dirtyTagFor` returns early when
   no cell exists yet, so it never calls `scheduleRevalidate` (`meta.ts:29-43`). `TrackedValue`
   and the collections, by contrast, always call it. This is harmless for rendering (nothing
   depended on the cell), but it is observable through run-loop creation (autoruns). Should the
   invalidation hook fire for every write?
2. **The renderer's validity check is global.** Any tracked write anywhere, even to state that
   no template uses, makes every renderer run a revalidation pass
   (`base-renderer.ts:374-378`). That pass does no DOM work, but it runs `didUpdate`-style hooks
   only for invalid regions. §07-1.10, item 4 allows finer-grained checks. Is there any
   observable effect of the global check that code relies on, such as `renderSettled` timing or
   extra run loops in tests?
3. **`getValue` after a throw returns stale data.** After `fn` throws, `getValue` stores the
   partial dependency set and keeps `LAST_VALUE`. Later reads silently return the previous (or
   `undefined`) value without rethrowing until a dependency changes (`tracking.ts:173-182`).
   Template computations re-evaluate instead. This looks unintentional, and it is untested.
4. **Validity snapshot vs. writes during evaluation.** In production builds, a write to a
   dependency during a computation's own evaluation is invisible to that computation, because
   the snapshot is taken after the frame ends (§07-1.5, item 2). The computation can then stay
   valid while holding a stale value. The dev-mode assertion prevents this, but the production
   behavior is unspecified.
5. **The `createCache` debug label is ignored.** `getValue` calls `beginTrackFrame()` without
   the label (`tracking.ts:173`). So caches never appear in the write-after-consume tracking
   stack, even though `createCache` accepts and stores a `debuggingLabel`.
6. **Per-index cells in `trackedArray` are ineffective.** Every index read also consumes the
   collection cell, and every index write invalidates the collection cell, so invalidation is
   effectively array-wide (`array.ts:77-80,139-144`). Is this intended (RFC 1068 promises that
   "changes to the collection only render what changed")?
7. **`trackedObject`'s `getPrototypeOf` hides the original prototype.** It reports an internal
   `TrackedObject.prototype` even though the clone keeps the original prototype, so
   `trackedObject(new Foo()) instanceof Foo` is `false` (`object.ts:101-103`). This contradicts
   the source comment "mimic the same behavior as a plain object".
8. **Template paths do not stop at `isDestroyed` objects**, but `get('a.b')` does
   (`property_get.ts:143-146` vs. `reference.ts:221-228`). Is this divergence intentional?
9. **`trackedSet.add` with a custom `equals` and an existing value** invalidates the value's
   cell but not the collection cell, whereas adding a new value invalidates both
   (`set.ts:41-54`). `equals(value, value)` with the same argument twice is an odd contract.
10. **`description` options are mostly unused.** They are accepted by all collections and by
    `@tracked({description})`, but only `TrackedValue` uses `description`, in its frozen error.
11. **Frozen `TrackedValue` throws even for equal writes** (§07-3.2). This is plausible, but it
    is untested.
12. **Commit-phase writes can loop without an assertion.** A modifier that writes state its own
    element's template reads causes one extra run loop per render. With a cycle it only hits the
    1000-loop limit, and there is no development-mode assertion pointing at the modifier
    (§07-1.11).
13. **`Tag` cycle assertion.** `'Cycles in tags are not allowed'` (`validators.ts:126-131`) can
    only arise through internal tag updating (classic computed chains, which are exempted with
    `ALLOW_CYCLES`). The abstract model has no counterpart. A computation that reads itself
    recurses instead (§07-3.4).

*Review points for the **[Proposed]** core (§07-2.2).* These are design decisions for the plan's
author, not records of existing behavior.

14. **Ember's default effect schedule.** Effects created without `schedule` need a default
    (§07-2.2.7). Candidates: a microtask (as outside Ember), the run loop's `actions` queue, or
    `afterRender` so user effects see the updated DOM. Whichever it is, test settledness
    (`settled()`, `renderSettled()`) should also wait for pending effect batches.
15. **`cached()` and errors.** Item 3 describes today's `getValue`: after a throw, reads return
    the previous value without rethrowing. `cached()` inherits it (§07-2.2.2, item 4). As the
    new foundation, it could instead store the error and rethrow it on every read until a
    dependency changes (as TC39 `Signal.Computed` does). The compatibility `getValue` could
    still return the stale value, because it can tell a stored error from a fresh one with
    `isValid`.
16. **Scheduled first run.** An effect's first run is scheduled, not synchronous (§07-2.2.5,
    item 1), so creating one during a render never runs user code mid-render. The cost is that
    code which wants the first run now has to wait for the flush. Is this the right default?
17. **Ordering within a batch.** A batch runs in effect creation order. A host that needs
    another order (modifier updates run in document pre-order, §06-11) gives each effect its
    own `schedule` function and orders the flushes itself (§07-2.4.6). Should the core offer an
    ordering hook instead?
18. **Equality cut-off.** With effects in the core, the missing cut-off (§07-1.3, item 5)
    becomes more visible: an effect that reads a `cached()` value re-runs whenever that value
    recomputes, even to an equal result. RFC 1218 defers an `equals` option; adding one would
    need the cut-off to propagate through `isValid` and effect staleness.
19. **Asynchronous consumption is left to libraries.** §07-2.7 shows that the core is enough
    for asynchronous resources that track reads across `await`, with an explicit `read()`. Should
    the core later offer implicit tracking across `await` (for example through TC39
    `AsyncContext`)? That would change what a tracking frame is (§07-1.2).
