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
 *  - `__gxtClearInstancePools` (manager.ts:9249 reassigns) — wrap-by-reassignment.
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
   * before-body (set `__gxtSyncAllInFlightPass` / `__gxtSyncAllInFlightCycle`,
   * pre-wrap pool-instance `trigger`s for fire-tracking) and after-body
   * (clear in-flight state, dispatch DC change listeners) into the canonical
   * function body. State referenced by both halves of the wrap is shared via
   * globalThis (`__gxtAllPoolArrays`, `__gxtSyncCycleId`, `__dcChangeListeners`)
   * — no closures had to move, so the slice-3 relocation pattern applied
   * directly (first wrap-by-reassignment to use it; slices 8/10/11 used the
   * host-hook pattern instead because their wrap bodies closed over compile.ts
   * module-local state).
   *
   * Previously: `(globalThis as any).__gxtSyncAllWrappers`. The globalThis
   * writer is RETAINED for dual exposure: ember-gxt-wrappers.ts no longer
   * needs to reassign the global (its DC-listener after-callback is folded
   * into the canonical body), but other globalThis readers may still exist
   * outside the source tree (the function name is a documented integration
   * surface). A future slice can remove the dual exposure once all readers
   * route through the bridge.
   */
  syncAllWrappers(): void;

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
 * '@lifeart/gxt'` and re-exports the runtime-hbs-flavored namespace), consumed
 * by manager.ts to obtain the SAME `@lifeart/gxt` namespace object that GXT's
 * internal manager-handler functions close over. This is needed so manager.ts
 * can mutate the original `$_MANAGERS` object in place (GXT's `$_maybeHelper`
 * etc. capture a reference to it at module-init time; replacing the object
 * wholesale would not be observed).
 *
 * Slice-7 design: a tiny one-method namespace, populated via the install-API
 * pattern introduced in slice 6 (`installRuntimePart`). The writer file
 * (`gxt-with-runtime-hbs.ts`) does NOT live in `manager.ts`, so we use a
 * partial-install API rather than an initial `setGxtRenderer` field. This
 * also validates the pattern with a SECOND non-manager.ts writer.
 *
 * NOT included in this slice (defer to future slices):
 *  - `__gxtOriginalManagers` — also written by `gxt-with-runtime-hbs.ts:219`
 *    AND by `compile.ts:6023`. Two writers + the deferred-retry consumer in
 *    `manager.ts:12402` make this materially more complex than slice 7's
 *    one-writer/one-reader scope. Defer until a dedicated slice can handle
 *    the dual-write semantics.
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
