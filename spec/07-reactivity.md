# 07 — Reactivity

This chapter defines the reactivity model of the Ember template language. It has five parts:

1. An **abstract model** (§07-1) of tracked storage, reactive computations, validity, and
   invalidation. It uses no tags, references, or revisions. Every other chapter describes
   template updates in terms of this model.
2. A **consumption primitive** (§07-2). It is the existing `createCache` / `getValue` /
   `isConst`, plus two **[Proposed]** additions (`isValid` and an invalidation hook). The chapter
   shows that these are enough to express everything the renderer needs.
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
| **invalidation hook** | The host callback invoked on every invalidation. The renderer uses it to schedule revalidation (§07-1.10, §07-2.2.4). |

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
| `@tracked` property (any decorator form) and classic `tracked()` | **Always invalidate**, even when the new value is identical (`===`) to the old | Yes: `@tracked({ equals })`. When `equals(old, new)` returns true, the write is skipped entirely (the value is *not* stored and nothing is invalidated) | `packages/@ember/-internals/metal/lib/tracked.ts:351-364`, `:429-441`; tests `packages/@ember/-internals/metal/tests/tracked/options_test.js:9,29,44` |
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
   (`environment.ts:61-100`). Test: `packages/@ember/-internals/glimmer/tests/integration/custom-modifier-manager-test.js:305`.
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
expression and updates when needed", without referring to tags or references. The existing
public API `@glimmer/tracking/primitives/cache` (RFC 0615, `rfcs/text/0615-autotracking-memoization.md`)
is almost enough. It lacks two things:

1. A way to ask *"is this computation still valid?"* **without** re-running it. Renderers need
   this to skip whole regions, and to decide whether a side-effecting operation (a modifier
   update, a component update hook) must run again. In the current implementation this is done
   with private tag APIs (`validateTag`, `JumpIfNotModifiedOpcode`, `UpdateModifierOpcode`).
2. A way for a host (a renderer, a test harness, a non-Ember embedding) to *learn that something
   changed*, so it can schedule work. Currently this is the private global-context hook
   `scheduleRevalidate` (`packages/@glimmer/global-context/index.ts:42,150,181`).

### 07-2.2 API

#### 07-2.2.1 Existing: `createCache`, `getValue`, `isConst`

Module: `@glimmer/tracking/primitives/cache`
(`packages/@glimmer/tracking/primitives/cache.ts:1`, implementation
`packages/@glimmer/validator/lib/tracking.ts:123-223`). Full semantics are in §07-3.4.

```ts
interface Cache<T = unknown> {}                 // opaque
function createCache<T>(fn: () => T, debuggingLabel?: string | false): Cache<T>;
function getValue<T>(cache: Cache<T>): T | undefined;
function isConst(cache: Cache): boolean;
```

`getValue` is the canonical way to *evaluate a reactive computation*:

- If `cache` has never been evaluated, or is invalid, `getValue` evaluates `fn` as a
  reactive computation (§07-1.2) and caches the result.
- Otherwise it returns the cached result.
- In both cases it consumes the cache's dependency set into the active computation (§07-1.3).

#### 07-2.2.2 **[Proposed]** `isValid(cache)`

```ts
function isValid(cache: Cache): boolean;
```

- Returns `true` iff `cache` has been evaluated at least once and is valid (§07-1.5).
- Returns `false` for a never-evaluated cache. (The asymmetry with `isConst`, which throws, is
  deliberate. "Not valid" is the correct answer for "would `getValue` run `fn`?")
- MUST NOT evaluate `fn`, MUST NOT consume anything, and MUST NOT invalidate anything. It is
  safe to call in any frame, including during a render transaction.
- Equivalent in the current implementation to
  `cache[TAG] !== undefined && validateTag(cache[TAG], cache[SNAPSHOT])`.

Invariant: `isValid(c) === true` ⇒ the next `getValue(c)` returns the cached value without
calling `fn`.

#### 07-2.2.3 **[Proposed]** `untrack(fn)` made public

```ts
function untrack<T>(fn: () => T): T;
```

Runs `fn` in an untracked frame (§07-1.4). This already exists internally
(`tracking.ts:251-259`), and Ember uses it for equality checks and classic computed getters. It
is listed here so that other chapters can say "evaluated untracked" and have a user-visible
equivalent.

#### 07-2.2.4 **[Proposed]** Invalidation hook

```ts
// Host-level; one registration per host (renderer runtime).
function onInvalidate(listener: () => void): () => void;   // returns an unsubscribe function
```

- `listener` is called **synchronously, after** every invalidation of any cell (§07-1.1,
  item 5). Writes suppressed by the equality policy do not call it.
- Inside `listener`, code MUST NOT read or write tracked storage. The listener exists only to
  *schedule* work (for example `queueMicrotask`, or starting a run loop).
- The listener receives no information about *which* cell changed. This matches the current
  implementation, whose only notification is the parameterless `scheduleRevalidate()`.
- Ember's renderer registers exactly the behavior of §07-1.10, item 1.

*Rationale.* A global "something changed" hook together with pull-based `isValid`/`getValue` is
exactly what the current tag system can provide cheaply, because tags have no reverse
(dependent) edges. A per-computation push notification (a watcher) would need reverse edges.
It is discussed in §07-2.5 as a possible future extension, not as a requirement.

#### 07-2.2.5 Tracked storage for specification purposes

To write storage, other chapters use the existing standalone form of `tracked`
(§07-3.2):

```ts
const cell = tracked(initialValue, { equals?: (a, b) => boolean });
cell.value; cell.value = v;       // read / write per §07-1.1
```

Wherever this spec says "a private tracked storage cell", an implementation MAY use any
mechanism with the semantics of §07-1.1. For example, `{{#each}}` item values use `!==`
equality (§07-4.7.2).

### 07-2.3 Reference semantics of the primitive (non-normative sketch)

The abstract model can be implemented with a global monotonically increasing clock. This is how
the current implementation works, and it is given only to show that the proposal is cheap:

```
clock := 1
cell.changedAt := clock at last invalidation
computation.deps := set of cells;  computation.validatedAt := clock at end of evaluation
isValid(c) := c evaluated ∧ ∀ d ∈ c.deps: d.changedAt ≤ c.validatedAt
invalidate(cell) := clock += 1; cell.changedAt := clock; notify onInvalidate listeners
```

Implementations MAY use any other technique (dirty flags, push/pull graphs, signals) that is
observably equivalent.

### 07-2.4 Sufficiency: expressing every renderer need

Below, `C(expr)` means `createCache(() => evaluate(expr))`. Each subsection names the current
mechanism it replaces. Detailed DOM semantics live in §05. Only the reactive skeleton is given
here.

#### 07-2.4.1 Content (text / dynamic content)

```
initial:  c := C(expr); v := getValue(c); append DOM for v;
          if isConst(c): done (the position is static)
update:   if !isValid(c): v' := getValue(c); if content *type* changed → re-render the
          enclosing block (§05); else apply the §05 update rule for v' (text: write only if
          normalized string differs)
```

Replaces `DynamicTextContent` (`packages/@glimmer/runtime/lib/vm/content/text.ts:7-36`) and the
content-type `AssertFilter` (`packages/@glimmer/runtime/lib/compiled/opcodes/content.ts:71-87`,
`vm.ts:266-284`). Calling `getValue(c)` unconditionally on every revalidation is equivalent to
the `isValid` check, because a valid cache returns its old value.

#### 07-2.4.2 Attributes and properties

The same pattern: `c := C(valueExpr)`. On update, if `!isValid(c)`, recompute and hand the new
value to the attribute's update policy. (The current policy writes `setAttribute` on every
recomputation for plain attributes, and writes properties only when `!==` the last written
value. See §05 and `packages/@glimmer/runtime/lib/vm/attributes/dynamic.ts:97-136`.) Replaces
`UpdateDynamicAttributeOpcode` (`packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:408-430`).

#### 07-2.4.3 Conditionals

`c := C(toBool(condExpr))`. On update, if `!isValid(c)` and `getValue(c)` differs from the last
branch decision, tear down and re-render the block. Otherwise descend into the current branch.
Replaces `VM_TO_BOOLEAN_OP` + `Assert` (`vm.ts:209-264`).

#### 07-2.4.4 Argument laziness

Each argument expression at an invocation site becomes `cᵢ := C(argExprᵢ)`, created when the
invocation is first rendered and **not** evaluated at that time. Every consumer of the argument
calls `getValue(cᵢ)`: `@name` in the callee's template, `this.args.name` through the args proxy,
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
eagerly, when the invocation is first rendered. Then `c := createCache(() => manager.getValue(bucket))`.
The helper's value position consumes `getValue(c)`. The helper re-runs `getValue` iff any cell
it consumed (including arguments it read) is invalidated. Replaces `createComputeRef(() =>
manager.getValue(bucket))` (`packages/@glimmer/manager/lib/public/helper.ts:122-150`).
`invokeHelper` already works exactly this way on top of `createCache`
(`packages/@glimmer/runtime/lib/helpers/invoke.ts:48-98`).

#### 07-2.4.6 Modifiers

Modifier hooks are side effects, not values. They are expressed by re-arming a fresh cache for
each hook call:

```
commit (install):   m.cache := createCache(() => manager.install(state)); getValue(m.cache)
revalidation:       if m.cache !== undefined && !isValid(m.cache):
                        schedule update for this transaction's commit phase
commit (update):    m.cache := createCache(() => manager.update(state)); getValue(m.cache)
```

Replaces the modifier `UpdatableTag` + `updateTag(modifierTag, track(install))`
(`packages/@glimmer/runtime/lib/environment.ts:61-100`) and `UpdateModifierOpcode`
(`dom.ts:308-328`). A manager with `disableAutoTracking` runs its hook inside `untrack`. The
cache is then constant, and `update` never runs because of tracked state. See §07-4.9.

#### 07-2.4.7 Component regions, `updateComponent`, and `didUpdate`

The current implementation wraps each component invocation in a *cache group*. The group's
dependency set is the union of everything consumed while creating the component and rendering
its template, including nested components. During revalidation, a valid group is skipped
entirely (`vm.ts:286-326`, `append.ts:351-385`,
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts:311,374`). The same
thing can be expressed by re-arming:

```
initial:  g := createCache(() => renderComponentRegion()); getValue(g)
update:   if isValid(g): skip region (its dependencies are still consumed by the enclosing region)
          else g := createCache(() => { manager.update?(state); revalidateChildren(); }); getValue(g)
```

This matters for observable hooks. A manager's `update` hook (capability `updateHook`), and the
`didUpdate` hooks queued by the region, run **when the region is invalid**. That happens when
any cell consumed anywhere in the region changed, *including in descendants*. It does not
depend only on the component's own arguments (`component.ts:440-445,940-966`). The classic
(curly) manager filters `didUpdateAttrs`/`didReceiveAttrs` by its own argument validity
(`packages/@ember/-internals/glimmer/lib/component-managers/curly.ts:443-471`). It still fires
`didUpdate`/`didRender` for every invalid region (`curly.ts:479-483`). See §07-5, item 6.

Skipping a valid region is **required only for its observable effects** (the hooks above). An
implementation MAY skip or MAY descend. Descending is harmless because every inner position is
itself cached.

#### 07-2.4.8 `{{#each}}` iteration change detection

```
list := C(() => toIterator(evaluate(listExpr)))   // obtaining the iterator happens INSIDE the computation
initial:  iterate list's result; for each item create an item cell (tracked, `!==` policy)
          holding the item value, and a memo/index cell
update:   if !isValid(list): obtain the new iterator via getValue(list) and run the keyed diff
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
`dom.ts:193-306,330-392`.)

#### 07-2.4.10 The renderer loop

`onInvalidate(() => ensureRunLoop())` plus, per run loop, `revalidate()` in the `render` queue
(§07-1.10). The renderer's global validity check (§07-1.10, item 4) becomes "is any root region
cache invalid?" (`!isValid(rootᵢ)` for some root). That is *finer* than the current global clock
comparison, but it is equivalent for DOM output.

**Conclusion.** `createCache`, `getValue`, `isConst`, `untrack`, **`isValid`**, and a global
**invalidation hook** are sufficient to express every update behavior of the renderer. No other
chapter needs tags, references, or revisions.

### 07-2.5 Design context: comparison with the TC39 Signals proposal (non-normative)

| Concept | This model | TC39 Signals (stage 1) |
|---|---|---|
| Root state | tracked storage cell; `tracked(v, {equals})` | `new Signal.State(v, {equals})` |
| Derived | `createCache(fn)` + `getValue` | `new Signal.Computed(fn, {equals})` + `.get()` |
| Untracked read | `untrack(fn)` [Proposed public] | `Signal.subtle.untrack(fn)` |
| Constant detection | `isConst(cache)` | none (introspection: `Signal.subtle.introspectSources`) |
| Validity check without recompute | `isValid(cache)` [Proposed] | none directly. Watchers get notified instead |
| Change notification | global parameterless `onInvalidate` [Proposed] | `new Signal.subtle.Watcher(notify)` + `watch(signal)`, `getPending()`: per-signal, synchronous, push |
| Equality cut-off for derived values | **none** (§07-1.3, item 5) | yes. A `Computed` whose recomputed value is `equals` to the previous one does not invalidate its dependents |
| Default equality for root writes | per API: `@tracked` always invalidates; `tracked(v)` and collections use `Object.is` (§07-1.6) | `Object.is` |
| Writes during computation | dev-mode assertion (§07-1.9) | throws when writing inside a `Computed` |

A future implementation could build the model on Signals. `tracked(v)` would map to `State`
(with `equals` forced to "always different" for `@tracked`), and `createCache` to `Computed`
with `equals: () => false`, which reproduces the lack of cut-off. `isValid` would be implemented
through a watcher's dirty bit.

### 07-2.6 Explicitly not part of the model

Tags, tag combinators, updatable tags, "volatile" and "current" tags, revisions, snapshots,
`validateTag`, `valueForTag`, `tagFor`, `dirtyTagFor`, `tagMetaFor`, references,
`valueForRef`, `childRefFor`, `ALLOW_CYCLES`, and the cycle assertion
`'Cycles in tags are not allowed'` (`validators.ts:126-131`) are all implementation details.
`@glimmer/validator` exports these (`packages/@glimmer/validator/index.ts:11-69`), but that
package is not public Ember API. See §07-5, item 9 regarding ecosystem reliance.

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
2. Observable differences from the legacy form (see §07-5, item 7):
   - Initialization is **eager** (normal class-field order). In the `validation_test.js:46` case
     the result is `'first: undefined'`.
   - The accessor is an **own, enumerable, configurable property of the instance**, not a
     prototype accessor.
   - The initializer's reads happen during construction, in whatever frame is active then.
     For a component, that is the component region's frame (§07-4.8).

#### 07-3.1.5 Standard auto-accessor: `@tracked accessor x = init`

Returns `{ get, set }` wrapping the native accessor storage (`tracked.ts:418-443`):

- **get:** consume the (instance, key) cell, read the native private storage, and, for arrays,
  also consume the array's `[]` cell.
- **set:** if `equals` is present and `equals(untrack(read), v)` is true, return. Otherwise
  invalidate the (instance, key) cell **and** the instance's object-level cell, as §07-3.1.2
  does, and write the native storage. (Until emberjs/ember.js#21636, which landed after this
  checkout's base, the object-level cell was not invalidated and the cited line lacks it; see
  §07-5 item 8.)
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

### 07-3.4 Cache primitives (`@glimmer/tracking/primitives/cache`)

(RFC 0615, `rfcs/text/0615-autotracking-memoization.md`. Implementation `tracking.ts:123-223`.)

**`createCache(fn, debuggingLabel?)`**

- **[Dev]** If `fn` is not a function, throws
  ``createCache() must be passed a function as its first parameter. Called with: ${String(fn)}``.
- Does not call `fn`.
- `debuggingLabel` is used only in development, and it is currently unused by `getValue` (see
  §07-5, item 10).

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

**[Proposed]** `isValid(cache)`: §07-2.2.2.

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
invalidation (see §07-5, item 11). Methods not in the list above that read indices (`at`, for
example) read through the index trap and so still consume.

#### 07-3.5.2 `trackedObject(data = {}, options)`

Proxy over a clone. The clone has the same prototype as `data` and copies all own property
descriptors. `getPrototypeOf` reports an internal `TrackedObject.prototype`, **not** the
original prototype (`object.ts:37-105`; see §07-5, item 12).

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
   hook call; and each argument expression. These are evaluated with `getValue` semantics
   (§07-2.2.1).
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
segment computation Sᵢ (i ≥ 1) := createCache(() => {
    let parent = getValue(Sᵢ₋₁)          // consumes the parent's dependencies
    if (parent === null || parent === undefined) return undefined
    return getProp(parent, sᵢ)            // Ember `_getProp` semantics, §07-3.6.2
})
the position's value = getValue(Sₙ)
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
  do not use (see §07-5, item 13).
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
   (`expressions.ts:115-122`, `dom.ts:224-236`).
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
   (`dom.ts:308-328`, `environment.ts:61-100`).
4. For a *dynamic* modifier, a changed definition destroys the old instance and installs a new
   one. An unchanged definition goes through the ordinary update path (`dom.ts:330-392`).
5. Modifiers do not run in non-interactive environments (SSR), so nothing is tracked for them
   there (`dom.ts:196-202`; `environment.ts:164-174`).

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
<!-- REMOVE -->5. **Path computation sharing is an implementation artifact.** It comes from `childRefFor`'s
   per-parent `children` map (§07-4.2), yet it determines evaluation counts. It is unclear which
   tests depend on it. A JS-function implementation needs to decide whether to reproduce it
   exactly (a memo keyed by parent computation and segment).
<!-- REMOVE -->6. **`updateComponent` fires for descendant changes.** Recorded as §06-12 Q12, which owns
   it.
7. **Legacy vs. stage-3 `@tracked` differ observably.** They differ in initialization timing
   (lazy on first read vs. eager), in whether an initializer runs when the field is written
   before it is read, and in whether the property is a prototype accessor or an own instance
   accessor (§07-3.1.2, §07-3.1.4; `validation_test.js:46-87` asserts different results for the
   two builds). *Resolved: accepted.* The difference is a known, accepted consequence of the
   two decorator implementations, which is why the tests assert different results. It is a
   property of `@tracked` itself and is orthogonal to the rendering layer: a new renderer
   keeps whichever `@tracked` implementation the build uses and need not reconcile them.

8. **`@tracked accessor` did not invalidate the object-level cell.** *Resolved* by
   emberjs/ember.js#21636 (after this checkout's base): the accessor setter now invalidates it,
   like the field setters (`tracked.ts:363` vs. `:439` in this checkout). The only in-tree consumers of the object-level cell are `{{#each-in}}` and
   `ObjectProxy`, and `{{#each-in}}` iterates own keys, which an accessor is not, so the
   difference is mostly visible to code that reads `tagForObject` directly.

9. **Ecosystem use of private tags.** Addons such as ember-modifier (classic modifier arg
   consumption), `tracked-built-ins`, and ember-resources import `@glimmer/validator`
   (`consumeTag`, `tagFor`, `dirtyTagFor`) directly. A new implementation will need a
   compatibility shim, or the proposed public primitives (§07-2) plus `tracked(v)`, to replace
   those uses. *Policy:* provide a shim if it is cheap and easy. It is not a hard requirement,
   because the most significant users are packages the project can influence directly, and
   they can be required to migrate before they run on a new renderer.

10. **The `createCache` debug label is ignored.** `getValue` calls `beginTrackFrame()` without
    the label (`tracking.ts:173`). So caches never appear in the write-after-consume tracking
    stack, even though `createCache` accepts and stores a `debuggingLabel`.
11. **Per-index cells in `trackedArray` are ineffective.** Every index read also consumes the
    collection cell, and every index write invalidates the collection cell, so invalidation is
    effectively array-wide (`array.ts:77-80,139-144`). Is this intended (RFC 1068 promises that
    "changes to the collection only render what changed")?
12. **`trackedObject`'s `getPrototypeOf` hides the original prototype.** It reports an internal
    `TrackedObject.prototype` even though the clone keeps the original prototype, so
    `trackedObject(new Foo()) instanceof Foo` is `false` (`object.ts:101-103`). This contradicts
    the source comment "mimic the same behavior as a plain object".
13. **Template paths do not stop at `isDestroyed` objects**, but `get('a.b')` does
    (`property_get.ts:143-146` vs. `reference.ts:221-228`). Is this divergence intentional?
14. **`trackedSet.add` with a custom `equals` and an existing value** invalidates the value's
    cell but not the collection cell, whereas adding a new value invalidates both
    (`set.ts:41-54`). `equals(value, value)` with the same argument twice is an odd contract.
15. **`description` options are mostly unused.** They are accepted by all collections and by
    `@tracked({description})`, but only `TrackedValue` uses `description`, in its frozen error.
16. **Frozen `TrackedValue` throws even for equal writes** (§07-3.2). This is plausible, but it
    is untested.
17. **Commit-phase writes can loop without an assertion.** A modifier that writes state its own
    element's template reads causes one extra run loop per render. With a cycle it only hits the
    1000-loop limit, and there is no development-mode assertion pointing at the modifier
    (§07-1.11).
18. **`Tag` cycle assertion.** `'Cycles in tags are not allowed'` (`validators.ts:126-131`) can
    only arise through internal tag updating (classic computed chains, which are exempted with
    `ALLOW_CYCLES`). The abstract model has no counterpart. A computation that reads itself
    recurses instead (§07-3.4).
