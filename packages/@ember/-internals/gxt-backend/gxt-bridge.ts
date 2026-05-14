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
 *  - `__gxtClearIfWatchers` — intra-compile.ts read+write. MIGRATED IN
 *    SLICE 56 (Cluster B) to module-local function `_gxtClearIfWatchers`
 *    in `compile.ts`. Zero-bridge intra-file refactor; the reader at the
 *    test-cleanup region now calls the function directly. Drops 1
 *    globalThis slot. See slices 43-48 for analogous zero-bridge precedents.
 *  - `__gxtTrackArgSource` / `__gxtLastArgSourceCtx` / `__gxtLastArgSourceKey`
 *    — intra-manager.ts state flags. Same exclusion pattern as slice 3's
 *    `__gxtSuppressDirtyTagForDuringRebuild` and slice 4's
 *    `__gxtLastSafeStringResult`. The `__gxtLastArgSourceKey` /
 *    `__gxtLastArgSourceCtx` pair WAS LATER MIGRATED IN SLICE 43 to
 *    module-local `_lastArgSourceKey` / `_lastArgSourceCtx` in
 *    `manager.ts` (zero-bridge intra-file precedent — see the slice 43
 *    entry below for the full topology). `__gxtTrackArgSource` WAS
 *    LATER MIGRATED IN SLICE 44 to module-local `_gxtTrackArgSource`
 *    in `manager.ts`, closing the arg-source-detection triad — see
 *    the slice 44 entry below for the full topology. All three slots
 *    are now module-local; the triad is fully retired from globalThis.
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
 *  - `__gxtAllPoolArrays` — MIGRATED IN SLICE 32 to `getAllPoolArrays()` on
 *    this namespace. The pre-slice-32 topology was 1 writer (manager.ts:1050
 *    one-time `(globalThis as any).__gxtAllPoolArrays = _allPoolArrays`
 *    publish of the manager.ts-local Set) and 2 readers (1 intra-file in
 *    `manager.ts`'s `_gxtSyncAllWrappers` pre-body proactive-wrap loop,
 *    1 cross-file in `compile.ts`'s `wrappedInverseFn` inverse-branch
 *    teardown of pool instances under the captured parent view). Slice 32
 *    matches the slice-30 read-only-bridge-getter shape applied to a
 *    `Set`-valued canonical state instead of an integer counter — the
 *    cross-file reader was the only consumer needing a bridge surface, and
 *    the read-only contract reflects that the Set is mutated intra-file by
 *    `getCachedOrCreateInstance` / `_gxtClearInstancePools`. The intra-file
 *    reader goes direct against `_allPoolArrays` (slice-22/24/27/30/31
 *    intra-file-reader precedent). The `__gxtAllPoolArrays` globalThis slot
 *    is DROPPED in this slice — net -1 globalThis surface. First slice to
 *    expose a read-only `Set`-getter bridge method (slices 19/20/22 are
 *    read-only booleans, slice 30 is a read-only integer-getter; slice 32
 *    is the `Set`-getter analogue).
 *  - `__gxtModifierInstallWatchers` — MIGRATED IN SLICE 33 to
 *    `getModifierInstallWatchers()` on this namespace. The pre-slice-33
 *    topology was 1 writer (manager.ts modifier-install code path inside
 *    the `installModifier` block — lazy-init dance:
 *    `prev = g.__gxtModifierInstallWatchers; map = prev instanceof Map ?
 *    prev : new Map(); if (!(prev instanceof Map)) g.__gxtModifierInstallWatchers = map;`
 *    then `map.set(instance, watcher)` on entry, `map.delete(instance)` on
 *    `finally`) and 1 cross-file reader (compile.ts's
 *    `_gxtTriggerReRenderBody` — `modWatchers instanceof Map && size > 0`
 *    gate, then `modWatchers.get(obj)` to find the per-instance notify
 *    watcher and call it). Slice 33 matches the slice-32 read-only-getter
 *    shape applied to a `Map`-valued canonical state instead of a `Set` —
 *    the cross-file reader was the only consumer needing a bridge surface,
 *    and the read-only contract reflects that the Map is mutated intra-file
 *    by the modifier-install code path only (per-install set on entry,
 *    delete on `finally`). The canonical state moves from
 *    `globalThis.__gxtModifierInstallWatchers` (lazy-init on first install)
 *    to the always-defined module-local `_modifierInstallWatchers` in
 *    `gxt-backend/manager.ts` — collapsing the lazy-init dance to a direct
 *    `.set` / `.delete` pair. The `__gxtModifierInstallWatchers` globalThis
 *    slot is DROPPED in this slice — net -1 globalThis surface. First slice
 *    to expose a read-only `Map`-getter bridge method (slices 19/20/22 are
 *    read-only booleans, slice 30 is a read-only integer-getter, slice 32
 *    is a read-only `Set`-getter; slice 33 is the `Map`-getter analogue).
 *  - `__gxtSyncIsPropertyDriven` — MIGRATED IN SLICE 34 to
 *    `isSyncIsPropertyDriven()` on this namespace. The pre-slice-34 topology
 *    was 2 intra-file writers in `compile.ts` (`__gxtSyncDomNow` body
 *    L5618 set-from-`__gxtPendingSyncFromPropertyChange`, L6085 reset-in-
 *    outer-`finally`) and 1 cross-file reader in `manager.ts:4547`
 *    (`__gxtDestroyUnclaimedPoolEntries` destroy-error-capture gate —
 *    `_outerSuppressCapture = !__gxtSyncIsPropertyDriven`). The flag
 *    mirrors `__gxtHadPendingSync` into a slot that SURVIVES
 *    `__gxtForceEmberRerender`'s finally-block clear, so downstream phases
 *    can still tell whether the sync was property-driven after the
 *    force-rerender pass. Slice 34 matches the slice-20/22/23/24
 *    read-only-boolean-predicate pattern: 2 intra-file writers route
 *    through the module-local `_gxtSetSyncIsPropertyDriven(value)` setter
 *    (directly, no bridge indirection); 1 cross-file reader routes through
 *    `compilePipeline.isSyncIsPropertyDriven?.()`. Canonical state moves
 *    to module-local `_gxtSyncIsPropertyDrivenFlag` in `compile.ts`. The
 *    `__gxtSyncIsPropertyDriven` globalThis slot is DROPPED in this slice
 *    — net -1 globalThis surface. Slice 34 is part of the audit-first
 *    investigation of the 4-flag pending-sync cluster (`__gxtPendingSync`
 *    / `__gxtHadPendingSync` / `__gxtPendingSyncFromPropertyChange` /
 *    `__gxtSyncIsPropertyDriven`); the audit revealed flags 1-3 have
 *    cross-package writers (test-helpers, glimmer, runloop, routing) and
 *    require larger bridge surfaces, while flag 4 has a clean 2-writer-
 *    intra-file + 1-reader-cross-file topology that closes in a single
 *    slice via the slice-20 predicate pattern. Flags 1-3 remain on
 *    globalThis pending future slices that address each writer-set
 *    separately.
 *  - `__gxtHadPendingSync` — MIGRATED IN SLICE 35 to `getHadPendingSync()`
 *    + `setHadPendingSync(value)` on this namespace (paired get/set bridge
 *    surface — slice-14 paired-methods pattern, applied to a single boolean
 *    flag instead of a Set+counter pair). The pre-slice-35 topology was
 *    5 writers and 4 readers spanning 3 files / 2 packages:
 *     Writers (5 sites):
 *       - `gxt-backend/compile.ts:5636` (`__gxtSyncDomNow` body — set to
 *         `!!__gxtPendingSyncFromPropertyChange` at start of flush).
 *       - `gxt-backend/compile.ts:5763` (`__gxtSyncDomNow` Phase-1 second-
 *         pass — clear when string-path dynamic-component listeners exist).
 *       - `gxt-backend/compile.ts:6268` (cross-test cleanup — clear at end
 *         of test teardown phase).
 *       - `gxt-backend/manager.ts:579` (helper recompute — set TRUE before
 *         calling `__gxtForceEmberRerender` so the morph runs to let the
 *         formula reading the helper cell re-evaluate).
 *       - `glimmer/lib/renderer.ts:1373` (cross-package — `__gxtForceEmberRerender`
 *         finally-block clear).
 *     Readers (4 sites):
 *       - `gxt-backend/compile.ts:5717` (`__gxtSyncDomNow` body — gate
 *         primary `gxtSyncDom()` call).
 *       - `gxt-backend/compile.ts:5745` (`__gxtSyncDomNow` Phase-1 second-
 *         pass — gate the post-syncAll `gxtSyncDom()` call).
 *       - `glimmer/lib/renderer.ts:989` (cross-package — modifier-replay
 *         gate: `hadPropertyChange = !!__gxtHadPendingSync`; stable
 *         rerenders without set() must NOT trigger modifier updates).
 *       - `glimmer/lib/renderer.ts:1292` (cross-package —
 *         `__gxtForceEmberRerender` start: capture `hadPendingSync` for the
 *         duration of the morph; reset in the finally-block writer at
 *         L1373).
 *    Slice 35 routes intra-`compile.ts` writers/readers through the module-
 *    local `_gxtSetHadPendingSync` / `_gxtGetHadPendingSync` helpers
 *    directly (slice-22/24/27/30/31/32/33/34 intra-file-writer precedent);
 *    cross-file/cross-package writers route through
 *    `compilePipeline.setHadPendingSync(value)`; cross-package readers
 *    route through `compilePipeline.getHadPendingSync?.() ?? false`.
 *    Canonical state moves to module-local `_gxtHadPendingSyncFlag` in
 *    `compile.ts` (alongside the slice-34 survivor flag
 *    `_gxtSyncIsPropertyDrivenFlag`). The `__gxtHadPendingSync` globalThis
 *    slot is DROPPED in this slice — net -1 globalThis surface. Slice 35
 *    is the second slice in the 4-flag pending-sync cluster audit (after
 *    slice 34 retired flag 4); flag 2 closes here because its writers,
 *    while spanning 3 files / 2 packages, are all in well-known sites
 *    (no test-helper, runloop, or routing writers). Flags 1 and 3
 *    (`__gxtPendingSync` / `__gxtPendingSyncFromPropertyChange`) remain
 *    deferred — both have multi-package writer-sets including test-helpers
 *    and routing that require their own dedicated bridge surfaces.
 *
 *    Bridge shape decision: paired get/set (slice-14 paired-methods
 *    pattern) instead of slice-20/22/23/24's read-only predicate or
 *    slice-29's mark+consume because slice 35 has cross-file/cross-package
 *    WRITERS (manager.ts:579 helper-recompute writer + glimmer/lib/renderer.ts:1373
 *    force-rerender-finally writer) in addition to cross-package readers;
 *    both surfaces must be reachable via the bridge. No `with*` save-
 *    restore variant is exposed: the writers are straight-line value
 *    assignments (no save-restore semantics) and they pair across files
 *    (manager.ts:579's TRUE pairs with renderer.ts:1373's FALSE; compile.ts's
 *    body-end writer at L5636 pairs with renderer.ts:1373's FALSE; the
 *    cleanup writer at L6268 stands alone).
 *  - `__gxtPendingSyncFromPropertyChange` — MIGRATED IN SLICE 36 to
 *    `getPendingSyncFromPropertyChange()` + `setPendingSyncFromPropertyChange(value)`
 *    on this namespace (paired get/set bridge surface — slice-14/35
 *    paired-methods pattern, applied to a single boolean flag). Flag 3 of
 *    the 4-flag pending-sync cluster (`__gxtPendingSync` /
 *    `__gxtHadPendingSync` / `__gxtPendingSyncFromPropertyChange` /
 *    `__gxtSyncIsPropertyDriven`); flag 4 closed in slice 34 and flag 2
 *    closed in slice 35. The pre-slice-36 topology was 14 writers and 2
 *    readers spanning 7 files / 4 packages:
 *     Writers (14 sites):
 *       - `gxt-backend/compile.ts:3066` (init slot to false — DROPPED in
 *         slice 36 since the module-local boolean defaults to `false`).
 *       - `gxt-backend/compile.ts:3888` (intra-file —
 *         `__gxtTriggerReRender` body — set TRUE on a real property change
 *         observed by `_notifyPropertiesChanged`).
 *       - `gxt-backend/compile.ts:5685` (intra-file — `__gxtSyncDomNow`
 *         body — clear after capturing into `__gxtHadPendingSync` and
 *         `__gxtSyncIsPropertyDriven`).
 *       - `gxt-backend/compile.ts:6309` (intra-file — cross-test cleanup —
 *         clear at end of test teardown phase).
 *       - `gxt-backend/manager.ts:4330` (cross-file —
 *         `__gxtPostRenderHooks` save-restore around
 *         `didUpdate`/`didRender` — clear before hooks).
 *       - `gxt-backend/manager.ts:4352` (cross-file — restore unchanged
 *         saved value when hooks did NOT produce new changes).
 *       - `gxt-backend/manager.ts:4356` (cross-file — restore-OR'd saved
 *         value when hooks DID produce new changes).
 *       - `gxt-backend/manager.ts:11019` (cross-file — Textarea-like
 *         `wrapHandler` tail finally — clear after user-interaction
 *         handler so the handler's property changes do not survive past
 *         the handler frame).
 *       - `glimmer/lib/templates/root.ts:1075` (cross-package — outlet
 *         model-update rerender — set TRUE before calling
 *         `__gxtSyncDomNow` so the formula re-evaluating the outlet
 *         model picks up the change).
 *       - `routing/router.ts:106` (cross-package — transition LinkTo
 *         path — set TRUE before calling `__gxtSyncDomNow` after dirtying
 *         `currentState` so registered classic reactors flush
 *         synchronously before the next assertion).
 *       - `internal-test-helpers/lib/run.ts:47` (test-helper —
 *         `runAppend` post-run cleanup when no afterRender-scheduled
 *         property change observed).
 *       - `internal-test-helpers/lib/run.ts:62` (test-helper —
 *         `runAppend` tail flush after syncNow).
 *       - `internal-test-helpers/lib/run.ts:139` (test-helper — `runTask`
 *         tail flush after syncNow).
 *       - `internal-test-helpers/lib/test-cases/rendering.ts:141`
 *         (test-helper — `RenderingTestCase.teardown` post-destroy
 *         flush).
 *       - `internal-test-helpers/lib/test-cases/rendering.ts:185`
 *         (test-helper — `render()` post-runAppend flush to prevent the
 *         setInterval fallback from triggering a morph from init-phase
 *         property changes).
 *       - `internal-test-helpers/lib/test-cases/abstract.ts:140`
 *         (test-helper — `AbstractTestCase.teardown` finally-block flush).
 *       - `internal-test-helpers/lib/test-cases/abstract-application.ts:73`
 *         (test-helper — `AbstractApplicationTestCase.teardown`
 *         finally-block flush).
 *     Readers (2 sites, both intra-`compile.ts`):
 *       - `compile.ts:5671` — `__gxtSyncDomNow` body — capture into
 *         `_gxtSetHadPendingSync` (mirrors `__gxtHadPendingSync`).
 *       - `compile.ts:5683` — `__gxtSyncDomNow` body — capture into
 *         `_gxtSetSyncIsPropertyDriven` (survivor mirror across
 *         `__gxtForceEmberRerender`).
 *    Slice 36 routes intra-`compile.ts` writers/readers through the
 *    module-local `_gxtSetPendingSyncFromPropertyChange` /
 *    `_gxtGetPendingSyncFromPropertyChange` helpers directly
 *    (slice-22/24/27/30/31/32/33/34/35 intra-file-writer/reader
 *    precedent); the 4 cross-file `manager.ts` writers, 2 cross-package
 *    writers (templates/root.ts + routing/router.ts), and 7 test-helper
 *    writers (`internal-test-helpers`) route through
 *    `compilePipeline.setPendingSyncFromPropertyChange(value)`. Net -1
 *    globalThis slot. Test-helper bridge-writer pattern established in
 *    this slice for reuse by flag 1 (`__gxtPendingSync`) in slice 37.
 *
 *    Bridge shape decision: paired get/set (slice-14/35 paired-methods
 *    pattern). Slice 36 cannot use slice-20/22/23/24's read-only
 *    predicate or slice-29's mark+consume because slice 36 has cross-
 *    file/cross-package WRITERS across 4 packages (manager.ts +
 *    templates/root.ts + routing/router.ts + internal-test-helpers) in
 *    addition to intra-file readers; both surfaces must be reachable.
 *    No `with*` save-restore variant is exposed: the writers are straight-
 *    line value assignments (the save-restore in manager.ts:4327-4357
 *    operates on TWO flags — `__gxtPendingSync` and
 *    `__gxtPendingSyncFromPropertyChange` — and reads/writes a saved
 *    local; a single-flag `with*` helper would not match its shape).
 *  - `__gxtPendingSync` — MIGRATED IN SLICE 37 to `getPendingSync()` +
 *    `setPendingSync(value)` on this namespace (paired get/set bridge
 *    surface — slice-14/35/36 paired-methods pattern). CLOSES the 4-flag
 *    pending-sync cluster (`__gxtPendingSync` / `__gxtHadPendingSync` /
 *    `__gxtPendingSyncFromPropertyChange` / `__gxtSyncIsPropertyDriven`) —
 *    flag 4 closed in slice 34, flag 2 closed in slice 35, flag 3 closed
 *    in slice 36. Flag 1 is the LARGEST flag in the cluster (master
 *    "DOM sync pending" boolean): set TRUE on any scheduled DOM sync
 *    (cell.update via GXT's external-schedule hook, real property change
 *    observed by `__gxtTriggerReRender`, force-rerender invalidation,
 *    outlet model update, route transition, post-render hook re-entry),
 *    and cleared at well-known boundaries. The pre-slice-37 topology was
 *    15 writers and 6 readers spanning 7 files / 5 packages:
 *     Writers (15 sites, after the init writer at compile.ts:3065
 *     DROPPED in this slice):
 *       - `gxt-backend/compile.ts:3072` (intra-file —
 *         `__gxtExternalSchedule` body — set TRUE on GXT cell-effect
 *         scheduling via `scheduleRevalidate()`).
 *       - `gxt-backend/compile.ts:3950` (intra-file —
 *         `__gxtTriggerReRender` body — set TRUE on a real property
 *         change observed by `_notifyPropertiesChanged`).
 *       - `gxt-backend/compile.ts:5731` (intra-file — `__gxtSyncDomNow`
 *         body — clear after gating the body via the read).
 *       - `gxt-backend/compile.ts:6382` (intra-file — cross-test cleanup
 *         — clear at end of test teardown phase).
 *       - `gxt-backend/manager.ts:4337` (cross-file —
 *         `__gxtPostRenderHooks` save-restore — clear before hooks).
 *       - `gxt-backend/manager.ts:4364` (cross-file — restore unchanged
 *         saved value when hooks did NOT produce new changes).
 *       - `gxt-backend/manager.ts:4368` (cross-file — restore-OR'd saved
 *         value when hooks DID produce new changes).
 *       - `gxt-backend/manager.ts:11032` (cross-file — `wrapHandler` tail
 *         finally — clear after user-interaction handler so the handler's
 *         property changes do not survive past the handler frame).
 *       - `glimmer/lib/renderer.ts:1679` (cross-package — `revalidate`
 *         body in GXT mode — set TRUE on explicit `.rerender()` calls
 *         so the next sync flushes the hooks).
 *       - `glimmer/lib/templates/root.ts:1074` (cross-package — outlet
 *         model-update rerender — set TRUE before calling
 *         `__gxtSyncDomNow`).
 *       - `routing/router.ts:111` (cross-package — transition LinkTo
 *         path — set TRUE before calling `__gxtSyncDomNow`).
 *       - `internal-test-helpers/lib/run.ts:70` (test-helper — `runAppend`
 *         tail flush after syncNow).
 *       - `internal-test-helpers/lib/run.ts:151` (test-helper — `runTask`
 *         tail flush after syncNow).
 *       - `internal-test-helpers/lib/test-cases/abstract-application.ts:81`
 *         (test-helper — `AbstractApplicationTestCase.afterEach` finally-
 *         block flush).
 *       - `internal-test-helpers/lib/test-cases/abstract.ts:148`
 *         (test-helper — `AbstractTestCase.teardown` finally-block flush).
 *       - `internal-test-helpers/lib/test-cases/rendering.ts:149`
 *         (test-helper — `RenderingTestCase.teardown` post-destroy flush).
 *     Readers (6 sites):
 *       - `gxt-backend/compile.ts:5730` (intra-file — `__gxtSyncDomNow`
 *         body — gate primary sync body).
 *       - `gxt-backend/compile.ts:6346` (intra-file — setInterval
 *         16ms fallback gate).
 *       - `gxt-backend/manager.ts:4335` (cross-file — `__gxtPostRenderHooks`
 *         save-read).
 *       - `gxt-backend/manager.ts:4356` (cross-file —
 *         `__gxtPostRenderHooks` produced-changes read).
 *       - `gxt-backend/manager.ts:4368` (cross-file —
 *         `__gxtPostRenderHooks` OR-restore read).
 *       - `glimmer/lib/renderer.ts:1275` (cross-package — `_backburner`
 *         end event — gate the post-end syncDomNow flush).
 *       - `runloop/index.ts:68` (cross-package — runloop `onEnd` hook —
 *         gate the GXT DOM-sync flush at the end of the outermost
 *         runloop).
 *    Slice 37 routes intra-`compile.ts` writers/readers through the
 *    module-local `_gxtSetPendingSync` / `_gxtGetPendingSync` helpers
 *    directly (slice-22/24/27/30/31/32/33/34/35/36 intra-file-writer/
 *    reader precedent); the 4 cross-file `manager.ts` writers + 3
 *    readers, 3 cross-package writers (renderer.ts revalidate +
 *    templates/root.ts outlet + routing/router.ts transition), 5 test-
 *    helper writers (`internal-test-helpers`), and 2 cross-package
 *    readers (glimmer/lib/renderer.ts _backburner end + runloop onEnd
 *    hook) route through `compilePipeline.setPendingSync(value)` /
 *    `compilePipeline.getPendingSync?.() ?? false`. Net -1 globalThis
 *    slot — closes the 4-flag pending-sync cluster.
 *
 *    Test-helper bridge-writer pattern: slice 37 reuses the slice-36
 *    bridge-writer pattern VERBATIM — the 4 test-helper files
 *    (`run.ts` + `test-cases/{rendering, abstract, abstract-application}.ts`)
 *    already imported `getGxtRenderer` in slice 36, so zero new import
 *    edges. The 5 test-helper writers each clear BOTH flags in their
 *    tail-finally blocks (paired with the slice-36 clear of
 *    `__gxtPendingSyncFromPropertyChange`).
 *
 *    Save-restore-on-two-flags pattern: the `__gxtPostRenderHooks` save/
 *    restore at `manager.ts:4327-4357` keeps its inline structure —
 *    slice 37 routes BOTH flag accesses (the slice-36 flag-3 access and
 *    this slice's flag-1 access) through the bridge, but the outer
 *    `savedPending` / `savedPendingPC` locals + the `if
 *    (!hookProducedChanges)` branch + the `else` OR-restore branch stay
 *    inline. Slice-36 empirical finding #2 ("save-restore-on-two-flags
 *    does NOT generalize to a single-flag `with*` helper") still holds:
 *    a single-flag wrap would split the atomic two-flag save into two
 *    independent save/restore frames, changing semantics.
 *
 *    Cross-package import-cycle check: `runloop/index.ts` adds a new
 *    import edge to `gxt-bridge`. The cycle risk: `gxt-backend/
 *    destroyable.ts:26` imports from `@ember/runloop`. However,
 *    `gxt-bridge.ts` is a LEAF module (it imports nothing from
 *    `gxt-backend` internals — only exposes a registry of injected
 *    capabilities). The import graph becomes:
 *      `runloop/index.ts` → `gxt-bridge` (terminal)
 *      `gxt-backend/destroyable.ts` → `@ember/runloop` → `gxt-bridge`
 *        (no cycle; `gxt-bridge` does not transitively import any
 *        `gxt-backend` file).
 *    The cycle does NOT close because `gxt-bridge` does not depend on
 *    runloop (or on any gxt-backend file). Verified safe.
 *
 *    Bridge shape decision: paired get/set (slice-14/35/36 paired-
 *    methods pattern). Slice 37 cannot use slice-20/22/23/24's read-only
 *    predicate because slice 37 has cross-package WRITERS (renderer.ts +
 *    templates/root.ts + router.ts + 5 test-helper writers). Slice 37
 *    cannot use slice-29's mark+consume because the flag has multiple
 *    independent writer paths (cell scheduling, property change, force-
 *    rerender, etc.) that each set independently — no single "consumer"
 *    boundary. No `with*` save-restore variant is exposed (see save-
 *    restore-on-two-flags note above). Closes the 4-flag pending-sync
 *    cluster — net cumulative -4 globalThis slots across slices 34/35/
 *    36/37.
 *  - `__gxtRunTaskActive` — MIGRATED IN SLICE 38 to `getRunTaskActive()` +
 *    `setRunTaskActive(value)` on this namespace (paired get/set bridge
 *    surface — slice-14/35/36/37 paired-methods pattern). Pairs
 *    topologically with slice 37's `__gxtPendingSync`: both flags are read
 *    together in the `getPendingSync?.() && !runTaskActive` gate in
 *    `glimmer/lib/renderer.ts` (`_backburner` end listener) and
 *    `runloop/index.ts` (runloop `onEnd` hook). Slice 38 closes the
 *    "pending-sync gate cluster" alongside slice 37. The flag is set TRUE
 *    during the body of `runTask` / `runAppend` (test-helper writers) to
 *    inform the runloop's `onEnd` and `_backburner`'s end listener that
 *    they should SKIP the post-end `__gxtSyncDomNow` flush — because
 *    `runTask` / `runAppend` perform their own explicit sync after the
 *    user's task completes. Cleared in the `finally` block at the end of
 *    each helper. The pre-slice-38 topology was 4 writers and 2 readers
 *    spanning 3 files / 3 packages:
 *     Writers (4 sites, all test-helper):
 *       - `internal-test-helpers/lib/run.ts:15` (test-helper —
 *         `runAppend` body open — set TRUE before `run(view, 'appendTo')`).
 *       - `internal-test-helpers/lib/run.ts:35` (test-helper —
 *         `runAppend` finally — clear after `appendTo` body completes).
 *       - `internal-test-helpers/lib/run.ts:130` (test-helper —
 *         `runTask` body open — set TRUE before `run(callback)`).
 *       - `internal-test-helpers/lib/run.ts:143` (test-helper —
 *         `runTask` finally — clear after `run(callback)` body completes).
 *     Readers (2 sites, both cross-package — SAME 2 sites as slice 37's
 *     cross-package readers):
 *       - `glimmer/lib/renderer.ts:1282` — `_backburner.on('end', ...)`
 *         listener — paired with the slice-37 `getPendingSync?.()` read
 *         to gate the post-end `__gxtSyncDomNow` flush.
 *       - `runloop/index.ts:84` — runloop `onEnd` hook — paired with the
 *         slice-37 `getPendingSync?.()` read to gate the GXT DOM-sync
 *         flush at the end of the outermost runloop.
 *    Slice 38 routes the 4 test-helper writers through
 *    `compilePipeline.setRunTaskActive(value)` and the 2 cross-package
 *    readers through `compilePipeline.getRunTaskActive?.() ?? false`.
 *    Canonical state moves to module-local `_gxtRunTaskActiveFlag` in
 *    `compile.ts` (alongside the slice-37 `_gxtPendingSyncFlag` and other
 *    pending-sync-cluster flags). The `__gxtRunTaskActive` globalThis
 *    slot is DROPPED in this slice — net -1 globalThis surface.
 *
 *    Bridge shape decision: paired get/set (slice-14/35/36/37 paired-
 *    methods pattern, same as slice 37) because slice 38 has cross-
 *    package WRITERS (test-helper `run.ts`) and cross-package READERS
 *    (`renderer.ts` + `runloop/index.ts`) — both surfaces must be
 *    reachable via the bridge. Slice 38 cannot use slice-20/22/23/24's
 *    read-only predicate because of the cross-package writers, and
 *    cannot use slice-29's mark+consume because the flag is gated by a
 *    try/finally open/close shape (not a one-shot consumer boundary).
 *
 *    ZERO new import edges in slice 38: `run.ts` (slice 36),
 *    `glimmer/lib/renderer.ts` (slice 6), and `runloop/index.ts` (slice
 *    37) all already import `getGxtRenderer`. The test-helper writer-
 *    contract reuses the slice-36/37 bridge-writer pattern verbatim.
 *  - `__gxtPendingModifierDestroys` — MIGRATED IN SLICE 39 to
 *    `getPendingModifierDestroys()` on this namespace. The pre-slice-39
 *    topology was 5 writers (all intra-`gxt-backend/manager.ts` modifier-
 *    install destructor closures — 4 in the cached-hit / first-install /
 *    internal-manager paths and 1 in the custom-modifier-manager destructor
 *    closure, each running the same lazy-init dance `let pd =
 *    g.__gxtPendingModifierDestroys; if (!pd) { pd = []; g.__gxtPendingModifierDestroys
 *    = pd; } pd.push(entry)`) and 4 readers spanning 3 files / 2 packages:
 *     Intra-file reader (1 site):
 *       - `manager.ts:9170` — phantom-element migration path in the custom-
 *         modifier-manager install step inspects the pending-destroys array
 *         to find a same-cycle install+destructor pair and reuses the prior
 *         instance, splicing the matched entry out via `.splice(i, 1)` so
 *         the post-cycle drain doesn't double-destroy. Routes direct
 *         against the module-local `_pendingModifierDestroys` Array
 *         (slice-22/24/27/30/31/32/33 intra-file-reader precedent).
 *     Cross-file reader (1 site):
 *       - `compile.ts:6204` — `__gxtSyncDomNow` Phase-2d drain splices the
 *         whole array (`splice(0)`) and per-entry calls `destroyModifier`
 *         + `destroyDestroyable` for entries whose element has actually
 *         been removed from the DOM. Routes through
 *         `compilePipeline.getPendingModifierDestroys?.()` and mutates the
 *         returned array reference.
 *     Cross-package readers (2 sites, both `internal-test-helpers`):
 *       - `test-cases/abstract.ts:87` — test-teardown drain splices the
 *         whole array (`splice(0)`) and drains for the destroying view.
 *         Routes through `compilePipeline.getPendingModifierDestroys?.()`.
 *       - `test-cases/rendering.ts:136` — QUnit between-test reset clears
 *         the array without draining (`.length = 0`) because the per-
 *         element teardown above already fired. Routes through
 *         `compilePipeline.getPendingModifierDestroys?.()`.
 *    Slice 39 graduates the canonical state to the module-local
 *    `_pendingModifierDestroys` Array in `gxt-backend/manager.ts` (always-
 *    defined at module init). The lazy-init dance at all 5 writer sites is
 *    DROPPED: post-slice-39 writers are direct `_pendingModifierDestroys.push(entry)`
 *    calls. Consumers (drain, migrate, clear) mutate the returned array
 *    reference (`splice(0)`, `splice(i, 1)`, `length = 0`) — same
 *    mutate-by-reference contract as slice-32's `_allPoolArrays` Set
 *    (`add`/`delete`/`clear` on the returned reference) and slice-33's
 *    `_modifierInstallWatchers` Map. Read-only — no writer surface is
 *    exposed; the 5 writers are intra-`manager.ts` only and route direct.
 *
 *    Bridge shape decision: single-method read (`getPendingModifierDestroys?():
 *    unknown[] | undefined`). Matches the slice-32 read-only `Set`-getter
 *    / slice-33 read-only `Map`-getter pattern applied to an `Array`-valued
 *    canonical state — same minimal-method shape used for any opaque-
 *    reference state with N internal writers + M external readers where
 *    the writer's mutation operations don't need to be exposed. The
 *    consumer-side mutation surface (`splice` / `push` / `length=0`) is
 *    a property of the returned array reference, not a bridge contract.
 *    No save-restore variant is exposed (no caller needs to temporarily
 *    swap the queue; the queue is per-process and accumulates across
 *    install/destroy frames until drained at end-of-cycle or teardown).
 *
 *    ZERO new import edges in slice 39: `manager.ts` already exposes the
 *    array directly (intra-file reader is direct); `compile.ts` already
 *    imports `getGxtRenderer` (since slice 6); both test-helper files
 *    (`abstract.ts` slice 36 / `rendering.ts` slice 36) already import
 *    `getGxtRenderer`. The `__gxtPendingModifierDestroys` globalThis slot
 *    is DROPPED in this slice — net -1 globalThis surface. First slice in
 *    Cluster B to expose a read-only `Array`-getter bridge method (slices
 *    19/20/22 are read-only booleans, slice 30 is a read-only integer-
 *    getter, slice 32 is a read-only `Set`-getter, slice 33 is a read-only
 *    `Map`-getter; slice 39 is the `Array`-getter analogue — completes the
 *    read-only-reference-getter family across `Set` / `Map` / `Array`).
 *  - `__gxtAfterRenderPropertyChange` — MIGRATED IN SLICE 40 to
 *    `getAfterRenderPropertyChange()` + `setAfterRenderPropertyChange(value)`
 *    on this namespace (paired get/set bridge surface — slice-14/35/36/37/38
 *    paired-methods pattern). The flag is set TRUE by `_gxtTriggerReRender`
 *    (in `compile.ts:4082`, INSIDE a `schedule('afterRender', cb)` callback
 *    as detected by the still-globalThis `__gxtInAfterRender` flag) to
 *    record that a property change originated from an `afterRender`
 *    callback — the classic `afterRender set` pattern where
 *    `didInsertElement` queues a set that must re-render the DOM before
 *    the test assertion. The flag is consumed by `runAppend` in
 *    `internal-test-helpers/lib/run.ts:49-50` (read-and-clear pair): the
 *    read decides whether to preserve `__gxtPendingSyncFromPropertyChange`
 *    for the subsequent `syncNow()` call (TRUE = `afterRender set` is
 *    legitimate user state and must trigger gxtSyncDom; FALSE = the change
 *    was init-artifact noise from e.g. Textarea's internal bindings and
 *    should not cause a post-runAppend full sync). The pre-slice-40
 *    topology was 1 writer and 1 reader+clearer spanning 2 files / 2
 *    packages:
 *     Writers (1 site, intra-`compile.ts`):
 *       - `compile.ts:4082` — `_gxtTriggerReRender` body, inside the
 *         `if ((globalThis as any).__gxtInAfterRender)` gate — set TRUE
 *         when a property change is observed during an `afterRender`
 *         scheduled callback.
 *     Readers (1 site, cross-package — also acts as the clearer):
 *       - `internal-test-helpers/lib/run.ts:49-50` — `runAppend` post-
 *         `appendTo` block — reads the flag into a local
 *         (`afterRenderChanged`) to gate the
 *         `setPendingSyncFromPropertyChange(false)` reset below, then
 *         clears the flag unconditionally on the same logical step (the
 *         flag is per-`runAppend`-cycle state).
 *    Slice 40 routes the 1 intra-`compile.ts` writer through the module-
 *    local `_gxtSetAfterRenderPropertyChange` helper directly (slice-22/24/
 *    27/30/31/32/33/34/35/36/37/38 intra-file precedent); the 1 cross-
 *    package reader+clearer routes through
 *    `compilePipeline.getAfterRenderPropertyChange?.() ?? false` and
 *    `compilePipeline.setAfterRenderPropertyChange?.(false)`. Canonical
 *    state moves to module-local `_gxtAfterRenderPropertyChangeFlag` in
 *    `compile.ts` (alongside the slice-35 `_gxtHadPendingSyncFlag`, slice-
 *    36 `_gxtPendingSyncFromPropertyChangeFlag`, slice-37
 *    `_gxtPendingSyncFlag`, and slice-38 `_gxtRunTaskActiveFlag`). The
 *    `__gxtAfterRenderPropertyChange` globalThis slot is DROPPED in this
 *    slice — net -1 globalThis surface.
 *
 *    Bridge shape decision: paired get/set (slice-14/35/36/37/38 paired-
 *    methods pattern, same as slice 38) because slice 40 has a cross-
 *    package READER+CLEARER — both `getAfterRenderPropertyChange()` and
 *    `setAfterRenderPropertyChange(false)` surfaces must be reachable from
 *    `run.ts`. The intra-file writer (compile.ts:4082 SET TRUE) routes via
 *    the intra-file helper directly. Slice 40 cannot use slice-20/22/23/24's
 *    read-only predicate because of the cross-package clearer, and cannot
 *    use slice-29's mark+consume because the read-and-clear are
 *    conceptually distinct (read decides flow; clear is unconditional but
 *    a future caller could skip it without breaking the read).
 *
 *    ZERO new import edges in slice 40: `run.ts` (slice 36) already imports
 *    `getGxtRenderer`. The pre-existing import edge is reused — slice 40
 *    extends the `_cpRA` pipeline-cache local pattern (introduced by slice
 *    37 in the same `runAppend` body) with a fresh `_cpAR` cache local for
 *    the get-then-set pair on this flag (pattern reuse from slice 38's
 *    `_cpRL` / `_cpBB` two-flag read-pair caches).
 *  - `__gxtInAfterRender` — MIGRATED IN SLICE 41 to `getInAfterRender()` +
 *    `setInAfterRender(value)` on this namespace (paired get/set bridge
 *    surface — slice-14/35/36/37/38/40 paired-methods pattern). Closes the
 *    2-flag afterRender-detection cluster alongside slice 40 (this slice
 *    is the `open/close` gate around `schedule('afterRender', cb)` user
 *    callbacks; slice 40 is the `property-change-observed-while-open`
 *    detector). The flag is set TRUE for the duration of a
 *    `schedule('afterRender', cb)` wrapped callback body (the
 *    `gxtAfterRenderWrapper` in `@ember/runloop/index.ts:509-525` saves
 *    the previous value, sets the flag TRUE, runs the user callback,
 *    then restores the previous value in a `finally` — the classic
 *    save/set/finally-restore pattern around a nested call). The flag is
 *    read by `_gxtTriggerReRender` (in `compile.ts:4129`) to gate slice
 *    40's `_gxtSetAfterRenderPropertyChange(true)` setter — i.e., to
 *    decide whether a property change originated from inside an
 *    `afterRender` callback (and therefore must be marked as a legitimate
 *    `afterRender set` pattern that must trigger gxtSyncDom). The pre-
 *    slice-41 topology was 3 writers and 1 reader spanning 2 files /
 *    2 packages:
 *     Writers (3 sites, all intra-`@ember/runloop/index.ts`):
 *       - `runloop/index.ts:514` — `gxtAfterRenderWrapper` body —
 *         `const prev = (globalThis as any).__gxtInAfterRender;`
 *         (save the previous value into a local for the finally
 *         restore).
 *       - `runloop/index.ts:515` — `gxtAfterRenderWrapper` body —
 *         `(globalThis as any).__gxtInAfterRender = true;` (open the
 *         gate around the `origFn.apply(this, a)` user callback).
 *       - `runloop/index.ts:519` — `gxtAfterRenderWrapper` finally —
 *         `(globalThis as any).__gxtInAfterRender = prev;` (restore the
 *         previous value, supporting nested `schedule('afterRender', ...)`
 *         frames if any — though no test exercises a nested pattern).
 *     Readers (1 site, intra-`compile.ts`):
 *       - `compile.ts:4129` — `_gxtTriggerReRender` body — gates slice
 *         40's `_gxtSetAfterRenderPropertyChange(true)` setter.
 *    Slice 41 routes the 3 intra-`runloop/index.ts` writers through
 *    `compilePipeline.getInAfterRender?.() ?? false` (save) and
 *    `compilePipeline.setInAfterRender?.(value)` (set + restore); the
 *    1 intra-`compile.ts` reader routes through the module-local
 *    `_gxtGetInAfterRender` helper directly (slice-22/24/27/30/31/32/33/
 *    34/35/36/37/38/40 intra-file precedent). Canonical state moves to
 *    module-local `_gxtInAfterRenderFlag` in `compile.ts` (alongside
 *    slice 40's `_gxtAfterRenderPropertyChangeFlag`, co-locating the
 *    2-flag afterRender-detection cluster per the slice 40 Finding #4
 *    family rule). The `__gxtInAfterRender` globalThis slot is DROPPED
 *    in this slice — net -1 globalThis surface.
 *
 *    Bridge shape decision: paired get/set (slice-14/35/36/37/38/40 paired-
 *    methods pattern, same as slice 40) because slice 41 has a cross-
 *    package WRITER triplet (`runloop/index.ts` save/set/restore) that
 *    needs both `getInAfterRender()` (for the save read) and
 *    `setInAfterRender()` (for the set TRUE and the finally restore)
 *    surfaces reachable from `runloop/index.ts`. The intra-file reader
 *    (compile.ts:4129) routes via the intra-file helper directly. Slice
 *    41 cannot use slice-20/22/23/24's read-only predicate because of
 *    the cross-package writer triplet, and cannot use slice-29's mark+
 *    consume because the save/set/restore pattern needs to read the
 *    previous value (save = read, set = write TRUE, restore = write
 *    previous) — three distinct sites with three distinct boolean
 *    values (the saved `prev` may be TRUE if a nested
 *    `schedule('afterRender', ...)` frame is in flight, FALSE
 *    otherwise).
 *
 *    ZERO new import edges in slice 41: `runloop/index.ts` (slice 37)
 *    already imports `getGxtRenderer`. The pre-existing import edge is
 *    reused — slice 41 introduces a fresh `_cpIAR` pipeline-cache local
 *    (slice-37's `_cpRA` pattern + slice-38's `_cpRL` / `_cpBB` two-flag
 *    pattern + slice-40's `_cpAR` single-flag get-then-set pattern) that
 *    caches the pipeline once for the three calls (save read + set TRUE
 *    + finally restore) on the same logical afterRender wrapper
 *    invocation.
 *  - `__gxtMutContext` — MIGRATED IN SLICE 42 to `getMutContext()` +
 *    `setMutContext(value)` on this namespace (paired get/set bridge
 *    surface — slice-14/35/36/37/38/40/41 paired-methods pattern). The
 *    value is the component render context (the `this` value of the
 *    template that invoked `(mut ...)` or `(__mutGet ...)`) at the
 *    moment the `$_maybeHelper` wrapper dispatches to the corresponding
 *    `__EMBER_BUILTIN_HELPERS__` entry. It is captured at helper-creation
 *    time inside the helpers' arrow-function bodies (in `compile.ts`'s
 *    `__EMBER_BUILTIN_HELPERS__.mut` / `__mutGet`) so the closure
 *    produced by those helpers can later resolve the source getter for
 *    two-way binding without re-threading the context through every
 *    `mut` argument. The pre-slice-42 topology was 6 writers and 2
 *    readers spanning 2 files / 1 package:
 *     Writers (6 sites, all intra-`ember-gxt-wrappers.ts`, two save/
 *     set/finally-restore triplets around `helper(...)` invocations
 *     for the `mut` and `__mutGet` keyword helpers):
 *       - `ember-gxt-wrappers.ts:530-536` — `__mutGet` branch
 *         save/set/finally-restore triplet around `helper(args[0],
 *         args[1])`.
 *       - `ember-gxt-wrappers.ts:592-599` — `mut` branch save/set/
 *         finally-restore triplet around `helper(unwrappedValue,
 *         pathArg)`.
 *     Readers (2 sites, both intra-`compile.ts`):
 *       - `compile.ts:6906` — `__EMBER_BUILTIN_HELPERS__.mut` helper
 *         body — captures `capturedCtx` for the returned `mutCell`
 *         closure's two-way-binding lookup.
 *       - `compile.ts:7209` — `__EMBER_BUILTIN_HELPERS__.__mutGet`
 *         helper body — same capture-at-helper-creation usage for the
 *         `(mut (get obj key))` two-way binding.
 *    Slice 42 routes the 6 intra-`ember-gxt-wrappers.ts` writers
 *    through the module-local `_gxtGetMutContext` / `_gxtSetMutContext`
 *    helpers directly (slice-22/24/27/30/31/32/33/34/35/36/37/38/40/41
 *    intra-file precedent); the 2 cross-package readers in compile.ts
 *    route through `compilePipeline.getMutContext?.()`. Canonical state
 *    moves to module-local `_gxtMutContext` in `ember-gxt-wrappers.ts`.
 *    The `__gxtMutContext` globalThis slot is DROPPED in this slice —
 *    net -1 globalThis surface.
 *
 *    State-home decision: `ember-gxt-wrappers.ts` (writer-home rule —
 *    6 writers vs 2 readers, all 6 writers intra-file, the writers run
 *    in the helper-invocation hot path). Distinct from slice 41 (which
 *    placed state in `compile.ts` despite having cross-package writers
 *    because of the slice 40 Finding #4 family rule binding the 2-flag
 *    afterRender-detection cluster) — slice 42's `__gxtMutContext` is
 *    an `unknown`-typed context value, not a boolean flag, and is NOT
 *    part of any cluster. First Cluster B slice with state home in
 *    `ember-gxt-wrappers.ts` (prior slices have placed state in
 *    `compile.ts`, `manager.ts`, `ember-template-compiler.ts`, and
 *    other in-package files; never previously in ember-gxt-wrappers).
 *
 *    Bridge shape decision: paired get/set (slice-14/35/36/37/38/40/41
 *    paired-methods pattern, same as slice 41) because slice 42 has
 *    cross-package READERS (`compile.ts`) that need `getMutContext()`
 *    reachable from compile.ts; `setMutContext()` is exposed for
 *    symmetry/future cross-package writers (none exist today, but the
 *    symmetric API is preserved for the paired-methods consistency).
 *    The 6 intra-file writers route via the module-local helpers
 *    directly. Slice 42 cannot use slice-20/22/23/24's read-only
 *    predicate because of the cross-package reader-from-non-state-home
 *    (the readers DO need to read the writer's value mid-frame, but
 *    the get-only shape is acceptable on the reader side — the setter
 *    is exposed for future symmetry only). Slice 42 cannot use
 *    slice-29's mark+consume because the save/set/finally-restore
 *    pattern needs the previous value preserved across the restore
 *    step (save = read previous, set = write new, restore = write
 *    previous) — three distinct sites with three distinct context
 *    values per logical helper invocation.
 *
 *    ZERO new import edges in slice 42: `ember-gxt-wrappers.ts`
 *    already imports `getGxtRenderer` (slice-pilot); the existing
 *    import edge is EXTENDED with `installCompilePipelinePart` from
 *    the same module (no new `from './gxt-bridge'` statement, just
 *    an additional named binding on the existing import). `compile.ts`
 *    already imports `getGxtRenderer` (slice 25+). The 2 intra-
 *    compile.ts readers re-use `getGxtRenderer()` directly without a
 *    pipeline-cache local — each helper body runs once per template
 *    render and only has a single bridge call, so the
 *    slice-37/38/40/41 `_cp*` pipeline-cache pattern is not needed.
 *  - `__gxtLastArgSourceKey` / `__gxtLastArgSourceCtx` — MIGRATED IN
 *    SLICE 43 to module-local `_lastArgSourceKey` / `_lastArgSourceCtx`
 *    in `manager.ts` (slice-31 zero-bridge intra-file precedent). The
 *    two slots are the writeback channel of the two-way binding
 *    "arg source" detection pass: the renderContext proxy `get` trap
 *    (manager.ts L6770+) records the (prop, target) pair when the
 *    `__gxtTrackArgSource` flag is set, and the consumer in
 *    `_installPropertyDidChangeOverride`'s probe block (manager.ts
 *    L2018+) reads them back immediately after invoking the arg getter
 *    to discover which (parent, key) pair the getter resolved to. The
 *    pre-slice-43 topology was 6 sites all intra-`manager.ts`:
 *      Writers (2 sites, in the proxy `get` trap):
 *        - `manager.ts:6786` — `g.__gxtLastArgSourceKey = prop`
 *        - `manager.ts:6787` — `g.__gxtLastArgSourceCtx = target`
 *      Readers + clearers (4 sites, in the probe block):
 *        - `manager.ts:2020` — `g.__gxtLastArgSourceKey = null` (pre-
 *          probe clear)
 *        - `manager.ts:2021` — `g.__gxtLastArgSourceCtx = null` (pre-
 *          probe clear)
 *        - `manager.ts:2023` — `const detectedKey =
 *          g.__gxtLastArgSourceKey` (post-probe read)
 *        - `manager.ts:2024` — `const detectedCtx =
 *          g.__gxtLastArgSourceCtx` (post-probe read)
 *    Slice 43 graduates the canonical state to module-local
 *    `_lastArgSourceKey: any` / `_lastArgSourceCtx: any` in `manager.ts`
 *    (initialized to `null`). All 6 sites migrate to direct module-
 *    local accesses; no bridge surface is added (zero cross-file
 *    consumers — confirmed by exhaustive grep across `packages/`). Net
 *    globalThis surface delta: -2 slots. Both `__gxtLastArgSourceKey`
 *    and `__gxtLastArgSourceCtx` globalThis slots are DROPPED in this
 *    slice.
 *
 *    State-home decision: `manager.ts` (canonical-home rule — all
 *    writers and readers live in `manager.ts`, no cross-file consumers,
 *    proxy `get` trap is hot so intra-file direct-variable access is
 *    preferred for perf).
 *
 *    Bridge shape decision: ZERO-bridge intra-file (slice-31 precedent
 *    — pure intra-file reader+writer cluster). Slice 43 cannot benefit
 *    from any bridge shape (predicate, get-only, paired get/set, paired
 *    methods) because there are zero cross-file consumers. This is the
 *    leanest possible shape: module-local `let` with truthy-null
 *    sentinel semantics.
 *
 *    ZERO new import edges in slice 43: the two consumers are already
 *    in `manager.ts`; no `getGxtRenderer` calls, no
 *    `installCompilePipelinePart` calls, no `from './gxt-bridge'`
 *    statements added.
 *
 *    The companion `__gxtTrackArgSource` flag (the boolean gate that
 *    arms the proxy trap before the probe getter call) remained on
 *    `globalThis` post-slice-43 and WAS LATER MIGRATED IN SLICE 44 —
 *    see the slice 44 entry below. Slice 43 limited scope to the
 *    paired writeback channel to preserve the per-slice "one logical
 *    unit" rule; slice 44 completed the triad as a follow-up zero-
 *    bridge intra-file slice.
 *  - `__gxtTrackArgSource` — MIGRATED IN SLICE 44 to module-local
 *    `_gxtTrackArgSource: boolean` in `manager.ts` (slice-31/43 zero-
 *    bridge intra-file precedent). Closes the arg-source-detection
 *    triad started by slice 43: pre-slice-44 the triad was 1
 *    globalThis slot (`__gxtTrackArgSource`) + 2 module-locals
 *    (`_lastArgSourceKey` / `_lastArgSourceCtx`); post-slice-44 all
 *    three slots are module-local. The flag is a transient boolean
 *    gate armed by the probe in `_installPropertyDidChangeOverride`
 *    (manager.ts L2018+) before invoking each component arg getter,
 *    and read by the renderContext proxy `get` trap (manager.ts
 *    L6826+) to decide whether to record the (prop, target) pair
 *    into the slice-43 `_lastArgSourceKey` / `_lastArgSourceCtx`
 *    slots. The pre-slice-44 topology was 4 active sites all
 *    intra-`manager.ts`:
 *      Writers (3 sites, in the probe block):
 *        - `manager.ts:2019` — `g.__gxtTrackArgSource = true` (probe-
 *          arm, immediately before clearing the slice-43 slots and
 *          invoking the arg getter)
 *        - `manager.ts:2032` — `g.__gxtTrackArgSource = false`
 *          (success-path probe-disarm, after reading back the slice-43
 *          slots)
 *        - `manager.ts:2037` — `g.__gxtTrackArgSource = false`
 *          (catch-path probe-disarm, defensive cleanup if the getter
 *          throws)
 *      Readers (1 site, in the proxy `get` trap):
 *        - `manager.ts:6833` — `if (typeof prop === 'string' &&
 *          g.__gxtTrackArgSource) { ... }` (gate-read; fires on every
 *          proxy property read but the gate is only truthy during the
 *          probe)
 *    Slice 44 graduates the canonical state to module-local
 *    `_gxtTrackArgSource: boolean` in `manager.ts` (initialized to
 *    `false`). All 4 active sites migrate to direct module-local
 *    accesses; no bridge surface is added (zero cross-file consumers
 *    — confirmed by exhaustive grep across `packages/`). Net
 *    globalThis surface delta: -1 slot. The `__gxtTrackArgSource`
 *    globalThis slot is DROPPED in this slice.
 *
 *    State-home decision: `manager.ts` (canonical-home rule — all
 *    writers and the sole reader live in `manager.ts`, no cross-file
 *    consumers, proxy `get` trap is hot so intra-file direct-variable
 *    access is preferred for perf).
 *
 *    Bridge shape decision: ZERO-bridge intra-file (slice-31/43
 *    precedent — pure intra-file reader+writer cluster). Slice 44
 *    cannot benefit from any bridge shape (predicate, get-only,
 *    paired get/set, paired methods) because there are zero cross-
 *    file consumers. This is the leanest possible shape: module-
 *    local `let` boolean with `false`-initial / armed `true` /
 *    disarmed `false` lifecycle.
 *
 *    ZERO new import edges in slice 44: the four consumers are
 *    already in `manager.ts`; no `getGxtRenderer` calls, no
 *    `installCompilePipelinePart` calls, no `from './gxt-bridge'`
 *    statements added. Slice 44 — like slice 43 — is a pure zero-
 *    bridge intra-file migration; only a module-local `let`
 *    declaration and 4 inline accessor migrations.
 *
 *    Bridge interface evolution (slice 44 — no API change): the
 *    bridge interface `GxtCompilePipelineCapabilities` is NOT extended
 *    in this slice (zero-bridge intra-file). The migration-history
 *    docblock IS extended with the full slice-44 entry for
 *    documentation. This is the second consecutive Cluster B slice
 *    (after slice 43) to ship without a new bridge method, completing
 *    the arg-source-detection triad fully under the canonical-home
 *    rule.
 *  - `__gxtForceRerenderInProgress` — MIGRATED IN SLICE 45 to
 *    module-local `_gxtForceRerenderInProgress: boolean` in
 *    `packages/@ember/-internals/glimmer/lib/renderer.ts` (slice-31/43/44
 *    zero-bridge intra-file precedent). This is the FIRST Cluster B
 *    slice with the state-home in `renderer.ts` (prior Cluster B
 *    zero-bridge slices home-d state in `manager.ts` (slice 31, 43,
 *    44) or `compile.ts` (slice 35, 40)). The flag is a classic
 *    re-entrancy guard for `__gxtForceEmberRerender` (the function
 *    `__gxtSyncDomNow` invokes to force-rerender GXT roots when
 *    Ember's `set()` / `notifyPropertyChange` misses cell tracking).
 *    The mechanism: set to `true` on entry, checked on every entry,
 *    early-return-if-already-true, reset to `false` in the `finally`
 *    block — prevents infinite loops when morphing triggers cell
 *    updates that schedule additional force-rerenders.
 *
 *    Pre-slice-45 topology was 3 active sites all intra-
 *    `renderer.ts`, all inside the `__gxtForceEmberRerender`
 *    function body:
 *      Readers (1 site, with early-return on truthy):
 *        - `renderer.ts:1310` —
 *          `if ((globalThis as any).__gxtForceRerenderInProgress) return;`
 *          (entry-guard; the re-entrancy check that aborts a nested
 *          call while the outer call is mid-flight)
 *      Writers (2 sites, paired arm/disarm around the render loop):
 *        - `renderer.ts:1311` —
 *          `(globalThis as any).__gxtForceRerenderInProgress = true;`
 *          (entry-arm, immediately after the entry-guard passes;
 *          arms the flag for the duration of the render loop)
 *        - `renderer.ts:1400` —
 *          `(globalThis as any).__gxtForceRerenderInProgress = false;`
 *          (finally-disarm; resets the flag whether the render loop
 *          completes normally or throws — guaranteeing the guard is
 *          released even on exception)
 *
 *    Slice 45 graduates the canonical state to module-local
 *    `_gxtForceRerenderInProgress: boolean` in `renderer.ts`
 *    (initialized to `false`). All 3 active sites migrate to direct
 *    module-local accesses; no bridge surface is added (zero cross-
 *    file consumers — confirmed by exhaustive grep across `packages/`).
 *    Net globalThis surface delta: -1 slot. The
 *    `__gxtForceRerenderInProgress` globalThis slot is DROPPED in this
 *    slice from the source code (the only remaining references are
 *    defensive resets in `packages/demo/tests.html` testStart /
 *    testDone hooks, which now write to an orphaned globalThis
 *    property no source consumer reads — harmless no-ops, preserved
 *    for HTML-fixture stability).
 *
 *    State-home decision: `renderer.ts` (canonical-home rule — all
 *    writers and the sole reader live in `renderer.ts`, no cross-file
 *    consumers; the function `__gxtForceEmberRerender` itself is
 *    defined in this file as a globalThis assignment at L1307+ and
 *    has no callers in source — it's invoked from globalThis by
 *    `__gxtSyncDomNow`). This is the first Cluster B zero-bridge slice
 *    with state homed in `renderer.ts` (the canonical home for
 *    re-entrancy guards inside `__gxtForceEmberRerender` and similar
 *    classic-renderer hot paths).
 *
 *    Bridge shape decision: ZERO-bridge intra-file (slice-31/43/44
 *    precedent — pure intra-file reader+writer cluster). Slice 45
 *    cannot benefit from any bridge shape (predicate, get-only,
 *    paired get/set, paired methods) because there are zero cross-
 *    file consumers. This is the leanest possible shape: module-
 *    local `let` boolean with `false`-initial / armed `true` on
 *    entry / disarmed `false` in `finally` lifecycle. The
 *    re-entrancy semantics are unchanged.
 *
 *    ZERO new import edges in slice 45: the three consumers are
 *    already in `renderer.ts`; no `getGxtRenderer` calls (renderer.ts
 *    already imports `getGxtRenderer` for the slice-35 hadPendingSync
 *    bridge use at L1320 / L1406), no `installCompilePipelinePart`
 *    calls, no new bridge-import statements added. Slice 45 — like
 *    slice 43 and 44 — is a pure zero-bridge intra-file migration:
 *    only a module-local `let` declaration and 3 inline accessor
 *    migrations.
 *
 *    Bridge interface evolution (slice 45 — no API change): the
 *    bridge interface `GxtCompilePipelineCapabilities` is NOT extended
 *    in this slice (zero-bridge intra-file). The migration-history
 *    docblock IS extended with the full slice-45 entry for
 *    documentation. This is the third consecutive Cluster B slice
 *    (after slice 43, 44) to ship without a new bridge method, and
 *    the first to home state in `renderer.ts`.
 *
 *    Hot-path concern: `__gxtForceEmberRerender` is invoked by
 *    `__gxtSyncDomNow` after every cell-tracking-miss force-rerender
 *    cycle (warm path during interactive updates). Pre-slice-45 cost
 *    per entry was 2 globalThis property accesses (1 read on the
 *    early-return guard, 1 write on the entry-arm) + 1 globalThis
 *    write in `finally`. Post-slice-45 it's 1 module-local read +
 *    1 module-local write + 1 module-local write — all directly
 *    inlineable by V8. The savings on entry-guard fast-path
 *    (re-entrant nested call) are non-negligible because the early-
 *    return is hit on every nested call from morph-triggered cell
 *    updates.
 *  - `__gxtDirtyRootsAtSync` — MIGRATED IN SLICE 46 to module-local
 *    `_gxtDirtyRootsAtSync: any[] | undefined` in
 *    `packages/@ember/-internals/glimmer/lib/renderer.ts` (slice-31/43/44/45
 *    zero-bridge intra-file precedent). This is the SECOND Cluster B
 *    slice (after slice 45) with the state-home in `renderer.ts`, and
 *    is paired state with slice-45's `_gxtForceRerenderInProgress`
 *    (both are part of the `__gxtForceEmberRerender` cycle state). The
 *    slot's purpose: `_gxtUpdateRootTagValues` (Phase 1b of
 *    `__gxtSyncDomNow`, post-slice-9 `installRootComponentPart.updateRootTagValues`)
 *    records which roots WERE dirty (their `gxtLastTagValue` differs
 *    from the current tag value) into the slot, so
 *    `__gxtForceEmberRerender` (Phase 1c) can scope its rerender to
 *    just those roots — avoiding a full-tree force-render when only
 *    some components mutated. The slot's lifetime spans one
 *    `__gxtSyncDomNow` cycle: written by Phase 1b
 *    (`_gxtUpdateRootTagValues` populates with the dirtyRoots array),
 *    read by Phase 1c (`__gxtForceEmberRerender`'s `dirtyRootsFromSync`
 *    read at the top of the function body), cleared to `undefined` in
 *    Phase 1c's `finally` block.
 *
 *    Pre-slice-46 topology was 3 active sites all intra-
 *    `renderer.ts`:
 *      Readers (1 site):
 *        - `renderer.ts:1344` —
 *          `const dirtyRootsFromSync = (globalThis as any).__gxtDirtyRootsAtSync as any[] | undefined;`
 *          (Phase 1c consume; assigns to a local for scoped-rerender
 *          iteration further down in `__gxtForceEmberRerender`)
 *      Writers (2 sites, paired populate/clear):
 *        - `renderer.ts:1486` —
 *          `(globalThis as any).__gxtDirtyRootsAtSync = dirtyRoots;`
 *          (Phase 1b populate, end of `_gxtUpdateRootTagValues` body;
 *          stashes the per-cycle dirty-roots list)
 *        - `renderer.ts:1430` —
 *          `(globalThis as any).__gxtDirtyRootsAtSync = undefined;`
 *          (Phase 1c clear, inside `__gxtForceEmberRerender`'s
 *          `finally`; resets the slot whether the render loop completes
 *          normally or throws)
 *
 *    Slice 46 graduates the canonical state to module-local
 *    `_gxtDirtyRootsAtSync: any[] | undefined` in `renderer.ts`
 *    (initialized to `undefined` implicitly). All 3 active sites
 *    migrate to direct module-local accesses; no bridge surface is
 *    added (zero cross-file consumers — confirmed by exhaustive grep
 *    across `packages/`). Net globalThis surface delta: -1 slot. The
 *    `__gxtDirtyRootsAtSync` globalThis slot is DROPPED in this slice
 *    from the source code.
 *
 *    State-home decision: `renderer.ts` (canonical-home rule — all
 *    writers and the sole reader live in `renderer.ts`, no cross-file
 *    consumers). The module-local `let` is placed adjacent to
 *    slice-45's `_gxtForceRerenderInProgress` because the two slots
 *    form paired cycle state for the `__gxtForceEmberRerender` sync
 *    cycle: the re-entrancy guard (slice 45) and the scoped-rerender
 *    targets list (slice 46) together encapsulate the per-cycle
 *    `__gxtForceEmberRerender` ephemeral state.
 *
 *    Bridge shape decision: ZERO-bridge intra-file (slice-31/43/44/45
 *    precedent — pure intra-file reader+writer cluster). Slice 46
 *    cannot benefit from any bridge shape because there are zero
 *    cross-file consumers. The leanest possible shape: module-local
 *    `let any[] | undefined` with `undefined`-initial / populated in
 *    Phase 1b / cleared back to `undefined` in Phase 1c `finally`.
 *    The scoped-rerender semantics are unchanged.
 *
 *    ZERO new import edges in slice 46: the three consumers are
 *    already in `renderer.ts`; no `getGxtRenderer` calls, no
 *    `installCompilePipelinePart` calls, no new bridge-import
 *    statements added. Slice 46 — like slice 43, 44, and 45 — is a
 *    pure zero-bridge intra-file migration: only a module-local `let`
 *    declaration and 3 inline accessor migrations.
 *
 *    Bridge interface evolution (slice 46 — no API change): the
 *    bridge interface `GxtCompilePipelineCapabilities` is NOT extended
 *    in this slice (zero-bridge intra-file). The `updateRootTagValues`
 *    docblock IS updated to point at the new module-local stash
 *    instead of the pre-slice-46 globalThis slot. The migration-
 *    history docblock IS extended with the full slice-46 entry for
 *    documentation. This is the fourth consecutive Cluster B slice
 *    (after slice 43, 44, 45) to ship without a new bridge method,
 *    and the second consecutive (after slice 45) to home state in
 *    `renderer.ts`.
 *
 *    Hot-path concern: `_gxtUpdateRootTagValues` and
 *    `__gxtForceEmberRerender` are both invoked by `__gxtSyncDomNow`
 *    on the warm interactive-update path. Pre-slice-46 cost per
 *    cycle was 3 globalThis property accesses (1 read + 2 writes).
 *    Post-slice-46 it's 3 module-local accesses — all directly
 *    inlineable by V8. The dirty-roots-array allocation is
 *    unchanged.
 *  - `__gxtRenderDepth` — MIGRATED IN SLICE 47 to module-local
 *    `_gxtRenderDepth: number` in
 *    `packages/@ember/-internals/glimmer/lib/renderer.ts` (slice-31/43/44/45/46
 *    zero-bridge intra-file precedent). This is the THIRD consecutive
 *    Cluster B slice (after slice 45 and slice 46) with the state-home
 *    in `renderer.ts`, forming a 3-slot module-local cluster of
 *    renderer-cycle state (`_gxtForceRerenderInProgress`,
 *    `_gxtDirtyRootsAtSync`, `_gxtRenderDepth`). The slot's purpose:
 *    classic render-depth re-entrancy counter for
 *    `ClassicRootState.render` (the `errorLoopTransaction`-wrapped
 *    initial render body). Guards against infinite render-depth loops
 *    (e.g., engine-mounting loops, runaway re-renders). If depth >
 *    20, the render is skipped with `console.warn`. Incremented on
 *    every render-entry; the `finally` writer restores the captured
 *    pre-entry depth (NOT a reset-to-0) so the counter unwinds cleanly
 *    across nested renders.
 *
 *    Pre-slice-47 topology was 3 active sites all intra-`renderer.ts`,
 *    all inside the single `ClassicRootState` constructor's render
 *    body wrapped by `errorLoopTransaction`:
 *      Readers (1 site):
 *        - `renderer.ts:510` —
 *          `const depth = (globalThis as any).__gxtRenderDepth || 0;`
 *          (top of render body; captures the pre-entry depth into a
 *          local for the `finally` to restore)
 *      Writers (2 sites, paired increment/restore around the cycle):
 *        - `renderer.ts:515` —
 *          `(globalThis as any).__gxtRenderDepth = depth + 1;`
 *          (entry-arm; bumps the counter past the L511 max-depth
 *          check, before the render body runs)
 *        - `renderer.ts:1137` —
 *          `(globalThis as any).__gxtRenderDepth = depth;`
 *          (`finally` block of the same render body; restores the
 *          captured pre-entry depth — NOT a reset-to-0)
 *
 *    Slice 47 graduates the canonical state to module-local
 *    `_gxtRenderDepth = 0` in `renderer.ts` (initialized to `0`). All
 *    3 active sites migrate to direct module-local accesses; no
 *    bridge surface is added (zero cross-file consumers — confirmed
 *    by exhaustive grep across `packages/`). The only non-source
 *    reference remaining is the comment-only mention at L3614 of this
 *    file ("state-flag inventory" docblock example). Net globalThis
 *    surface delta: -1 slot. The `__gxtRenderDepth` globalThis slot
 *    is DROPPED in this slice from the source code.
 *
 *    State-home decision: `renderer.ts` (canonical-home rule — all
 *    writers and the sole reader live in `renderer.ts`, no cross-
 *    file consumers). The module-local `let` is placed adjacent to
 *    slice-45's `_gxtForceRerenderInProgress` and slice-46's
 *    `_gxtDirtyRootsAtSync`, forming a 3-slot module-local cluster
 *    of renderer-cycle state. Third consecutive Cluster B slice with
 *    the state-home in `renderer.ts`.
 *
 *    Bridge shape decision: ZERO-bridge intra-file (slice-31/43/44/45/46
 *    precedent — pure intra-file reader+writer cluster). Slice 47
 *    cannot benefit from any bridge shape because there are zero
 *    cross-file consumers. The leanest possible shape: module-local
 *    `let number` with `0`-initial / incremented on entry-arm /
 *    restored to captured pre-entry depth in the `finally`. The
 *    re-entrancy-guard and nested-render semantics are unchanged.
 *
 *    ZERO new import edges in slice 47: the three consumers are
 *    already in `renderer.ts`; no `getGxtRenderer` calls, no
 *    `installCompilePipelinePart` calls, no new bridge-import
 *    statements added. Slice 47 — like slice 43, 44, 45, and 46 — is
 *    a pure zero-bridge intra-file migration: only a module-local
 *    `let` declaration and 3 inline accessor migrations.
 *
 *    Bridge interface evolution (slice 47 — no API change): the
 *    bridge interface `GxtCompilePipelineCapabilities` is NOT extended
 *    in this slice (zero-bridge intra-file). The migration-history
 *    docblock IS extended with the full slice-47 entry for
 *    documentation. This is the fifth consecutive Cluster B slice
 *    (after slice 43, 44, 45, 46) to ship without a new bridge method,
 *    and the third consecutive (after slice 45, 46) to home state in
 *    `renderer.ts`.
 *
 *    Hot-path concern: `ClassicRootState.render` is the per-root
 *    render entry point invoked on every renderRoots cycle. Pre-
 *    slice-47 cost per render was 3 globalThis property accesses (1
 *    read + 2 writes). Post-slice-47 it's 3 module-local accesses —
 *    all directly inlineable by V8. The L511 max-depth check (`depth
 *    > 20`) is unchanged.
 *
 *  - `__gxtNestedTrackingProxies` — MIGRATED IN SLICE 48 to direct
 *    access of the pre-existing module-local const in
 *    `packages/@ember/-internals/gxt-backend/manager.ts`. This is the
 *    simplest possible Cluster B slice — the canonical state already
 *    existed as a module-local const since the original
 *    `wrapNestedObjectForTracking` implementation; slice 48 just
 *    retires the globalThis projection and redirects the one reader
 *    to direct const access.
 *
 *    Pre-slice-48 topology (confirmed audit — exactly 2 sites,
 *    BOTH in `manager.ts`):
 *
 *      Canonical state (already module-local pre-slice-48):
 *        - `manager.ts:5632` —
 *          `const _nestedTrackingProxies = new WeakMap<object, any>();`
 *          (pre-existing — added with the original
 *          `wrapNestedObjectForTracking` impl)
 *
 *      Writer (1 site — the ONLY writer was the globalThis projection):
 *        - `manager.ts:5633` —
 *          `(globalThis as any).__gxtNestedTrackingProxies = _nestedTrackingProxies;`
 *          (module-init projection right after the const — purely a
 *          globalThis-side mirror so the cross-context reader could
 *          see the same WeakMap)
 *
 *      Reader (1 site):
 *        - `manager.ts:3104` —
 *          `const proxyMap = (globalThis as any).__gxtNestedTrackingProxies;`
 *          (raw→proxy lookup fallback in the template-rendered
 *          backtracking check; reads the WeakMap to discover whether
 *          a raw target object has a registered tracking proxy)
 *
 *    The mechanism's semantics: WeakMap cache of raw-object →
 *    tracking-proxy wrapper used by `wrapNestedObjectForTracking`. The
 *    L3104 reader path looks up whether a raw target object has a
 *    registered proxy in the cache; used during the backtracking guard
 *    ("instance's template already rendered this pass"). After
 *    slice 48, the reader uses the const directly; behavior unchanged.
 *
 *    All 2 active sites are intra-`manager.ts` (confirmed by
 *    exhaustive grep across `packages/`). Zero cross-file consumers.
 *    Zero cross-package consumers. The pre-existing const declaration
 *    means no NEW declaration is needed in slice 48 — the leanest
 *    possible Cluster B slice (-1 LOC net source delta, no new
 *    `let`/`const` introduced).
 *
 *    Sites moved (slice 48):
 *      - packages/@ember/-internals/gxt-backend/manager.ts: drop the
 *        L5633 globalThis projection write; redirect the L3104 reader
 *        from `(globalThis as any).__gxtNestedTrackingProxies` to
 *        direct `_nestedTrackingProxies` const access (the L3105
 *        `proxyMap?.get?.(targetObj)` is folded into the single
 *        expression `_nestedTrackingProxies.get(targetObj)` since the
 *        const is guaranteed initialized at first read).
 *      - packages/@ember/-internals/gxt-backend/gxt-bridge.ts: append
 *        this slice-48 entry. NO new bridge methods (zero-bridge).
 *
 *    State-home decision: `manager.ts` (canonical-home rule — both
 *    sites intra-file; canonical const already existed in
 *    `manager.ts`). Breaks the renderer.ts streak (slice 45/46/47) and
 *    resumes the manager.ts state-home pattern (slice 31/43/44).
 *
 *    Bridge shape decision: ZERO-bridge intra-file (slice-31/43/44/
 *    45/46/47 precedent — pure intra-file reader+writer cluster).
 *    Slice 48 cannot benefit from any bridge shape because there are
 *    zero cross-file consumers. The leanest possible shape: direct
 *    access to the pre-existing module-local const. WeakMap-cache
 *    semantics unchanged.
 *
 *    ZERO new import edges in slice 48: both consumers are already in
 *    `manager.ts`; no `getGxtRenderer` calls, no
 *    `installCompilePipelinePart` calls, no new bridge-import
 *    statements added. Slice 48 — like slice 43, 44, 45, 46, and 47 —
 *    is a pure zero-bridge intra-file migration: only one source line
 *    deletion (L5633 projection) plus a one-line reader-redirect.
 *
 *    Bridge interface evolution (slice 48 — no API change): the
 *    bridge interface `GxtCompilePipelineCapabilities` is NOT extended
 *    in this slice (zero-bridge intra-file). The migration-history
 *    docblock IS extended with the full slice-48 entry. This is the
 *    sixth consecutive Cluster B slice (after slice 43, 44, 45, 46,
 *    47) to ship without a new bridge method.
 *
 *    Hot-path concern: the L3104 reader runs inside the template-
 *    rendered backtracking check (only when a tracked-property write
 *    occurs during a render pass — already a cold/diagnostic path).
 *    Pre-slice-48 cost was 1 globalThis property access + 1 optional-
 *    chain `?.get?.()` invocation. Post-slice-48 it's 1 direct const
 *    `.get()` call — the optional-chain guards are no longer needed
 *    because the const is guaranteed initialized at module-load time.
 *    Marginally faster on the cold path.
 *
 *  - `__gxtIsInRenderPass` — RETIRED IN SLICE 49 (orphan write-only
 *    deletion). Pre-slice-49 audit confirmed exactly 2 active sites in
 *    `packages/@ember/-internals/gxt-backend/manager.ts`, BOTH writers,
 *    ZERO readers anywhere in `packages/`. The earlier slice-8 docblock
 *    note (immediately before `GxtRenderPassCapabilities`) describing
 *    `metal/tracked.ts` as a cross-package reader was STALE — exhaustive
 *    grep across `packages/@ember/-internals/metal/` returned zero
 *    hits at slice-49 time. The globalThis slot was a write-only orphan
 *    whose intended cross-package reader had already migrated away (or
 *    never existed in the active codebase) by the time slice 49 ran.
 *
 *    Pre-slice-49 topology (confirmed audit — exactly 2 sites, BOTH in
 *    `manager.ts`, BOTH writers):
 *
 *      Canonical state (already module-local pre-slice-49):
 *        - `manager.ts:2997` —
 *          `let _isInRenderPass = false;`
 *          (pre-existing module-local — already the source of truth;
 *          read at `manager.ts:3095` inside `markTemplateRendered`).
 *
 *      Writer #1 (entry-arm):
 *        - `manager.ts:3067` —
 *          `(globalThis as any).__gxtIsInRenderPass = true;`
 *          (co-write inside `beginRenderPass`, immediately after
 *          `_isInRenderPass = true`).
 *
 *      Writer #2 (exit-disarm):
 *        - `manager.ts:3073` —
 *          `(globalThis as any).__gxtIsInRenderPass = false;`
 *          (co-write inside `endRenderPass`, immediately after
 *          `_isInRenderPass = false`).
 *
 *      Readers (0 sites):
 *        - Zero in `packages/`. The slice-48 memory note explicitly
 *          confirmed orphan status; this slice's pre-flight grep
 *          reconfirmed.
 *
 *    Sites moved (slice 49):
 *      - packages/@ember/-internals/gxt-backend/manager.ts: delete
 *        both writers (L3067 entry-arm + L3073 exit-disarm). The
 *        module-local `_isInRenderPass` `let` (L2997) and its lone
 *        reader (L3095) are unchanged — behavior is identical post-
 *        slice because the only consumer always used the const, never
 *        the globalThis slot.
 *      - packages/@ember/-internals/gxt-backend/gxt-bridge.ts: append
 *        this slice-49 entry; also update the stale slice-8 "deferred"
 *        note above `GxtRenderPassCapabilities` to reflect that the
 *        flag is now retired rather than deferred. NO new bridge
 *        methods (zero-bridge, pure deletion).
 *
 *    State-home decision: N/A — pure orphan retirement. No state-home
 *    move is required because the canonical module-local const
 *    `_isInRenderPass` already exists in `manager.ts` and is unchanged.
 *
 *    Bridge shape decision: ZERO-bridge orphan deletion (no
 *    cross-file/cross-package consumers ever existed in the active
 *    tree; the only "users" are ad-hoc, untracked debug scripts under
 *    `scripts/debug-artifacts/` which observe `globalThis` for
 *    diagnostic console traces — those will silently read `undefined`
 *    post-slice-49, same as before any pass starts).
 *
 *    ZERO new import edges in slice 49: only writers were deleted; no
 *    new declarations introduced. Slice 49 is the LEANEST possible
 *    Cluster B slice — pure deletion, no redirect required.
 *
 *    Bridge interface evolution (slice 49 — no API change): the
 *    bridge interface `GxtRenderPassCapabilities` is NOT extended; the
 *    migration-history docblock IS extended with this slice-49 entry,
 *    AND the stale "deferred" bullet above `GxtRenderPassCapabilities`
 *    is rewritten to point to this entry. Seventh consecutive Cluster
 *    B slice (after slice 43, 44, 45, 46, 47, 48) to ship without a
 *    new bridge method.
 *
 *    Hot-path concern: the deleted writes ran inside
 *    `beginRenderPass`/`endRenderPass` — once per render pass. Two
 *    globalThis property assignments per pass are eliminated. The
 *    surviving `_isInRenderPass = true/false` const assignment is
 *    inlineable by V8. Marginally faster on the per-pass entry/exit.
 *
 *    Count delta (slice 49): -1 globalThis slot retired, -2 LOC
 *    source, 0 new bridge methods, 0 new import edges.
 *
 *  - `__gxtMorphChildren` — RETIRED IN SLICE 50 (orphan write-only
 *    deletion). Pre-slice-50 audit confirmed exactly 1 active site in
 *    `packages/@ember/-internals/glimmer/lib/renderer.ts`, A WRITER,
 *    ZERO readers anywhere in `packages/`. The pre-slice-50 comment
 *    immediately above the writer claimed "used by root.ts" but an
 *    exhaustive grep of `packages/@ember/-internals/glimmer/lib/root.ts`
 *    at slice-50 time returned zero matches for both `__gxtMorphChildren`
 *    and the underlying `morphChildren` identifier — that comment was
 *    STALE. The globalThis slot was a write-only orphan whose intended
 *    cross-file consumer either migrated away or never landed in the
 *    active codebase.
 *
 *    Pre-slice-50 topology (confirmed audit — exactly 1 site, in
 *    `renderer.ts`, a writer):
 *
 *      Canonical state (already module-local pre-slice-50):
 *        - `renderer.ts:202` —
 *          `function morphChildren(target: Element | SimpleElement, source: DocumentFragment): void { ... }`
 *          (pre-existing module-local function — already the source of
 *          truth; the in-file callers at `renderer.ts:245` and
 *          `renderer.ts:981` invoke `morphChildren` directly, never
 *          through the globalThis projection).
 *
 *      Writer #1 (module-init expose):
 *        - `renderer.ts:289` —
 *          `(globalThis as any).__gxtMorphChildren = morphChildren;`
 *          (top-level module-init assignment, executed once at module
 *          load. The adjacent comment "used by root.ts" was stale).
 *
 *      Readers (0 sites):
 *        - Zero in `packages/`. The slice-49 memory note pre-flagged
 *          this orphan; slice-50 pre-flight grep reconfirmed.
 *
 *    Sites moved (slice 50):
 *      - packages/@ember/-internals/glimmer/lib/renderer.ts: delete the
 *        sole writer at L289 along with its stale "used by root.ts"
 *        comment at L288. The module-local `morphChildren` function
 *        (L202) and its in-file callers (L245, L981) are unchanged —
 *        behavior is identical post-slice because the only consumers
 *        always called the local function, never the globalThis slot.
 *      - packages/@ember/-internals/gxt-backend/gxt-bridge.ts: append
 *        this slice-50 entry. NO new bridge methods (zero-bridge, pure
 *        deletion). No stale-note rewrite is needed because no prior
 *        slice referenced `__gxtMorphChildren` in this file.
 *
 *    State-home decision: N/A — pure orphan retirement. No state-home
 *    move is required because the canonical module-local function
 *    `morphChildren` already exists in `renderer.ts` and is unchanged.
 *
 *    Bridge shape decision: ZERO-bridge orphan deletion. No
 *    cross-file/cross-package consumers ever existed in the active
 *    tree; the leanest possible shape is direct deletion of the orphan
 *    writer.
 *
 *    ZERO new import edges in slice 50: only the writer was deleted; no
 *    new declarations introduced. Slice 50 matches slice 49 as the
 *    LEANEST possible Cluster B shape — pure deletion of a single
 *    module-init writer, no redirect required.
 *
 *    Bridge interface evolution (slice 50 — no API change): no bridge
 *    interface is extended; the migration-history docblock IS extended
 *    with this slice-50 entry. Eighth consecutive Cluster B slice (after
 *    slice 43, 44, 45, 46, 47, 48, 49) to ship without a new bridge
 *    method.
 *
 *    Hot-path concern: the deleted write executed once at module-load
 *    time. No per-render-pass cost is eliminated, but one cold-start
 *    globalThis property assignment is removed. Negligible impact;
 *    correctness/cleanup motivated.
 *
 *    Count delta (slice 50): -1 globalThis slot retired, -2 LOC source
 *    (writer line + stale comment), 0 new bridge methods, 0 new import
 *    edges.
 *
 *  - `__gxtRerenderedRoots` — RETIRED IN SLICE 51 (orphan write-only
 *    deletion). Pre-slice-51 audit confirmed exactly 1 active site in
 *    `packages/@ember/-internals/glimmer/lib/renderer.ts:1438-1440`,
 *    a lazy-init writer + dead push, ZERO readers anywhere in
 *    `packages/`. The pre-slice-51 comment immediately above the writer
 *    claimed `__gxtDestroyUnclaimedPoolEntries can find their children`
 *    via the slot — but exhaustive grep of `RerenderedRoots` and
 *    `rerenderedRoots` across all of `packages/` returned ONLY the
 *    three writer lines in `renderer.ts`. The
 *    `_gxtDestroyUnclaimedPoolEntries` function body in
 *    `manager.ts:4623` (already module-local from a prior slice) does
 *    NOT read the slot under any aliased name. The comment was STALE —
 *    the intended cross-file consumer either migrated away or never
 *    landed in the active codebase. The slice-50 memory note pre-flagged
 *    this orphan; slice-51 pre-flight grep reconfirmed.
 *
 *    Pre-slice-51 topology (confirmed audit — exactly 3 lines in
 *    `renderer.ts`, all writer-side / dead push):
 *
 *      Canonical state: N/A — the array's contents are never consumed
 *        anywhere in `packages/`. There is no state to preserve.
 *
 *      Writer + dead push (sole site):
 *        - `renderer.ts:1436-1437` — stale comment claiming
 *          `__gxtDestroyUnclaimedPoolEntries can find their children`
 *          via the slot.
 *        - `renderer.ts:1438-1439` — lazy-init binding:
 *          `const rerenderedRoots = (globalThis as any).__gxtRerenderedRoots
 *           || ((globalThis as any).__gxtRerenderedRoots = []);`
 *          (creates the array on first use within the for-of loop in
 *          `__gxtForceEmberRerender`; on subsequent rerender entries,
 *          reads the same already-allocated array).
 *        - `renderer.ts:1440` — `if (classicRoot.root)
 *          rerenderedRoots.push(classicRoot.root);` (push only — the
 *          array is never read, iterated, or cleared anywhere in
 *          `packages/`).
 *
 *      Readers (0 sites):
 *        - Zero in `packages/`. Exhaustive grep across `RerenderedRoots`
 *          (capitalized) and `rerenderedRoots` (camelCase) confirms only
 *          the three writer lines exist. No alias reader, no consumer of
 *          the array contents.
 *
 *    Sites moved (slice 51):
 *      - packages/@ember/-internals/glimmer/lib/renderer.ts: delete the
 *        sole writer block — the 2-line stale comment + 2-line lazy-init
 *        const binding + 1-line push (5 source lines total). NO
 *        replacement, NO redirect. Pure deletion. The surrounding
 *        `__gxtForceEmberRerender` for-of loop is otherwise unchanged.
 *      - packages/@ember/-internals/gxt-backend/gxt-bridge.ts: append
 *        this slice-51 entry. NO new bridge methods (zero-bridge, pure
 *        deletion). No stale-note rewrite is needed because no prior
 *        slice referenced `__gxtRerenderedRoots` in this file.
 *
 *    State-home decision: N/A — pure orphan retirement. There is no
 *    canonical state to preserve because the slot's contents (an array
 *    of re-rendered root component instances) are never consumed by any
 *    reader.
 *
 *    Bridge shape decision: ZERO-bridge orphan deletion. No
 *    cross-file/cross-package consumers ever existed in the active
 *    tree; the leanest possible shape is direct deletion of the orphan
 *    writer block.
 *
 *    ZERO new import edges in slice 51: only the writer was deleted; no
 *    new declarations introduced. Slice 51 matches slices 49 and 50 as
 *    a pure-deletion orphan retirement — the THIRD consecutive
 *    pure-orphan-retirement Cluster B slice.
 *
 *    Bridge interface evolution (slice 51 — no API change): no bridge
 *    interface is extended; the migration-history docblock IS extended
 *    with this slice-51 entry. NINTH consecutive Cluster B slice (after
 *    slice 43, 44, 45, 46, 47, 48, 49, 50) to ship without a new bridge
 *    method.
 *
 *    Hot-path concern: the deleted writer executed once per re-rendered
 *    root per `__gxtForceEmberRerender` invocation. The slot's array
 *    grew monotonically across render passes (never cleared by any
 *    consumer — confirming dead-code accumulation). Removing it
 *    eliminates a small per-pass allocation/push and prevents a slow
 *    memory growth pattern on long-running pages. Negligible per-pass
 *    impact; correctness/cleanup motivated.
 *
 *    Count delta (slice 51): -1 globalThis slot retired, -5 LOC source
 *    (stale comment + lazy-init binding + dead push), 0 new bridge
 *    methods, 0 new import edges.
 *
 *  - `__gxtSuppressDestroyCapture` — MIGRATED TO MODULE-LOCAL IN SLICE 52
 *    (zero-bridge intra-`manager.ts`). Pre-slice-52 audit confirmed 7
 *    functional sites all in
 *    `packages/@ember/-internals/gxt-backend/manager.ts`, plus 1
 *    comment-only cross-file reference at
 *    `packages/@ember/-internals/glimmer/lib/renderer.ts:317`. Classic
 *    boolean state-flag pattern with paired entry-arm /
 *    `finally`-disarm + snapshot read for re-entrancy preservation.
 *
 *    Pre-slice-52 topology (confirmed audit — exactly 7 functional
 *    sites, all in `manager.ts`, plus 2 comment lines and 1
 *    comment-only cross-file reference):
 *
 *      Canonical state: `globalThis.__gxtSuppressDestroyCapture`
 *        (boolean, `undefined` by default until first write — treated
 *        as falsy by all readers).
 *
 *      Functional sites in `manager.ts`:
 *        - L3397 — reader-gate in `triggerLifecycleHook` catch block.
 *          When set, suppresses capture of user-thrown lifecycle
 *          errors into the render-error queue. Set during spurious
 *          unclaimed-pool sweeps where a destroy/lifecycle throw
 *          should NOT propagate to assert.throws.
 *        - L4758 — snapshot read into `_hadPriorSuppress` local at
 *          the start of `__gxtDestroyUnclaimedPoolEntries`. Preserves
 *          outer re-entrant arms so a nested sweep doesn't clobber
 *          an enclosing arm's lifetime.
 *        - L4760 — entry-arm writer (set to `true` if
 *          `_outerSuppressCapture && !_hadPriorSuppress`).
 *        - L4899 — reader-gate in Phase 3 `instance.destroy()` catch.
 *          Same first-error-wins capture policy as L3397.
 *        - L4916 — reader-gate in Phase 3 `instance.willDestroy()`
 *          catch (mirror of L4899 for the legacy hook).
 *        - L4943 — `finally`-disarm writer (set to `false` if
 *          `_outerSuppressCapture && !_hadPriorSuppress` — equivalent
 *          to snapshot-restore because the snapshot was always
 *          `false` when the entry-arm condition fired).
 *
 *      Comment-only sites:
 *        - `manager.ts:3394` + `manager.ts:4896` — 2 comment lines
 *          explaining the flag's semantics, lightly edited in slice
 *          52 to reflect the new module-local name.
 *        - `renderer.ts:317` — 1 cross-file comment-only doc
 *          reference. Lightly edited in slice 52 to point at the new
 *          module-local `_suppressDestroyCapture` and note the
 *          slice-52 migration. NO functional cross-file consumer
 *          existed.
 *
 *    Sites moved (slice 52):
 *      - packages/@ember/-internals/gxt-backend/manager.ts:
 *        introduced new module-local `let _suppressDestroyCapture =
 *        false;` adjacent to the existing `_isInRenderPass` cluster
 *        (around L2998-3018) with a docblock explaining its
 *        semantics. Redirected all 7 functional sites to access the
 *        const directly:
 *          * L3397 reader: `(globalThis as any)
 *            .__gxtSuppressDestroyCapture` → `_suppressDestroyCapture`.
 *          * L4758 snapshot read:
 *            `!!(globalThis as any).__gxtSuppressDestroyCapture`
 *            → `_suppressDestroyCapture` (the canonical is already
 *            boolean-typed; the `!!` coercion was a load-order safety
 *            measure that the typed const obviates).
 *          * L4760 entry-arm writer:
 *            `(globalThis as any).__gxtSuppressDestroyCapture = true;`
 *            → `_suppressDestroyCapture = true;`
 *          * L4899 + L4916 reader-gates: same shape as L3397.
 *          * L4943 `finally`-disarm writer:
 *            `(globalThis as any).__gxtSuppressDestroyCapture = false;`
 *            → `_suppressDestroyCapture = false;`
 *        Light comment edits at L3394 + L4896 to reflect the new
 *        module-local name.
 *      - packages/@ember/-internals/glimmer/lib/renderer.ts:317:
 *        light comment edit to point at the new module-local
 *        `_suppressDestroyCapture` in `manager.ts` (slice-52) and
 *        note the migration history.
 *      - packages/@ember/-internals/gxt-backend/gxt-bridge.ts: append
 *        this slice-52 entry to the migration-history docblock above
 *        `GxtCompilePipelineCapabilities` (slice-49/50/51-precedent
 *        location). NO new bridge methods (zero-bridge intra-file).
 *        No stale-note rewrite is needed because no prior slice
 *        referenced `__gxtSuppressDestroyCapture` in this file.
 *
 *    State-home decision: `manager.ts` — the slot's sole functional
 *    accessors all live in `manager.ts`'s
 *    `__gxtDestroyUnclaimedPoolEntries` and `triggerLifecycleHook`
 *    functions; the slot's lifecycle is tightly coupled to the
 *    unclaimed-pool sweep code path. Matches slice-31/43/44/48/49
 *    precedent (intra-`manager.ts` zero-bridge).
 *
 *    Bridge shape decision: ZERO-bridge intra-file. All functional
 *    sites are inside `manager.ts`. The cross-file `renderer.ts:317`
 *    reference is comment-only (no functional access). No bridge
 *    method needed; module-local `let` is sufficient.
 *
 *    Re-entrancy semantics preserved exactly: the snapshot read at
 *    L4758 captures the prior `_suppressDestroyCapture` value into
 *    `_hadPriorSuppress`. The matching `finally`-disarm at L4943
 *    only writes `false` if the entry-arm condition
 *    (`_outerSuppressCapture && !_hadPriorSuppress`) was true — i.e.,
 *    only if WE actually set it to true ourselves. If an outer
 *    re-entrant invocation already armed it, our matching no-op
 *    leaves the outer arm's lifetime intact. The original
 *    `globalThis` form had identical semantics. Functional
 *    equivalence verified by re-reading both branches before and
 *    after migration.
 *
 *    ZERO new import edges in slice 52: only inline accessor edits
 *    + one new `let` declaration adjacent to existing module-local
 *    state. No `getGxtRenderer` calls, no `installCompilePipelinePart`
 *    calls, no new bridge-import statements added. Slice 52 matches
 *    slices 43, 44, 45, 46, 47, 48, 49, 50, 51 as a zero-bridge
 *    Cluster B slice — the TENTH consecutive.
 *
 *    Bridge interface evolution (slice 52 — no API change): no
 *    bridge interface is extended in this slice (zero-bridge
 *    intra-file). The migration-history docblock IS extended with
 *    this slice-52 entry. TENTH consecutive Cluster B slice (after
 *    43, 44, 45, 46, 47, 48, 49, 50, 51) to ship without a new
 *    bridge method.
 *
 *    Hot-path concern: the migrated accessors execute on every
 *    `__gxtDestroyUnclaimedPoolEntries` invocation (~once per
 *    spurious-sweep render-pass tick) and once per
 *    `triggerLifecycleHook` catch (a rarer path triggered only on
 *    user-thrown lifecycle errors). Direct module-local boolean
 *    reads/writes are strictly faster than `(globalThis as any).foo`
 *    property access — the engine can constant-fold the
 *    closure-local read whereas the globalThis access requires a
 *    full property-lookup walk every time. Small but real
 *    improvement on the unclaimed-sweep hot path.
 *
 *    Count delta (slice 52): -1 globalThis slot retired, +1 new
 *    module-local `let`, ~7 inline accessor migrations, +18 LOC
 *    docblock for the new module-local + +3 LOC light comment edits.
 *    0 new bridge methods, 0 new import edges.
 *
 * 53. (Cluster B slice 53) Retired `__gxtInstancesMarkedForDestruction`
 *    globalThis slot. The slot held a `Set<any>` of pool-instance
 *    references explicitly marked for destruction during a force-rerender
 *    (e.g. dynamic-component swap via `{{component this.name}}` where the
 *    new instance lands in a different pool keyed by factory; the old
 *    instance in the previous pool is unclaimed and needs its destroy
 *    lifecycle fired). Producer: the `__gxtIsForceRerender`-gated loop
 *    inside `setupComponentManager` (manager.ts:1490-1511) that iterates
 *    parent-pool entries and tags unclaimed live instances. Consumers:
 *    `_gxtSnapshotLiveInstances` (cycle-start `.clear()` call —
 *    manager.ts:4630 pre-slice-53) and `_gxtDestroyUnclaimedPoolEntries`
 *    (mark-and-delete check at manager.ts:4718 pre-slice-53). All 4
 *    functional sites were intra-`manager.ts`; zero cross-file consumers
 *    (verified by exhaustive grep across `packages/`).
 *
 *    Pre-slice-53 topology (audit confirmed — exactly 4 functional sites
 *    + 1 comment, ALL in `manager.ts`):
 *      - manager.ts:1501 — producer lazy-init read:
 *        `let markedSet = (globalThis as any).__gxtInstancesMarkedForDestruction;`
 *      - manager.ts:1504 — producer lazy-init write:
 *        `(globalThis as any).__gxtInstancesMarkedForDestruction = markedSet;`
 *      - manager.ts:4630 — consumer read for cycle-start clear:
 *        `const markedSet = (globalThis as any).__gxtInstancesMarkedForDestruction;`
 *      - manager.ts:4718 — consumer read for mark-and-delete check:
 *        `const markedForDestruction = (globalThis as any).__gxtInstancesMarkedForDestruction;`
 *      - manager.ts:4715 — comment-only reference (1 line — lightly
 *        edited in slice 53 to point at the new module-local
 *        `_instancesMarkedForDestruction` const).
 *
 *    Sites moved (slice 53):
 *      - packages/@ember/-internals/gxt-backend/manager.ts: introduced
 *        new module-local `const _instancesMarkedForDestruction = new
 *        Set<any>();` adjacent to the existing `_preRerenderSnapshot`
 *        declaration (~L4622-L4636) with a docblock explaining its
 *        semantics and the slice-53 migration. Collapsed the producer
 *        lazy-init pattern (L1501+L1504) into a single direct
 *        `_instancesMarkedForDestruction.add(entry.instance)` call —
 *        no lazy-init needed because the const is eagerly initialized
 *        at module-load time. Redirected the two consumer reads at
 *        L4630 (`_gxtSnapshotLiveInstances`) and L4718
 *        (`_gxtDestroyUnclaimedPoolEntries`) to access the const
 *        directly; collapsed the `if (markedForDestruction && ...)` guard
 *        in the consumer at L4718 to a simple `if
 *        (_instancesMarkedForDestruction.has(instance))` since the const
 *        is guaranteed initialized at module-load time. The comment line
 *        at L4715 was lightly edited to point at the new module-local
 *        name.
 *      - packages/@ember/-internals/gxt-backend/gxt-bridge.ts: append
 *        the full slice-53 entry to the migration-history docblock above
 *        `GxtCompilePipelineCapabilities`. NO new bridge methods
 *        (zero-bridge intra-file). No stale-note rewrite is needed
 *        because no prior slice referenced
 *        `__gxtInstancesMarkedForDestruction` in this file.
 *
 *    State-home decision: `manager.ts` — all 4 functional accessors live
 *    in `manager.ts` (the producer inside `setupComponentManager`; the
 *    two consumers inside `_gxtSnapshotLiveInstances` and
 *    `_gxtDestroyUnclaimedPoolEntries`). The slot's lifecycle is tightly
 *    coupled to the unclaimed-pool sweep code path; placing the const
 *    adjacent to `_preRerenderSnapshot` (the sibling state cleared in the
 *    same `_gxtSnapshotLiveInstances` cycle-start function) is the
 *    natural cohort. Matches slice-48 / slice-52 manager.ts state-home
 *    precedent.
 *
 *    Bridge shape decision: ZERO-bridge intra-file. All functional sites
 *    are inside `manager.ts`. No cross-file consumer ever existed (the
 *    slot's producer-consumer chain was self-contained within the
 *    `manager.ts` force-rerender / unclaimed-sweep pipeline from the
 *    beginning). No bridge method needed; module-local `const` is
 *    sufficient — and stronger than slice-52's `let` because this slot's
 *    identity is stable across the lifetime of the module (only its
 *    contents mutate via `add`/`delete`/`clear`). Slice-48 precedent
 *    (`__gxtNestedTrackingProxies`) applies directly.
 *
 *    ZERO new import edges in slice 53: only inline accessor edits + one
 *    new `const` declaration adjacent to existing module-local state. No
 *    `getGxtRenderer` calls, no `installCompilePipelinePart` calls, no
 *    new bridge-import statements added. Slice 53 matches slices 43, 44,
 *    45, 46, 47, 48, 49, 50, 51, 52 as a zero-bridge Cluster B slice —
 *    the ELEVENTH consecutive.
 *
 *    Bridge interface evolution (slice 53 — no API change): no bridge
 *    interface is extended in this slice (zero-bridge intra-file). The
 *    migration-history docblock IS extended with the full slice-53 entry.
 *    ELEVENTH consecutive Cluster B slice (after 43, 44, 45, 46, 47, 48,
 *    49, 50, 51, 52) to ship without a new bridge method.
 *
 *    Hot-path concern: the producer (manager.ts:1490-1511) only fires
 *    under `__gxtIsForceRerender`, which is a relatively cold path
 *    (only on force-rerender entry, not on every render pass). The two
 *    consumer reads execute once per `_gxtSnapshotLiveInstances`
 *    invocation (cycle-start) and once per pool-entry inspection inside
 *    `_gxtDestroyUnclaimedPoolEntries` (per-instance loop). All three
 *    paths benefit from the const becoming a direct closure-local read
 *    instead of a `(globalThis as any).foo` property-lookup walk; the
 *    consumer at L4718 also drops one redundant truthiness guard per
 *    iteration. Small but real improvement on the unclaimed-sweep cold
 *    path and a slightly tighter inner-loop in the per-instance check.
 *
 *    Count delta (slice 53): -1 globalThis slot retired, +1 new
 *    module-local `const`, 4 inline accessor migrations (1 producer
 *    lazy-init collapse + 2 consumer reads + 1 consumer guard collapse),
 *    +14 LOC docblock for the new module-local + ~4 LOC light comment
 *    edits. 0 new bridge methods, 0 new import edges.
 *
 * 55. (Cluster B slice 55) Migrated `__gxtClearRenderErrors` globalThis
 *    slot to the typed-bridge `compilePipeline.clearRenderErrors()` method.
 *    The slot held a `() => void` function that drains the manager.ts-local
 *    `_renderErrors` queue without throwing — the no-throw counterpart to
 *    `flushRenderErrors()` (which drains-and-throws). Producer: a single
 *    top-level globalThis write at `manager.ts:3286` immediately after the
 *    `export function clearRenderErrors()` definition at `manager.ts:3283`.
 *    Consumers: four cross-package readers in `packages/internal-test-helpers/`
 *    (run.ts:35 in `runAppend` catch, run.ts:157 in `runTask` catch,
 *    test-cases/abstract-application.ts:94 in `teardown` reset,
 *    test-cases/abstract.ts:174 in `teardown` reset) plus one comment-only
 *    reference at `internal-test-helpers/lib/ember-dev/setup-qunit.ts:106`
 *    documenting why the prior `__gxtClearRenderErrors()` call there is
 *    retired dead code.
 *
 *    Slice-54 attempted to retire `__gxtClearTagsToRevalidate` as an
 *    orphan but reverted after discovering the producer lives in the
 *    bundled `@lifeart/gxt` runtime (`node_modules/@lifeart/gxt/dist/
 *    gxt.runtime-compiler.es.js`'s `setupGlobalScope`), NOT in `packages/`.
 *    Pre-flight for slice 55 extended grep coverage to the bundled GXT
 *    runtime as well — `__gxtClearRenderErrors` is confirmed NOT
 *    runtime-owned (clean grep of `node_modules/@lifeart/gxt/dist/`).
 *    Producer is Ember-side only.
 *
 *    Pre-slice-55 topology (audit confirmed — exactly 1 producer + 4
 *    cross-package readers + 1 comment-only retirement note):
 *      - manager.ts:3286 — producer write:
 *        `(globalThis as any).__gxtClearRenderErrors = clearRenderErrors;`
 *      - internal-test-helpers/lib/run.ts:35 — reader in `runAppend` catch:
 *        `const clearErrors = (globalThis as any).__gxtClearRenderErrors;`
 *      - internal-test-helpers/lib/run.ts:157 — reader in `runTask` catch:
 *        `const clearErrors = (globalThis as any).__gxtClearRenderErrors;`
 *      - internal-test-helpers/lib/test-cases/abstract-application.ts:94 —
 *        reader in `teardown` reset:
 *        `const clearErrors = (globalThis as any).__gxtClearRenderErrors;`
 *      - internal-test-helpers/lib/test-cases/abstract.ts:174 — reader in
 *        `teardown` reset:
 *        `const clearErrors = (globalThis as any).__gxtClearRenderErrors;`
 *      - internal-test-helpers/lib/ember-dev/setup-qunit.ts:106 — comment
 *        line documenting why an earlier defensive `__gxtClearRenderErrors()`
 *        call was retired (light edit only — points at the new bridge).
 *      - Repository-root harness reader at `index.html:102` is OUTSIDE
 *        `packages/` and remains a globalThis reader (cannot import from
 *        `gxt-bridge`). The slice-55 implementation retires the globalThis
 *        WRITER, so the harness reader's `typeof === 'function'` guard
 *        no-ops cleanly — same shape as any other harness that loads
 *        post-slice-55. The harness reader is intentionally NOT migrated.
 *
 *    Sites moved (slice 55):
 *      - packages/@ember/-internals/gxt-backend/manager.ts: retired the
 *        globalThis writer at L3286. Updated the `compilePipeline` object
 *        literal at L13249 to register `clearRenderErrors` as a bridge
 *        method seeded at module-init. The `export function
 *        clearRenderErrors(): void` definition at L3283-L3285 is preserved
 *        as-is (the function itself doesn't change — only the publication
 *        mechanism). Slice-55 marker comment added at the registration
 *        site.
 *      - packages/internal-test-helpers/lib/run.ts: replaced the two
 *        reader sites (L35-L36, L157-L158) with
 *        `getGxtRenderer()?.compilePipeline.clearRenderErrors?.();`.
 *        Existing `getGxtRenderer` import is reused (already present from
 *        prior slices 36/38/40). The pre-slice-55 typeof-function-guarded
 *        pattern is replaced with the equivalent optional-chain guard
 *        (returns same null-safe semantics when classic-Ember loads).
 *      - packages/internal-test-helpers/lib/test-cases/abstract-application.ts:
 *        replaced the reader at L94-L95 with the bridge call; reused
 *        existing `getGxtRenderer` import and the local `_cpAA` capture
 *        already defined at L85 — the bridge call is appended after
 *        `_cpAA?.setPendingSyncFromPropertyChange?.(false)`.
 *      - packages/internal-test-helpers/lib/test-cases/abstract.ts:
 *        replaced the reader at L174-L175 with the bridge call; reused
 *        existing `getGxtRenderer` import and the local `_cpAT` capture
 *        already defined at L161 — the bridge call is appended after
 *        `_cpAT?.setPendingSyncFromPropertyChange?.(false)`.
 *      - packages/internal-test-helpers/lib/ember-dev/setup-qunit.ts:106 —
 *        lightly edited to point at the new bridge call surface
 *        (`compilePipeline.clearRenderErrors`) instead of the retired
 *        globalThis slot name.
 *      - packages/@ember/-internals/gxt-backend/gxt-bridge.ts: appended
 *        `clearRenderErrors(): void` to `GxtCompilePipelineCapabilities`
 *        immediately after `clearInstancePools(): void` (sibling void/
 *        clear-pattern). Added the full slice-55 entry to this
 *        migration-history docblock. NO stale-note rewrite needed (no
 *        prior slice referenced `__gxtClearRenderErrors`).
 *
 *    State-home decision: `manager.ts` — the function body itself
 *    (`clearRenderErrors`) was already exported from `manager.ts` at
 *    L3283. Only the publication mechanism changes (globalThis writer →
 *    bridge registration). Matches the slice-12 / slice-13 / slice-14
 *    bridge-registration precedent (function home unchanged; only the
 *    cross-file invocation surface migrates from globalThis to typed
 *    bridge).
 *
 *    Bridge shape decision: typed-bridge `clearRenderErrors(): void`
 *    method on `GxtCompilePipelineCapabilities`. Cross-file pattern (4
 *    readers across 3 files in `internal-test-helpers/`) precludes
 *    zero-bridge; the slot is structurally an exported test-helper hook.
 *    Matches slice-12 / slice-37 / slice-38 / slice-39 / slice-42
 *    typed-bridge precedent. Breaks the 11-consecutive zero-bridge streak
 *    (slices 43-53). One new bridge method, no new install-API namespace
 *    (the method is seeded directly in `manager.ts`'s `setGxtRenderer`
 *    call, NOT via `installCompilePipelinePart` — `manager.ts` is the
 *    function-home file).
 *
 *    Bridge interface evolution (slice 55 — 36th API change): adds
 *    `clearRenderErrors(): void` method to
 *    `GxtCompilePipelineCapabilities`. Net +1 bridge method, -1
 *    globalThis slot.
 *
 *    Hot-path concern: NONE. All 4 readers are in test-helper code paths
 *    (catch blocks and teardown methods). The bridge-call overhead vs.
 *    globalThis-typeof-guard is negligible at the call frequency (at
 *    most a few times per test).
 *
 *    Count delta (slice 55): -1 globalThis slot retired, +1 new bridge
 *    method on `compilePipeline`, +1 bridge registration in the
 *    `setGxtRenderer` call, 4 inline accessor migrations (4 cross-package
 *    readers in `internal-test-helpers/`), +1 comment edit at
 *    `setup-qunit.ts:106`. Reuses existing `getGxtRenderer` imports in
 *    all 3 reader files (no new import edges).
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
   * (the pre-slice-14 entry `__dcChangeListeners` is now module-local; the
   * pre-slice-30 entry `__gxtSyncCycleId` was graduated to a module-local
   * in slice 30; the pre-slice-31 entries `__gxtSyncAllInFlightPass` /
   * `__gxtSyncAllInFlightCycle` were graduated to module-local state in
   * slice 31; the pre-slice-32 entry `__gxtAllPoolArrays` was graduated
   * to the module-local `_allPoolArrays` in `manager.ts` in slice 32 and
   * is now read via `compilePipeline.getAllPoolArrays` cross-file or
   * `_allPoolArrays` direct intra-file) — no closures had to move, so
   * the slice-3 relocation pattern applied directly (first wrap-by-
   * reassignment to use it; slices 8/10/11 used the host-hook pattern
   * instead because their wrap bodies closed over compile.ts module-local
   * state).
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
   * Drain the manager.ts-local render-error queue (`_renderErrors`) without
   * throwing. Counterpart to `flushRenderErrors()` (which drains-and-throws)
   * — `clearRenderErrors()` only clears.
   *
   * Called from internal-test-helpers' `runAppend` / `runTask` catch blocks
   * (race-cleanup: when the caller observes a thrown render error, the same
   * error has been duplicated into `_renderErrors` by the gxt-backend catch
   * path at manager.ts's `captureRenderError`; the stale copy would re-throw
   * during the NEXT runTask/runAppend's `flushRenderErrors` call, breaking
   * error-recovery tests) and from `AbstractApplicationTestCase.teardown` /
   * `AbstractTestCase.teardown` (between-test reset: errors caught by
   * `assert.rejectsAssertion` are also captured into `_renderErrors` via
   * `captureRenderError`, leaving a stale copy that would re-throw on the
   * next test's first `flushRenderErrors` call).
   *
   * Slice-55 (Cluster B): replaces the pre-slice-55 globalThis writer
   * `(globalThis as any).__gxtClearRenderErrors = clearRenderErrors;` at
   * `manager.ts:3286` and the four cross-package reader sites in
   * `internal-test-helpers/lib/run.ts:35` / `:157` and
   * `internal-test-helpers/lib/test-cases/abstract-application.ts:94` /
   * `internal-test-helpers/lib/test-cases/abstract.ts:174` — all of which
   * used a `const fn = (globalThis as any).__gxtClearRenderErrors; if
   * (typeof fn === 'function') fn();` typeof-guarded call pattern. Readers
   * now route through `getGxtRenderer()?.compilePipeline.clearRenderErrors?.()`,
   * the optional-chain providing the same null-tolerant guard for
   * classic-Ember builds (where gxt-backend was never loaded).
   *
   * Note: the harness reader at the repository-root `index.html:102` is
   * outside `packages/` and continues to use the `globalThis` accessor
   * intentionally (it cannot import from `gxt-bridge`). The slice-55
   * migration intentionally leaves the harness reader as-is; the
   * `manager.ts:3286` globalThis writer remains in source ONLY if the
   * harness reader is preserved — otherwise the writer is retired and the
   * harness reader silently no-ops (existing `typeof === 'function'` guard
   * handles the missing-slot case). The slice-55 implementation RETIRES
   * the writer outright since `index.html` is a development/diagnostic
   * harness only — production builds neither load it nor execute the
   * defensive cleanup it performs.
   *
   * Previously: `(globalThis as any).__gxtClearRenderErrors`.
   */
  clearRenderErrors(): void;

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

  /**
   * Read-only access to the Set of pool arrays tracked by manager.ts's
   * component-instance pool. Each pool array is a list of `PoolEntry`
   * records (`{ instance, claimed, updatedThisPass, eachRowKey? }`); the
   * Set itself is the master registry of every pool array ever created by
   * `getCachedOrCreateInstance`. Mutations (additions on new pool creation,
   * `clear()` on `_gxtClearInstancePools` per-test teardown) happen
   * intra-file in `manager.ts`; the bridge surface is read-only.
   *
   * Slice-32 (Cluster B): graduates the canonical state from the pre-slice-32
   * `globalThis.__gxtAllPoolArrays` slot (one-time publish at
   * `manager.ts:1050`) to the module-local `_allPoolArrays` Set in
   * `gxt-backend/manager.ts`. The pre-slice-32 read pattern was uniform:
   * `const pools = g.__gxtAllPoolArrays; if (pools) { ... }` — the only
   * intentional value of the truthy guard is the bridge-not-yet-installed
   * edge (pre-publish `g.__gxtAllPoolArrays` was `undefined`, so all
   * readers saw fall-through). The bridge contract preserves this:
   * `getAllPoolArrays?.()` returns `undefined` when the bridge is not
   * installed (defensive optional chain on the install method itself),
   * and the canonical implementation returns the live Set otherwise.
   *
   * Reader topology after slice 32:
   *  - intra-file `manager.ts` (1 site — `_gxtSyncAllWrappers` pre-body
   *    proactive wrap of pool-instance `trigger`s for fire-tracking):
   *    direct iteration over the module-local `_allPoolArrays` Set
   *    (slice-22/24/27/30/31 intra-file-reader precedent).
   *  - cross-file `compile.ts` (1 site — `wrappedInverseFn` inverse-branch
   *    teardown of pool instances under the captured parent view during
   *    `{{#each ... else}}` transitions to the empty-list branch):
   *    routes through `compilePipeline.getAllPoolArrays?.()` and gates
   *    the iteration on the truthy return.
   *
   * Bridge shape decision: single-method read (`getAllPoolArrays?(): Set<unknown[]> | undefined`).
   * Matches the slice-30 read-only-getter pattern (slice 30 exposes a
   * `number` getter; slice 32 is the `Set`-getter analogue). No writer
   * is exposed — the Set is mutated by `getCachedOrCreateInstance` (adds
   * new pool arrays on first instance creation in a cache-key slot) and
   * `_gxtClearInstancePools` (clears between tests), both intra-file in
   * `manager.ts`. No save-restore variant is exposed (no caller needs to
   * temporarily swap the master pool registry).
   *
   * Namespace decision: `compilePipeline`. The canonical state lives in
   * `manager.ts` but the bridge namespace is contributed via the direct
   * `setGxtRenderer` seeding (alongside `syncAllWrappers`,
   * `clearInstancePools`, `snapshotLiveInstances`, and the slice-14
   * dynamic-component listener triad — all manager.ts-canonical
   * compilePipeline methods). Same namespace pattern as slices 13/14.
   *
   * Bridge interface evolution (slice 32 — twenty-fifth API change):
   * `GxtCompilePipelineCapabilities` extended with ONE new optional method
   * (`getAllPoolArrays?(): Set<unknown[]> | undefined`) — read-only Set
   * access. First slice to expose a read-only `Set`-getter bridge method
   * (slice 19/20/22 are read-only booleans, slice 30 is a read-only
   * integer-getter; slice 32 is the `Set`-getter analogue).
   *
   * Bridge-not-yet-installed edge: cross-file reader uses
   * `?.() ?? undefined` (the trailing `?? undefined` is structurally a
   * no-op for the cross-file reader's `if (allPools)` gate, but is
   * preserved in commentary as the explicit truthy-coerce parallel to
   * slice-30's `?? 0`). The manager.ts writer (`_allPoolArrays = new
   * Set()` at module-init) runs before any `setGxtRenderer` is observable
   * by a reader, so the canonical Set is always populated when the
   * `getAllPoolArrays` getter is callable.
   *
   * Fast-check: implementation is `return _allPoolArrays;` — one variable
   * read; zero allocations. Identical hot-path cost to the pre-slice-32
   * globalThis read. The reader's `if (allPools)` gate continues to
   * dominate the post-slice-32 cost too (the slice-32 implementation
   * always returns a non-`undefined` Set when the bridge is installed, so
   * the gate becomes a `Set.size > 0` check in practice — pre-slice-32
   * the same gate handled both the `undefined` and empty-Set cases). The
   * `__gxtAllPoolArrays` globalThis slot is DROPPED in this slice — net
   * -1 globalThis surface.
   */
  getAllPoolArrays?(): Set<unknown[]> | undefined;

  /**
   * Read-only access to the Map of per-modifier-install "dirty-during-install"
   * watcher callbacks tracked by manager.ts's custom-modifier-manager install
   * path. The Map is keyed by modifier instance (the object created by
   * `manager.createModifier`); each value is a notify-watcher function that
   * sets a per-install `_selfSetDuringInstall = true` flag when called.
   * Mutations (`.set(instance, watcher)` on entry to `installModifier`,
   * `.delete(instance)` on its `finally`) happen intra-file in `manager.ts`;
   * the bridge surface is read-only.
   *
   * Purpose: classic Ember's `CustomModifierManager` wraps `installModifier`
   * in a `track()` frame, and if the modifier's install hook mutates its own
   * tracked state (e.g. `this.set('savedElement', ...)` that was implicitly
   * READ by the set path itself), classic captures the tag in the frame and
   * schedules an `updateModifier` on the next validation tick — producing
   * an extra `didUpdate` hook call. GXT mimics this by registering a
   * per-modifier-instance notify watcher for the duration of
   * `installModifier`. If `compile.ts`'s `_gxtTriggerReRenderBody` sees a
   * `notifyPropertyChange` for an object whose modifier-install frame is
   * currently active, it dispatches the registered watcher, which flags the
   * instance for a single post-install `updateModifier` call.
   *
   * Slice-33 (Cluster B): graduates the canonical state from the pre-slice-33
   * `globalThis.__gxtModifierInstallWatchers` slot (lazy-init writer at
   * `manager.ts:9127-9132` — the `instanceof Map ? : new Map()` +
   * publish-back-to-globalThis dance, gated by `prevInstallWatcher instanceof
   * Map`) to the module-local `_modifierInstallWatchers` Map in
   * `gxt-backend/manager.ts` (always-defined at module init). The lazy-init
   * dance is dropped: the post-slice-33 writer is a direct `.set(instance,
   * watcher)` on entry to `installModifier` and `.delete(instance)` on its
   * `finally`. The bridge contract preserves the pre-slice-33 semantics:
   * `getModifierInstallWatchers?.()` returns the live Map when the bridge
   * is installed (always non-`undefined`), `undefined` otherwise (defensive
   * optional chain on the install method itself).
   *
   * Reader topology after slice 33:
   *  - cross-file `compile.ts` (1 site — `_gxtTriggerReRenderBody` hot path
   *    consulted on every notifyPropertyChange dispatch): routes through
   *    `compilePipeline.getModifierInstallWatchers?.()` and gates with the
   *    pre-existing `instanceof Map && size > 0` guard. The `instanceof Map`
   *    half handles the bridge-not-yet-installed case (returns `undefined`);
   *    the `size > 0` half short-circuits the empty-Map fast path between
   *    modifier-install frames (which is the common case — the Map only has
   *    entries during an active `installModifier` call, scope of one
   *    synchronous track frame).
   *
   * Bridge shape decision: single-method read (`getModifierInstallWatchers?():
   * Map<object, () => void> | undefined`). Matches the slice-32 read-only
   * `Set`-getter pattern applied to a `Map`-valued canonical state — same
   * minimal-method shape used for any opaque-reference state with N internal
   * writers + M external readers where the writer's mutation operations
   * don't need to be exposed. No writer is exposed — the Map is mutated
   * intra-file by the modifier-install code path only. No save-restore
   * variant is exposed (no caller needs to temporarily swap the watcher
   * registry; install frames are per-instance keyed and non-overlapping
   * across instances).
   *
   * Namespace decision: `compilePipeline`. The canonical state lives in
   * `manager.ts` but the bridge namespace is contributed via the direct
   * `setGxtRenderer` seeding (alongside `syncAllWrappers`,
   * `clearInstancePools`, `snapshotLiveInstances`, the slice-14
   * dynamic-component listener triad, and the slice-32 `getAllPoolArrays`
   * getter — all manager.ts-canonical compilePipeline methods). Same
   * namespace pattern as slices 13/14/32.
   *
   * Bridge interface evolution (slice 33 — twenty-sixth API change):
   * `GxtCompilePipelineCapabilities` extended with ONE new optional method
   * (`getModifierInstallWatchers?(): Map<object, () => void> | undefined`) —
   * read-only `Map` access. First slice in Cluster B to expose a read-only
   * `Map`-getter bridge method (slices 19/20/22 are read-only booleans,
   * slice 30 is a read-only integer-getter, slice 32 is a read-only
   * `Set`-getter; slice 33 is the `Map`-getter analogue).
   *
   * Bridge-not-yet-installed edge: cross-file reader uses the pre-existing
   * `instanceof Map && size > 0` gate on the return value. The `instanceof
   * Map` half short-circuits the `undefined` return when the bridge is not
   * yet installed (slice-32's `if (allPools)` truthy-coerce equivalent).
   * The manager.ts writer (`_modifierInstallWatchers = new Map()` at
   * module-init) runs before any `setGxtRenderer` is observable by a
   * reader, so the canonical Map is always populated (though typically
   * empty) when the `getModifierInstallWatchers` getter is callable.
   *
   * Fast-check: implementation is `return _modifierInstallWatchers;` — one
   * variable read; zero allocations. Identical hot-path cost to the
   * pre-slice-33 globalThis read. The reader's `instanceof Map && size > 0`
   * gate continues to dominate the post-slice-33 cost: the empty-Map
   * common-case path takes one Map `size === 0` check and falls through;
   * the rare active-install-frame path takes one `Map.get(obj)` lookup and
   * one typeof check before firing the watcher. The
   * `__gxtModifierInstallWatchers` globalThis slot is DROPPED in this
   * slice — net -1 globalThis surface.
   */
  getModifierInstallWatchers?(): Map<object, () => void> | undefined;

  /**
   * Read-only Array-getter exposing the canonical pending-modifier-destroys
   * queue. Returns the live module-local `_pendingModifierDestroys` Array
   * (always-defined post-slice-39 at module init), `undefined` only when
   * the bridge implementation is not yet installed (defensive optional
   * chain on the method itself). The queue holds entries (heterogeneous —
   * duck-typed by the consumers) of the shape `{ cached: any; destroyable:
   * any; element: HTMLElement; modKey: string; cache: Map<...> | undefined;
   * isCustom?: boolean }` — each entry registered by a modifier
   * destructor closure in `manager.ts` to be drained at end-of-sync-cycle
   * by `compile.ts`'s `__gxtSyncDomNow` Phase-2d drain (firing
   * `destroyModifier` + `destroyDestroyable` for entries whose element has
   * actually been removed from the DOM) or at test-teardown by
   * `internal-test-helpers` (drain in `abstract.ts`, clear in
   * `rendering.ts`).
   *
   * The pending-destroys queue is the back-half of the deferred-destroy
   * protocol that distinguishes a GXT formula re-evaluation (destructor
   * fires, but the SAME modifier formula re-evaluates synchronously and
   * the cached-hit path resets `pendingDestroy = false` without actually
   * destroying) from real element removal (destructor fires, no
   * subsequent re-evaluation, the entry remains in the queue and gets
   * destroyed at end-of-cycle). Because test assertions can run before
   * microtasks, the protocol detects element removal SYNCHRONOUSLY by
   * checking `element.isConnected` at drain time — entries whose element
   * is still attached are skipped (they survived the re-evaluation and
   * the cached-hit path will refresh them on the next install).
   *
   * Slice-39 (Cluster B): graduates the canonical state from the pre-slice-39
   * `globalThis.__gxtPendingModifierDestroys` slot (lazy-initialized by 5
   * writer sites in `manager.ts` — the modifier-install destructor
   * closures at L8682/L8875/L9039/L9311 plus the custom-modifier-manager
   * destructor closure, each running the same lazy-init dance) to the
   * module-local `_pendingModifierDestroys` Array in
   * `gxt-backend/manager.ts` (always-defined at module init). The lazy-
   * init dance at all 5 writer sites is DROPPED: post-slice-39 writers
   * are direct `_pendingModifierDestroys.push(entry)` calls.
   *
   * Reader topology after slice 39:
   *  - intra-file `manager.ts` (1 site — phantom-element migration path
   *    at the custom-modifier-manager install step, L9170 — inspects the
   *    queue for a same-cycle install+destructor pair and reuses the
   *    prior instance, splicing the matched entry out via
   *    `.splice(i, 1)`): routes direct against `_pendingModifierDestroys`
   *    (slice-22/24/27/30/31/32/33 intra-file-reader precedent).
   *  - cross-file `compile.ts` (1 site — `__gxtSyncDomNow` Phase-2d drain
   *    at L6204): routes through `compilePipeline.getPendingModifierDestroys?.()`
   *    and `.splice(0)`s the entire array, per-entry running
   *    `destroyModifier` + `destroyDestroyable` for entries whose element
   *    has actually been removed from the DOM.
   *  - cross-package `internal-test-helpers` (2 sites):
   *      - `test-cases/abstract.ts:87` — test-teardown drain `.splice(0)`s
   *        the array and drains for the destroying view.
   *      - `test-cases/rendering.ts:136` — QUnit between-test reset clears
   *        the array without draining (`.length = 0`).
   *    Both route through `compilePipeline.getPendingModifierDestroys?.()`.
   *
   * Bridge shape decision: single-method read (`getPendingModifierDestroys?():
   * unknown[] | undefined`). Matches the slice-32 read-only `Set`-getter /
   * slice-33 read-only `Map`-getter pattern applied to an `Array`-valued
   * canonical state — same minimal-method shape used for any opaque-
   * reference state with N internal writers + M external readers where
   * the writer's mutation operations don't need to be exposed. The
   * consumer-side mutation surface (`splice` / `length=0`) is a property
   * of the returned array reference, not a bridge contract. No save-
   * restore variant is exposed (no caller needs to temporarily swap the
   * queue).
   *
   * Namespace decision: `compilePipeline`. The canonical state lives in
   * `manager.ts` but the bridge namespace is contributed via the direct
   * `setGxtRenderer` seeding (alongside `syncAllWrappers`,
   * `clearInstancePools`, `snapshotLiveInstances`, the slice-14
   * dynamic-component listener triad, the slice-32 `getAllPoolArrays`
   * getter, and the slice-33 `getModifierInstallWatchers` getter — all
   * manager.ts-canonical compilePipeline methods). Same namespace pattern
   * as slices 13/14/32/33.
   *
   * Bridge interface evolution (slice 39 — thirty-second API change):
   * `GxtCompilePipelineCapabilities` extended with ONE new optional method
   * (`getPendingModifierDestroys?(): unknown[] | undefined`) — read-only
   * `Array` access. First slice in Cluster B to expose a read-only
   * `Array`-getter bridge method (slices 19/20/22 are read-only booleans,
   * slice 30 is a read-only integer-getter, slice 32 is a read-only
   * `Set`-getter, slice 33 is a read-only `Map`-getter; slice 39 is the
   * `Array`-getter analogue — completes the read-only-reference-getter
   * family across `Set` / `Map` / `Array`).
   *
   * Bridge-not-yet-installed edge: cross-file reader uses the pre-
   * existing `if (pd && pd.length > 0)` guard on the return value. The
   * truthy half handles the `undefined` return when the bridge is not
   * yet installed (matching pre-slice-39 `if (pendingDestroys && ...)`
   * where the slot was also potentially `undefined`); the `.length > 0`
   * half short-circuits the empty-Array common case. The `manager.ts`
   * writer (`_pendingModifierDestroys = []` at module-init) runs before
   * any `setGxtRenderer` is observable by a reader, so the canonical
   * Array is always populated (though typically empty between sync
   * cycles) when the `getPendingModifierDestroys` getter is callable.
   *
   * Fast-check: implementation is `return _pendingModifierDestroys;` —
   * one variable read; zero allocations. Identical hot-path cost to the
   * pre-slice-39 globalThis read. The reader's `length > 0` gate
   * continues to dominate the post-slice-39 cost: the empty-Array
   * common-case path takes one length check and falls through; the rare
   * non-empty path takes one `splice(0)` to drain and iterates.
   */
  getPendingModifierDestroys?(): unknown[] | undefined;

  /**
   * Predicate exposing the `__gxtSyncIsPropertyDriven` boolean flag set
   * at the start of `compile.ts`'s `__gxtSyncDomNow` body. The flag
   * mirrors `__gxtHadPendingSync` into a slot that SURVIVES
   * `__gxtForceEmberRerender`'s finally-block clear, so downstream phases
   * (specifically `manager.ts:__gxtDestroyUnclaimedPoolEntries`) can still
   * tell whether the sync was driven by a real property change after the
   * force-rerender pass has cleared `__gxtHadPendingSync`. Without this
   * survivor flag, the destroy-error capture path cannot distinguish a
   * spurious unclaimed sweep (where no user property change drove the
   * sync — e.g. an initial-render sync that ran
   * `__gxtSnapshotLiveInstances` and now sees a newborn instance whose
   * element is disconnected because the morph allocated a fresh wrapper)
   * from a real user-driven sync (where destroy/lifecycle throws ARE
   * captured into `_renderErrors`). Spurious-sweep destroy errors must
   * NOT be captured, or they re-throw out of the next
   * `runAppend`/`runTask` `flushRenderErrors` call.
   *
   * Pre-slice-34 topology:
   *  - Writers (2 sites, intra-file in `compile.ts`):
   *    - `compile.ts:5618` (`__gxtSyncDomNow` body — set to
   *      `!!__gxtPendingSyncFromPropertyChange` at the start of the flush,
   *      mirroring `__gxtHadPendingSync` into the survivor slot).
   *    - `compile.ts:6085` (`__gxtSyncDomNow` body — reset to `false` in
   *      the outer `finally` so a subsequent initial-render sync starts in
   *      a clean state).
   *  - Readers (1 cross-file site):
   *    - `manager.ts:4547` (`__gxtDestroyUnclaimedPoolEntries` — gate
   *      `_outerSuppressCapture = !__gxtSyncIsPropertyDriven`. When
   *      truthy, suppresses the destroy-error capture path in renderer.ts's
   *      `wrappedDestroy`/`wrappedTrigger` for the duration of this
   *      unclaimed-sweep frame, so user-thrown lifecycle errors are NOT
   *      routed into `_renderErrors`).
   *
   * Slice-34 (Cluster B): graduates the canonical state from the pre-
   * slice-34 `globalThis.__gxtSyncIsPropertyDriven` slot to the module-
   * local boolean `_gxtSyncIsPropertyDrivenFlag` in `compile.ts`. The 2
   * intra-file writers route through the module-local
   * `_gxtSetSyncIsPropertyDriven(value)` setter (directly, no bridge
   * indirection — slice-22/24/27/30 intra-file-writer precedent). The 1
   * cross-file reader routes through this bridge predicate
   * `compilePipeline.isSyncIsPropertyDriven?.()` (load-order-safe
   * optional chain — defaults to `undefined`/falsy when the bridge is
   * not yet installed, which means `_outerSuppressCapture` defaults to
   * `true` in that edge — matches pre-slice-34 semantics where the slot
   * would be `undefined`/falsy before the first `__gxtSyncDomNow` call).
   * Net globalThis surface delta: -1 slot (`__gxtSyncIsPropertyDriven`).
   *
   * Bridge shape decision: read-only predicate (single-method
   * `isSyncIsPropertyDriven?(): boolean`). Mirrors slice-20's `isSyncing`,
   * slice-22's `isCurrentlyRendering`, and slice-23's `isInTriggerReRender`
   * — same minimal boolean-getter shape. No setter is exposed: both
   * writers are intra-file in `compile.ts` and use the module-local
   * setter directly. No `with*` save-restore variant is exposed: the
   * writers are straight-line set-true (body start) / set-false (outer
   * `finally`) within a single try/finally pair, mirroring the
   * `_gxtSetSyncing(true)` / `_gxtSetSyncing(false)` pattern in the same
   * `__gxtSyncDomNow` body.
   *
   * Namespace decision: `compilePipeline`. The flag is semantically a
   * scope-modifier on the GXT post-runTask DOM sync pipeline — the
   * writers + body live in `compile.ts` (the pipeline's home file), the
   * reader gates manager.ts's destroy-error capture path on whether the
   * sync flush was property-driven. Same namespace pattern as slices
   * 15/17/18/19/20/22/23/24/29/30.
   *
   * Bridge interface evolution (slice 34 — twenty-seventh API change):
   * `GxtCompilePipelineCapabilities` extended with ONE new optional
   * method (`isSyncIsPropertyDriven?(): boolean`) — read-only predicate
   * access. Mirrors slices 19/20/22 (read-only booleans), 23
   * (`isInTriggerReRender`), and 29's mark+consume pair (without the
   * consume side, since the flag SURVIVES across the
   * `__gxtForceEmberRerender` invocation — its clear is performed by
   * the same `__gxtSyncDomNow` body that set it, NOT by the reader).
   *
   * Bridge-not-yet-installed edge: cross-file reader uses
   * `getGxtRenderer()?.compilePipeline.isSyncIsPropertyDriven?.()` — both
   * optional chains return `undefined` when either the renderer or the
   * method is not yet installed. `_outerSuppressCapture =
   * !undefined === true` (suppression ON), which mirrors pre-slice-34
   * semantics where `globalThis.__gxtSyncIsPropertyDriven === undefined`
   * before the first `__gxtSyncDomNow` call also yielded
   * `_outerSuppressCapture === true`. The reader runs only inside
   * `__gxtDestroyUnclaimedPoolEntries` which is itself reached via
   * Phase 3 of `__gxtSyncDomNow` — and by that point compile.ts's
   * module init (which seeds the bridge via `installCompilePipelinePart`
   * at file EOF) has completed, so the bridge IS installed in
   * practice and the predicate returns the real boolean value.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtSyncIsPropertyDrivenFlag` boolean — one boolean read; zero
   * allocations. Matches slice-20's `isSyncing()` body shape.
   */
  isSyncIsPropertyDriven?(): boolean;

  /**
   * Read the `__gxtHadPendingSync` boolean flag. Returns `true` if the
   * currently-executing `__gxtSyncDomNow` flush observed a real property
   * change (i.e., a `notifyPropertyChange` triggered the sync, NOT a
   * cell-creation-during-initial-render). The flag's lifetime is the
   * `__gxtSyncDomNow` body: it is set to
   * `!!__gxtPendingSyncFromPropertyChange` at the start of the flush
   * (compile.ts:5636), cleared in the Phase-1 second-pass when string-path
   * dynamic-component listeners are present (compile.ts:5763), cleared
   * in `__gxtForceEmberRerender`'s finally-block at glimmer/lib/renderer.ts:1373,
   * cleared in compile.ts's cross-test cleanup (compile.ts:6268), and set
   * TRUE by manager.ts's helper-recompute path (manager.ts:579) before
   * calling `__gxtForceEmberRerender` to force a full-tree morph.
   *
   * Pre-slice-35 readers:
   *  - `gxt-backend/compile.ts:5717` — `__gxtSyncDomNow` body's primary
   *    `gxtSyncDom()` gate (skip the call when no property change drove
   *    the sync).
   *  - `gxt-backend/compile.ts:5745` — `__gxtSyncDomNow` Phase-1 second-
   *    pass post-syncAll `gxtSyncDom()` gate.
   *  - `glimmer/lib/renderer.ts:989` (cross-package) — modifier-replay
   *    gate; stable rerenders without `set()` must NOT trigger modifier
   *    updates.
   *  - `glimmer/lib/renderer.ts:1292` (cross-package) —
   *    `__gxtForceEmberRerender` start; captures the flag value before the
   *    finally-block at L1373 clears it.
   *
   * Slice-35 (Cluster B): graduates the canonical state from the pre-
   * slice-35 `globalThis.__gxtHadPendingSync` slot to the module-local
   * boolean `_gxtHadPendingSyncFlag` in `compile.ts`. The intra-file
   * readers route through the module-local `_gxtGetHadPendingSync()`
   * getter directly (slice-22/24/27/30/31/32/33/34 intra-file-reader
   * precedent). The 2 cross-package readers route through this bridge
   * getter (`compilePipeline.getHadPendingSync?.() ?? false`). Net
   * globalThis surface delta: -1 slot (paired with `setHadPendingSync`).
   *
   * Bridge-not-yet-installed edge: cross-package readers use
   * `getGxtRenderer()?.compilePipeline.getHadPendingSync?.() ?? false`.
   * Both optional chains return `undefined` when either the renderer or
   * the method is not yet installed; the `?? false` coerces to FALSE,
   * which mirrors pre-slice-35 semantics where
   * `globalThis.__gxtHadPendingSync === undefined` (pre-first-sync edge)
   * coerced via `!!` to FALSE. The reader at renderer.ts:989 runs only
   * inside the bridge's morph callback (reached via Phase 2 of
   * `__gxtSyncDomNow`); the reader at renderer.ts:1292 runs only inside
   * `__gxtForceEmberRerender` (reached via Phase 2 of `__gxtSyncDomNow`
   * OR manager.ts:582's helper-recompute path) — by both reach paths
   * `compile.ts`'s module init (which seeds the bridge via
   * `installCompilePipelinePart` at file EOF) has completed, so the
   * bridge IS installed in practice and the getter returns the real
   * boolean value.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtHadPendingSyncFlag` boolean — one boolean read; zero allocations.
   * Matches slice-34's `isSyncIsPropertyDriven()` body shape.
   */
  getHadPendingSync?(): boolean;

  /**
   * Write the `__gxtHadPendingSync` boolean flag. The flag's lifetime and
   * semantics are described in the `getHadPendingSync` doc above.
   *
   * Pre-slice-35 writers (5 sites):
   *  - `gxt-backend/compile.ts:5636` (intra-file, routes through module-
   *    local `_gxtSetHadPendingSync` directly — slice-22/24/27/30/31/32/33/34
   *    intra-file-writer precedent).
   *  - `gxt-backend/compile.ts:5763` (intra-file, routes through module-
   *    local helper directly).
   *  - `gxt-backend/compile.ts:6268` (intra-file, routes through module-
   *    local helper directly).
   *  - `gxt-backend/manager.ts:579` (cross-file — helper recompute path;
   *    sets TRUE before calling `__gxtForceEmberRerender` so the
   *    full-tree morph runs and lets the formula reading the helper cell
   *    re-evaluate). Routes through this bridge setter.
   *  - `glimmer/lib/renderer.ts:1373` (cross-package —
   *    `__gxtForceEmberRerender` finally-block clear). Routes through
   *    this bridge setter.
   *
   * Slice-35 (Cluster B): graduates the canonical state from the pre-
   * slice-35 `globalThis.__gxtHadPendingSync` slot to the module-local
   * boolean `_gxtHadPendingSyncFlag` in `compile.ts`. The 3 intra-file
   * writers route through the module-local `_gxtSetHadPendingSync(value)`
   * setter directly; the 2 cross-file/cross-package writers route through
   * this bridge setter (`compilePipeline.setHadPendingSync?.(value)`).
   * Net globalThis surface delta: -1 slot (paired with `getHadPendingSync`).
   *
   * Bridge-not-yet-installed edge: cross-file writers use
   * `getGxtRenderer()?.compilePipeline.setHadPendingSync?.(value)`. Both
   * optional chains short-circuit to `undefined` (no-op) when either the
   * renderer or the method is not yet installed — the pre-slice-35
   * writers' assignment to `globalThis.__gxtHadPendingSync` also would
   * have been observed only by readers that come AFTER the writer in the
   * `__gxtSyncDomNow` flush, and by the time the writer fires the bridge
   * is installed (the writer sites are inside `__gxtSyncDomNow` /
   * `__gxtForceEmberRerender` / manager.ts's helper-recompute path —
   * all of which run AFTER module init).
   *
   * Bridge shape decision: paired get/set (slice-14 paired-methods
   * pattern) instead of slice-20/22/23/24's read-only predicate because
   * slice 35 has cross-file/cross-package WRITERS (manager.ts:579 +
   * glimmer/lib/renderer.ts:1373) in addition to cross-package readers
   * (renderer.ts:989 + renderer.ts:1292) — both surfaces must be reachable.
   *
   * Fast-check: the implementation writes the module-local
   * `_gxtHadPendingSyncFlag` boolean — one boolean assignment; zero
   * allocations.
   */
  setHadPendingSync?(value: boolean): void;

  /**
   * Read the `__gxtPendingSyncFromPropertyChange` boolean flag. Returns
   * `true` if a real property change (notifyPropertyChange via
   * `__gxtTriggerReRender`) has been observed since the last
   * `__gxtSyncDomNow` flush captured-and-cleared the flag. Distinguishes
   * a property-driven sync from a cell-creation-during-initial-render
   * sync (the latter also sets `__gxtPendingSync` true, but NOT this
   * flag) so `__gxtSyncDomNow` can correctly gate `gxtSyncDom()` and
   * route `__gxtHadPendingSync` / `__gxtSyncIsPropertyDriven` survivor
   * flags into the downstream phases (modifier replay, force-rerender,
   * destroy-error capture).
   *
   * Pre-slice-36 readers (2 sites, both intra-`compile.ts`):
   *  - `compile.ts:5671` — `__gxtSyncDomNow` body — capture into
   *    `_gxtSetHadPendingSync(!!flag)`. The captured `__gxtHadPendingSync`
   *    is then read in Phase 1 gates and cross-package by glimmer's
   *    modifier-replay + force-rerender-start sites.
   *  - `compile.ts:5683` — `__gxtSyncDomNow` body — capture into
   *    `_gxtSetSyncIsPropertyDriven(!!flag)`. The captured
   *    `__gxtSyncIsPropertyDriven` is then read cross-file in manager.ts's
   *    `__gxtDestroyUnclaimedPoolEntries` destroy-error capture gate.
   *
   * Slice-36 (Cluster B): graduates the canonical state from the pre-
   * slice-36 `globalThis.__gxtPendingSyncFromPropertyChange` slot to the
   * module-local boolean `_gxtPendingSyncFromPropertyChangeFlag` in
   * `compile.ts`. The 2 intra-file readers route through the module-
   * local `_gxtGetPendingSyncFromPropertyChange()` getter directly
   * (slice-22/24/27/30/31/32/33/34/35 intra-file-reader precedent). No
   * cross-package readers exist in the pre-slice-36 topology — the bridge
   * getter exists for symmetry with the setter and for potential future
   * consumers (e.g. test-helpers that need to inspect the flag before
   * clearing it). Net globalThis surface delta: -1 slot (paired with
   * `setPendingSyncFromPropertyChange`).
   *
   * Bridge-not-yet-installed edge: callers that route through this
   * bridge getter use `getGxtRenderer()?.compilePipeline.getPendingSyncFromPropertyChange?.() ?? false`.
   * Both optional chains return `undefined` when either the renderer or
   * the method is not yet installed; the `?? false` coerces to FALSE,
   * which mirrors pre-slice-36 semantics where
   * `globalThis.__gxtPendingSyncFromPropertyChange === undefined`
   * (pre-first-sync edge) coerced via `!!` to FALSE.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtPendingSyncFromPropertyChangeFlag` boolean — one boolean read;
   * zero allocations. Matches slice-35's `getHadPendingSync()` body shape.
   */
  getPendingSyncFromPropertyChange?(): boolean;

  /**
   * Write the `__gxtPendingSyncFromPropertyChange` boolean flag. The
   * flag's lifetime and semantics are described in the
   * `getPendingSyncFromPropertyChange` doc above.
   *
   * Pre-slice-36 writers (14 sites — see migration history docblock at
   * top of this interface for the full list). Slice 36 routes intra-
   * `compile.ts` writers (5 sites) through the module-local
   * `_gxtSetPendingSyncFromPropertyChange(value)` setter directly; the
   * cross-file `manager.ts` writers (4 sites — post-render-hooks save/
   * restore + handler-tail clear), the 2 cross-package writers
   * (templates/root.ts:1075 outlet rerender + routing/router.ts:106
   * transition LinkTo), and the 7 test-helper writers (3 in `run.ts` +
   * 1 each in `test-cases/{rendering,abstract,abstract-application}.ts`)
   * route through this bridge setter (`compilePipeline.setPendingSyncFromPropertyChange?.(value)`).
   *
   * The test-helper writer-contract: clear the flag in
   * `teardown` / `runTask` / `runAppend` / `render` tail-finally blocks
   * so the setInterval(16ms) fallback flusher does NOT pick up stale
   * sync state from the previous test. This is the FIRST slice to
   * route test-helper writers through the bridge — establishes the
   * pattern that flag 1 (`__gxtPendingSync`) will reuse in slice 37.
   *
   * Slice-36 (Cluster B): graduates the canonical state from the pre-
   * slice-36 `globalThis.__gxtPendingSyncFromPropertyChange` slot to the
   * module-local boolean `_gxtPendingSyncFromPropertyChangeFlag` in
   * `compile.ts`. Net globalThis surface delta: -1 slot (paired with
   * `getPendingSyncFromPropertyChange`).
   *
   * Bridge-not-yet-installed edge: cross-file/cross-package/test-helper
   * writers use `getGxtRenderer()?.compilePipeline.setPendingSyncFromPropertyChange?.(value)`.
   * Both optional chains short-circuit to `undefined` (no-op) when the
   * renderer or the method is not yet installed. This is load-order-
   * safe because the writers fire AFTER module init in practice
   * (`runTask` / `runAppend` / `teardown` paths all run after
   * compile.ts's `installCompilePipelinePart` at file EOF has executed).
   *
   * Bridge shape decision: paired get/set (slice-14/35 paired-methods
   * pattern) because slice 36 has cross-file/cross-package WRITERS
   * across 4 packages (manager.ts + templates/root.ts + routing/router.ts
   * + internal-test-helpers) — the setter surface must be reachable
   * from all of them. No `with*` save-restore variant: the only save-
   * restore-shaped writer pair is manager.ts:4327-4357's
   * `__gxtPostRenderHooks` save/restore, which operates on TWO flags
   * (`__gxtPendingSync` and `__gxtPendingSyncFromPropertyChange`) — a
   * single-flag `with*` helper would not match its shape.
   *
   * Fast-check: the implementation writes the module-local
   * `_gxtPendingSyncFromPropertyChangeFlag` boolean — one boolean
   * assignment; zero allocations.
   */
  setPendingSyncFromPropertyChange?(value: boolean): void;

  /**
   * Read the `__gxtPendingSync` boolean flag. Returns `true` if any DOM
   * sync is pending (set by cell-effect scheduling via
   * `__gxtExternalSchedule`, by a real property change observed by
   * `__gxtTriggerReRender`, by a force-rerender invalidation in
   * `RootState.revalidate`, by an outlet model update in
   * `templates/root.ts`, by a route transition in `routing/router.ts`,
   * or by a post-render hook re-entry in `__gxtPostRenderHooks`). The
   * flag is the master pending-sync gate — `__gxtSyncDomNow`'s body
   * checks it first to skip its work when nothing is pending, and the
   * setInterval(16ms) fallback flusher uses it to know when to call
   * `__gxtSyncDomNow()`.
   *
   * Pre-slice-37 readers (6 sites):
   *  - `compile.ts:5730` — `__gxtSyncDomNow` body — gate primary sync.
   *  - `compile.ts:6346` — setInterval(16ms) fallback gate.
   *  - `manager.ts:4335` — `__gxtPostRenderHooks` save-read.
   *  - `manager.ts:4356` — `__gxtPostRenderHooks` produced-changes read.
   *  - `manager.ts:4368` — `__gxtPostRenderHooks` OR-restore read.
   *  - `glimmer/lib/renderer.ts:1275` — `_backburner` end event — gate
   *    the post-end syncDomNow flush (only on outermost runloop end +
   *    not inside runTask).
   *  - `runloop/index.ts:68` — runloop `onEnd` hook — gate the GXT
   *    DOM-sync flush at the end of the outermost runloop (only when
   *    not inside runTask).
   *
   * Slice-37 (Cluster B): graduates the canonical state from the pre-
   * slice-37 `globalThis.__gxtPendingSync` slot to the module-local
   * boolean `_gxtPendingSyncFlag` in `compile.ts`. The 2 intra-file
   * readers route through the module-local `_gxtGetPendingSync()` getter
   * directly; the 3 cross-file `manager.ts` readers and 2 cross-package
   * readers (`glimmer/lib/renderer.ts` + `runloop/index.ts`) route
   * through this bridge getter. Net globalThis surface delta: -1 slot
   * (paired with `setPendingSync`). CLOSES the 4-flag pending-sync
   * cluster.
   *
   * Bridge-not-yet-installed edge: callers that route through this
   * bridge getter use `getGxtRenderer()?.compilePipeline.getPendingSync?.() ?? false`.
   * Both optional chains return `undefined` when either the renderer or
   * the method is not yet installed; the `?? false` coerces to FALSE,
   * which mirrors pre-slice-37 semantics where
   * `globalThis.__gxtPendingSync === undefined` (pre-first-sync edge)
   * coerced via `!!` to FALSE.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtPendingSyncFlag` boolean — one boolean read; zero allocations.
   * Matches slice-35/36's `get*` body shape.
   */
  getPendingSync?(): boolean;

  /**
   * Write the `__gxtPendingSync` boolean flag. The flag's lifetime and
   * semantics are described in the `getPendingSync` doc above.
   *
   * Pre-slice-37 writers (15 sites — see migration history docblock at
   * top of this interface for the full list). Slice 37 routes intra-
   * `compile.ts` writers (4 sites; the init writer at L3065 is DROPPED
   * since the module-local boolean defaults to `false`) through the
   * module-local `_gxtSetPendingSync(value)` setter directly; the
   * cross-file `manager.ts` writers (4 sites — post-render-hooks save/
   * restore + handler-tail clear), the 3 cross-package writers
   * (renderer.ts:1679 revalidate + templates/root.ts:1074 outlet +
   * routing/router.ts:111 transition), and the 5 test-helper writers
   * (2 in `run.ts` + 1 each in `test-cases/{rendering, abstract,
   * abstract-application}.ts`) route through this bridge setter.
   *
   * Slice-37 (Cluster B): graduates the canonical state from the pre-
   * slice-37 `globalThis.__gxtPendingSync` slot to the module-local
   * boolean `_gxtPendingSyncFlag` in `compile.ts`. Net globalThis
   * surface delta: -1 slot (paired with `getPendingSync`).
   *
   * Bridge-not-yet-installed edge: cross-file/cross-package/test-helper
   * writers use `getGxtRenderer()?.compilePipeline.setPendingSync?.(value)`.
   * Both optional chains short-circuit to `undefined` (no-op) when the
   * renderer or the method is not yet installed. This is load-order-
   * safe because the writers fire AFTER module init in practice
   * (`runTask` / `runAppend` / `teardown` / outlet rerender / transition
   * / revalidate paths all run after compile.ts's
   * `installCompilePipelinePart` at file EOF has executed).
   *
   * Bridge shape decision: paired get/set (slice-14/35/36 paired-
   * methods pattern, same as slice 36) because slice 37 has cross-
   * file/cross-package WRITERS across 5 packages (manager.ts +
   * glimmer/lib/renderer.ts + glimmer/lib/templates/root.ts +
   * routing/router.ts + internal-test-helpers) — the setter surface
   * must be reachable from all of them. No `with*` save-restore variant
   * is exposed: the save-restore in manager.ts:4327-4357 operates on
   * TWO flags (`__gxtPendingSync` and `__gxtPendingSyncFromPropertyChange`)
   * and a single-flag wrap would split the atomic two-flag save into
   * two independent save/restore frames (slice-36 empirical finding
   * #2). Closes the 4-flag pending-sync cluster.
   *
   * Fast-check: the implementation writes the module-local
   * `_gxtPendingSyncFlag` boolean — one boolean assignment; zero
   * allocations.
   */
  setPendingSync?(value: boolean): void;

  /**
   * Read the `__gxtRunTaskActive` boolean flag. Returns `true` if a
   * `runTask` or `runAppend` body is currently executing — i.e., the
   * test helper has opened its body via `setRunTaskActive(true)` and has
   * not yet entered its `finally` block to clear the flag. The flag's
   * sole consumer purpose is to gate cross-package post-end DOM-sync
   * flushes: when `runTask` / `runAppend` is active, the runloop's
   * `onEnd` hook (`runloop/index.ts:84`) and the `_backburner.on('end')`
   * listener (`glimmer/lib/renderer.ts:1282`) MUST skip their post-end
   * `__gxtSyncDomNow()` flush, because the test helper will perform its
   * own explicit sync after the user's body completes. Without this
   * gate, both sites would double-sync during `runTask` and re-evaluate
   * each-formulas with stale values.
   *
   * Pre-slice-38 readers (2 sites, both cross-package — paired
   * topologically with slice 37's `getPendingSync` readers at the SAME
   * sites):
   *  - `glimmer/lib/renderer.ts:1282` — `_backburner.on('end', ...)`
   *    listener — gate the post-end syncDomNow flush.
   *  - `runloop/index.ts:84` — runloop `onEnd` hook — gate the GXT
   *    DOM-sync flush at the end of the outermost runloop.
   *
   * Slice-38 (Cluster B): graduates the canonical state from the pre-
   * slice-38 `globalThis.__gxtRunTaskActive` slot to the module-local
   * boolean `_gxtRunTaskActiveFlag` in `compile.ts`. The 2 cross-package
   * readers route through this bridge getter. Net globalThis surface
   * delta: -1 slot (paired with `setRunTaskActive`). Closes the
   * "pending-sync gate cluster" alongside slice 37.
   *
   * Bridge-not-yet-installed edge: callers that route through this
   * bridge getter use `getGxtRenderer()?.compilePipeline.getRunTaskActive?.() ?? false`.
   * Both optional chains return `undefined` when either the renderer or
   * the method is not yet installed; the `?? false` coerces to FALSE,
   * which mirrors pre-slice-38 semantics where
   * `globalThis.__gxtRunTaskActive === undefined` (pre-first-runTask
   * edge) coerced via `!!` to FALSE.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtRunTaskActiveFlag` boolean — one boolean read; zero
   * allocations. Matches slice-35/36/37's `get*` body shape.
   */
  getRunTaskActive?(): boolean;

  /**
   * Write the `__gxtRunTaskActive` boolean flag. The flag's lifetime
   * and semantics are described in the `getRunTaskActive` doc above.
   *
   * Pre-slice-38 writers (4 sites, all test-helper):
   *  - `internal-test-helpers/lib/run.ts:15` — `runAppend` body open —
   *    set TRUE before `run(view, 'appendTo')`.
   *  - `internal-test-helpers/lib/run.ts:35` — `runAppend` finally —
   *    clear after `appendTo` body completes.
   *  - `internal-test-helpers/lib/run.ts:130` — `runTask` body open —
   *    set TRUE before `run(callback)`.
   *  - `internal-test-helpers/lib/run.ts:143` — `runTask` finally —
   *    clear after `run(callback)` body completes.
   *
   * Slice 38 routes all 4 test-helper writers through this bridge
   * setter (`compilePipeline.setRunTaskActive(value)`). Slice 38 has no
   * intra-`compile.ts` writers (the flag has no intra-file references).
   *
   * Slice-38 (Cluster B): graduates the canonical state from the pre-
   * slice-38 `globalThis.__gxtRunTaskActive` slot to the module-local
   * boolean `_gxtRunTaskActiveFlag` in `compile.ts`. Net globalThis
   * surface delta: -1 slot (paired with `getRunTaskActive`).
   *
   * Bridge-not-yet-installed edge: the 4 test-helper writers use
   * `getGxtRenderer()?.compilePipeline.setRunTaskActive?.(value)`. Both
   * optional chains short-circuit to `undefined` (no-op) when the
   * renderer or the method is not yet installed. This is load-order-
   * safe because the writers fire AFTER module init in practice
   * (`runTask` / `runAppend` are test-driven and run after compile.ts's
   * `installCompilePipelinePart` at file EOF has executed). If the
   * write is dropped pre-install, the flag stays FALSE and the
   * cross-package readers correctly read FALSE — matching pre-slice-38
   * semantics where `globalThis.__gxtRunTaskActive === undefined`
   * coerced to FALSE.
   *
   * Bridge shape decision: paired get/set (slice-14/35/36/37 paired-
   * methods pattern, same as slice 37) because slice 38 has cross-
   * package WRITERS (test-helper `run.ts`) and cross-package READERS
   * (`renderer.ts` + `runloop/index.ts`) — both surfaces must be
   * reachable. Closes the "pending-sync gate cluster" alongside slice
   * 37.
   *
   * Fast-check: the implementation writes the module-local
   * `_gxtRunTaskActiveFlag` boolean — one boolean assignment; zero
   * allocations.
   */
  setRunTaskActive?(value: boolean): void;

  /**
   * Read the `__gxtAfterRenderPropertyChange` boolean flag. Returns `true`
   * if a property change was observed by `_gxtTriggerReRender` while
   * `__gxtInAfterRender` was true — i.e., a `set(...)` fired inside a
   * `schedule('afterRender', cb)` callback. Used by `runAppend` in
   * `internal-test-helpers/lib/run.ts:49` (paired with
   * `setAfterRenderPropertyChange(false)` clear on the same logical step)
   * to decide whether to preserve `__gxtPendingSyncFromPropertyChange` for
   * the subsequent `syncNow()` call. TRUE means the change is a legitimate
   * `afterRender set` pattern (`didInsertElement` queues a set that must
   * re-render the DOM before the test assertion) and must trigger
   * gxtSyncDom; FALSE means the change was init-artifact noise (e.g.,
   * Textarea's internal bindings during component init) that should not
   * cause a post-runAppend full sync.
   *
   * Pre-slice-40 readers (1 site, cross-package — paired with the
   * clearer on the same logical step):
   *  - `internal-test-helpers/lib/run.ts:49` — `runAppend` post-`appendTo`
   *    block — reads the flag into a local (`afterRenderChanged`) to gate
   *    the `setPendingSyncFromPropertyChange(false)` reset below.
   *
   * Slice-40 (Cluster B): graduates the canonical state from the pre-
   * slice-40 `globalThis.__gxtAfterRenderPropertyChange` slot to the
   * module-local boolean `_gxtAfterRenderPropertyChangeFlag` in
   * `compile.ts`. The 1 cross-package reader routes through this bridge
   * getter. Net globalThis surface delta: -1 slot (paired with
   * `setAfterRenderPropertyChange`).
   *
   * Bridge-not-yet-installed edge: callers that route through this bridge
   * getter use
   * `getGxtRenderer()?.compilePipeline.getAfterRenderPropertyChange?.() ?? false`.
   * Both optional chains return `undefined` when either the renderer or
   * the method is not yet installed; the `?? false` coerces to FALSE,
   * which mirrors pre-slice-40 semantics where
   * `globalThis.__gxtAfterRenderPropertyChange === undefined` (pre-first-
   * `_gxtTriggerReRender`-in-afterRender edge) coerced via `Boolean(...)`
   * to FALSE.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtAfterRenderPropertyChangeFlag` boolean — one boolean read; zero
   * allocations. Matches slice-35/36/37/38's `get*` body shape.
   */
  getAfterRenderPropertyChange?(): boolean;

  /**
   * Write the `__gxtAfterRenderPropertyChange` boolean flag. The flag's
   * lifetime and semantics are described in the
   * `getAfterRenderPropertyChange` doc above.
   *
   * Pre-slice-40 writers (1 site, cross-package — `run.ts` clearer; the
   * intra-`compile.ts` SET-TRUE writer at compile.ts:4082 routes via the
   * intra-file helper directly and does NOT use this bridge setter):
   *  - `internal-test-helpers/lib/run.ts:50` — `runAppend` post-`appendTo`
   *    block — clear the flag unconditionally after the
   *    `getAfterRenderPropertyChange()` read above (per-`runAppend`-cycle
   *    state).
   *
   * Slice 40 routes the 1 cross-package clearer through this bridge
   * setter (`compilePipeline.setAfterRenderPropertyChange(value)`). The
   * 1 intra-`compile.ts` writer (SET-TRUE inside the `__gxtInAfterRender`
   * gate) routes via the module-local `_gxtSetAfterRenderPropertyChange`
   * helper directly — slice-22/24/27/30/31/32/33/34/35/36/37/38 intra-
   * file-writer precedent.
   *
   * Slice-40 (Cluster B): graduates the canonical state from the pre-
   * slice-40 `globalThis.__gxtAfterRenderPropertyChange` slot to the
   * module-local boolean `_gxtAfterRenderPropertyChangeFlag` in
   * `compile.ts`. Net globalThis surface delta: -1 slot (paired with
   * `getAfterRenderPropertyChange`).
   *
   * Bridge-not-yet-installed edge: the cross-package clearer uses
   * `getGxtRenderer()?.compilePipeline.setAfterRenderPropertyChange?.(value)`.
   * Both optional chains short-circuit to `undefined` (no-op) when the
   * renderer or the method is not yet installed. This is load-order-
   * safe because the clearer fires AFTER module init in practice
   * (`runAppend` is test-driven and runs after compile.ts's
   * `installCompilePipelinePart` at file EOF has executed). If the clear
   * is dropped pre-install, the flag stays FALSE (module-init value) and
   * the reader correctly reads FALSE — matching pre-slice-40 semantics
   * where `globalThis.__gxtAfterRenderPropertyChange === undefined`
   * coerced to FALSE.
   *
   * Bridge shape decision: paired get/set (slice-14/35/36/37/38 paired-
   * methods pattern, same as slice 38) because slice 40 has a cross-
   * package READER+CLEARER — both `getAfterRenderPropertyChange()` and
   * `setAfterRenderPropertyChange(false)` surfaces must be reachable
   * from `run.ts`.
   *
   * Fast-check: the implementation writes the module-local
   * `_gxtAfterRenderPropertyChangeFlag` boolean — one boolean assignment;
   * zero allocations.
   */
  setAfterRenderPropertyChange?(value: boolean): void;

  /**
   * Read the `__gxtInAfterRender` boolean flag. Returns `true` if a
   * `schedule('afterRender', cb)` wrapped callback body is currently
   * executing — i.e., we are nested inside `gxtAfterRenderWrapper` at
   * `@ember/runloop/index.ts:512-521`. Used by `_gxtTriggerReRender`
   * in `compile.ts:4129` to gate slice 40's
   * `_gxtSetAfterRenderPropertyChange(true)` setter — i.e., to decide
   * whether a property change observed during a re-render trigger
   * originated from inside an `afterRender` callback (the classic
   * `afterRender set` pattern where `didInsertElement` queues a
   * `set(...)` that must re-render the DOM before the test assertion).
   *
   * Also used by the `gxtAfterRenderWrapper` itself (cross-package
   * `runloop/index.ts:514`) to capture the previous value before
   * opening the gate (`(prev = read(); setInAfterRender(true); try { ...
   * } finally { setInAfterRender(prev); }`) — the save half of the
   * save/set/finally-restore triplet.
   *
   * Pre-slice-41 readers (1 site, intra-`compile.ts`; the cross-package
   * `runloop/index.ts:514` save-step read also routes through this
   * getter post-slice-41 — but pre-slice-41 the save read was a direct
   * `(globalThis as any).__gxtInAfterRender` read):
   *  - `compile.ts:4129` — `_gxtTriggerReRender` body — gates slice
   *    40's `_gxtSetAfterRenderPropertyChange(true)` setter.
   *
   * Slice-41 (Cluster B): graduates the canonical state from the pre-
   * slice-41 `globalThis.__gxtInAfterRender` slot to the module-local
   * boolean `_gxtInAfterRenderFlag` in `compile.ts`. The intra-file
   * reader (compile.ts:4129) routes through the module-local helper
   * directly. The cross-package save-step read (runloop/index.ts:514)
   * routes through this bridge getter. Net globalThis surface delta:
   * -1 slot (paired with `setInAfterRender`).
   *
   * Bridge-not-yet-installed edge: callers that route through this
   * bridge getter use
   * `getGxtRenderer()?.compilePipeline.getInAfterRender?.() ?? false`.
   * Both optional chains return `undefined` when either the renderer
   * or the method is not yet installed; the `?? false` coerces to
   * FALSE, which mirrors pre-slice-41 semantics where
   * `globalThis.__gxtInAfterRender === undefined` (pre-first-
   * `schedule('afterRender', cb)` edge) coerced via truthiness to
   * FALSE.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtInAfterRenderFlag` boolean — one boolean read; zero
   * allocations. Matches slice-35/36/37/38/40's `get*` body shape.
   */
  getInAfterRender?(): boolean;

  /**
   * Write the `__gxtInAfterRender` boolean flag. The flag's lifetime
   * and semantics are described in the `getInAfterRender` doc above.
   *
   * Pre-slice-41 writers (3 sites, all intra-`@ember/runloop/index.ts`
   * `gxtAfterRenderWrapper` body — the save/set/finally-restore
   * triplet around a wrapped `schedule('afterRender', cb)` user
   * callback). The save step uses `getInAfterRender` (above), the
   * set TRUE and finally-restore steps both use this setter:
   *  - `runloop/index.ts:515` — `gxtAfterRenderWrapper` body —
   *    open the gate (`setInAfterRender(true)`) before
   *    `origFn.apply(this, a)`.
   *  - `runloop/index.ts:519` — `gxtAfterRenderWrapper` finally —
   *    restore the previous value (`setInAfterRender(prev)`) after
   *    the user callback returns or throws. Supports nested
   *    `schedule('afterRender', ...)` frames if any (though no test
   *    exercises a nested pattern; the saved `prev` may be TRUE in
   *    nested flow, FALSE otherwise — the restore is correct in
   *    both cases).
   *
   * Slice 41 routes both cross-package writers (set TRUE + finally
   * restore) through this bridge setter
   * (`compilePipeline.setInAfterRender(value)`). The intra-`compile.ts`
   * reader (compile.ts:4129) routes via the intra-file helper directly
   * — slice-22/24/27/30/31/32/33/34/35/36/37/38/40 intra-file-reader
   * precedent.
   *
   * Slice-41 (Cluster B): graduates the canonical state from the pre-
   * slice-41 `globalThis.__gxtInAfterRender` slot to the module-local
   * boolean `_gxtInAfterRenderFlag` in `compile.ts`. Net globalThis
   * surface delta: -1 slot (paired with `getInAfterRender`).
   *
   * Bridge-not-yet-installed edge: the cross-package writers use
   * `getGxtRenderer()?.compilePipeline.setInAfterRender?.(value)`.
   * Both optional chains short-circuit to `undefined` (no-op) when
   * the renderer or the method is not yet installed. This is load-
   * order-safe because the wrapper-body writes fire only AFTER
   * module init in practice (the wrapper closure is built lazily
   * inside `schedule(...)` and the wrapped body runs inside
   * backburner's afterRender queue, which is well past gxt-backend
   * module init — by the time a `schedule('afterRender', cb)`
   * callback actually fires, compile.ts's `installCompilePipelinePart`
   * at file EOF has run and the setter is installed). If the writes
   * are dropped pre-install (impossible in practice), the flag stays
   * FALSE (module-init value) and the reader correctly reads FALSE
   * — matching pre-slice-41 semantics where
   * `globalThis.__gxtInAfterRender === undefined` coerced to FALSE.
   *
   * Bridge shape decision: paired get/set (slice-14/35/36/37/38/40
   * paired-methods pattern, same as slice 40) because slice 41 has a
   * cross-package WRITER triplet (`runloop/index.ts` save/set/restore)
   * that needs both `getInAfterRender()` (for the save read) and
   * `setInAfterRender()` (for the set TRUE and the finally restore)
   * surfaces reachable from `runloop/index.ts`.
   *
   * Fast-check: the implementation writes the module-local
   * `_gxtInAfterRenderFlag` boolean — one boolean assignment; zero
   * allocations.
   */
  setInAfterRender?(value: boolean): void;

  /**
   * Read the `__gxtMutContext` runtime context value. Returns the component
   * render context (`unknown` because callers in compile.ts handle it as
   * an opaque component instance — the same `this` value of the template
   * that invoked `(mut ...)` or `(__mutGet ...)`) captured by the most
   * recent active save/set frame, or `undefined` when no `mut` / `__mutGet`
   * dispatch is currently in flight (module-init default; pre-slice-42
   * the corresponding state was `globalThis.__gxtMutContext === undefined`).
   *
   * Used by `compile.ts`'s `__EMBER_BUILTIN_HELPERS__.mut` and
   * `__EMBER_BUILTIN_HELPERS__.__mutGet` helper bodies to capture the
   * dispatching component's `this` for the returned `mutCell` closure's
   * two-way-binding source-getter lookup. The capture must happen at
   * helper-creation time (inside the helper body, NOT inside the inner
   * `mutCell` closure) because the helper body runs while the
   * `ember-gxt-wrappers.ts` save/set/finally-restore triplet is open
   * (i.e., between `setMutContext(ctx)` and `setMutContext(prevCtx)`);
   * the inner `mutCell` closure runs LATER (e.g., when the user clicks
   * an `<input>` and a `set(...)` is dispatched), well after the writer
   * frame has unwound and the global slot has been restored to its
   * previous value.
   *
   * Pre-slice-42 readers (2 sites, both intra-`compile.ts`):
   *  - `compile.ts:6906` — `__EMBER_BUILTIN_HELPERS__.mut` body.
   *  - `compile.ts:7209` — `__EMBER_BUILTIN_HELPERS__.__mutGet` body.
   *
   * Slice-42 (Cluster B): graduates the canonical state from the pre-
   * slice-42 `globalThis.__gxtMutContext` slot to the module-local
   * `_gxtMutContext` in `ember-gxt-wrappers.ts`. The cross-package
   * readers (compile.ts) route through this bridge getter. Net
   * globalThis surface delta: -1 slot (paired with `setMutContext`).
   *
   * Bridge-not-yet-installed edge: callers that route through this
   * bridge getter use
   * `getGxtRenderer()?.compilePipeline.getMutContext?.()`. Both optional
   * chains return `undefined` when either the renderer or the method is
   * not yet installed, which mirrors pre-slice-42 semantics where
   * `globalThis.__gxtMutContext === undefined` (pre-first-`(mut ...)`
   * dispatch edge). The bridge slot is installed by
   * `ember-gxt-wrappers.ts` at its module-init time (via the
   * `installCompilePipelinePart({ getMutContext, setMutContext })`
   * block) — that runs before compile.ts's
   * `(globalThis as any).__EMBER_BUILTIN_HELPERS__ = { ... mut,
   * __mutGet ... }` assignment finishes module-init, so by the time
   * the helper bodies actually fire at template-render time the bridge
   * slot is guaranteed to be populated.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtMutContext` value — one property read; zero allocations.
   * Matches slice-35/36/37/38/40/41's `get*` body shape (modulo the
   * `unknown` return type, which carries no runtime cost).
   */
  getMutContext?(): unknown;

  /**
   * Write the `__gxtMutContext` runtime context value. The value's
   * lifetime and semantics are described in the `getMutContext` doc
   * above.
   *
   * Pre-slice-42 writers (6 sites, all intra-`ember-gxt-wrappers.ts`,
   * two save/set/finally-restore triplets around `helper(...)`
   * invocations):
   *  - `ember-gxt-wrappers.ts:530-536` — `__mutGet` branch
   *    save/set/finally-restore triplet.
   *  - `ember-gxt-wrappers.ts:592-599` — `mut` branch save/set/
   *    finally-restore triplet.
   *
   * Slice 42 routes the 6 intra-file writers through the module-local
   * `_gxtSetMutContext` helper directly (slice-22/24/27/30/31/32/33/
   * 34/35/36/37/38/40/41 intra-file-writer precedent); this bridge
   * setter is exposed for symmetry/future cross-package writers (none
   * exist today, but the symmetric API is preserved for the
   * paired-methods consistency).
   *
   * Slice-42 (Cluster B): graduates the canonical state from the pre-
   * slice-42 `globalThis.__gxtMutContext` slot to the module-local
   * `_gxtMutContext` in `ember-gxt-wrappers.ts`. Net globalThis
   * surface delta: -1 slot (paired with `getMutContext`).
   *
   * Bridge-not-yet-installed edge: no cross-package writers today, so
   * this edge is theoretical. If a future cross-package writer were
   * added, it would use
   * `getGxtRenderer()?.compilePipeline.setMutContext?.(value)`; both
   * optional chains short-circuit to `undefined` (no-op) when the
   * renderer or the method is not yet installed. Load-order-safe in
   * the same way as `getMutContext` (the bridge slot is populated at
   * ember-gxt-wrappers.ts module-init time, well before any template
   * render fires).
   *
   * Bridge shape decision: paired get/set (slice-14/35/36/37/38/40/41
   * paired-methods pattern, same as slice 41) — even though slice 42
   * has no cross-package writers today, the symmetric API is preserved
   * to match the paired-methods cluster (the unused setter has the
   * same cost as a no-op interface declaration — zero runtime impact,
   * minor TS-only signature footprint).
   *
   * Fast-check: the implementation writes the module-local
   * `_gxtMutContext` value — one property assignment; zero
   * allocations.
   */
  setMutContext?(value: unknown): void;
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
 * Slice 49 update (orphan retirement):
 *  - `__gxtIsInRenderPass` — RETIRED in slice 49. The pre-slice-49 note
 *    here described a deferred migration to a typed `isInRenderPass()`
 *    method on the bridge, justified by alleged cross-package readers
 *    in `metal/tracked.ts`. That note was STALE: a pre-flight grep
 *    across `packages/@ember/-internals/metal/` at slice-49 time
 *    returned zero hits. The globalThis slot had no active readers
 *    anywhere in `packages/` — it was a write-only orphan. Slice 49
 *    deletes both writers in `manager.ts` (entry-arm + exit-disarm)
 *    with no replacement; the module-local `_isInRenderPass` const
 *    (already the source of truth for the lone in-file reader at
 *    `markTemplateRendered`) is unchanged. See the slice-49 entry in
 *    the migration-history docblock above `GxtCompilePipelineCapabilities`
 *    for the full topology.
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
   * module-local `_gxtDirtyRootsAtSync` in `renderer.ts` (slice 46 —
   * graduated from `(globalThis as any).__gxtDirtyRootsAtSync`), then
   * update each root's `gxtLastTagValue` to match the current value. Used
   * by `__gxtSyncDomNow`'s Phase 1b — after cell-based updates have
   * applied, roots are marked clean so the Phase 2b force-rerender doesn't
   * re-fire on already-applied changes.
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
