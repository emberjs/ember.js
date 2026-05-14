/**
 * gxt-bridge — Cluster B pilot
 *
 * Typed capabilities bridge between sibling modules in `@ember/-internals/gxt-backend`
 * (and a small number of cross-package consumers). Replaces ad-hoc
 * `(globalThis as any).__gxt*` 1-writer/1-reader pairs.
 *
 * Why a separate module (rather than direct imports between sibling files)?
 * `manager.ts` and `compile.ts` historically don't import each other — adding a
 * direct import edge would create circular-load hazards during gxt-backend's
 * module init (both are very large files with eagerly-evaluated top-level
 * `(globalThis as any).__gxtFoo = ...` statements that the other side then reads
 * at top-level too).
 *
 * Instead this module is a LEAF: it imports nothing from gxt-backend internals
 * and only exposes a tiny mutable registry. The writer (manager.ts) calls
 * `setGxtRenderer({ ... })` exactly once at module init; readers
 * (compile.ts, ember-gxt-wrappers.ts) read through `getGxtRenderer()`.
 *
 * Contract:
 *  - `setGxtRenderer` is called exactly once, at gxt-backend module init
 *    (manager.ts top-level). Classic-Ember builds NEVER import gxt-backend, so
 *    the registry stays `null` and every reader's `if (renderer)` guard turns
 *    into a dead-code branch that `__GXT_MODE__` strips at bundle time.
 *  - Capabilities are added to the interface incrementally as more globalThis
 *    bridges are migrated. This pilot covers the "destruction" capability
 *    cluster only (6 hooks). Future iterations will add scheduling, lifecycle,
 *    cell-mirror, etc.
 *  - All methods are best-effort (callers must remain defensive). The bridge
 *    does NOT add behavior on top of the underlying call; it's a typed
 *    indirection only.
 *
 * Anti-patterns this bridge AVOIDS:
 *  - No `globalThis` writes (the whole point).
 *  - No imports back into manager.ts / compile.ts (would re-introduce the
 *    cycles the globalThis pattern existed to avoid).
 *  - No `__GXT_MODE__` gating inside the bridge itself — classic builds drop
 *    the entire import edge to gxt-backend via build-time dead-code elimination.
 */

/**
 * Destruction capabilities. Implemented by manager.ts, consumed by compile.ts
 * and ember-gxt-wrappers.ts (intra-package), plus a small number of test
 * helpers.
 *
 * All methods are synchronous and best-effort; each implementation already
 * wraps user-thrown destroy errors locally (see manager.ts destroy phases).
 */
export interface GxtDestructionCapabilities {
  /**
   * Destroy a single destroyable (Ember's destroyable contract). Used by
   * compile.ts:5605 to tear down per-modifier destroyables when an element is
   * removed from the DOM.
   *
   * Previously: `(globalThis as any).__gxtDestroyDestroyableFn`.
   */
  destroyDestroyable(destroyable: object): void;

  /**
   * Flush any custom-managed (manager.ts:_customManagedInstances) component
   * instances whose DOM nodes are no longer connected. Invoked from
   * `__gxtDestroyUnclaimedPoolEntries` near the start of its sweep.
   *
   * Previously: `(globalThis as any).__gxtDestroyCustomManagedInstances`.
   */
  destroyCustomManagedInstances(): void;

  /**
   * Drive the unclaimed-pool-entry destroy sweep. Called from compile.ts at
   * the end of `__gxtSyncDomNow` Phase 2 to fire lifecycle hooks on pool
   * entries that were in the previous render but not in the new one.
   *
   * Previously: `(globalThis as any).__gxtDestroyUnclaimedPoolEntries`.
   */
  destroyUnclaimedPoolEntries(): void;

  /**
   * Destroy any classic-component instances whose wrapper element appears in
   * the given list of removed DOM nodes. Called from multiple compile.ts
   * sites after morph-driven DOM mutations.
   *
   * Previously: `(globalThis as any).__gxtDestroyInstancesInNodes`.
   */
  destroyInstancesInNodes(removedNodes: ReadonlyArray<Node>): void;

  /**
   * Run the full interactive destroy lifecycle for all tracked component
   * instances. Called from compile.ts at QUnit afterEach teardown.
   *
   * Previously: `(globalThis as any).__gxtDestroyTrackedInstances`.
   */
  destroyTrackedInstances(): void;

  /**
   * Destroy a single Ember component instance with full lifecycle hooks.
   * Used by `$_dc_ember` (dynamic-component switch) in ember-gxt-wrappers.ts.
   *
   * Previously: `(globalThis as any).__gxtDestroyEmberComponentInstance`.
   */
  destroyEmberComponentInstance(instance: object): void;
}

/**
 * Backtracking capabilities. Implemented by validator.ts (frame management)
 * and manager.ts (`checkBacktracking`), consumed by helper-manager.ts and
 * ember-gxt-wrappers.ts (both intra-package) when wrapping createHelper/getValue
 * invocations so read-then-write inside a helper compute is detected as a
 * backtracking re-render, plus cross-package readers in
 * `metal/property_set.ts`, `metal/tracked.ts`, and `gxt-backend/glimmer-tracking.ts`
 * that call `checkBacktracking` from inside @tracked / set() setters.
 *
 * Begin/end are paired in `try/finally` — every begin must have a matching
 * end. The implementations are no-ops outside of an enclosing frame; missing
 * a begin (frame stays null) is safe.
 *
 * Slice-10 design: the `checkBacktracking` method is seeded by manager.ts's
 * initial `setGxtRenderer` install, with an optional `transformBacktrackingMessage`
 * host hook contributed by compile.ts via `installBacktrackingPart`. The hook
 * replaces the pre-slice-10 wrap-by-reassignment installer at compile.ts:5041
 * (`_installTemplateOnlyRenderTreeInjection`) which wrapped
 * `globalThis.__gxtCheckBacktracking` at runtime to inject template-only
 * component names into the assertion message. The pre-slice-10 wrap reassigned
 * the function and intercepted `__emberAssertFn` for the duration of the call;
 * the bridge form is a typed message transformer that manager.ts applies before
 * dispatching to `_assertFn`. Mirrors the slice-8 host-hook pattern.
 *
 * NOT included in this slice (intentionally deferred):
 *  - `__gxtAssertNotResolvedHelperAsNamedArg` (compile.ts) — referenced by
 *    EMITTED CODE strings (`globalThis.__gxtAssertNotResolvedHelperAsNamedArg(...)`
 *    appears in compiled template output). It's a code-generation hook, not
 *    a runtime bridge target.
 *  - `__gxtDebugCompile` (compile.ts reader-only) — read-only debug toggle
 *    a developer flips manually in the browser console; no source writer.
 */
export interface GxtBacktrackingCapabilities {
  /**
   * Open a new backtracking-detection frame. `debugName` is captured for
   * inclusion in the assertion message if a backtracking write is observed
   * during the frame.
   *
   * Previously: `(globalThis as any).__gxtBeginBacktrackingFrame`.
   */
  beginFrame(debugName?: string): void;

  /**
   * Close the current backtracking-detection frame. Always called in a
   * `finally` block paired with `beginFrame`.
   *
   * Previously: `(globalThis as any).__gxtEndBacktrackingFrame`.
   */
  endFrame(): void;

  /**
   * Check if setting `key` on `targetObj` constitutes backtracking (i.e., the
   * target's template was already rendered in the current pass). When true,
   * assemble a render-tree assertion message and dispatch via the current
   * `__emberAssertFn`. Best-effort: no-op outside a render pass and for
   * targets not in the rendered set.
   *
   * Called from `@ember/-internals/metal/lib/property_set.ts:_setProp`,
   * `@ember/-internals/metal/lib/tracked.ts:set`, and
   * `gxt-backend/glimmer-tracking.ts:trackedSet`. Each caller already
   * guards via DEBUG / `typeof === 'function'`, so missing bridge install
   * (e.g., classic-Ember build) is safe.
   *
   * Slice-10: an optional `transformBacktrackingMessage` host hook
   * contributed by compile.ts (via `installBacktrackingPart`) is applied to
   * the assembled message before it reaches `_assertFn`. Pre-slice-10 this
   * was implemented as a runtime wrap of `globalThis.__gxtCheckBacktracking`.
   *
   * Previously: `(globalThis as any).__gxtCheckBacktracking`.
   */
  checkBacktracking?(targetObj: unknown, key: string): void;

  /**
   * Host hook contributed by compile.ts (via `installBacktrackingPart`) that
   * rewrites the backtracking assertion message before manager.ts's
   * `checkBacktracking` dispatches it to `_assertFn`. Used to inject names of
   * rendered template-only components into the render tree (template-only
   * components have no instance and so are not visible in the parentView
   * chain that `checkBacktracking` walks). Pre-slice-10 this logic lived in
   * a wrap-by-reassignment installer at compile.ts:5041; this slice promotes
   * it to a typed host hook.
   *
   * Best-effort: errors thrown from the hook are caught and the original
   * message is used, matching the pre-slice-10 wrap's try/catch behavior.
   */
  transformBacktrackingMessage?(msg: string): string;
}

/**
 * View utilities and parent-view stack management. Implemented by manager.ts
 * (parent-view stack lives there) and ember-source's view-registry weakmaps,
 * consumed by compile.ts (intra-package) plus glimmer/lib/templates/outlet.ts
 * (cross-package — outlet rendering needs to push the enclosing classic-
 * component wrapper view on the parentView stack so nested components inherit
 * the correct parentView).
 *
 * Push/pop are paired in `try/finally` — every push during a render must have
 * a matching pop. Missing a pop leaves a stale top-of-stack which corrupts
 * subsequent renders.
 *
 * Slice-11 design: the `rebuildViewTreeFromDom` method is seeded by manager.ts's
 * initial `setGxtRenderer` install, with an optional `afterRebuildViewTreeFromDom`
 * host hook contributed by compile.ts via `installViewUtilsPart`. The hook
 * replaces the pre-slice-11 wrap-by-reassignment installer at compile.ts:4399
 * (`_wrapGxtRebuildViewTree`) which wrapped `globalThis.__gxtRebuildViewTreeFromDom`
 * at runtime to (a) reset stale `_wrapperIfUserFalse` view-registry children for
 * direct-click toggled false branches and (b) drain the in-element deferred-render
 * queue. The pre-slice-11 wrap reassigned the function with a 4-step retry-install
 * dance (immediate + queueMicrotask + setInterval(50ms, 60 attempts)); the bridge
 * form is a typed AFTER hook (manager.ts applies it after its own rebuild body
 * runs to completion). Mirrors the slice-8 host-hook pattern but with a different
 * dispatch position — slice 8 is before-hook, slice 10 is transformer, slice 11
 * is after-hook. This is the THIRD distinct host-hook shape supported by the
 * install-API pattern.
 *
 * NOT included in this slice (intentionally deferred):
 *  - `__gxtSuppressDirtyTagForDuringRebuild` (manager.ts) — a boolean state
 *    flag whose reads/writes are entirely intra-file (manager.ts). The
 *    bridge is method-call shaped; state-flag semantics is a separate
 *    pattern. The flag could become a module-local `let` independently of
 *    the bridge migration.
 */
export interface GxtViewUtilsCapabilities {
  /**
   * Push a view onto the parent-view stack. Child components created during
   * the next render(s) read the top of this stack as their `parentView`.
   *
   * Previously: `(globalThis as any).__gxtPushParentView`.
   */
  pushParentView(view: object): void;

  /**
   * Pop the top entry from the parent-view stack. Always called in a
   * `finally` block paired with `pushParentView`.
   *
   * Previously: `(globalThis as any).__gxtPopParentView`.
   */
  popParentView(): void;

  /**
   * Look up the view associated with a DOM element via the ember-source
   * ELEMENT_VIEW weakmap. Returns null when no view is associated.
   *
   * Previously: `(globalThis as any).__gxtViewUtilsRef.getElementView`.
   */
  getElementView(element: Element): object | null;

  /**
   * Look up the DOM element associated with a view via the ember-source
   * VIEW_ELEMENT weakmap. Returns null when no element is associated.
   *
   * Previously: `(globalThis as any).__gxtViewUtilsRef.getViewElement`.
   */
  getViewElement(view: object): Element | null;

  /**
   * Rebuild the view-tree parent/child relationships from live DOM ancestry.
   * Called from `views/lib/system/utils.ts` (`getRootViews` / `getChildViews`)
   * before reading the view-registry, and from compile.ts's
   * `__gxtSyncDomNow` Phase 2c2 + manager.ts's `flushAfterInsertQueue` tail.
   *
   * Best-effort: DEBUG-gated in manager.ts's seeded implementation; a
   * concurrent rebuild guards against re-entry via a module-local
   * `_rebuildInProgress` flag.
   *
   * Slice-11: an optional `afterRebuildViewTreeFromDom` host hook contributed
   * by compile.ts (via `installViewUtilsPart`) runs AFTER the main rebuild body
   * to (a) reset stale view-registry CHILD_VIEW_IDS for direct-click-toggled
   * `_wrapperIfUserFalse` branches and (b) drain the in-element deferred-render
   * queue. Pre-slice-11 this logic lived in a wrap-by-reassignment installer at
   * compile.ts:4399 (`_wrapGxtRebuildViewTree`).
   *
   * Previously: `(globalThis as any).__gxtRebuildViewTreeFromDom`.
   */
  rebuildViewTreeFromDom?(explicitRegistry?: unknown): void;

  /**
   * Host hook contributed by compile.ts (via `installViewUtilsPart`) that runs
   * AFTER manager.ts's `rebuildViewTreeFromDom` body. Used to (a) reset stale
   * `_wrapperIfUserFalse` view-registry children when the user clicks an
   * `{{#if}}` branch to false (closes over compile.ts's `_wrapperIfUserFalse`
   * Set + `_wrapperIfCondLookup` Map), and (b) drain the in-element
   * deferred-render queue exposed by `__gxtInElementDrainDeferred`.
   *
   * Pre-slice-11 this logic lived in a wrap-by-reassignment installer at
   * compile.ts:4399; this slice promotes it to a typed AFTER host hook.
   *
   * Best-effort: errors thrown from the hook are caught and ignored, matching
   * the pre-slice-11 wrap's try/catch behavior. Only one contributor at a time
   * is supported (compile.ts).
   */
  afterRebuildViewTreeFromDom?(explicitRegistry?: unknown): void;
}

/**
 * Format / attribute-value helpers. Implemented by manager.ts, currently only
 * consumed intra-package — but exposed via the bridge for pattern uniformity
 * with the prior slices and to give future cross-package consumers a typed
 * entry point.
 *
 * NOT included in this slice (intentionally deferred — different bridge shape
 * or non-bridge cleanup required):
 *  - `__gxtNormAttr` / `__gxtQuotedAttr` / `__gxtUnboundEval` /
 *    `__gxtUnboundResetSlots` — referenced by EMITTED CODE strings in
 *    compile.ts (the compile post-processor writes literal
 *    `globalThis.__gxtNormAttr` / `globalThis.__gxtQuotedAttr(...)` /
 *    `globalThis.__gxtUnboundEval(...)` into generated template output).
 *    Migrating any of these requires updating the code generator to emit
 *    bridge-aware calls — out of scope for the runtime-only bridge migration.
 *  - `__gxtLastSafeStringResult` — read+written entirely intra-`compile.ts`
 *    (writer at SafeString toString hook, reader at attribute interpolation
 *    site). Cleaner cleanup is to convert to a module-local `let` in an
 *    intra-file refactor (same pattern as slice 3's exclusion of
 *    `__gxtSuppressDirtyTagForDuringRebuild`).
 *  - `__gxtSymbols` (compile.ts) — orphan writer; the comment in compile.ts
 *    claims renderer.ts/root.ts consume it, but those modules actually read
 *    `globalThis.__lifeartGxt` (a different key). Confirmed by exhaustive
 *    grep — zero readers in the source tree. Cleaned up in this slice
 *    alongside the migration (see slice 4 commit message).
 */
export interface GxtFormatCapabilities {
  /**
   * Decide whether to emit a style-binding XSS warning for the given
   * (element, value) pair. The implementation tracks per-element dedup and
   * suppresses warnings during force-rerender (`__gxtIsForceRerender`).
   *
   * Returns `true` if the caller SHOULD emit the warning, `false` if the
   * element has already been warned about (or force-rerender is in flight).
   *
   * Previously: `(globalThis as any).__gxtShouldWarnStyle`.
   */
  shouldWarnStyle(element: unknown, value?: string): boolean;
}

/**
 * Compile-pipeline capabilities. Composite namespace: methods may be
 * contributed both from manager.ts (initial `setGxtRenderer` install) AND
 * from compile.ts / ember-template-compiler.ts via `installCompilePipelinePart`
 * (slice 6 — see below).
 *
 * Slice 5 contributed `syncWrapper` and `snapshotLiveInstances` (manager.ts
 * writers). Slice 6 extends the namespace with compile.ts-writer + third-file-
 * writer hooks via a partial-install API. This is the first slice to evolve
 * the bridge interface beyond "manager.ts installs everything at EOF".
 *
 * Why incremental install? `manager.ts` and `compile.ts` deliberately don't
 * import each other (top-level circular-load hazard). A subset of compile-
 * pipeline hooks have their function definitions in compile.ts where they
 * close over compile-internal WeakMaps (`_arrayOwnerMap`, `_objectValueCellMap`)
 * or compile-local `let` state (`_intervalSyncBudget`). Relocating those
 * functions to manager.ts would require relocating the closures too, which
 * either fragments the maps' reader sites (3+ intra-compile.ts callers) or
 * pulls in scheduling state that has no place in manager.ts. Adding a small
 * partial-install API is cleaner than forcing relocation.
 *
 * NOT included in this slice (intentionally deferred):
 *  - `__gxtCompileTemplate` is migrated to the bridge for in-monorepo readers,
 *    but the source globalThis writer is RETAINED in compile.ts because the
 *    `@glimmer-workspace/integration-tests/.../gxt-delegate.ts` consumer lives
 *    in a workspace that does NOT depend on `@ember/-internals`, so cannot
 *    import the bridge. Dual exposure (bridge + globalThis) is intentional
 *    for this hook. All other slice-6 hooks remove globalThis entirely.
 *  - `__gxtIsRootComponent`, `__gxtUpdateRootTagValues` — MIGRATED IN SLICE 9
 *    to the new `rootComponent` namespace via `installRootComponentPart`.
 *    First reverse-flow slice: writer is `glimmer/lib/renderer.ts` (outside
 *    gxt-backend), reader is `compile.ts` (inside). The install-API pattern
 *    proved direction-agnostic — mechanically identical to slice 6's
 *    `ember-template-compiler.ts` contribution and slice 7's
 *    `gxt-with-runtime-hbs.ts` contribution.
 *  - `__gxtDirectModule` (writer in gxt-with-runtime-hbs.ts, reader in
 *    manager.ts) — MIGRATED IN SLICE 7. See `GxtRuntimeCapabilities` and
 *    `installRuntimePart` below. Validates the install-API pattern with a
 *    second non-manager.ts writer file.
 *  - `__gxtMarkTemplateRendered` / `__gxtBeginRenderPass` / `__gxtEndRenderPass`
 *    — render-pass triad. MIGRATED IN SLICE 8 to the `renderPass` namespace
 *    via the new `installRenderPassPart` API. The pre-slice-8 wrap-by-reassignment
 *    at compile.ts:5106 was promoted to a typed `beforeBeginRenderPass`
 *    host hook contributed by compile.ts.
 *  - `__gxtClearIfWatchers` — intra-compile.ts read+write (writer at L3487,
 *    reader at L5798). State-flag pattern in a single file; cleaner cleanup
 *    is a module-local `const` in an intra-file refactor.
 *  - `__gxtTrackArgSource` / `__gxtLastArgSourceCtx` / `__gxtLastArgSourceKey`
 *    — intra-manager.ts state flags. Same exclusion pattern as slice 3's
 *    `__gxtSuppressDirtyTagForDuringRebuild` and slice 4's
 *    `__gxtLastSafeStringResult`.
 *  - `__gxtSyncAllWrappers` — MIGRATED IN SLICE 12 to `syncAllWrappers` on this
 *    namespace. First wrap-by-reassignment to use the slice-3 relocation
 *    pattern instead of the slice-8/10/11 host-hook pattern: the wrap bodies
 *    (compile.ts marker install + defineProperty trap; ember-gxt-wrappers.ts
 *    DC change listener dispatch) referenced ONLY globalThis-shared state, so
 *    they were folded directly into the canonical body in manager.ts. Five
 *    wrap-by-reassignment installers eliminated.
 *  - `__gxtClearInstancePools` — MIGRATED IN SLICE 13 to `clearInstancePools`
 *    on this namespace. Second wrap-by-reassignment to use the slice-3
 *    relocation pattern (after slice 12's `syncAllWrappers`). Both halves of
 *    the wrap (initial install at manager.ts:1109 clearing `_allPoolArrays`,
 *    wrap-by-reassignment at manager.ts:9461 also clearing `_customManagedPool`
 *    + `_customManagedInstances`) closed over ONLY manager.ts module-local
 *    state — even cleaner than slice 12's globalThis-shared state — so the
 *    relocation collapsed into a single intra-file function with zero cross-
 *    file state references.
 *  - `__dcChangeListeners` Set + `__dcStringListenerCount` counter — MIGRATED
 *    IN SLICE 14 to `addDynamicComponentListener` /
 *    `clearDynamicComponentListeners` / `hasStringDynamicComponentListeners`
 *    on this namespace. The half-migrated leftover from slice 12: the Set's
 *    reader was folded into manager.ts's `_gxtSyncAllWrappers` by slice 12 but
 *    its writer sites stayed inline in ember-gxt-wrappers.ts (L1868 / L2039 /
 *    L2317) plus a cross-test clear at compile.ts:5800-5801 and counter readers
 *    at compile.ts:5317 + manager.ts:3713. Slice 14 promotes the Set + counter
 *    to manager.ts module-local state and exposes typed bridge methods. NO
 *    external readers (the Set + counter are intra-gxt-backend only —
 *    confirmed by exhaustive grep), so dual exposure is NOT retained — the
 *    `__dcChangeListeners` / `__dcStringListenerCount` globals are removed
 *    outright.
 *  - `__gxtTriggerReRender` — MIGRATED IN SLICE 15 to `triggerReRender` on
 *    this namespace with two chain-aware host hooks:
 *    `addBeforeTriggerReRender(fn)` / `addAfterTriggerReRender(fn)`. The
 *    pre-slice-15 implementation had FOUR wrap-by-reassignment sites:
 *    (1) `manager.ts:3595` `_installTriggerReRenderWrapper` — recorded
 *    dirtied nested objects into a manager.ts module-local Set
 *    (`_dirtiedNestedObjectsForHooks`); (2) `glimmer/lib/renderer.ts:431`
 *    `_ensureTriggerReRenderPatched` — dirtied ArrayProxy content-array
 *    owners from a renderer.ts module-local WeakMap (`_proxyContentOwners`)
 *    AFTER the canonical body ran; (3) `@ember/object/core.ts:70`
 *    `ensureTriggerReRenderWrapped` — toggled `g.__gxtInTriggerReRender`
 *    around the canonical call; (4) `ember-gxt-wrappers.ts:2837`
 *    `installTrackedSetDetector` — set `__gxtTrackedSetSinceRerender = true`.
 *    Slice 15 promotes these to a multi-contributor BEFORE-chain +
 *    AFTER-chain registered through bridge methods (state-registry shape
 *    borrowed from slice 14, applied to chains instead of a single set).
 *    The `__gxtInTriggerReRender` toggle is folded into the canonical body
 *    itself (replacing core.ts's wrap entirely — its body became a no-op so
 *    the file is just deleted of the wrap). The `__gxtTriggerReRender`
 *    globalThis writer was RETAINED through slice 27 because save-restore
 *    suppression sites at `validator.ts:117-143` and `manager.ts:11219-11480`
 *    swapped the global slot temporarily; pre-slice-15 those sites observed
 *    the wrapped version, so dual exposure preserved their semantics.
 *    Slice 28 (Cluster B) routed those two sites through
 *    `withTriggerSuppressed(fn)` and DROPPED the canonical
 *    `globalThis.__gxtTriggerReRender = _gxtTriggerReRender` writer at
 *    `compile.ts:3392`, closing the longest-runway campaign (slices 25-28)
 *    with net -1 globalThis slot.
 *
 *    Chain dispatch is hot-path (called from every `notifyPropertyChange`).
 *    The canonical body iterates the BEFORE-chain (if non-empty) before its
 *    own body and the AFTER-chain (if non-empty) after; empty-chain check
 *    is a `length > 0` test (zero per-call overhead when no contributor
 *    registered). Each registration returns an off-fn for symmetric cleanup,
 *    matching slice 14's `addDynamicComponentListener` ergonomics.
 *  - `__gxtTrackedSetSinceRerender` — MIGRATED IN SLICE 29 to
 *    `markTrackedSetSinceRerender()` + `consumeTrackedSetSinceRerender()`
 *    on this namespace. Lean 1-writer/1-reader topology — both sites are
 *    intra-file in `ember-gxt-wrappers.ts` (writer at L2853 inside the
 *    slice-15 BEFORE-trigger-rerender hook; reader at L2814-2815 inside
 *    the `UpdatingVM.prototype.execute` patch that flips `alwaysRevalidate`
 *    for one execute when a tracked write occurred since the last
 *    execute). The bridge surface is a MARK+CONSUME pair (atomic
 *    check+clear on the reader side) rather than the get/set/with triple
 *    used by slices 17/18/20/22/23/24 — folds the pre-slice-29 inline
 *    `if (g.x) { g.x = false; ... }` into a single bridge call that
 *    expresses the atomic semantics. Canonical state moves to the
 *    module-local `_gxtTrackedSetSinceRerenderFlag` in `compile.ts`. The
 *    `__gxtTrackedSetSinceRerender` globalThis slot is DROPPED in this
 *    slice — net -1 globalThis surface.
 *  - `__gxtSyncCycleId` — MIGRATED IN SLICE 30 to `getSyncCycleId()` on this
 *    namespace. The pre-slice-30 topology was 1 intra-file writer in
 *    `compile.ts` `__gxtSyncDomNow` (`(g.x = (g.x || 0) + 1)`) and 14
 *    readers (5 intra-file in `compile.ts`, 8 in `gxt-backend/manager.ts`,
 *    1 cross-package in `glimmer/lib/renderer.ts:1040`) — all 14 used the
 *    uniform `(g.__gxtSyncCycleId || 0)` truthy-coerce-undefined-to-0
 *    pattern. The bridge surface is read-only (no setter / no increment
 *    helper exposed): the canonical writer is intra-file and uses the
 *    module-local `_gxtIncrementSyncCycleId()` directly. Intra-file
 *    readers call `_gxtGetSyncCycleId()` directly (slice-27 precedent);
 *    cross-file readers (manager.ts + renderer.ts) call
 *    `compilePipeline.getSyncCycleId?.() ?? 0`. The `__gxtSyncCycleId`
 *    globalThis slot is DROPPED in this slice — net -1 globalThis surface.
 *    First slice to expose a read-only INTEGER bridge method (slices 19/20/
 *    22 are read-only booleans; slice 30 is the integer-getter analogue).
 *  - `__gxtSyncAllInFlightPass` / `__gxtSyncAllInFlightCycle` — MIGRATED
 *    IN SLICE 31 to module-local `_gxtSyncAllInFlightPass` /
 *    `_gxtSyncAllInFlightCycle` in `gxt-backend/manager.ts`. The pre-slice-31
 *    topology was 4 writers (BEFORE-body set + AFTER-body finally clear,
 *    both in `_gxtSyncAllWrappers`) and 5 readers (3 in
 *    `_wrapInstanceTriggerForSyncAllMark`, 1 in `_gxtSyncAllWrappersBody`,
 *    plus 1 reuse via the same trigger-wrap closure) — ALL 9 sites are
 *    intra-file in `manager.ts`. NO bridge methods exposed: cross-file /
 *    cross-package consumers do not exist (confirmed by exhaustive grep
 *    across `packages/`, the only references outside `manager.ts` are
 *    stale comments in `compile.ts:5547-5558` and `gxt-bridge.ts:526`).
 *    Slice 31 is the FIRST paired migration in Cluster B (two related
 *    integer-counters retired together via the SAME mechanism). It is also
 *    the SECOND zero-bridge-surface migration (slice-14's `__dcChangeListeners`
 *    Set+counter did expose bridge methods because compile.ts read them via
 *    `hasStringDynamicComponentListeners`; slice 31 has true zero external
 *    readers, so no bridge surface is needed at all). Net globalThis
 *    surface delta: -2 slots in a single slice (the largest single-slice
 *    surface reduction in Cluster B so far).
 */
export interface GxtCompilePipelineCapabilities {
  /**
   * Sync a classic-component wrapper element's attribute/class bindings when
   * a property changes on the component. Called from compile.ts's
   * `__gxtTriggerReRender` path after `cellFor(obj, keyName).update(...)`.
   *
   * Best-effort: returns early if the object has no wrapper element or no
   * attribute/class bindings, or if the changed key isn't relevant to any
   * binding.
   *
   * Previously: `(globalThis as any).__gxtSyncWrapper`.
   */
  syncWrapper(obj: unknown, keyName: string): void;

  /**
   * Snapshot all live component instances before a force-rerender. Used by
   * `__gxtDestroyUnclaimedPoolEntries` to detect which instances were
   * removed after the rebuild. Called from compile.ts at the start of
   * `__gxtSyncDomNow`'s Phase 2a.
   *
   * Also clears the marked-for-destruction set from the previous cycle.
   *
   * Previously: `(globalThis as any).__gxtSnapshotLiveInstances`.
   */
  snapshotLiveInstances(): void;

  /**
   * Run the per-cycle sync-all pass: iterate `trackedArgCells`, refresh arg
   * cells whose getters' return values changed, fire pre-render lifecycle
   * hooks (`willUpdate` / `willRender` / `didReceiveAttrs` / `didUpdateAttrs`)
   * on the corresponding instances, and run the wrapper-element attribute /
   * class binding sync pass.
   *
   * Called from compile.ts's `__gxtSyncDomNow` Phase 1 (BEFORE the
   * force-rerender) so changes are detected before arg cells are reset by the
   * rebuild. Also fires the registered `__dcChangeListeners` (string /
   * curried / null dynamic-component listeners contributed by
   * ember-gxt-wrappers.ts) AFTER the main body so dynamic-component swaps
   * apply at the same point as arg-cell updates.
   *
   * The wrap-by-reassignment installer dance (compile.ts:5068-5206
   * `_installSyncAllFiredMarker` + `defineProperty` trap with retry on every
   * reassignment) is replaced in slice 12 by direct fold of the wrap's
   * before-body (set the in-flight pass-id / cycle-id state — module-local
   * `_gxtSyncAllInFlightPass` / `_gxtSyncAllInFlightCycle` post-slice-31,
   * pre-slice-31 these were globalThis slots; pre-wrap pool-instance
   * `trigger`s for fire-tracking) and after-body (clear in-flight state,
   * dispatch DC change listeners) into the canonical function body. State
   * referenced by both halves of the wrap is intra-package
   * (`__gxtAllPoolArrays`; the pre-slice-14 entry `__dcChangeListeners` is
   * now module-local; the pre-slice-30 entry `__gxtSyncCycleId` was
   * graduated to a module-local in slice 30; the pre-slice-31 entries
   * `__gxtSyncAllInFlightPass` / `__gxtSyncAllInFlightCycle` were
   * graduated to module-local state in slice 31) — no closures had to
   * move, so the slice-3 relocation pattern applied directly (first
   * wrap-by-reassignment to use it; slices 8/10/11 used the host-hook
   * pattern instead because their wrap bodies closed over compile.ts
   * module-local state).
   *
   * Previously: `(globalThis as any).__gxtSyncAllWrappers`.
   *
   * Slice-17 (Cluster B): the globalThis writer at `manager.ts:3763` is
   * DROPPED. Audit confirmed zero readers exist outside the gxt-bridge path
   * (intra-package references are all comments; cross-package grep across
   * packages/ and tests/ found no consumers). All callers now route through
   * `compilePipeline.syncAllWrappers`.
   */
  syncAllWrappers(): void;

  /**
   * Clear all component-instance pools between tests. Prevents stale
   * pooled instances from leaking across test boundaries. Clears three
   * manager.ts-local data structures:
   *  - `_allPoolArrays`: every pool array used by `getCachedOrCreateInstance`
   *  - `_customManagedPool`: pools for components installed via
   *    `setComponentManager`
   *  - `_customManagedInstances`: side-array of (node, destroyFn) used by
   *    `destroyCustomManagedInstances` for disconnect-driven cleanup
   *
   * Called from compile.ts's `__gxtSyncDomNow` Phase X (test teardown helper)
   * — routes through `compilePipeline.clearInstancePools`.
   *
   * Slice-13 design: the pre-slice-13 implementation was a TWO-STAGE wrap:
   * (1) initial install at manager.ts:1109 clearing `_allPoolArrays`, then
   * (2) wrap-by-reassignment at manager.ts:9461 that captured the original
   * and reinstalled a wrapper also clearing `_customManagedPool` /
   * `_customManagedInstances`. Both halves closed over manager.ts module-
   * local state ONLY — no globalThis-shared state, no cross-file closures —
   * so the slice-3 relocation pattern applied even more cleanly than
   * slice 12's `syncAllWrappers` (which had to fold globalThis-shared state
   * through the wrap body). The two stages were collapsed into a single
   * intra-file `_gxtClearInstancePools` function.
   *
   * Previously: `(globalThis as any).__gxtClearInstancePools`.
   *
   * Slice-17 (Cluster B): the globalThis writer at `manager.ts:1138` is
   * DROPPED. Audit confirmed zero readers exist outside the gxt-bridge path
   * (intra-package references are all comments; cross-package grep across
   * packages/ and tests/ — including ember-testing — found no consumers).
   * All callers route through `compilePipeline.clearInstancePools`.
   */
  clearInstancePools(): void;

  /**
   * Register a dynamic-component change listener that fires AFTER every
   * sync-all pass (in `_gxtSyncAllWrappers`'s after-body). Listeners are
   * notified when dynamic-component swaps need to perform manual DOM updates
   * — used by the three `$_dc_ember` paths in ember-gxt-wrappers.ts:
   *   - null path (L1862): `_nullListener` performs the null-DOM swap.
   *   - curried path (L2024): `_dcChangeListener` performs curried swap.
   *   - string path (L2292): `_dcChangeListener` performs string-name swap.
   *
   * Returns an "off" function the caller invokes from its destructor to
   * de-register the listener. The off-fn is idempotent.
   *
   * Pass `{ stringPath: true }` for the string-component path so the bridge
   * tracks a counter consulted by `hasStringDynamicComponentListeners()`
   * (compile.ts's `__gxtSyncDomNow` morph-skip logic; manager.ts's
   * notifyPropertyChange dispatch when string-path listeners are present).
   *
   * Slice-14 design: the listener Set + string-path counter live as
   * manager.ts module-local state (`_dcChangeListeners` Set,
   * `_dcStringListenerCount` number). The pre-slice-14 globalThis Set + counter
   * (`__dcChangeListeners`, `__dcStringListenerCount`) are removed outright —
   * no external readers exist (intra-gxt-backend only). Replaces three inline
   * `g.__dcChangeListeners.add(...)` writer sites at
   * ember-gxt-wrappers.ts:1877 / :2037 / :2305 plus the counter increment at
   * :2307, the cleanup `.delete(...)` sites at :1881 / :2042 / :2312, and the
   * decrement at :2313 — all replaced by a single `addDynamicComponentListener`
   * call returning the appropriate off-fn.
   *
   * Previously: `(globalThis as any).__dcChangeListeners` Set + the
   * `(globalThis as any).__dcStringListenerCount` counter.
   */
  addDynamicComponentListener(
    fn: () => boolean,
    options?: { stringPath?: boolean }
  ): () => void;

  /**
   * Clear all registered dynamic-component change listeners and reset the
   * string-path listener counter to zero. Called from compile.ts's
   * `__gxtSyncDomNow` test-teardown Phase 2 (the cross-test reset block at
   * compile.ts:5800-5801) so listeners registered by a previous test do not
   * fire (and are not counted) during the next test.
   *
   * Slice-14 design: replaces the pre-slice-14 inline
   * `(globalThis as any).__dcChangeListeners.clear()` plus
   * `(globalThis as any).__dcStringListenerCount = 0` at compile.ts:5800-5801
   * with a single bridge call.
   *
   * Previously: `(globalThis as any).__dcChangeListeners.clear()` +
   * `(globalThis as any).__dcStringListenerCount = 0`.
   */
  clearDynamicComponentListeners(): void;

  /**
   * Return `true` if any STRING-path dynamic-component listener is currently
   * registered. Used by compile.ts's `__gxtSyncDomNow` Phase 1 to decide
   * whether to skip the force-rerender morph (Phase 2b) — cell-based string-
   * path swaps already handled dynamic-component identity via the bridge
   * dispatch, so the morph would re-apply already-applied changes. Also used
   * by manager.ts's arg-cell update path to dispatch
   * `notifyPropertyChange` so Ember's tag-driven @computed properties on
   * classic components recompute after arg updates via syncAll (the Ember tag
   * isn't dirtied by direct property assignment).
   *
   * Slice-14 design: derived getter over the manager.ts module-local
   * `_dcStringListenerCount` number. Replaces the pre-slice-14 inline
   * `(globalThis as any).__dcStringListenerCount > 0` checks at
   * compile.ts:5317 and manager.ts:3713 (the two reader sites).
   *
   * Previously: `(globalThis as any).__dcStringListenerCount > 0` inline.
   */
  hasStringDynamicComponentListeners(): boolean;

  /**
   * Compile a template string to a gxt-compatible template factory.
   * Contributed by compile.ts (the function definition's home file).
   * Read by `@ember/-internals/glimmer/index.ts` and
   * `@ember/template-compiler/lib/template.ts` to delegate template
   * compilation when GXT mode is active.
   *
   * NOTE: the source globalThis writer in compile.ts is RETAINED in addition
   * to the bridge install because `@glimmer-workspace/integration-tests/.../
   * gxt-delegate.ts` reads the function via globalThis and cannot depend on
   * `@ember/-internals`. Dual exposure is intentional for this hook only.
   *
   * Previously: `(globalThis as any).__gxtCompileTemplate`.
   */
  compileTemplate?(templateString: string, options?: unknown): unknown;

  /**
   * Wrap a template factory with template-cache-counter instrumentation so
   * the `templateFactory` resolver-cache accounting matches the classic
   * Glimmer pathway. Contributed by ember-template-compiler.ts (the function
   * definition's home file, where the closure over `templateCacheCounters`
   * lives).
   *
   * Read by `@ember/-internals/glimmer/index.ts`'s `template` shim.
   *
   * Previously: `(globalThis as any).__gxtInstrumentFactory`.
   */
  instrumentFactory?(factory: unknown, compileOptions?: unknown): unknown;

  /**
   * Reset the interval-driven sync budget. Contributed by compile.ts (the
   * function closes over compile.ts's `_intervalSyncBudget` module-local
   * `let`, which is also read by the setInterval-driven fallback flusher).
   *
   * Called from internal-test-helpers/run.ts after each explicit sync /
   * runTask to prevent the interval-driven fallback from being permanently
   * starved by a long test.
   *
   * NOTE: the source globalThis writer in compile.ts is RETAINED in addition
   * to the bridge install because `packages/demo/tests.html` (an HTML test
   * harness, can't import TS) reads this hook via globalThis. Dual exposure
   * pattern; same as `compileTemplate`.
   *
   * Previously: `(globalThis as any).__gxtResetIntervalBudget`.
   */
  resetIntervalBudget?(): void;

  /**
   * Register an array as having `(ownerObj, ownerKey)` as a logical owner so
   * KVO array mutations (`pushObject`, `shiftObject`) dirty the owner's cell.
   * Contributed by compile.ts (the function closes over compile.ts's
   * `_arrayOwnerMap` WeakMap, which is also READ at multiple intra-compile.ts
   * sites — relocation would fragment the map's call sites).
   *
   * Called from manager.ts (4 sites), glimmer/lib/renderer.ts, after
   * installing cell-backed getters on classic component instances.
   *
   * Previously: `(globalThis as any).__gxtRegisterArrayOwner`.
   */
  registerArrayOwner?(array: unknown, ownerObj: object, ownerKey: string): void;

  /**
   * Register an object value as having `(ownerObj, ownerKey)` as a logical
   * owner so writes to the object's properties dirty the owner's cell.
   * Contributed by compile.ts (closure over `_objectValueCellMap` WeakMap,
   * see `registerArrayOwner` for the same constraint).
   *
   * Called from manager.ts and glimmer/lib/templates/root.ts when classic
   * controllers attach a model object to the render context.
   *
   * Previously: `(globalThis as any).__gxtRegisterObjectValueOwner`.
   */
  registerObjectValueOwner?(value: unknown, ownerObj: object, ownerKey: string): void;

  /**
   * Dispatch a re-render trigger for `(obj, keyName)`. Called from every
   * `notifyPropertyChange` (metal/property_events.ts:89) and from many direct
   * call sites in manager.ts / compile.ts / glimmer-tracking.ts /
   * tracked.ts. The canonical implementation lives in compile.ts (closure over
   * `_arrayOwnerMap`, `_objectValueCellMap`, `_pendingIfWatcherNotifications`,
   * the if-watcher WeakMap, etc. — none of which can be relocated without
   * fragmenting their many intra-compile.ts reader sites).
   *
   * Contract: best-effort, never throws (every cell update / proto walk /
   * computed-property recompute path is wrapped in try/catch internally).
   * Hot-path: invoked on every property notification, so the implementation
   * dispatches the BEFORE-chain and AFTER-chain hooks via `length > 0` fast
   * checks — empty chains add zero per-call overhead.
   *
   * Slice-15 design: replaces the pre-slice-15 globalThis function published
   * by `compile.ts:3066`. The globalThis writer is RETAINED because the
   * save-restore suppression sites at `validator.ts:117-143` and
   * `manager.ts:11219-11480` swap the global slot temporarily to suppress
   * triggers during specific frames; pre-slice-15 those sites observed the
   * wrapped version (so any in-flight chains keep firing through the wrap),
   * and dual exposure preserves their semantics.
   *
   * Slice-17 (Cluster B): the two save-restore sites are now routed through
   * `withTriggerSuppressed(fn)` below. The globalThis writer is still
   * RETAINED post-slice-17 because the many cross-package readers (metal,
   * glimmer-tracking, manager.ts:529/544/2050/2608/5461, compile.ts:6125+)
   * still call the function via `(globalThis as any).__gxtTriggerReRender`.
   * Removing the global is a separate larger migration that has to route
   * every reader through the bridge first.
   *
   * Slice-25 (Cluster B): first sub-slice of the longest-runway
   * `__gxtTriggerReRender` reader-migration campaign. The two cross-package
   * READERS at `metal/tracked.ts:308` (tracked setter notify) and
   * `glimmer-tracking.ts:63` (custom-tracked-set host hook) now consume
   * `compilePipeline.triggerReRender(...)` instead of
   * `(globalThis as any).__gxtTriggerReRender`. Suppression semantics are
   * preserved by a new module-local `_gxtTriggerSuppressedFlag` in
   * compile.ts that `_gxtWithTriggerSuppressed` sets in parallel with the
   * pre-slice-17 globalThis-clear — the flag is checked at the entry of
   * `_gxtTriggerReRender` so bridge readers observe the same no-op during a
   * `withTriggerSuppressed(fn)` frame.
   *
   * Slice-26 (Cluster B): second sub-slice of the reader-migration campaign
   * — five more READERS migrated to `compilePipeline.triggerReRender(...)`:
   *  - `metal/property_events.ts:103` — `notifyPropertyChange` GXT
   *    integration trigger (third cross-package reader; mirrors slice 25).
   *  - `manager.ts:529` — patched `recompute()` error-path bump trigger.
   *  - `manager.ts:544` — patched `recompute()` happy-path bump trigger.
   *  - `manager.ts:2054` — PROPERTY_DID_CHANGE override capture-once
   *    (now captures `compilePipeline.triggerReRender`; four call sites
   *    inside the closure body invoke the captured value through truthy
   *    guards).
   *  - `manager.ts:2612` — args dispatch CP-dependent-key reread trigger.
   *
   * Slice-27 (Cluster B): third sub-slice of the reader-migration campaign
   * — the FINAL safe reader migrated to `compilePipeline.triggerReRender(...)`:
   *  - `manager.ts:5514` — attrs proxy capture-once for `triggerReRender`
   *    (mirrors slice-26's `manager.ts:2054` capture-once shape; two call
   *    sites at L5690-5691 and L5696 inside the closure body invoke the
   *    captured value through truthy guards, so `undefined` cleanly matches
   *    the pre-slice-27 behavior).
   * Three intra-file `compile.ts` readers (L6413/6472/6684 — mut cell
   * update paths) were also migrated in slice 27 but route DIRECTLY to the
   * module-local `_gxtTriggerReRender` function (not through the bridge),
   * since they are intra-file and the function is in scope — direct call
   * avoids one bridge lookup per write. Suppression semantics for the
   * direct-call sites are identical to bridge-call sites because the
   * suppression flag is checked at the entry of `_gxtTriggerReRender`.
   *
   * Slice-28 (Cluster B): closes the longest-runway reader-migration
   * campaign. The two save-restore writer sites (`manager.ts` first-render
   * suppression for new classic components; `validator.ts` track()
   * reentrancy guard) are routed through `withTriggerSuppressed(fn)` (the
   * slice-17 bridge helper) and the canonical
   * `globalThis.__gxtTriggerReRender = _gxtTriggerReRender` writer at
   * `compile.ts:3392` is DROPPED. With no external readers and no external
   * writers, the globalThis slot is fully retired (net -1 globalThis slot
   * for the campaign — slices 25-28 migrated 9 cross-package readers, 3
   * intra-file readers, and 2 save-restore writers; canonical writer drop
   * closes it). `_gxtWithTriggerSuppressed` (the helper body for
   * `withTriggerSuppressed`) is simplified to module-local flag save/
   * restore only (no globalThis touch).
   *
   * Previously: `(globalThis as any).__gxtTriggerReRender`.
   */
  triggerReRender?(obj: object, keyName: string): void;

  /**
   * Register a BEFORE-chain host hook to run BEFORE the canonical
   * `triggerReRender` body. Returns an off-fn the caller invokes from its
   * destructor (or never, for module-init contributors that live for the
   * entire process) to de-register the hook. The off-fn is idempotent.
   *
   * Slice-15 contributors (each replacing one pre-slice-15 wrap-by-reassignment
   * installer):
   *  - `manager.ts` (was `_installTriggerReRenderWrapper`): adds the mutated
   *    `obj` to manager.ts's module-local `_dirtiedNestedObjectsForHooks` Set.
   *  - `ember-gxt-wrappers.ts` (was `installTrackedSetDetector`): calls
   *    `markTrackedSetSinceRerender()` (slice 29 — replaced the pre-slice-29
   *    `globalThis.__gxtTrackedSetSinceRerender = true` writer) so the
   *    UpdatingVM's `alwaysRevalidate` flip fires on the next `execute`.
   *
   * Hook errors are caught and ignored (matching the pre-slice-15 wraps'
   * try/catch behavior).
   */
  addBeforeTriggerReRender?(fn: (obj: object, keyName: string) => void): () => void;

  /**
   * Register an AFTER-chain host hook to run AFTER the canonical
   * `triggerReRender` body. Returns an off-fn (idempotent).
   *
   * Slice-15 contributors:
   *  - `glimmer/lib/renderer.ts` (was `_ensureTriggerReRenderPatched`): when
   *    `keyName === '[]' || keyName === 'length'` on an Array that is the
   *    content of an ArrayProxy, dirties the component cell with the proxy
   *    value (not the content array). Closes over renderer.ts's module-local
   *    `_proxyContentOwners` WeakMap.
   *
   * Hook errors are caught and ignored.
   */
  addAfterTriggerReRender?(fn: (obj: object, keyName: string) => void): () => void;

  /**
   * Run `fn` with `_gxtTriggerReRender` suppressed (the module-local
   * `_gxtTriggerSuppressedFlag` in compile.ts is set to `true` for the
   * duration of `fn`). Returns whatever `fn` returns; the prior flag value
   * is restored on completion via `try/finally` (including when `fn`
   * throws).
   *
   * Slice-17 (Cluster B): graduated the two save-restore suppression sites
   * (`validator.ts` track() reentrancy guard; `manager.ts` first-render
   * suppression for new classic components) to a typed bridge method.
   * Pre-slice-17 both sites manually saved/restored
   * `globalThis.__gxtTriggerReRender`; the helper encapsulates the same
   * pattern so the suppression contract is a documented API surface rather
   * than scattered swap pairs.
   *
   * Suppression semantics: the canonical `_gxtTriggerReRender` function in
   * compile.ts checks `_gxtTriggerSuppressedFlag` at its single entry point
   * and short-circuits when the flag is `true`. All readers — bridge
   * readers (`compilePipeline.triggerReRender(...)`), direct intra-file
   * callers in compile.ts, and the canonical body itself — observe the
   * same no-op for the duration of `fn`.
   *
   * Slice-25 (Cluster B): the module-local `_gxtTriggerSuppressedFlag` was
   * introduced as the cross-cutting suppression surface so bridge readers
   * (newly migrated off the globalThis slot) observed suppression in
   * parallel with the pre-slice-28 globalThis-clear.
   *
   * Slice-28 (Cluster B): with all readers (slices 25-27) and both save-
   * restore writer sites (this slice) migrated, the canonical
   * `globalThis.__gxtTriggerReRender = _gxtTriggerReRender` writer at
   * `compile.ts:3392` is DROPPED. `_gxtWithTriggerSuppressed` is
   * simplified to pure module-local flag save/restore (no globalThis
   * touch). The `withTriggerSuppressed(fn)` surface is unchanged — the
   * contract for callers is identical pre/post slice 28. Net -1 globalThis
   * slot, closing the longest-runway Cluster B campaign.
   */
  withTriggerSuppressed?<T>(fn: () => T): T;

  /**
   * Run `fn` with `__gxtInTriggerReRender` set to `true` (save the prior
   * value, set the flag, invoke `fn`, then restore the prior value via
   * `try/finally`). Returns whatever `fn` returns. Re-entrancy-safe because
   * an enclosing frame's value is preserved by the save-restore pattern.
   *
   * Slice-18 (Cluster B): graduates the two save-restore writer sites for
   * `__gxtInTriggerReRender` to a typed bridge helper:
   *  - `compile.ts:3130-3136` (folded inside the canonical `triggerReRender`
   *    body — see slice-15 doc above): wraps the entire trigger body so any
   *    nested `CP.get` short-circuit reads `true`.
   *  - `metal/property_events.ts:96-101` (caller-side around the
   *    `gxtTrigger(obj, keyName)` call in `notifyPropertyChange`): wraps the
   *    trigger invocation so the call sites observe `true` for the duration
   *    of the synchronous notify cascade (including any nested
   *    `notifyPropertyChange` calls produced by `__gxtTriggerReRender`).
   * Both writers used to manually inline
   * `wasInside = g.__gxtInTriggerReRender; g.__gxtInTriggerReRender = true;
   * try { ... } finally { g.__gxtInTriggerReRender = wasInside; }`. This
   * helper folds that pattern into one documented bridge surface.
   *
   * Reader contract: the flag is consumed by:
   *  - `metal/computed.ts:522` — `CP.get` short-circuits cache misses when
   *    `isInTriggerReRender() && revision === undefined` (preserves
   *    classic Ember's "don't eagerly evaluate never-consumed CPs during a
   *    change notification" semantic). Migrated to `isInTriggerReRender()`
   *    in slice 18; globalThis fallback dropped in slice 23.
   *  - `@ember/object/core.ts:325` — DEBUG proxy trap's `_isInternalPath`
   *    predicate. Migrated to `isInTriggerReRender()` in slice 20 as part of
   *    the 3-flag predicate group; globalThis fallback dropped in slice 23.
   *
   * Slice-23 (Cluster B): the `__gxtInTriggerReRender` globalThis writer is
   * DROPPED — canonical state is now the module-local
   * `_gxtInTriggerReRenderFlag` in `compile.ts`. Both bridge writers now
   * read/write the module-local slot exclusively; both bridge-routed
   * readers (`metal/computed.ts` and `@ember/object/core.ts` proxy trap)
   * route through `isInTriggerReRender()` exclusively (no globalThis
   * fallback). The cross-package writer at `metal/property_events.ts:96-101`
   * routes through `withInTriggerReRender(fn)` exclusively. Net -1
   * globalThis slot. Mirrors slice-22's pattern.
   *
   * See `isInTriggerReRender()` below for the read-side surface.
   */
  withInTriggerReRender?<T>(fn: () => T): T;

  /**
   * Read-only predicate for `__gxtInTriggerReRender`. Returns `true` iff the
   * current synchronous stack is nested inside a `withInTriggerReRender(fn)`
   * frame (or inside the canonical `triggerReRender` body, which is itself
   * wrapped by `withInTriggerReRender`).
   *
   * Slice-18 (Cluster B): exposes the read side of the flag as a bridge
   * predicate so `metal/computed.ts`'s `CP.get` re-entrance guard can avoid
   * touching `globalThis` directly.
   *
   * Slice-23 (Cluster B): reads the module-local
   * `_gxtInTriggerReRenderFlag` in `compile.ts` (graduated from
   * `globalThis.__gxtInTriggerReRender` in slice 23). The two reader sites
   * (`metal/computed.ts:538` + `@ember/object/core.ts:357-360`) route
   * through this predicate exclusively (no globalThis fallback).
   *
   * Fast-check: one boolean read; zero allocations. Suitable for the
   * `CP.get` hot path.
   */
  isInTriggerReRender?(): boolean;

  /**
   * Read-only predicate for the render-pass depth counter at
   * `compile.ts:_renderPassDepth`. Returns `true` iff at least one render
   * pass is currently active (i.e., `_gxtSetIsRendering(true)` was called
   * more often than `_gxtSetIsRendering(false)` since module init).
   *
   * Slice-19 (Cluster B): graduates the single-writer / multi-reader render-
   * pass-detect flag (`__gxtIsRendering`) to a typed read-side predicate.
   * The writer (`compile.ts:_gxtSetIsRendering`, exposed as
   * `globalThis.__gxtSetIsRendering`) is the only mutator of the depth
   * counter; this predicate is the read-side surface.
   *
   * Writer + reader audit (pre-slice-19):
   *   Writer (1):
   *     - `compile.ts:_gxtSetIsRendering` — increment on `true`, decrement
   *       on `false`. Called from:
   *         - `glimmer/lib/renderer.ts:2236/2272/2283` via
   *           `globalThis.__gxtSetIsRendering` (cross-package writer; the
   *           renderer wraps each `template.render()` invocation with
   *           `setIsRendering(true)` + restore).
   *         - The depth counter is module-local to `compile.ts` so it is
   *           shared between the in-element `$_inElement` readers and the
   *           renderer's wraps (which both go through globalThis).
   *   Readers (4):
   *     - `compile.ts:1903` ($_inElement render-pass detect for deferred
   *       in-element renders). MIGRATED in slice 19 to `_gxtIsRendering()`
   *       intra-file call.
   *     - `compile.ts:2130` ($_inElement self-insert heuristic). MIGRATED
   *       in slice 19 to `_gxtIsRendering()` intra-file call.
   *     - `glimmer/lib/renderer.ts:2233/2271` (renderComponent's
   *       wasRendering save-restore + the inner `_doRender` reactor's
   *       wasRenderingLocal check). MIGRATED in slice 19 to
   *       `compilePipeline.isRendering()` bridge call.
   *     - `@ember/object/core.ts:321` (DEBUG proxy trap `_isInternalPath`
   *       predicate). NOT migrated in slice 19 — the trap reads three
   *       globalThis flags together (`__gxtIsRendering`, `__gxtSyncing`,
   *       `__gxtInTriggerReRender`); migrating only one would not improve
   *       the edge count net. Slice 18 deferred the same trap for its own
   *       `__gxtInTriggerReRender` reader. A future slice 20 can migrate
   *       the whole 3-flag predicate at once (see suggested slice 20 in
   *       memory notes).
   *
   * Bridge shape decision: read-only predicate (mirroring slice-18's
   * `isInTriggerReRender()`). The single writer (`_gxtSetIsRendering`)
   * is paired begin/end through cross-package callers in
   * `glimmer/lib/renderer.ts`, not a `withRendering(fn)` save-restore
   * helper. A future slice 20 can promote the writer to a paired
   * `beginRendering()` / `endRendering()` (or `withRendering(fn)`) bridge
   * surface, but slice 19 keeps the writer on globalThis to avoid touching
   * the cross-package renderer.ts writer site at the same time.
   *
   * Namespace decision: `compilePipeline`. The flag is semantically a
   * scope-modifier on the GXT template render pipeline — the writer +
   * depth counter live in `compile.ts` (the pipeline's home file), the
   * intra-package readers are in `$_inElement` rendering helpers, and the
   * cross-package reader in `glimmer/lib/renderer.ts` is the renderer's
   * wrapping of `template.render()`. Same namespace as slices 15/17/18.
   *
   * The globalThis writer `__gxtIsRendering` is RETAINED post-slice-19
   * because of the unmigrated `@ember/object/core.ts:321` reader. The
   * bridge predicate reads the same module-local `_renderPassDepth`
   * counter as the globalThis function — they are equivalent post-install.
   *
   * Fast-check: the implementation is `return _renderPassDepth > 0` — one
   * integer comparison; zero allocations. Suitable for hot-path use in
   * the `$_inElement` rendering helpers.
   */
  isRendering?(): boolean;

  /**
   * Run `fn` while the render-pass depth counter (`_renderPassDepth` in
   * `compile.ts`) is incremented; the counter is decremented on completion
   * via `try/finally` (including when `fn` throws). Returns whatever `fn`
   * returns. The decrement triggers the in-element deferred-render drain
   * when depth transitions from 1 → 0 (parent fragment is now committed to
   * the live document — see `_gxtSetIsRendering` body).
   *
   * Conditional-restore semantics (preserved exactly from pre-slice-21):
   * ALWAYS increment depth on entry. On exit (in `finally`), ONLY decrement
   * when we entered with depth == 0 (the call frame is the outermost
   * render). When nested inside another render pass (entered with depth
   * > 0), the decrement is SKIPPED, leaving the counter inflated by 1 for
   * the rest of the enclosing frame. This pre-slice-21 "drift" is required
   * to gate the in-element deferred-render drain trigger: the drain fires
   * on the depth-1→0 transition during the OUTER frame's decrement — but
   * ONLY when no nested frames inflated the counter. EMPIRICAL: a naive
   * "always-increment, always-decrement" wrap (the natural slice-17/18
   * shape) regresses 3 tests in `Strict Mode - renderComponent`
   * ("multiple calls to render in to the same element appear as siblings"
   * and variants) where the extra inner-frame drain replays a queued
   * in-element render in the parent before the parent commits, producing
   * duplicated DOM output.
   *
   * Slice-21 (Cluster B): graduates the two cross-package writer sites
   * for `__gxtSetIsRendering` to this typed bridge helper:
   *  - `glimmer/lib/renderer.ts:2249` (renderComponent top-level wrap
   *    around the initial `renderIntoRegion(template, renderContext)`).
   *  - `glimmer/lib/renderer.ts:2286` (`_doRender` reactor wrap around
   *    `clearRegion(); renderIntoRegion(template, renderContext)`).
   * Pre-slice-21 each site called `globalThis.__gxtSetIsRendering(true)`
   * before the body and `__gxtSetIsRendering(false)` after with a manual
   * `wasRendering` conditional restore. The helper folds the
   * conditional-skip + try/finally pattern into one documented bridge
   * surface (mirroring slice-17's `withTriggerSuppressed` and slice-18's
   * `withInTriggerReRender` — the third "wrap a synchronous body in a
   * state-flag toggle" helper on `compilePipeline`, with the additional
   * conditional-skip semantics specific to the depth-counter / drain
   * contract).
   *
   * The intra-file caller `compile.ts:13819` (templateFactory.render body)
   * was also migrated in slice 21, but calls `_gxtSetIsRendering` directly
   * (intra-module) with unconditional increment/decrement — its caller
   * contract requires the bump for in-element render-pass detection
   * regardless of nesting, and the surrounding try/catch already provides
   * try/finally semantics.
   *
   * After slice-21 the `__gxtSetIsRendering` and `__gxtIsRendering`
   * globalThis writers are DROPPED. The cross-package readers all route
   * through `isRendering()` / `withRendering()` bridge surfaces, and the
   * intra-file readers stay on the module-local `_gxtIsRendering` /
   * `_gxtSetIsRendering` functions. Net globalThis surface delta: -2 slots
   * (`__gxtIsRendering` + `__gxtSetIsRendering`).
   */
  withRendering?<T>(fn: () => T): T;

  /**
   * Read-only predicate for the `__gxtSyncing` boolean flag toggled by
   * `compile.ts`'s `__gxtSyncDomNow` body (and the manager.ts post-render
   * hook re-entry guard at `manager.ts:4202-4215`). Returns `true` iff the
   * current synchronous stack is nested inside the GXT post-`runTask` DOM
   * sync flush (Phase 0 through Phase 5 in `__gxtSyncDomNow`).
   *
   * Slice-20 (Cluster B): graduates the read side of the `__gxtSyncing`
   * flag to a typed bridge predicate so the `@ember/object/core.ts:320-326`
   * DEBUG proxy trap can read it through the bridge alongside the slice-18
   * `isInTriggerReRender()` and slice-19 `isRendering()` predicates. With
   * this addition, all three flags consumed by the proxy trap's
   * `_isInternalPath` predicate are bridge-routed — closing the deferrals
   * documented in slices 18 and 19.
   *
   * Writer + reader audit (pre-slice-20):
   *   Writers (6 sites — 4 in compile.ts, 2 in manager.ts):
   *     - `compile.ts:5270` — set to `true` at start of `__gxtSyncDomNow`
   *       body (after `__gxtPendingSync` check passes).
   *     - `compile.ts:5717` — set to `false` in the body's `finally`
   *       (mirrors the `try` at 5278).
   *     - `compile.ts:5871` — reset to `false` in `__gxtCleanupActiveComponents`
   *       (test-between-test cleanup).
   *     - `compile.ts:5253/5759` — read-only check (early return) in
   *       `__gxtSyncDomNow` and the 16ms interval-driven flush. Treated as
   *       a read for migration purposes (already routed via globalThis on
   *       the read side; the writer-vs-reader split here is the body's
   *       set/reset vs. the re-entrancy guards).
   *     - `manager.ts:4202-4215` — `_dispatchPostRenderHook` save-restore
   *       wraps the post-render hook re-entry (`wasSyncing = g.__gxtSyncing;
   *       g.__gxtSyncing = false; try {...} finally { g.__gxtSyncing =
   *       wasSyncing; }`) so a nested `__gxtSyncDomNow` invocation from the
   *       post-render hook is not short-circuited by the re-entrancy guard.
   *   Readers (5 cross-module sites):
   *     - `compile.ts:5253` (__gxtSyncDomNow re-entrancy guard — early
   *       return). RETAINED on globalThis; intra-file write/read pair.
   *     - `compile.ts:5759` (interval-driven flush re-entrancy guard).
   *       RETAINED on globalThis; intra-file write/read pair.
   *     - `compile.ts:4826` (`isSyncing` flag computed inside the wrapped
   *       inverseFn of `$_each` for inverse-branch destroy lifecycle).
   *       RETAINED on globalThis; intra-file reader, not in the proxy-trap
   *       3-flag group.
   *     - `manager.ts:1356` (component-instance creation marks instances
   *       created during the sync cycle for Phase 3 destroy ordering).
   *       RETAINED on globalThis; intra-file reader, not in the proxy-trap
   *       3-flag group.
   *     - `manager.ts:4826` (TRACE_DESTROY debug log). RETAINED on
   *       globalThis; intra-file reader, not in the proxy-trap 3-flag
   *       group.
   *     - `destroyable.ts:319` (chooses join-flush vs sync destroy based
   *       on whether GXT post-runTask sync is in progress). RETAINED on
   *       globalThis; intra-file reader (already typed as
   *       `g.__gxtSyncing?: boolean` — independent of the proxy-trap 3-flag
   *       group; no bridge-routing required for slice 20's primary goal).
   *     - `@ember/object/core.ts:324` (DEBUG proxy trap `_isInternalPath`
   *       predicate). MIGRATED in slice 20 to `compilePipeline.isSyncing()`
   *       bridge call with globalThis fallback — alongside the slice-18
   *       `isInTriggerReRender()` and slice-19 `isRendering()` predicates,
   *       so the entire 3-flag predicate routes through the bridge as a
   *       unit.
   *
   * Bridge shape decision: read-only predicate (mirroring slice-18's
   * `isInTriggerReRender()` and slice-19's `isRendering()`). The six writers
   * remain on globalThis in slice 20 — they are intra-file (compile.ts
   * writes its own sync body) or intra-manager (manager.ts wraps the
   * post-render hook re-entry). A future slice can promote the manager.ts
   * save-restore pair to a `withoutSyncing(fn): T` helper paralleling
   * slice-17's `withTriggerSuppressed`, and the compile.ts body writers to
   * a `withSyncing(fn): T` helper paralleling slice-18's
   * `withInTriggerReRender`. But neither writer migration is required for
   * the proxy-trap-as-unit goal of slice 20.
   *
   * Namespace decision: `compilePipeline`. The flag is semantically a
   * scope-modifier on the GXT post-runTask DOM sync pipeline — the writer
   * + body live in `compile.ts` (the pipeline's home file), the readers
   * gate behavior on whether the sync flush is the current frame. Same
   * namespace as slices 15/17/18/19.
   *
   * Slice-24 (Cluster B): the `__gxtSyncing` globalThis writer is DROPPED
   * — canonical state is now the module-local `_gxtSyncingFlag` in
   * `compile.ts`. All five non-proxy-trap readers (compile.ts:5253/5759/
   * 4826, manager.ts:1356/4826, destroyable.ts:319) route through this
   * bridge predicate exclusively. The proxy-trap reader's `__gxtSyncing`
   * globalThis fallback (`@ember/object/core.ts:362`) is also dropped in
   * slice 24. The four intra-file writers (compile.ts L5395/L5842/L5996
   * straight-line + the manager.ts:4202-4215 post-render-hook save-restore)
   * all route through the module-local state — the latter via the new
   * `withSyncing(value, fn)` bridge helper below.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtSyncingFlag` boolean — one boolean read; zero allocations.
   * Matches slice-18's `isInTriggerReRender()` body shape.
   */
  isSyncing?(): boolean;

  /**
   * Run `fn` while the `__gxtSyncing` boolean flag is set to `value`
   * (save the prior value, set the flag, invoke `fn`, then restore the
   * prior value via `try/finally`). Returns whatever `fn` returns.
   * Re-entrancy-safe: an enclosing frame's value is preserved by the
   * save-restore pattern (nested calls stack correctly).
   *
   * Slice-24 (Cluster B): graduates the cross-package writer at
   * `manager.ts:4202-4215` (`_dispatchPostRenderHook` post-render-hook
   * re-entry save-restore) to a typed bridge helper. Pre-slice-24 the
   * site inlined `wasSyncing = g.__gxtSyncing; g.__gxtSyncing = false;
   * try { syncNow(); } finally { g.__gxtSyncing = wasSyncing; }` to
   * temporarily clear the re-entrancy guard so the nested
   * `__gxtSyncDomNow` call proceeds (its body then promotes the flag
   * back to `true` for its own execution, and resets to `false` in its
   * own `finally`). The bridge helper folds the inline save-restore
   * into one documented surface; the `value` argument controls the
   * flag's value DURING the body (FALSE here for the manager.ts caller).
   *
   * Bridge shape decision: TWO-ARGUMENT save-restore wrapper
   * `withSyncing<T>(value: boolean, fn: () => T): T` — a generalisation
   * of slice-17's `withTriggerSuppressed` (set-to-FALSE-for-body) and
   * slice-18's `withInTriggerReRender` (set-to-TRUE-for-body). Taking
   * the value as an argument lets the same helper serve BOTH the "set
   * TRUE for a sync flush body" caller (compile.ts `__gxtSyncDomNow` —
   * which uses module-local `_gxtSetSyncing` directly because its
   * try/finally already pairs the set/reset and no nested caller writes
   * the flag to a different value mid-body) AND the "set FALSE to
   * bypass the re-entrancy guard" caller (manager.ts:4202-4215). Note:
   * this is the FIRST Cluster B bridge helper that takes a non-`fn`
   * argument — prior `with*` helpers always set the same direction.
   *
   * Writer audit (pre-slice-24):
   *  - Intra-file `__gxtSyncDomNow` body (compile.ts L5395 set-TRUE / L5842
   *    set-FALSE in `finally`) — RETAINED as straight-line module-local
   *    `_gxtSetSyncing(true/false)` calls (the body's try/finally already
   *    provides cleanup pairing; matches slice-22's intra-file direct-
   *    call decision).
   *  - Intra-file `__gxtCleanupActiveComponents` cleanup (compile.ts L5996
   *    set-FALSE) — RETAINED as straight-line `_gxtSetSyncing(false)`.
   *  - Cross-package `manager.ts:4202-4215` post-render-hook re-entry —
   *    MIGRATED in slice 24 to `withSyncing(false, fn)`.
   *
   * Reader contract: the flag is consumed by `isSyncing()` (above) —
   * all six readers route through that predicate exclusively after
   * slice 24, including the `@ember/object/core.ts:362` proxy trap
   * which drops its globalThis fallback in this slice.
   *
   * Namespace decision: `compilePipeline`. Same namespace as slices
   * 15/17/18/19/20/21/22/23. The flag's canonical state lives in
   * `compile.ts` (the pipeline's home file).
   *
   * Bridge interface evolution: slice 24 — eighteenth API change.
   * `GxtCompilePipelineCapabilities` extended with ONE new optional
   * method (`withSyncing`). No new install API.
   *
   * After slice 24 the `__gxtSyncing` globalThis slot is DROPPED: the
   * canonical state is the module-local `_gxtSyncingFlag` in
   * `compile.ts`, the bridge methods are the sole cross-package surface,
   * and the intra-file writers use the module-local setter directly.
   * Net globalThis surface delta: -1 slot (`__gxtSyncing`).
   */
  withSyncing?<T>(value: boolean, fn: () => T): T;

  /**
   * Run `fn` while the `__gxtCurrentlyRendering` boolean flag is set to
   * `true` (save the prior value, set the flag, invoke `fn`, then restore
   * the prior value via `try/finally`). Returns whatever `fn` returns.
   * Re-entrancy-safe: an enclosing frame's value is preserved by the
   * save-restore pattern (nested calls stack correctly).
   *
   * Slice-22 (Cluster B): graduates the cross-package writer site for
   * `__gxtCurrentlyRendering` to a typed bridge helper. DISTINCT from
   * slice-21's `withRendering` (which manages the `_renderPassDepth`
   * counter for the `__gxtIsRendering` predicate). `__gxtCurrentlyRendering`
   * is a SEPARATE pure-boolean flag that gates the "cross-object reactivity
   * trigger fan-out" from @tracked setters: when a @tracked property is set
   * DURING a render pass or DURING a wrapped user-event handler, the setter
   * MUST NOT call `__gxtTriggerReRender` — otherwise the inner trigger would
   * dirty cells mid-render (breaking the initial render) or mid-event-commit
   * (clobbering the user's input via a parent-arg re-sync). The flag is
   * narrower in scope than the depth-counter `__gxtIsRendering`: it only
   * covers the inner-template-call body + the wrapped event handler body,
   * not the entire renderComponent wrap.
   *
   * Writer audit (pre-slice-22):
   *  - `manager.ts:10775-10780` — `wrapHandler` save-restore wrap around the
   *    event handler call (`change`, `input`, `keyUp`, etc.). Pattern:
   *    `prevRendering = g.__gxtCurrentlyRendering; g.__gxtCurrentlyRendering
   *    = true; try { handler(e); } finally { g.__gxtCurrentlyRendering =
   *    prevRendering; ... }`. Migrated to `withCurrentlyRendering(fn): T` in
   *    slice 22 — the canonical save-restore writer.
   *  - `compile.ts:14181/14191` — `templateFactory.render` body unconditional
   *    `true` (before template body call) / `false` (in `finally`).
   *    Migrated in slice 22 to direct module-local `_gxtSetCurrentlyRendering`
   *    calls — INTRA-FILE writer, paired with `gxtSetIsRendering(true)`. The
   *    bridge helper's save-restore semantics are NOT what this caller wants
   *    (the templateFactory render body always wants to detect "we are inside
   *    a template body call" regardless of nesting); the surrounding
   *    try/finally provides the cleanup pairing.
   *
   * Reader contract: the flag is consumed by:
   *  - `metal/tracked.ts:297` — `if (!g.__gxtCurrentlyRendering) {
   *    __gxtTriggerReRender(this, key); __gxtExternalSchedule(); }` — guards
   *    the cross-object reactivity trigger from a non-component @tracked
   *    setter. Migrated to `isCurrentlyRendering()` in slice 22.
   *  - `glimmer-tracking.ts:54` — same pattern, this time inside the
   *    `tracked()` decorator's setter. Migrated to `isCurrentlyRendering()`
   *    in slice 22.
   *
   * Bridge shape decision: balanced save-restore wrapper (mirroring
   * slice-17's `withTriggerSuppressed` and slice-18's `withInTriggerReRender`
   * — the pure-boolean variant of the "wrap synchronous body in a state-flag
   * toggle" pattern). UNLIKE slice-21's `withRendering`, the balanced wrap
   * works here because the flag is a pure boolean (no depth counter, no
   * drain-on-1→0 side-effect): every save-restore pair is independent, and
   * nested frames stack correctly via the saved-value protocol.
   *
   * Namespace decision: `compilePipeline`. The flag is semantically a
   * scope-modifier on the GXT template render pipeline — its canonical state
   * lives in `compile.ts` (the pipeline's home file), the intra-file writer
   * is the templateFactory render body, and the cross-package writer in
   * `manager.ts` is the event-handler wrap. Same namespace as slices
   * 15/17/18/19/20/21.
   *
   * Bridge interface evolution: slice 22 — seventeenth API change.
   * `GxtCompilePipelineCapabilities` extended with TWO new optional methods
   * (`withCurrentlyRendering` + `isCurrentlyRendering`) — same paired shape
   * as slice 18's `withInTriggerReRender`/`isInTriggerReRender`.
   *
   * After slice 22 the `__gxtCurrentlyRendering` globalThis slot is DROPPED:
   * the canonical state is the module-local `_gxtCurrentlyRenderingFlag` in
   * `compile.ts`, the bridge methods are the sole cross-package surface,
   * and the intra-file writers use the module-local setter directly. Net
   * globalThis surface delta: -1 slot (`__gxtCurrentlyRendering`).
   */
  withCurrentlyRendering?<T>(fn: () => T): T;

  /**
   * Read-only predicate for the `__gxtCurrentlyRendering` boolean flag (the
   * pure-boolean version managed by `withCurrentlyRendering(fn)` and the
   * intra-file `_gxtSetCurrentlyRendering` writer in `compile.ts`). Returns
   * `true` iff the current synchronous stack is nested inside either:
   *  - a `withCurrentlyRendering(fn)` frame (the event-handler wrap from
   *    `manager.ts:10775`), OR
   *  - the `templateFactory.render` body in `compile.ts:14181-14193` (the
   *    inner template-function call between the `_gxtSetCurrentlyRendering(true)`
   *    set and the `finally` `_gxtSetCurrentlyRendering(false)` reset).
   *
   * Slice-22 (Cluster B): exposes the read side of the flag as a bridge
   * predicate so `metal/tracked.ts:297` and `glimmer-tracking.ts:54` can
   * gate their `__gxtTriggerReRender` calls without touching `globalThis`
   * directly. The implementation reads the canonical module-local
   * `_gxtCurrentlyRenderingFlag` in `compile.ts` (not a globalThis slot —
   * the slot is DROPPED in slice 22). Bridge-not-yet-installed edge:
   * defaults to `false` (the safe value — the slot was `undefined` pre-
   * install, which the pre-slice-22 `!g.__gxtCurrentlyRendering` check
   * treated as "not rendering").
   *
   * Fast-check: the implementation is `return _gxtCurrentlyRenderingFlag` —
   * one variable read; zero allocations. Suitable for the @tracked setter
   * hot path (every @tracked write outside a render pass goes through it).
   */
  isCurrentlyRendering?(): boolean;

  /**
   * Mark that a tracked write occurred since the last `UpdatingVM.execute`
   * call. Called from the `addBeforeTriggerReRender` host hook registered
   * by `ember-gxt-wrappers.ts` (the slice-15 contributor that replaced the
   * pre-slice-15 `installTrackedSetDetector` wrap-by-reassignment). The
   * flag is consumed (and cleared) on the next `UpdatingVM.execute` call
   * by `consumeTrackedSetSinceRerender()` below.
   *
   * Slice-29 (Cluster B): graduates the cross-file flag from
   * `globalThis.__gxtTrackedSetSinceRerender` to a typed mark+consume
   * bridge surface. The pre-slice-29 topology was:
   *  - Writer (1 site): `ember-gxt-wrappers.ts:2853` — set to `true`
   *    inside the BEFORE-trigger-rerender hook body.
   *  - Reader (1 site): `ember-gxt-wrappers.ts:2814-2815` — inside the
   *    `UpdatingVM.prototype.execute` patch, read + clear on entry to
   *    decide whether to force `alwaysRevalidate=true` for the one call
   *    (which causes `valueForRef` to recompute every childRef, flushing
   *    stale cached values from tracked writes that fired outside the
   *    normal VM update cycle — see the patch narrative at L2780-L2803).
   *
   * Bridge shape decision: mark+consume (2 methods) rather than the
   * get/set/with triple used by slices 17/18/20/22/23/24. Reason: the
   * reader's usage is exactly "check, clear, branch" — never a read
   * without clearing, and never a paired save-restore (the flag has a
   * single semantic owner: the consume-side resets it after observing).
   * Folding "check + clear" into a single `consume` call eliminates the
   * two-step `if (g.x) { g.x = false; ... }` race at the reader (not a
   * concurrency hazard in JS, but a documentation hazard — the bridge
   * surface now expresses the atomic semantics that pre-slice-29 the
   * reader open-coded).
   *
   * Namespace decision: `compilePipeline`. The flag's canonical state
   * lives in `compile.ts` alongside the other compilePipeline state
   * flags introduced in slices 17-24. Same namespace pattern.
   *
   * Bridge-not-yet-installed edge: the writer hook only registers AFTER
   * the bridge install (registration goes through
   * `addBeforeTriggerReRender`, which itself requires the bridge), so
   * the writer can assume the bridge is present. Callers still gate
   * with `?.` for the optional-method protocol typing.
   *
   * Bridge interface evolution: slice 29 — twenty-third API change.
   * `GxtCompilePipelineCapabilities` extended with TWO new optional
   * methods (`markTrackedSetSinceRerender` + `consumeTrackedSetSinceRerender`)
   * — paired mark+consume shape, distinct from the slice-22-style
   * `with/is` paired shape.
   *
   * After slice 29 the `__gxtTrackedSetSinceRerender` globalThis slot is
   * DROPPED: the canonical state is the module-local
   * `_gxtTrackedSetSinceRerenderFlag` in `compile.ts`; the writer hook
   * and the UpdatingVM.execute patch route exclusively through the
   * bridge methods. Net globalThis surface delta: -1 slot.
   */
  markTrackedSetSinceRerender?(): void;

  /**
   * Atomically check + clear the "tracked set since last rerender" flag.
   * Returns the prior value of the flag and resets the canonical
   * module-local `_gxtTrackedSetSinceRerenderFlag` (compile.ts) to
   * `false`.
   *
   * Slice-29 (Cluster B): paired reader for `markTrackedSetSinceRerender`
   * above. Called from `ember-gxt-wrappers.ts`'s `UpdatingVM.prototype.execute`
   * patch (the `__gxtEmberPatchedAlwaysRevalidate` install). The patch's
   * branch is `if (consumeTrackedSetSinceRerender()) { force-revalidate
   * this one call; }` — exactly the pre-slice-29 inline `if (g.x) { g.x
   * = false; ... }` check + clear, folded into one atomic bridge call.
   *
   * Bridge-not-yet-installed edge: the UpdatingVM patch runs on every
   * Glimmer execute, including invocations that may predate the bridge
   * install (deferred Promise.resolve().then in ember-gxt-wrappers.ts).
   * Callers use `?? false` to preserve the pre-slice-29 "no detection
   * ⇒ never force revalidate" behavior.
   *
   * Fast-check: implementation is `prev = flag; flag = false; return prev;`
   * — two variable accesses, zero allocations. Suitable for the per-execute
   * hot path (called once on every UpdatingVM.execute).
   */
  consumeTrackedSetSinceRerender?(): boolean;

  /**
   * Read the current sync-cycle counter. The counter is a monotonically
   * increasing integer, bumped once per `__gxtSyncDomNow` flush (the GXT
   * post-`runTask` DOM sync entry point in `compile.ts`). It is used as a
   * stamp for per-cycle dedup across the renderer:
   *  - modifier update tracking (manager.ts `$_MANAGERS.modifier._updatedInstances`
   *    is cleared on every bump; renderer.ts:1040 skips replay of modifiers
   *    already updated in the current cycle);
   *  - lifecycle hook gating (compile.ts:5185's `__gxtWDEFiredCycle` and
   *    manager.ts's `__gxtCreatedInSyncCycle` / `__gxtDestructorCycle` stamps
   *    suppress double-firing of pre-destroy and didReceiveAttrs across the
   *    same cycle);
   *  - mid-sync if-condition collapse propagation (compile.ts:4100/4616 use
   *    the cycle as a "dead-this-cycle" key on `__gxtParentDeadCycle`,
   *    suppressing TRUE-branch renders for children whose parent collapsed
   *    earlier in the same flush).
   *
   * Slice-30 (Cluster B): graduates the canonical state from the pre-slice-30
   * `globalThis.__gxtSyncCycleId` integer slot to a module-local
   * `_gxtSyncCycleId` in `compile.ts`. Pre-slice-30 the read pattern was
   * universal: `const c = (g.__gxtSyncCycleId || 0)`. All 14 readers used
   * this exact shape — the only intentional value is the truthy-coerce of
   * `undefined` to `0` (covers the bridge-not-yet-installed edge: pre-install
   * `g.__gxtSyncCycleId` was `undefined`, so all readers saw `0`). The
   * bridge contract preserves this: `getSyncCycleId?.() ?? 0` defaults to
   * `0` when the bridge is not yet installed.
   *
   * The single canonical writer at `compile.ts:__gxtSyncDomNow` body
   * (pre-slice-30 `(g.__gxtSyncCycleId = (g.__gxtSyncCycleId || 0) + 1)`)
   * is intra-file and uses the module-local `_gxtIncrementSyncCycleId()`
   * directly — NOT exposed via the bridge surface, because the writer is
   * always intra-file (no external caller is expected to bump the counter).
   * This is a deliberate read-only-bridge shape: external consumers can
   * observe the counter but not advance it.
   *
   * Reader topology after slice 30:
   *  - intra-file compile.ts (5 sites): call `_gxtGetSyncCycleId()`
   *    directly (intra-file cheapness, mirrors slice-22/24/27 precedent).
   *  - intra-package gxt-backend/manager.ts (8 sites): route through
   *    `getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0`.
   *  - cross-package glimmer/lib/renderer.ts (1 site): route through the
   *    bridge (same shape as manager.ts).
   *
   * Bridge shape decision: single-method read (`getSyncCycleId?(): number`).
   * Matches the existing slice-22/19/20 "predicate" pattern but for an
   * integer counter rather than a boolean. The reader-only nature of the
   * bridge (no setter / no increment helper exposed) reflects that the
   * counter has exactly one canonical writer in `compile.ts` and many
   * read-only observers. No save-restore variant is exposed (no caller
   * needs to temporarily rewind the counter).
   *
   * Namespace decision: `compilePipeline`. The counter's canonical state
   * lives in `compile.ts` alongside the other compilePipeline state from
   * slices 17-29 (the slice-29 `_gxtTrackedSetSinceRerenderFlag`, the
   * slice-24 `_gxtSyncingFlag`, the slice-22 `_gxtCurrentlyRenderingFlag`,
   * the slice-25 `_gxtTriggerSuppressedFlag`). Same namespace pattern.
   *
   * Bridge interface evolution (slice 30 — twenty-fourth API change):
   * `GxtCompilePipelineCapabilities` extended with ONE new optional method
   * (`getSyncCycleId?(): number`) — read-only counter access. Slice 30 is
   * the FIRST slice to expose only a getter (slice 19/20/22 also exposed
   * read-only predicates, but those were booleans; slice 30 is the first
   * integer-getter bridge method).
   *
   * Bridge-not-yet-installed edge: all readers use `?.() ?? 0` to preserve
   * the pre-slice-30 truthy-coerce-undefined-to-0 semantics. The single
   * intra-file writer in `__gxtSyncDomNow` body runs only after the bridge
   * install (`installCompilePipelinePart` runs at module-init time, before
   * any `runTask` flush can fire), so the writer always sees the canonical
   * counter.
   *
   * Fast-check: implementation is `return _gxtSyncCycleId;` — one variable
   * read; zero allocations. Identical hot-path cost to the pre-slice-30
   * globalThis read (the truthy-coerce `|| 0` is moved out of the reader
   * and into the bridge contract's `?? 0` fallback, which only fires when
   * the bridge is not installed). After slice 30 the
   * `__gxtSyncCycleId` globalThis slot is DROPPED: the canonical state is
   * the module-local `_gxtSyncCycleId` in `compile.ts`; the writer is
   * intra-file and the readers route through this getter (cross-file/
   * cross-package) or directly through `_gxtGetSyncCycleId()` (intra-file).
   * Net globalThis surface delta: -1 slot.
   */
  getSyncCycleId?(): number;
}

/**
 * Render-pass lifecycle capabilities. Implemented by manager.ts (the canonical
 * `beginRenderPass` / `endRenderPass` / `markTemplateRendered` definitions),
 * with an optional `beforeBeginRenderPass` host hook contributed by compile.ts
 * via `installRenderPassPart` (slice 8 — host-hook pattern).
 *
 * Consumers: glimmer/lib/templates/root.ts (cross-package — outlet rendering
 * enables backtracking detection around the template render call) and the
 * internal compile.ts pre-hook (intra-package).
 *
 * Begin/end are paired in `try/finally` — every begin must have a matching end.
 *
 * Slice-8 design: extends the slice-6 / slice-7 install-API pattern with a
 * "host hook" — compile.ts contributes a `beforeBeginRenderPass` function via
 * `installRenderPassPart` (mirroring slices 6 and 7). manager.ts's
 * `beginRenderPass` method dispatches the registered before-hook (if any)
 * BEFORE its main body. This replaces the pre-slice-8 runtime mutation pattern
 * at compile.ts:5106 where `_installTemplateOnlyResetHook` reassigned
 * `globalThis.__gxtBeginRenderPass = wrapped(...)` to clear compile.ts-local
 * template-only render state (`__gxtTemplateOnlyRenderedSet`,
 * `__gxtTemplateOnlyStack`) at the start of each pass. The host-hook pattern
 * avoids runtime mutation entirely.
 *
 * NOT included in this slice (intentionally deferred):
 *  - `__gxtIsInRenderPass` — boolean state flag co-written with
 *    `_isInRenderPass` inside `beginRenderPass`/`endRenderPass`. Cross-package
 *    readers in metal/tracked.ts treat it as a fast-check predicate. Migrating
 *    to a method (`isInRenderPass()`) would require updating many tracked-read
 *    hot-path call sites; the state-flag pattern is fundamentally different
 *    from the bridge's method-call shape. Same exclusion class as the deferred
 *    state-flag inventory (e.g. `__gxtRenderDepth`, `__gxtIsRendering`).
 */
export interface GxtRenderPassCapabilities {
  /**
   * Open a new render pass. Clears the marked-template-rendered set and sets
   * the in-render-pass flag. Dispatches the registered `beforeBeginRenderPass`
   * host hook FIRST so contributors (e.g. compile.ts) can clear their own
   * pass-local state before manager.ts's bookkeeping runs.
   *
   * Previously: `(globalThis as any).__gxtBeginRenderPass`. Pre-slice-8 the
   * function was wrapped at runtime by `_installTemplateOnlyResetHook` in
   * compile.ts:5106 to clear template-only state; that wrap is now installed
   * via `installRenderPassPart({ beforeBeginRenderPass })` and dispatched here.
   */
  beginRenderPass(): void;

  /**
   * Close the current render pass. Clears the marked-template-rendered set
   * and clears the in-render-pass flag.
   *
   * Previously: `(globalThis as any).__gxtEndRenderPass`.
   */
  endRenderPass(): void;

  /**
   * Mark a template-rendered instance for backtracking detection. The
   * implementation also walks own/prototype keys to capture nested
   * non-component objects (so shared dependencies on `this.wrapper.content`
   * are caught too).
   *
   * Previously: `(globalThis as any).__gxtMarkTemplateRendered`.
   */
  markTemplateRendered(instance: unknown): void;

  /**
   * Host hook contributed by compile.ts (via `installRenderPassPart`) that
   * runs BEFORE manager.ts's `beginRenderPass` body. Used to clear
   * compile.ts-local template-only render state
   * (`__gxtTemplateOnlyRenderedSet`, `__gxtTemplateOnlyStack`) at the start
   * of each render pass. Pre-slice-8 this logic lived in a wrap-by-reassignment
   * installer at compile.ts:5106; this slice promotes it to a typed host hook.
   *
   * Best-effort: errors thrown from the hook are caught and ignored, matching
   * the pre-slice-8 wrap's try/catch behavior. Only one contributor at a time
   * is supported in this slice (compile.ts); a future slice can extend to a
   * chain if a second contributor appears.
   */
  beforeBeginRenderPass?(): void;
}

/**
 * Runtime / module-handoff capabilities. Implemented by
 * `gxt-with-runtime-hbs.ts` (the file that imports `* as gxtModule from
 * '@lifeart/gxt'` and re-exports the runtime-hbs-flavored namespace) AND by
 * `compile.ts` (the file that imports `$_MANAGERS` directly from
 * `@lifeart/gxt` for use in template-emit code). Both writers contribute the
 * SAME `$_MANAGERS` object reference (the `manualChunks` rollup consolidation
 * guarantees a single GXT module instance; see compile.ts:1242 note). The
 * dual-write is for entry-point independence — either file may load alone in
 * different bundles, so each must be able to publish the manager reference
 * autonomously.
 *
 * Consumed by manager.ts to obtain the SAME `@lifeart/gxt` namespace and
 * `$_MANAGERS` object that GXT's internal manager-handler functions close
 * over. manager.ts must mutate the original `$_MANAGERS` object in place
 * (GXT's `$_maybeHelper` etc. capture a reference to it at module-init time;
 * replacing the object wholesale would not be observed).
 *
 * Slice-7 design (initial): `getGxtModule` populated via the install-API
 * pattern introduced in slice 6 (`installRuntimePart`). The writer file
 * (`gxt-with-runtime-hbs.ts`) does NOT live in `manager.ts`, so we use a
 * partial-install API rather than an initial `setGxtRenderer` field. This
 * also validates the pattern with a SECOND non-manager.ts writer.
 *
 * Slice-16 extension: `getOriginalManagers` added as the canonical bridge
 * route for the GXT-original `$_MANAGERS` reference, replacing the prior
 * `(globalThis as any).__gxtOriginalManagers` dual-write. Both writers
 * contribute via `installRuntimePart`; last-writer-wins is benign because
 * both return the same object reference. The manager.ts reader does a
 * `queueMicrotask` deferral so contributors (which run at their own module
 * init, after manager.ts's `setGxtRenderer`) have a chance to register.
 */
export interface GxtRuntimeCapabilities {
  /**
   * Return the `@lifeart/gxt` namespace object as imported by
   * `gxt-with-runtime-hbs.ts`. Returns `undefined` if the writer file never
   * loaded (i.e., the gxt-with-runtime-hbs entry was not part of the import
   * graph for this build).
   *
   * Used by manager.ts's `$_MANAGERS`-mutation block to obtain the
   * GXT-internal `$_MANAGERS` reference and install the Ember
   * component/helper/modifier handlers in place.
   *
   * Previously: `(globalThis as any).__gxtDirectModule`.
   */
  getGxtModule?(): unknown;

  /**
   * Return the GXT-original `$_MANAGERS` object — the exact reference that
   * GXT's internal `$_maybeHelper`, `$_maybeModifier`, etc. close over at
   * module init. Returns `undefined` if neither writer file
   * (`gxt-with-runtime-hbs.ts` nor `compile.ts`) is in the import graph.
   *
   * Both `gxt-with-runtime-hbs.ts` and `compile.ts` register this method via
   * `installRuntimePart`; the second `Object.assign` wins, but both return
   * the same object since the rollup `manualChunks` consolidation ensures a
   * single `@lifeart/gxt` module instance across the gxt-backend package.
   *
   * Used by manager.ts (in a `queueMicrotask` so contributors get a chance
   * to register) to mutate the original managers object in place.
   *
   * Previously: `(globalThis as any).__gxtOriginalManagers`.
   */
  getOriginalManagers?(): unknown;
}

/**
 * Root-component / renderer-state capabilities. Implemented by
 * `glimmer/lib/renderer.ts` (the file that owns the `renderers` set and the
 * per-renderer `RendererState.debug.roots` walk), consumed by
 * `gxt-backend/compile.ts` (the file that drives `__gxtTriggerReRender` and
 * Phase 1b of `__gxtSyncDomNow`).
 *
 * Slice-9 design: this is the FIRST "reverse-flow" namespace on the bridge.
 * All prior slices had the writer inside `gxt-backend` (and readers either
 * inside `gxt-backend` or in the small set of cross-package consumers that
 * import the bridge). For this namespace the writer is OUTSIDE `gxt-backend`
 * (it's `glimmer/lib/renderer.ts`, which already imports the bridge for
 * slice-6's `compilePipeline.registerArrayOwner` reader). Mechanically the
 * shape is identical to slice 7's `runtime` namespace and slice 6's
 * compile-pipeline contributions from `ember-template-compiler.ts`: the
 * non-manager.ts writer file calls `installRootComponentPart(...)` at module
 * init; manager.ts seeds an empty `rootComponent: {}` so `Object.assign` has
 * a target. The "reverse" framing is from the perspective of the writer
 * location (renderer.ts publishes; compile.ts consumes), not the bridge's
 * mechanical contract.
 *
 * Why split into its own namespace (rather than dropped into
 * `compilePipeline`)? `compilePipeline` is conceptually "the compile-side
 * surface contributed by compile.ts / ember-template-compiler.ts". Renderer-
 * owned hooks belong on their own namespace so the surface area stays legible
 * (`rootComponent.isRootComponent(...)` vs. `compilePipeline.isRootComponent(...)`
 * — the former immediately tells the reader the implementation lives in the
 * renderer file).
 *
 * NOT included in this slice (intentionally deferred):
 *  - `__gxtCheckAllTagsCurrent` (glimmer/lib/renderer.ts:1398) — defined
 *    alongside `__gxtUpdateRootTagValues` but the only reference in source is
 *    a HISTORICAL comment at compile.ts:5522 explaining why the function is
 *    no longer used. Zero live readers. Cleaned up as an orphan in this slice
 *    (writer removal only — no migration to the bridge needed).
 */
export interface GxtRootComponentCapabilities {
  /**
   * Return `true` if `obj` is the `root` of one of the registered renderers'
   * top-level GXT roots. Used by compile.ts's `__gxtTriggerReRender` path to
   * distinguish own-SELF_TAG changes (handled by the cell-based sync
   * pipeline) from nested-object changes (which need a force-rerender
   * fallback). Returns `false` for non-objects, missing renderers, or any
   * object that isn't itself a registered root.
   *
   * Previously: `(globalThis as any).__gxtIsRootComponent`.
   */
  isRootComponent?(obj: unknown): boolean;

  /**
   * Walk every registered renderer's GXT roots, recording which were dirty
   * (their `gxtLastTagValue` differs from the current tag value) on
   * `(globalThis as any).__gxtDirtyRootsAtSync`, then update each root's
   * `gxtLastTagValue` to match the current value. Used by
   * `__gxtSyncDomNow`'s Phase 1b — after cell-based updates have applied,
   * roots are marked clean so the Phase 2b force-rerender doesn't re-fire on
   * already-applied changes.
   *
   * Previously: `(globalThis as any).__gxtUpdateRootTagValues`.
   */
  updateRootTagValues?(): void;
}

/**
 * The aggregate GXT renderer capabilities object. Pilot exposed only the
 * destruction slice; subsequent slices added backtracking, view-utils,
 * format, compile-pipeline, and runtime. Future slices will be additional
 * readonly properties on this same interface (e.g. `schedule`, `lifecycle`,
 * `cellMirror`, …).
 *
 * Why a single object rather than 30 individual exports? Easier to extend
 * incrementally without re-wiring imports each time; readers do
 * `getGxtRenderer()?.destruction.foo(...)` which is a single optional-chain.
 */
export interface GxtRenderer {
  readonly destruction: GxtDestructionCapabilities;
  readonly backtracking: GxtBacktrackingCapabilities;
  readonly viewUtils: GxtViewUtilsCapabilities;
  readonly format: GxtFormatCapabilities;
  readonly compilePipeline: GxtCompilePipelineCapabilities;
  readonly renderPass: GxtRenderPassCapabilities;
  readonly runtime: GxtRuntimeCapabilities;
  readonly rootComponent: GxtRootComponentCapabilities;
}

let _renderer: GxtRenderer | null = null;

// Slice-6 deferred-install queue. Contributions from compile.ts /
// ember-template-compiler.ts arrive via `installCompilePipelinePart` and
// may fire BEFORE manager.ts's `setGxtRenderer` call (the load-order of
// the two large module-init paths depends on the entry point — entering
// via `@ember/template-compiler` loads compile.ts first; entering via
// the renderer loads manager.ts first). We buffer until the renderer is
// available, then flush.
let _pendingCompilePipelineParts: Partial<GxtCompilePipelineCapabilities>[] = [];

// Slice-7 deferred-install queue. Same load-order independence pattern as
// slice 6's compile-pipeline queue, but for the `runtime` namespace. The
// writer (`gxt-with-runtime-hbs.ts`) re-exports `$_MANAGERS` from manager.ts,
// so importing the writer file pulls manager.ts in transitively — but the
// top-level statement in gxt-with-runtime-hbs.ts that runs the install
// fires AFTER the re-exports' transitive `setGxtRenderer` has executed.
// Still, when external code imports gxt-with-runtime-hbs.ts via a path that
// reaches manager.ts only AFTER the install-call line, we'd have a null
// renderer. Buffer until the renderer is available, then flush.
let _pendingRuntimeParts: Partial<GxtRuntimeCapabilities>[] = [];

// Slice-8 deferred-install queue. Same load-order independence pattern as
// slices 6 and 7, but for the `renderPass` namespace. The host-hook
// contributor (`compile.ts`) may load before OR after manager.ts depending
// on the entry point: entering via `@ember/template-compiler` loads compile.ts
// first; entering via the renderer loads manager.ts first. Buffer until the
// renderer is available, then flush.
let _pendingRenderPassParts: Partial<GxtRenderPassCapabilities>[] = [];

// Slice-9 deferred-install queue. Same load-order independence pattern as
// slices 6 / 7 / 8, but for the `rootComponent` namespace whose writer
// (`glimmer/lib/renderer.ts`) is OUTSIDE gxt-backend. renderer.ts may load
// BEFORE manager.ts in some entry paths (e.g., when an app boots from
// `@ember/-internals/glimmer` and gxt-backend is pulled in lazily via the
// compile-pipeline import edge). Buffer until the renderer is available,
// then flush.
let _pendingRootComponentParts: Partial<GxtRootComponentCapabilities>[] = [];

// Slice-10 deferred-install queue. Same load-order independence pattern as
// slice 8's `_pendingRenderPassParts`, but for the `backtracking` namespace's
// `transformBacktrackingMessage` host hook contributed by compile.ts.
// compile.ts may load before manager.ts depending on entry point; buffer
// until the renderer is available, then flush.
let _pendingBacktrackingParts: Partial<GxtBacktrackingCapabilities>[] = [];

// Slice-11 deferred-install queue. Same load-order independence pattern as
// slices 8 and 10, but for the `viewUtils` namespace's
// `afterRebuildViewTreeFromDom` host hook contributed by compile.ts.
// compile.ts may load before manager.ts depending on entry point; buffer
// until the renderer is available, then flush.
let _pendingViewUtilsParts: Partial<GxtViewUtilsCapabilities>[] = [];

/**
 * Install the renderer capabilities object. Called exactly once at
 * gxt-backend module init by manager.ts. Multiple calls overwrite, but this
 * is intentional only for tooling/tests; production code calls it once.
 *
 * The `compilePipeline` slot may receive ADDITIONAL methods from compile.ts
 * and ember-template-compiler.ts via `installCompilePipelinePart` after this
 * initial install. See slice-6 design note in `GxtCompilePipelineCapabilities`.
 *
 * The `runtime` slot is populated entirely via `installRuntimePart` (slice 7)
 * from `gxt-with-runtime-hbs.ts`; manager.ts seeds an empty `runtime: {}` so
 * the namespace exists for `Object.assign` to merge into.
 *
 * On install we also flush any compile-pipeline / runtime parts that were
 * registered BEFORE manager.ts loaded (see `_pendingCompilePipelineParts`
 * and `_pendingRuntimeParts` above).
 */
export function setGxtRenderer(renderer: GxtRenderer): void {
  _renderer = renderer;
  if (_pendingCompilePipelineParts.length > 0) {
    for (const part of _pendingCompilePipelineParts) {
      Object.assign(_renderer.compilePipeline, part);
    }
    _pendingCompilePipelineParts = [];
  }
  if (_pendingRenderPassParts.length > 0) {
    for (const part of _pendingRenderPassParts) {
      Object.assign(_renderer.renderPass, part);
    }
    _pendingRenderPassParts = [];
  }
  if (_pendingRuntimeParts.length > 0) {
    for (const part of _pendingRuntimeParts) {
      Object.assign(_renderer.runtime, part);
    }
    _pendingRuntimeParts = [];
  }
  if (_pendingRootComponentParts.length > 0) {
    for (const part of _pendingRootComponentParts) {
      Object.assign(_renderer.rootComponent, part);
    }
    _pendingRootComponentParts = [];
  }
  if (_pendingBacktrackingParts.length > 0) {
    for (const part of _pendingBacktrackingParts) {
      Object.assign(_renderer.backtracking, part);
    }
    _pendingBacktrackingParts = [];
  }
  if (_pendingViewUtilsParts.length > 0) {
    for (const part of _pendingViewUtilsParts) {
      Object.assign(_renderer.viewUtils, part);
    }
    _pendingViewUtilsParts = [];
  }
}

/**
 * Slice-6 install API. Allows compile.ts and ember-template-compiler.ts to
 * contribute additional methods to the `compilePipeline` namespace.
 *
 * Why: a subset of compile-pipeline hooks have their function definitions in
 * compile.ts (closing over compile-local WeakMaps / module-local `let` state)
 * or in ember-template-compiler.ts (closing over imported counters). Those
 * functions cannot be relocated to manager.ts without fragmenting their
 * reader sites or pulling unrelated state across the file boundary. The
 * partial-install API lets each writer file contribute its own slice.
 *
 * Contract: callable at any point during module init. If `setGxtRenderer`
 * has already fired (manager.ts loaded first), the part is merged
 * immediately via `Object.assign` into the existing `compilePipeline`
 * object — so already-captured references (e.g. a `const cp =
 * getGxtRenderer()?.compilePipeline` stored at top-level) see the new
 * methods. If `setGxtRenderer` has NOT yet fired (compile.ts loaded first),
 * the part is buffered and flushed when `setGxtRenderer` runs.
 */
export function installCompilePipelinePart(
  part: Partial<GxtCompilePipelineCapabilities>
): void {
  if (_renderer === null) {
    _pendingCompilePipelineParts.push(part);
    return;
  }
  Object.assign(_renderer.compilePipeline, part);
}

/**
 * Slice-7 install API. Allows `gxt-with-runtime-hbs.ts` to contribute methods
 * to the `runtime` namespace. Mirrors `installCompilePipelinePart` (slice 6)
 * for the same load-order independence: if `setGxtRenderer` has already fired
 * (manager.ts loaded first), the part is merged immediately via `Object.assign`
 * into the existing `runtime` object. If `setGxtRenderer` has NOT yet fired,
 * the part is buffered and flushed when `setGxtRenderer` runs.
 *
 * Used by `gxt-with-runtime-hbs.ts` to publish the `@lifeart/gxt` namespace
 * object so manager.ts can mutate the GXT-internal `$_MANAGERS` in place. See
 * `GxtRuntimeCapabilities` for the namespace docs.
 */
export function installRuntimePart(part: Partial<GxtRuntimeCapabilities>): void {
  if (_renderer === null) {
    _pendingRuntimeParts.push(part);
    return;
  }
  Object.assign(_renderer.runtime, part);
}

/**
 * Slice-8 install API. Allows compile.ts to contribute the
 * `beforeBeginRenderPass` host hook to the `renderPass` namespace. Mirrors
 * `installCompilePipelinePart` (slice 6) and `installRuntimePart` (slice 7).
 *
 * The `beginRenderPass` / `endRenderPass` / `markTemplateRendered` methods
 * are seeded by manager.ts's initial `setGxtRenderer` call; `beforeBeginRenderPass`
 * arrives later from compile.ts (typical load order: compile.ts top-level runs
 * the install AFTER manager.ts has already published the triad — but
 * cross-entry import paths can flip the order, so we use the same
 * pending-queue pattern as slices 6 and 7).
 */
export function installRenderPassPart(part: Partial<GxtRenderPassCapabilities>): void {
  if (_renderer === null) {
    _pendingRenderPassParts.push(part);
    return;
  }
  Object.assign(_renderer.renderPass, part);
}

/**
 * Slice-9 install API. Allows `glimmer/lib/renderer.ts` to contribute methods
 * to the `rootComponent` namespace. Mirrors `installCompilePipelinePart`
 * (slice 6), `installRuntimePart` (slice 7), and `installRenderPassPart`
 * (slice 8): if `setGxtRenderer` has already fired (manager.ts loaded first),
 * the part is merged immediately via `Object.assign` into the existing
 * `rootComponent` object. If `setGxtRenderer` has NOT yet fired, the part is
 * buffered and flushed when `setGxtRenderer` runs.
 *
 * Slice-9 is the first reverse-flow install: the writer file
 * (`glimmer/lib/renderer.ts`) lives OUTSIDE gxt-backend. Mechanically this is
 * identical to slice 6's `ember-template-compiler.ts` writer or slice 7's
 * `gxt-with-runtime-hbs.ts` writer — the install-API pattern is direction-
 * agnostic and supports both intra-gxt-backend writers and external-to-
 * gxt-backend writers without modification. See `GxtRootComponentCapabilities`
 * for the namespace docs.
 */
export function installRootComponentPart(
  part: Partial<GxtRootComponentCapabilities>
): void {
  if (_renderer === null) {
    _pendingRootComponentParts.push(part);
    return;
  }
  Object.assign(_renderer.rootComponent, part);
}

/**
 * Slice-10 install API. Allows compile.ts to contribute the
 * `transformBacktrackingMessage` host hook to the `backtracking` namespace.
 * Mirrors `installRenderPassPart` (slice 8) — same host-hook pattern, but on
 * a different namespace.
 *
 * The `beginFrame` / `endFrame` / `checkBacktracking` methods are seeded by
 * manager.ts's initial `setGxtRenderer` call; `transformBacktrackingMessage`
 * arrives later from compile.ts. Typical load order: compile.ts top-level runs
 * the install AFTER manager.ts has already published `checkBacktracking` — but
 * cross-entry import paths can flip the order, so we use the same pending-queue
 * pattern as slices 6 / 7 / 8 / 9.
 */
export function installBacktrackingPart(
  part: Partial<GxtBacktrackingCapabilities>
): void {
  if (_renderer === null) {
    _pendingBacktrackingParts.push(part);
    return;
  }
  Object.assign(_renderer.backtracking, part);
}

/**
 * Slice-11 install API. Allows compile.ts to contribute the
 * `afterRebuildViewTreeFromDom` host hook to the `viewUtils` namespace.
 * Mirrors `installRenderPassPart` (slice 8) and `installBacktrackingPart`
 * (slice 10) — same install-API pattern, different namespace + a third
 * distinct host-hook shape (AFTER-hook, contrasting slice 8's before-hook
 * and slice 10's transformer-hook).
 *
 * The `pushParentView` / `popParentView` / `getElementView` / `getViewElement` /
 * `rebuildViewTreeFromDom` methods are seeded by manager.ts's initial
 * `setGxtRenderer` call; `afterRebuildViewTreeFromDom` arrives later from
 * compile.ts. Typical load order: compile.ts top-level runs the install AFTER
 * manager.ts has already published `rebuildViewTreeFromDom` — but cross-entry
 * import paths can flip the order, so we use the same pending-queue pattern as
 * slices 6 / 7 / 8 / 9 / 10.
 */
export function installViewUtilsPart(
  part: Partial<GxtViewUtilsCapabilities>
): void {
  if (_renderer === null) {
    _pendingViewUtilsParts.push(part);
    return;
  }
  Object.assign(_renderer.viewUtils, part);
}

/**
 * Read the renderer. Returns `null` when gxt-backend was never loaded (i.e.,
 * classic-Ember build) — callers must guard with `if (renderer)`. Under
 * `__GXT_MODE__ = false`, the entire calling branch DCEs away.
 */
export function getGxtRenderer(): GxtRenderer | null {
  return _renderer;
}
