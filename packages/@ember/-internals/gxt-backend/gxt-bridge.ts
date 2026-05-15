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
 *  - `__gxtAssertNotResolvedHelperAsNamedArg` (compile.ts) — retired in
 *    Cluster B slice 74 via inline-emission (slice-72-style). The guard body
 *    is now declared at the outer Function() scope of the emitted
 *    `templateFnCode`, gated on detection of the rewritten named-arg helper
 *    pattern. No runtime bridge target needed.
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
 * Slice-69 (Cluster B): extends the `viewUtils` namespace with the
 * `getWrapperUserFalseSet(): Set<string> | undefined` accessor. The Set is
 * owned by compile.ts as the module-local `_wrapperIfUserFalse` (the
 * canonical source of truth, populated by the ifWatcher when the user
 * toggles an `{{#if}}` branch to false) and contributed to the bridge by
 * compile.ts via `installViewUtilsPart`. The sole cross-file reader at
 * `manager.ts:1807` (GXT compat: restore `isExpanded = false` on freshly-
 * constructed component instances whose wrapper id was user-toggled false —
 * load-bearing for the "View tree tests" smoke module's x-toggle/visit()
 * cycle assertions) now routes through `getGxtRenderer()?.viewUtils
 * .getWrapperUserFalseSet?.()`. Replaces the pre-slice-69 globalThis publish
 * `(globalThis as any).__gxtWrapperIfUserFalse = _wrapperIfUserFalse;` at
 * compile.ts L4425. Same typed-bridge cross-file shape as slice 55 (which
 * routed `__gxtClearRenderErrors` through `compilePipeline.clearRenderErrors`);
 * here the data structure is a Set rather than a function, so the bridge
 * exposes a getter that returns the live Set reference. Callers must NOT
 * mutate the returned set — read-only contract.
 *
 * NOT included in this slice (intentionally deferred):
 *  - `__gxtSuppressDirtyTagForDuringRebuild` (manager.ts) — a boolean state
 *    flag whose reads/writes are entirely intra-file (manager.ts). The
 *    bridge is method-call shaped; state-flag semantics is a separate
 *    pattern. The flag could become a module-local `let` independently of
 *    the bridge migration. LATER MIGRATED IN SLICE 61 (Cluster B) — see
 *    the slice 61 entry further down for the full topology.
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

  /**
   * Read the set of classic-component wrapper DOM ids that the user has
   * directly toggled to `false` via a click handler calling
   * `set()`/`toggleProperty`. The set is owned by compile.ts as the module-
   * local `_wrapperIfUserFalse` (the canonical source of truth) and
   * contributed to the bridge by compile.ts via `installViewUtilsPart`.
   *
   * Consumed cross-file by manager.ts's `_buildComponent` to restore
   * `isExpanded = false` on freshly-constructed component instances whose
   * wrapper id appears in the set — the GXT compat restoration that keeps
   * x-toggle's `isExpanded` user-collapsed state intact across visit() cycles
   * in the "View tree tests" smoke module (see compile.ts L5363 + manager.ts
   * L1796 docblocks).
   *
   * Returns `undefined` if the host hook has not been installed (compile.ts
   * never loaded — classic-Ember build, in which case manager.ts also wasn't
   * loaded so this method is unreachable; defensive `?.` chaining keeps the
   * call site safe). When installed, always returns the same Set reference;
   * callers should NOT mutate it (read-only contract).
   *
   * Previously: `(globalThis as any).__gxtWrapperIfUserFalse` (writer at
   * compile.ts L4425, reader at manager.ts L1807).
   */
  getWrapperUserFalseSet?(): Set<string> | undefined;
}

/**
 * Format / attribute-value helpers. Implemented by manager.ts, currently only
 * consumed intra-package — but exposed via the bridge for pattern uniformity
 * with the prior slices and to give future cross-package consumers a typed
 * entry point.
 *
 * NOT included in this slice (intentionally deferred — different bridge shape
 * or non-bridge cleanup required):
 *  - `__gxtNormAttr` / `__gxtQuotedAttr` — formerly EMITTED-CODE consumers
 *    referenced by literal `globalThis.__gxtNormAttr` / `globalThis.__gxtQuotedAttr(...)`
 *    output strings from the compile post-processor. RETIRED IN SLICE 75
 *    (paired -2 net): `__gxtNormAttr` was a dead slot (no emitter ever
 *    produced its globalThis-literal; the in-module `_normalizeStringValue`
 *    reference was used everywhere) — removed directly. `__gxtQuotedAttr`
 *    body was inlined into the emitted `templateFnCode` Function() outer
 *    scope (slice-72/74 pattern; the body re-implements
 *    `_normalizeStringValue` inline as `__qaNorm`, so no closure surface
 *    is needed beyond intrinsic JS). The emitted
 *    `globalThis.__gxtQuotedAttr(` shape is rewritten to a local
 *    `__gxtQuotedAttr(` reference after the `].join("")` post-processor
 *    runs. Gated on `hasQuotedAttr` so templates without quoted-attribute
 *    interpolation pay zero overhead.
 *
 *    (Slice 76 update: `__gxtInElementInsertBeforeValue` + `__gxtInElementAppendMode`
 *    were a paired EMITTED-CODE STATE-WRITE channel for the
 *    `{{#in-element ... insertBefore=...}}` mode signalling between the
 *    `templateFnCode` inner function body (writer) and the `$_inElement`
 *    runtime shim (reader+consumer, both intra-`compile.ts`). Slice 76
 *    graduates the pair to module-local state in `compile.ts`
 *    (`_gxtIeInsertBeforeValue` / `_gxtIeAppendMode`) with a setter
 *    `_gxtIeSet(insertBefore, append)` passed into the per-template
 *    Function() as the `__ieSet` parameter alongside slice-73's
 *    `__ubGT` / `__ubST` (Function()-param-binding pattern extended to
 *    three params: tracker getter/setter + ie setter). The emitted
 *    write-sites at the inner function body become `__ieSet(undefined,
 *    true)` for append-mode and `__ieSet(<json>, false)` for the
 *    asserting non-null path. The two read+consume sites in the
 *    `$_inElement` shim become direct module-local accesses with
 *    identical read-then-clear consume semantics. Caller-order audit
 *    confirmed single-threaded synchronous render: setter (template-fn
 *    invoke) → reader+clear (shim invoke). Net -2 globalThis slots.)
 *
 *    (Slice 77 update: `__gxtInElementDrainDeferred` — drain-fn pointer
 *    for the in-element deferred-render queue. Pre-slice-77 the inner-
 *    block-defined `_drainInElementDeferQueue` arrow was published as a
 *    globalThis slot (compile.ts:1892) so the two intra-`compile.ts`
 *    readers (depth-1→0 gate in `_gxtSetIsRendering` at L1796 +
 *    post-rebuild finalization in `__gxtFlushAfterInsertQueue` wrap at
 *    L5523) could reach it from outside the block scope. Slice-64's
 *    stale docblock for `__gxtInElementDeferredRender` had claimed the
 *    drain side "remains a globalThis slot because manager.ts and the
 *    renderPass-depth gate above at L1746 consume it from outside this
 *    block." Post-slice-64 re-audit (2026-05-15) confirmed zero
 *    functional readers in `manager.ts` (only a doc-comment reference
 *    at L828 describing the slice-11 wrap), zero in
 *    `glimmer/lib/renderer.ts`, zero in `node_modules/@lifeart/gxt`.
 *    Both functional readers are intra-`compile.ts`. The block-scope
 *    wrapper was a local-scope encapsulation choice — not a cross-
 *    package boundary. Slice 77 hoists the pointer to a module-local
 *    `let _drainInElementDeferQueue: (() => void) | undefined;`
 *    declared at module top; the setup block assigns the inner-defined
 *    arrow into the module-local instead of `globalThis`. Both readers
 *    swap globalThis property accesses for direct module-local
 *    reads with the `typeof === 'function'` guard preserved for
 *    defensive ordering. Net -1 globalThis slot. Zero new bridge
 *    surface. Zero cross-file edits.)
 *
 *    (Slice 73 update: `__gxtUnboundEval` + `__gxtUnboundResetSlots` were
 *    formerly in this exclusion bucket — both EMITTED-CODE consumers with
 *    no module-local reach. Slice 73 retired BOTH via paired inline-
 *    emission: the eval body is inlined into the `templateFnCode`
 *    Function() outer scope alongside `__ubCache`, a per-Function-body
 *    `__ubSlots` map replaces the pre-slice-73 shared module-level Map,
 *    and tracker access is passed via Function() constructor parameters
 *    (`Function('__ubGT', '__ubST', body)(_gxtGetTracker, _gxtSetTracker)`).
 *    The emitted `globalThis.__gxtUnboundEval(__ubCache,` shape is
 *    rewritten to a local `__gxtUnboundEval(__ubCache,` reference after
 *    `_rewriteInlineUnbound` runs. Both globalThis slots dropped — net -2.
 *    The Function() params pattern is novel for slice-72-style inline-
 *    emission: slice 72 had `globalThis.$_maybeHelper` as a stable existing
 *    surface to close over, but no comparable globalThis tracker surface
 *    exists, so Function() params provide module-bound delegate refs
 *    without introducing a new globalThis slot.)
 *  - `__gxtLastSafeStringResult` — read+written entirely intra-`compile.ts`
 *    (writer at SafeString toString hook, reader at attribute interpolation
 *    site). Cleaner cleanup is to convert to a module-local `let` in an
 *    intra-file refactor (same pattern as slice 3's exclusion of
 *    `__gxtSuppressDirtyTagForDuringRebuild`). LATER MIGRATED IN SLICE 60
 *    (Cluster B) — see the slice 60 entry further down for the full topology.
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
 *  - `__gxtClearTagHelperCache` — intra-compile.ts read+write. MIGRATED IN
 *    SLICE 57 (Cluster B) to module-local function `_gxtClearTagHelperCache`
 *    in `compile.ts`, structural twin of slice 56. Producer adjacent to
 *    `_tagHelperInstanceCache` declaration; reader in the test-cleanup
 *    region. Zero-bridge intra-file refactor; drops 1 globalThis slot.
 *    See slices 43-48, 56 for analogous zero-bridge precedents.
 *  - `__curriedRenderInfos` — intra-compile.ts lazy-init array. MIGRATED IN
 *    SLICE 58 (Cluster B) to module-local `const _curriedRenderInfos: any[]`
 *    in `compile.ts`. Hybrid of slice-48 (lazy-init-collapse) and slice-56/57
 *    (intra-file graduation): the 3 functional sites (reader at the
 *    CurriedComponent re-render branch, test-cleanup `length = 0` reset, and
 *    push site inside the curried-component registration block) now access
 *    the module-local array directly, and the runtime `if (!...) ... = []`
 *    lazy-init at the push site is collapsed because the const is eagerly
 *    initialized at module-load. Zero-bridge intra-file refactor; drops 1
 *    globalThis slot. See slices 43-48, 56, 57 for analogous zero-bridge
 *    precedents and slice 48 in particular for the lazy-init-collapse pattern.
 *  - `__gxtPreFlushFiredFalse` — intra-compile.ts pre-flush stash. MIGRATED IN
 *    SLICE 59 (Cluster B) to module-local `let _gxtPreFlushFiredFalse:
 *    Set<IfWatcherCb> | undefined` in `compile.ts`. Writer in the Phase 0
 *    (pre-flush FALSE-flip) block of `__gxtSyncDomNow` stashes the set of
 *    already-fired cbs; reader in the Phase 1a flush block of the same
 *    function consumes and clears it. Both sites live in the same scheduler
 *    tick — no cross-file consumer, no save/restore wrappers — so a
 *    module-local binding is sufficient. Zero-bridge intra-file refactor;
 *    drops 1 globalThis slot. See slices 43-48, 56-58 for analogous
 *    zero-bridge precedents.
 *  - `__gxtLastSafeStringResult` — intra-compile.ts SafeString-derived-string
 *    tracker. MIGRATED IN SLICE 60 (Cluster B) to module-local `let
 *    _gxtLastSafeStringResult: string | undefined` in `compile.ts`. Writer
 *    sits inside the deferred SafeString.prototype.toString patch installed
 *    by the top-level `setTimeout(..., 0)` block: every time GXT's quoted
 *    attribute path stringifies a SafeString, the resulting raw HTML string
 *    is stashed. Reader + clearer live in the `__gxtAttrInterpolate` style-
 *    binding warn site inside `_styleEmptyGuard` — the warn path compares
 *    the concatenated attr value against the last stashed SafeString result
 *    to decide whether the attr came entirely from a single SafeString (no
 *    warn) or whether static text was mixed in (warn). Both the writer and
 *    the reader/clearer live intra-`compile.ts`; the bundled @lifeart/gxt
 *    runtime has zero references (verified by grep of
 *    `node_modules/.pnpm/@lifeart+gxt@0.0.61/`). No save/restore wrappers,
 *    no host hook chains. Structural twin of slice 59 — same single-file
 *    writer/reader/clearer topology. Zero-bridge intra-file refactor;
 *    drops 1 globalThis slot. See slices 43-48, 56-59 for analogous
 *    zero-bridge precedents.
 *  - `__gxtSuppressDirtyTagForDuringRebuild` — intra-manager.ts boolean
 *    state flag suppressing `__classicDirtyTagFor` writes while a view-tree
 *    rebuild is in progress. MIGRATED IN SLICE 61 (Cluster B) to module-
 *    local `let _gxtSuppressDirtyTagForDuringRebuild = false` in `manager.ts`.
 *    Set-true writer at the entry of `_gxtRebuildViewTreeFromDom` (paired
 *    with the established sibling `_rebuildInProgress = true` re-entry
 *    guard); set-false writer in the `finally` block of the same function,
 *    paired with `_rebuildInProgress = false`. Single reader inside the
 *    `installClassicDirtyTagForRebuildGuard` IIFE's `classicDirtyTagForGuarded`
 *    wrap (early-returns when the flag is true so no fresh
 *    `__classicDirtyTagFor` work / no scheduled revalidations fire from
 *    within the rebuild). Both writer sites and the reader live entirely
 *    intra-`manager.ts`; the bundled @lifeart/gxt runtime has zero
 *    references (verified by grep of
 *    `node_modules/.pnpm/@lifeart+gxt@0.0.61/`). No save/restore wrappers,
 *    no host hook chains. The slot was explicitly called out as a slice-3
 *    deferred exclusion (see the slice-3 "NOT included" note above) for
 *    exactly this graduation pattern; same shape as slices 43-44
 *    (`__gxtTrackArgSource` triad). Zero-bridge intra-file refactor; drops
 *    1 globalThis slot. See slices 43-48, 56-60 for analogous zero-bridge
 *    precedents.
 *  - `__gxtTemplateOnlyRenderedSet` + `__gxtTemplateOnlyStack` — paired
 *    intra-compile.ts template-only render lifecycle state. MIGRATED IN
 *    SLICE 62 (Cluster B) to module-local `const _gxtTemplateOnlyRenderedSet
 *    = new Set<string>()` + `const _gxtTemplateOnlyStack: string[] = []`
 *    in `compile.ts`. The Set tracks template-only component kebab-names
 *    rendered during the current render pass (consumed by the slice-10
 *    `transformBacktrackingMessage` host hook contributor
 *    `_rebuildBacktrackingMsgWithTemplateOnly` to inject template-only
 *    names into the `- While rendering:` backtracking-assertion tree).
 *    The stack pushes the kebab-name at render entry (inside the $_tag
 *    thunk's template-only branch) and pops in the matching `finally`.
 *    Both bindings are eagerly initialized at module-load, collapsing the
 *    pre-slice-62 lazy-init `||`-fallback writers (Set-add path at the
 *    finally-block when `__gxtLastCreatedEmberInstance === null`; stack
 *    push path at thunk entry) that pre-slice-62 created the Set/array
 *    on first use. All 5 Set sites (lazy-init reader inside
 *    `_rebuildBacktrackingMsgWithTemplateOnly`, second reader inside
 *    `_resetTemplateOnlyState`, clear-block inside the pass-id-changed
 *    branch of the $_tag thunk, finally-block assign-or-lazy-init writer,
 *    and the `for (const n of ...)` iteration inside the rebuild) and
 *    all 3 Stack sites (doc comment above
 *    `_rebuildBacktrackingMsgWithTemplateOnly`, reader inside
 *    `_resetTemplateOnlyState`, push site inside the $_tag thunk +
 *    paired pop in the matching `finally`) live entirely
 *    intra-`compile.ts`; the bundled @lifeart/gxt runtime has zero
 *    references (verified by grep of
 *    `node_modules/.pnpm/@lifeart+gxt@0.0.61/`). The pre-slice-8 doc
 *    references inside `manager.ts`'s `beginRenderPass` body and
 *    `gxt-bridge.ts`'s `GxtRenderPassCapabilities` docblock survive as
 *    historical notes — they describe the slot names that the slice-8
 *    `beforeBeginRenderPass` host hook reset; the host hook itself
 *    (`_resetTemplateOnlyState`) is unchanged, only its body is updated
 *    to access the module-local bindings. Hybrid of slice-58
 *    (lazy-init collapse) and slices 56-60 (intra-file graduation).
 *    Same template-only render lifecycle as the slice-10
 *    `transformBacktrackingMessage` host hook's input. Zero-bridge
 *    intra-file refactor; drops 2 globalThis slots in one slice
 *    (net -2 — first paired-slot slice since the slice-43-44
 *    `__gxtTrackArgSource` triad). See slices 43-48, 56-61 for
 *    analogous zero-bridge precedents.
 *  - `__gxtTemplateOnlyRenderedSetPassId` — intra-compile.ts numeric
 *    pass-id snapshot that gates the slice-62 Set `.clear()` inside the
 *    $_tag thunk. MIGRATED IN SLICE 63 (Cluster B) to module-local
 *    `let _gxtTemplateOnlyRenderedSetPassId: number | undefined = undefined`
 *    adjacent to the slice-62 declarations in `compile.ts`. Audit confirmed
 *    exactly 2 functional sites (reader + writer in the same
 *    pass-id-changed gate block that owns the slice-62 Set `.clear()`),
 *    entirely intra-`compile.ts`; the bundled @lifeart/gxt runtime has zero
 *    references (verified by grep of
 *    `node_modules/.pnpm/@lifeart+gxt@0.0.61/`). Initialized to `undefined`
 *    so the first read in any render pass mismatches `_curPass` (a
 *    `number | 0` from `__emberRenderPassId`) and triggers the initial
 *    clear, matching the pre-slice-63 globalThis-undefined semantics. Same
 *    intra-file pattern as slice 62 (its direct sibling). Zero-bridge
 *    intra-file refactor; drops 1 globalThis slot. See slices 43-48,
 *    56-62 for analogous zero-bridge precedents.
 *  - `__gxtInElementDeferredRender` — intra-compile.ts enqueue function
 *    for the in-element deferred-render queue. The queue itself is the
 *    `Array<() => void>` declared at the top of the in-element bare block
 *    in `compile.ts`; it collects $_inElement block bodies whose
 *    compile-time literal id targets resolve to null during an active
 *    render pass (nested component templates evaluating
 *    `{{#in-element (getElement "id")}}` before the outer parent's
 *    DocumentFragment has been committed to the live document) and is
 *    drained either by the slice-1 manager.ts `flushAfterInsertQueue`
 *    tail (via the `__gxtFlushAfterInsertQueue` wrap installed below the
 *    enqueue declaration) or by the renderComponent strict-mode path
 *    (via the renderPass-depth-0 gate at `compile.ts:1746` calling the
 *    drain through `__gxtInElementDrainDeferred`). MIGRATED IN SLICE 64
 *    (Cluster B) by hoisting `_inElementDeferQueue` to a module-local
 *    `const` just above the bare block and replacing the consumer's
 *    `enq = (globalThis as any).__gxtInElementDeferredRender; enq(cb)`
 *    indirection with a direct `_inElementDeferQueue.push(cb)`. Audit
 *    confirmed exactly 2 functional sites (writer at the former
 *    L1829 enqueue declaration; consumer at the former L2092 inside the
 *    $_inElement null-target render-pass-detect branch), entirely
 *    intra-`compile.ts`; the bundled @lifeart/gxt runtime has zero
 *    references (verified by grep of
 *    `node_modules/.pnpm/@lifeart+gxt@0.0.61/`). The drain side
 *    (`__gxtInElementDrainDeferred`) was deferred at slice 64 (claimed
 *    to need cross-block access for manager.ts and the renderPass-depth-0
 *    gate); the slice-64 claim about manager.ts was stale — post-slice-77
 *    re-audit confirmed manager.ts has only a doc-comment reference at
 *    L828, no functional reader. Slice 77 retires the drain side via
 *    the same intra-file graduation pattern (module-local pointer
 *    `let _drainInElementDeferQueue`). Zero-bridge intra-file refactor;
 *    drops 1 globalThis slot. See slices 43-48, 56-63 for analogous
 *    zero-bridge precedents.
 *  - `__gxtRootOutletRerenderMap` — intra-`glimmer/lib/templates/root.ts`
 *    per-outlet rerender registry: a `Map<any, (ref: any) => void>` keyed
 *    by `instance.outletRef` (each `visit()` creates a fresh ref) that
 *    holds the rerender closure for each concurrent ApplicationInstance
 *    (Ember Islands-style setup). The dispatch shim installed as
 *    `__gxtRootOutletRerender` looks up the closure for the incoming
 *    outletRef so that `setOutletState` on either root re-renders into
 *    the correct DOM target (without the map, a single global rerender
 *    function would let the second visit overwrite the first). MIGRATED
 *    IN SLICE 65 (Cluster B) by graduating the lazy-init
 *    `(globalThis as any).__gxtRootOutletRerenderMap ||
 *    ((globalThis as any).__gxtRootOutletRerenderMap = new Map())` at the
 *    former `root.ts:589-591` to a module-local `const
 *    _gxtRootOutletRerenderMap = new Map<any, (ref: any) => void>();`
 *    declared at the top of `root.ts` (next to the existing `gxtDomApi`
 *    module-local). The reader inside the `__gxtRootOutletRerender`
 *    setter at the former `root.ts:1212` was simplified from
 *    `const map = (globalThis as any).__gxtRootOutletRerenderMap; if (map
 *    && outletRef && map.has(...))` to a direct
 *    `_gxtRootOutletRerenderMap.has(outletRef)` check — the lazy-init
 *    guarded `map &&` is now structurally redundant since the const is
 *    initialized at module load. Audit confirmed exactly 3 functional
 *    sites (writer+reader pair at the lazy-init L589-591, reader inside
 *    the dispatch shim at L1212, and the `Map.set` at L1201 binding the
 *    new closure), all intra-`glimmer/lib/templates/root.ts`; the
 *    bundled @lifeart/gxt runtime has zero references (verified by grep
 *    of `node_modules/.pnpm/@lifeart+gxt@0.0.61/`). The dispatch shim
 *    `__gxtRootOutletRerender` REMAINS a globalThis slot because it is
 *    consumed by cross-file callers in `outlet.ts` / `renderer.ts` —
 *    that's the cross-package bridge target for a future slice (typed
 *    `rerenderOutlet(outletRef: any): void` on this namespace). Same
 *    lazy-init-collapse shape as slice 58 (`__curriedRenderInfos`); same
 *    intra-file pattern as slices 43-48, 56-64. Zero-bridge intra-file
 *    refactor; drops 1 globalThis slot. First non-{compile,manager,renderer}
 *    file to participate in a Cluster B zero-bridge graduation —
 *    `glimmer/lib/templates/root.ts` is now the fourth host module for
 *    module-local state. See slices 43-48, 56-64 for analogous
 *    zero-bridge precedents.
 *  - `__gxtCurrentParentIfRef` — intra-compile.ts parent-If stack flag used by
 *    the $_if `wrapBranch` save/restore pattern so nested $_if invocations
 *    during a parent branch evaluation can record themselves as children of
 *    the enclosing IfCondition (via its stable ref holder, since origIf may
 *    invoke wrapBranch SYNCHRONOUSLY from its constructor before the outer
 *    `const ifCondition` is assigned). MIGRATED IN SLICE 66 (Cluster B) by
 *    graduating the `(globalThis as any).__gxtCurrentParentIfRef` slot to a
 *    module-local `let _gxtCurrentParentIfRef: any = undefined;` declared
 *    next to the existing slice-59 `_gxtPreFlushFiredFalse` flag in
 *    `compile.ts`. Audit confirmed exactly 5 functional sites — all
 *    intra-`gxt-backend/compile.ts`: the outer wrapBranch save+set (former
 *    L4577-4578), the inner wrappedInnerBranch save+set (former L4676-4677),
 *    the inner restore in the inner finally (former L4699), the outer
 *    restore in the outer finally (former L4707), and the post-origIf
 *    reader (former L4738) that wires the parent→child relationship
 *    `parentIfRef.childIfConditions.add(ifCondition)`. Zero cross-file
 *    consumers; the bundled @lifeart/gxt runtime has zero references
 *    (verified by grep of `node_modules/.pnpm/@lifeart+gxt@0.0.61/`,
 *    per slice-55's lesson from slice-54's revert). Lazy-init was NOT
 *    required — the slot was already a bare globalThis property
 *    written/read via plain `g2.__gxtCurrentParentIfRef = ...` and the
 *    save/restore semantics are tolerant of `undefined` (the outer-most
 *    wrapBranch invocation reads `undefined` as `prev`, sets the slot, and
 *    restores `undefined` in its finally). The post-origIf reader's
 *    `_gp = globalThis as any` alias is dropped (was only used for this
 *    one read). Same intra-file pattern as slices 43-48, 56-65. 21st
 *    consecutive Cluster B zero-bridge slice (after 43-53, 56-65).
 *    Zero-bridge intra-file refactor; drops 1 globalThis slot.
 *  - `__gxtCommentRegistry` + `__gxtCommentCounter` — paired intra-compile.ts
 *    HTML-comment preservation registry. The registry maps a stable plain-
 *    ASCII token (e.g. `__gxtCmt_42`) to the literal `<!-- ... -->` source
 *    captured by `_preserveHtmlComments`; the counter monotonically
 *    increments per registered comment so each token is unique within the
 *    process. The template emission path writes a `<EmberHtmlRaw
 *    @value={{(__gxtCommentLookup "<token>")}} />` in place of the
 *    original comment and the `__gxtCommentLookup` resolver (registered
 *    as a built-in helper KEY — preserved as-is per template-emission
 *    contract since the resolver name is referenced by generated template
 *    source) reads the registry back at render time to recover the
 *    literal comment text without sending curly-brace-containing comment
 *    bodies through the GXT parser. MIGRATED IN SLICE 67 (Cluster B) by
 *    graduating both `(globalThis as any).__gxtCommentRegistry` and
 *    `(globalThis as any).__gxtCommentCounter` to module-local
 *    `const _gxtCommentRegistry: Record<string, string> =
 *    Object.create(null)` + `let _gxtCommentCounter = 0` declared next to
 *    the slice-66 `_gxtCurrentParentIfRef` flag near the top of
 *    `compile.ts`. Audit confirmed exactly 3 functional sites across
 *    both identifiers — all intra-`gxt-backend/compile.ts`: the writer
 *    pair inside `_preserveHtmlComments` (`_gxtCommentRegistry[token] =
 *    full` keyed by `__gxtCmt_${++_gxtCommentCounter}` at the former
 *    L12289-L12290) and the reader inside the `__gxtCommentLookup`
 *    built-in resolver (`_gxtCommentRegistry[key]` lookup with empty-
 *    string fallback at the former L7556-L7559). Zero cross-file
 *    consumers; the bundled @lifeart/gxt runtime has zero references to
 *    either identifier (verified by grep of
 *    `node_modules/.pnpm/@lifeart+gxt@0.0.61/`, per slice-55's lesson
 *    from slice-54's revert). Lazy-init COLLAPSED — the pre-slice-67
 *    runtime `if (!g.__gxtCommentRegistry)` /
 *    `if (typeof g.__gxtCommentCounter !== 'number')` fallbacks are
 *    dropped because the const/let are eagerly initialized at module
 *    load (registry as `Object.create(null)` with no prototype chain so
 *    `registry[key]` is collision-free against `Object.prototype`
 *    inherited names; counter as `0` so the first `++` write yields
 *    token `__gxtCmt_1` exactly as before). The `__gxtCommentLookup`
 *    resolver KEY itself REMAINS in the built-in helper registry —
 *    template emission writes its literal name into the generated
 *    `<EmberHtmlRaw @value={{(__gxtCommentLookup "...")}} />` output,
 *    so renaming it would break compiled template source; out of scope
 *    for slice 67. Same lazy-init-collapse + intra-file graduation shape
 *    as slices 58 / 62 / 65; structural twin of slice 62 (the prior
 *    paired-slot Cluster B slice — `__gxtTemplateOnlyRenderedSet` +
 *    `__gxtTemplateOnlyStack`). 22nd consecutive Cluster B zero-bridge
 *    slice (after 43-53, 56-66). Zero-bridge intra-file refactor; drops
 *    2 globalThis slots in one slice (net -2 — second paired-slot
 *    Cluster B slice after slice 62).
 *  - `__gxtInElementFallbackIds` — intra-compile.ts in-element literal-id
 *    fallback STACK pushed by the GXT render-template wrapper before
 *    invoking the template body and consumed by the `$_inElement` runtime
 *    when the destination ref resolves to `null`/`undefined` during a
 *    render pass. `$_inElement` peeks the top id (a compile-time literal
 *    element id captured from the `#in-element` destination expression)
 *    and shifts it off when actually taking the defer path, allowing the
 *    renderer to defer the body insertion and re-resolve against the now-
 *    attached parent fragment in a microtask. MIGRATED IN SLICE 68
 *    (Cluster B) by graduating the `(globalThis as any).__gxtInElementFallbackIds`
 *    slot to a module-local `const _inElementFallbackIds: string[] = []`
 *    declared next to the slice-67 `_gxtCommentRegistry` / `_gxtCommentCounter`
 *    bindings near the top of `compile.ts`. Audit confirmed exactly 4
 *    functional sites — all intra-`gxt-backend/compile.ts`: the peek
 *    reader inside `$_inElement` defer-detection (former L1982), the
 *    shift reader inside the defer-take branch (former L1990), and the
 *    push-side lazy-init reader-writer pair inside the render-template
 *    wrapper (former L14687-L14688) where the stack is initialized and
 *    each `_inElementLiteralIds[i]` is pushed before invoking the
 *    template body. Zero cross-file consumers; the bundled @lifeart/gxt
 *    runtime has zero references to `__gxtInElementFallbackIds` (verified
 *    by grep of `node_modules/.pnpm/@lifeart+gxt@0.0.61/`, per slice-55's
 *    lesson from slice-54's revert). Lazy-init COLLAPSED — the pre-slice-68
 *    `g.__gxtInElementFallbackIds = g.__gxtInElementFallbackIds || []`
 *    fallback inside the render-template wrapper is dropped because the
 *    const is eagerly initialized to `[]` at module load (same shape as
 *    the pre-slice-68 lazy-init initialization). The peek-reader's
 *    `Array.isArray(...) &&` guard is also dropped since the const is
 *    guaranteed to be an array. The stack is preserved across nested
 *    render passes via the `_inElemStackStart` index snapshot/length-
 *    restore pattern already in place at the push site (NOT via array
 *    replacement), so the shared module-local array remains safe under
 *    reentrancy. Same lazy-init-collapse + intra-file graduation shape
 *    as slices 58 / 62 / 65 / 67. 23rd consecutive Cluster B zero-bridge
 *    slice (after 43-53, 56-67). Zero-bridge intra-file refactor; drops
 *    1 globalThis slot.
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

  /**
   * Read-only access to the resolver-cache counters object that mirrors the
   * Glimmer `ConstantsImpl` per-namespace definition counters
   * (`componentDefinitionCount` / `helperDefinitionCount` /
   * `modifierDefinitionCount`). In GXT mode the Glimmer VM is bypassed, so
   * its `ProgramConstants` counters never advance; the GXT-side tracker
   * maintains parallel counters in `ember-gxt-wrappers.ts`'s
   * `_trackHelperDefinition` / `_trackComponentDefinition` and the renderer
   * copies them onto the live `EvaluationContext.constants` object on every
   * `renderer._context` read so the `ember-glimmer runtime resolver cache`
   * test's `renderer._context.constants` read sees the same values.
   *
   * Returns the LIVE module-local object reference (NOT a snapshot copy);
   * callers may read the counters but MUST NOT mutate them. The writers
   * (`_trackHelperDefinition` / `_trackComponentDefinition` in
   * `ember-gxt-wrappers.ts`) increment the counters as part of the
   * helper/component-name dedup pass that runs during template compilation.
   * The single cross-file reader (`glimmer/lib/renderer.ts:2972` `_context`
   * getter) reads the counters under the `__GXT_MODE__` gate and copies
   * them onto `(ctx.constants as { ...DefinitionCount: number })` for the
   * test assertion to observe.
   *
   * Previously: `(globalThis as any).__gxtResolverCacheCounters` — a
   * lazy-init self-assign at `ember-gxt-wrappers.ts:249` that published
   * the module-local `_resolverCacheCounters` object via the globalThis
   * slot for cross-file reach. Slice 78 graduates the canonical object
   * to a plain module-local `const _resolverCacheCounters` declaration
   * and exposes it through this typed-bridge getter. Net -1 globalThis
   * slot, +1 new bridge method.
   *
   * Bridge shape decision: single-method read
   * (`getResolverCacheCounters?(): ResolverCacheCounters | undefined`).
   * Matches slice 32's `getAllPoolArrays?(): Set<unknown[]> | undefined`
   * precedent — read-only live-reference getter. The renderer's hot path
   * is the per-render `_context` getter; the bridge call dispatches one
   * `getGxtRenderer()` plus one property/method dereference, equivalent
   * to the pre-slice-78 globalThis property walk.
   *
   * Bridge-not-yet-installed edge: the cross-file reader uses
   * `?.() ?? undefined` (returns `undefined` when the renderer is not
   * yet installed or the method is not yet registered). The renderer's
   * `if (counters && ctx && (ctx as any).constants)` truthy-gate maps
   * directly to the pre-slice-78 `if (counters && ...)` semantics. The
   * `ember-gxt-wrappers.ts` module-init runs `installCompilePipelinePart`
   * at module-load time alongside the slice-42 `getMutContext`/
   * `setMutContext` install at L96 — well before the first
   * `renderer._context` read fires during a render.
   *
   * Fast-check: implementation is `() => _resolverCacheCounters` — one
   * variable read; zero allocations. Identical hot-path cost to the
   * pre-slice-78 globalThis property read.
   */
  getResolverCacheCounters?(): {
    componentDefinitionCount: number;
    helperDefinitionCount: number;
    modifierDefinitionCount: number;
  };

  /**
   * Invalidate the `classHelperInstanceCache` (in `ember-gxt-wrappers.ts`)
   * so the next `$_maybeHelper` invocation re-runs `delegate.getValue(bucket)`
   * (which calls the helper's `compute()` with fresh state) instead of
   * short-circuiting on the cached `lastArgsSer` dedup string. Called from
   * the `__gxtRecomputeTagRef` after-body inside `manager.ts`'s
   * `__gxtTriggerReRender` patch (the helper-recompute path that fires
   * after `cellFor(obj, keyName).update(...)` returns) so that subsequent
   * renders see the recomputed result rather than the previous cached one.
   *
   * Iterates the `classHelperInstanceCache` map and, for every cached entry
   * whose `__managerBucket` is truthy (i.e. an Ember-helper-manager-backed
   * bucket, NOT a function helper or the `__tagDirtySentinel__` placeholder),
   * clears its `lastArgsSer` to `null`. Function-helper / simple-helper
   * cache entries are untouched — those have separate caches with their
   * own invalidation paths.
   *
   * The (`_obj`, `_key`) arguments are part of the legacy pre-slice-87
   * signature (`function (obj: any, key: string)`) and are CURRENTLY
   * UNUSED — the cache invalidation is unconditional rather than scoped
   * to the object/key pair. Preserved in the signature for symmetry with
   * the call site at `manager.ts:565` (which passes `this,
   * '__gxtRecomputeTagRef'`) and for future per-key scoping if/when the
   * helper cache grows a key-indexed dependency tracker.
   *
   * Best-effort: caller wraps the bridge call in a `try/catch` (defensive
   * — the bridge method itself is loop-safe and won't throw, but the
   * surrounding `__gxtTriggerReRender` after-body iterates external state
   * that may not be in a consistent shape).
   *
   * Previously: `(globalThis as any).__gxtNotifyHelperPropertyChange` —
   * a `function (_obj, _key) { ... }` written at
   * `ember-gxt-wrappers.ts:368` (writer) and read with a `typeof ===
   * 'function'` guard at `manager.ts:565` (reader). Slice 87 graduates
   * the writer to a module-local function `_gxtNotifyHelperPropertyChange`
   * and routes the reader through this typed-bridge method. Net -1
   * globalThis slot, +1 new bridge method.
   *
   * Bridge shape decision: typed-bridge `notifyHelperPropertyChange(obj:
   * unknown, key: string): void` method on `GxtCompilePipelineCapabilities`.
   * Cross-file pattern (1 reader in `manager.ts`, 1 writer in
   * `ember-gxt-wrappers.ts`) — both intra-package, mirrors slice-55's
   * `clearRenderErrors` shape (same `void`-returning bridge method, same
   * intra-package cross-file pair) and slice-78's `getResolverCacheCounters`
   * install (same file, same `installCompilePipelinePart` registration
   * pattern). The void-return shape matches the pre-slice-87 function's
   * implicit `undefined` return.
   *
   * Bridge-not-yet-installed edge: the reader uses `?.()` (no-op when the
   * renderer is not yet installed or the method is not yet registered).
   * The pre-slice-87 `typeof === 'function'` guard maps directly to the
   * optional-chain (both short-circuit to a no-op when the host hook
   * isn't installed — classic-Ember build path). The
   * `ember-gxt-wrappers.ts` module-init runs `installCompilePipelinePart`
   * at module-load time alongside the slice-42 / slice-78 install calls
   * — well before the first `__gxtTriggerReRender` after-body fires
   * during a render.
   *
   * Fast-check: implementation is a single `for` loop over the
   * `classHelperInstanceCache` map with one boolean check and one
   * property assignment per managed-bucket entry; zero allocations.
   * The cache is typically small (one entry per unique helper name
   * invoked in the current template scope plus the `__tagDirtySentinel__`
   * placeholder). Identical hot-path cost to the pre-slice-87 globalThis
   * property read + indirect call.
   */
  notifyHelperPropertyChange?(obj: unknown, key: string): void;

  /**
   * Reset the three helper-instance caches owned by
   * `ember-gxt-wrappers.ts`: `classHelperInstanceCache`,
   * `simpleHelperResultCache`, and `managedHelperBucketCache`. Preserves
   * the `__tagDirtySentinel__` entry in `classHelperInstanceCache` (a
   * synthetic listener that forwards dirty signals to compile.ts's
   * `_tagHelperInstanceCache` — re-installing it after every teardown is
   * unnecessary and would race with subsequent `dirtyTagFor` invalidations
   * that fire during the next test's render). The `managedHelperBucketCache`
   * is rebuilt as a fresh `WeakMap` rather than `.clear()`'d because it is
   * declared `let` with a `WeakMap` value (WeakMaps don't support `.clear()`
   * directly without a re-creation).
   *
   * Called from internal-test-helpers' `runDestroy` (which fires after
   * `run(destroy, toDestroy)` returns — i.e. when a test's owner /
   * component tree has been destroyed and the helper caches' entries are
   * referencing dead instances that the next test must not see) and from
   * compile.ts's `_gxtClearOnSetup` between-test reset (which runs after
   * the QUnit testStart sweep clears stale render errors but before the
   * next test's first render — drops any cache entries that survived
   * `runDestroy` because they were created OUTSIDE a destroyable owner
   * tree, e.g. `_tagHelperInstanceCache` shadow entries created by the
   * `__tagDirtySentinel__` listener but never associated with an owner).
   *
   * Slice-88 (Cluster B): replaces the pre-slice-88 globalThis writer
   * `(g as any).__gxtClearHelperCache = () => { ... }` at
   * `ember-gxt-wrappers.ts:184` and the two reader sites:
   *   - cross-package: `internal-test-helpers/lib/run.ts:134` (the
   *     `runDestroy` body — a `const clearCache = (globalThis as any)
   *     .__gxtClearHelperCache; if (typeof clearCache === 'function')
   *     clearCache();` typeof-guarded call pattern).
   *   - intra-gxt-backend: `compile.ts:6834` (the `_gxtClearOnSetup`
   *     between-test reset body — a `if (typeof (globalThis as any)
   *     .__gxtClearHelperCache === 'function') { (globalThis as any)
   *     .__gxtClearHelperCache(); }` typeof-guarded call pattern).
   * Both readers now route through
   * `getGxtRenderer()?.compilePipeline.clearHelperCache?.()`, the
   * optional-chain providing the same null-tolerant guard for
   * classic-Ember builds (where gxt-backend was never loaded) and the
   * bridge-not-yet-installed edge.
   *
   * Bridge shape decision: typed-bridge `clearHelperCache(): void` method
   * on `GxtCompilePipelineCapabilities`. Cross-file pattern (2 readers: 1
   * cross-package in `internal-test-helpers/lib/run.ts`, 1 intra-package
   * in `compile.ts`; 1 writer in `ember-gxt-wrappers.ts`) — mirrors
   * slice-55's `clearRenderErrors` shape (same `void`-returning bridge
   * method, same cross-package + intra-package reader split with a
   * single writer in a sibling intra-package file) and slice-87's
   * `notifyHelperPropertyChange` install (same file, same
   * `installCompilePipelinePart` registration pattern). The void-return
   * shape matches the pre-slice-88 arrow function's implicit `undefined`
   * return. No arguments — the cache reset is unconditional.
   *
   * Bridge-not-yet-installed edge: the readers use `?.()` (no-op when
   * the renderer is not yet installed or the method is not yet
   * registered). The pre-slice-88 `typeof === 'function'` guard maps
   * directly to the optional-chain (both short-circuit to a no-op when
   * the host hook isn't installed — classic-Ember build path). The
   * `ember-gxt-wrappers.ts` module-init runs `installCompilePipelinePart`
   * at module-load time alongside the slice-42 / slice-78 / slice-87
   * install calls — well before the first `runDestroy` /
   * `_gxtClearOnSetup` call fires.
   *
   * Fast-check: implementation reads the slot once, dereferences the
   * `__tagDirtySentinel__` entry, calls `.clear()` on
   * `classHelperInstanceCache`, conditionally re-inserts the sentinel,
   * calls `.clear()` on `simpleHelperResultCache`, and re-assigns
   * `managedHelperBucketCache` to a fresh `WeakMap`. Five operations,
   * runs only at test-teardown / test-setup (NOT on every render).
   * Cost is dominated by the `Map.clear()` calls, which are O(n) in
   * the cache size — typically small (one entry per unique helper name
   * invoked in the prior test). Identical hot-path cost to the
   * pre-slice-88 globalThis property read + indirect call.
   */
  clearHelperCache?(): void;

  /**
   * Read the `__gxtDestroyReattachInProgress` boolean flag. Returns `true`
   * if a destroy-phase reattach is currently in progress — i.e., the
   * `__gxtDestroyUnclaimedPoolEntries` body (manager.ts) or the inverse-
   * branch destroy reattach IIFE (compile.ts) has temporarily re-attached
   * disconnected component elements to `document.body` /
   * `#qunit-fixture` so that `willDestroyElement` / `willClearRender`
   * hooks see `document.body.contains(this.element) === true`. The flag
   * is paired with a `try/finally` save-set-restore: SET TRUE before the
   * reattach loop, cleared FALSE in the `finally` after the lifecycle
   * hooks run and the elements are detached again.
   *
   * The flag's sole consumer purpose is to gate the
   * `<ember-outlet>` custom element's `connectedCallback` body
   * (`glimmer/lib/templates/outlet.ts:30`): when a destroy-phase reattach
   * fires `connectedCallback` on an inner `<ember-outlet>` (e.g., one
   * nested inside a just-removed component wrapper like `root-9`), the
   * callback MUST skip rendering — without this gate the callback would
   * read `__currentOutletState` (the NEW route after the transition),
   * render the new route's template, and corrupt the parentView stack
   * (the new route's components would get `parentView = root-9` and
   * disappear from `getRootViews`).
   *
   * Pre-slice-89 readers (1 site, cross-package):
   *  - `glimmer/lib/templates/outlet.ts:30` — `connectedCallback` guard
   *    at the top of the body: `if ((globalThis as any).
   *    __gxtDestroyReattachInProgress) { return; }`.
   *
   * Slice-89 (Cluster B): graduates the canonical state from the pre-
   * slice-89 `globalThis.__gxtDestroyReattachInProgress` slot to the
   * module-local boolean `_gxtDestroyReattachInProgressFlag` in
   * `compile.ts`. The 1 cross-package reader routes through this bridge
   * getter. Net globalThis surface delta: -1 slot (paired with
   * `setDestroyReattachInProgress`).
   *
   * Bridge-not-yet-installed edge: the reader uses
   * `getGxtRenderer()?.compilePipeline.getDestroyReattachInProgress?.()`.
   * Both optional chains return `undefined` when either the renderer or
   * the method is not yet installed; the falsy guard at the call site
   * (`if (...)`) coerces `undefined` to FALSE, which mirrors pre-slice-89
   * semantics where `globalThis.__gxtDestroyReattachInProgress === undefined`
   * (pre-first-destroy-reattach edge) coerced via the `if (...)` to FALSE.
   *
   * Fast-check: the implementation reads the module-local
   * `_gxtDestroyReattachInProgressFlag` boolean — one boolean read; zero
   * allocations. Matches slice-35/36/37/38/40/41's `get*` body shape.
   */
  getDestroyReattachInProgress?(): boolean;

  /**
   * Write the `__gxtDestroyReattachInProgress` boolean flag. The flag's
   * lifetime and semantics are described in the
   * `getDestroyReattachInProgress` doc above.
   *
   * Pre-slice-89 writers (4 sites, all intra-`gxt-backend`):
   *  - `manager.ts:4852` — `__gxtDestroyUnclaimedPoolEntries` body open —
   *    set TRUE before the reattach loop in Phase 1
   *    (willDestroyElement + willClearRender).
   *  - `manager.ts:4866` — `__gxtDestroyUnclaimedPoolEntries` body
   *    finally — clear FALSE after the reattach loop completes.
   *  - `compile.ts:5827` — outlet-tracking-arg inverse-branch destroy
   *    IIFE body open — set TRUE before the reattach loop for the
   *    inverse-branch direct-children DFS reattach.
   *  - `compile.ts:5841` — outlet-tracking-arg inverse-branch destroy
   *    IIFE finally — clear FALSE after the inverse-branch reattach
   *    loop completes.
   *
   * Slice 89 routes all 4 intra-`gxt-backend` writers through the
   * module-local `_gxtSetDestroyReattachInProgress` helper directly
   * (slice-22/24/27/30/31/32/33/34/35/36/37/38/40/41 intra-file
   * precedent for the 2 writers in compile.ts) and through the bridge
   * setter (`compilePipeline.setDestroyReattachInProgress(value)`) for
   * the 2 writers in manager.ts (cross-file within the package).
   *
   * Slice-89 (Cluster B): graduates the canonical state from the pre-
   * slice-89 `globalThis.__gxtDestroyReattachInProgress` slot to the
   * module-local boolean `_gxtDestroyReattachInProgressFlag` in
   * `compile.ts`. Net globalThis surface delta: -1 slot (paired with
   * `getDestroyReattachInProgress`).
   *
   * Bridge-not-yet-installed edge: the 2 cross-file writers in
   * `manager.ts` use
   * `getGxtRenderer()?.compilePipeline.setDestroyReattachInProgress?.(value)`.
   * Both optional chains short-circuit to `undefined` (no-op) when the
   * renderer or the method is not yet installed. This is load-order-
   * safe because the destroy-reattach paths fire only during tests
   * AFTER module init (the test infrastructure has driven the renderer
   * to render at least one template before any test issues a destroy
   * that would trigger the reattach). If the write is dropped pre-
   * install, the flag stays FALSE and the cross-package reader correctly
   * reads FALSE — matching pre-slice-89 semantics where
   * `globalThis.__gxtDestroyReattachInProgress === undefined` coerced to
   * FALSE.
   *
   * Bridge shape decision: paired get/set (slice-14/35/36/37/38/40/41
   * paired-methods pattern, same as slice 41) because slice 89 has 4
   * writers split across 2 files (2 in `manager.ts` cross-file, 2 in
   * `compile.ts` intra-file) and 1 cross-package reader in
   * `glimmer/lib/templates/outlet.ts` — both surfaces must be reachable
   * via the bridge (writer setter for manager.ts cross-file, reader
   * getter for outlet.ts cross-package). Slice 89 cannot use slice-
   * 20/22/23/24's read-only predicate because of the writers, and
   * cannot use slice-29's mark+consume because the flag uses a
   * try/finally save-set-restore pattern (4 paired open/close writers,
   * not a one-shot consumer boundary). ZERO new import edges:
   * `manager.ts` already imports `getGxtRenderer` (slice 6+) and
   * `glimmer/lib/templates/outlet.ts` already imports `getGxtRenderer`
   * (slice 3).
   *
   * State home: `compile.ts` (alongside the other intra-file paired
   * bridges added in slices 37/38/40/41) — per the "canonical state
   * lives where it's primarily mutated" rule and consistency with the
   * other module-local boolean-flag paired bridges.
   *
   * Fast-check: the implementation writes the module-local
   * `_gxtDestroyReattachInProgressFlag` boolean — one boolean
   * assignment; zero allocations.
   */
  setDestroyReattachInProgress?(value: boolean): void;

  /**
   * Return the (lazy-initialized) cache of engine instances keyed by engine
   * name. The cache holds one engine instance per `{{mount "engine-name"}}`
   * invocation — reused across re-renders of the parent template so that
   * `<ember-mount>` elements recreated by a force-rerender don't double-
   * instantiate the engine. Engines created via `factoryFor('engine:name')`
   * are inserted on first `<ember-mount>` connection and destroyed in the
   * compile.ts between-test teardown (`_gxtClearOnSetup` body) — destroying
   * both the inner `__gxtOriginalEngine` (which `init`-ed itself into the
   * `Namespace.NAMESPACES` table) and the cached engine instance so the
   * "Should not have any NAMESPACES" assertion passes.
   *
   * Pre-slice-90 topology (1 writer + 3 readers):
   *  - writer: `outlet.gts:310` — `<ember-mount>.renderEngine` body — lazy-
   *    init via `((globalThis as any).__gxtEngineInstances ||= new
   *    Map<string, any>())`. Returns the same Map on every call (idempotent
   *    on the cache slot, just `.get(engineName)` after).
   *  - reader: `compile.ts:6910` — `_gxtClearOnSetup` teardown body, guard
   *    check `if ((globalThis as any).__gxtEngineInstances)` before
   *    iteration.
   *  - reader: `compile.ts:6911` — `_gxtClearOnSetup` teardown body, the
   *    `for (const [, engineInst] of (globalThis as any).
   *    __gxtEngineInstances)` iteration that destroys each cached engine.
   *  - reader: `compile.ts:6935` — `_gxtClearOnSetup` teardown body,
   *    `.clear()` call to drop all entries after destruction.
   *
   * Slice-90 (Cluster B): graduates the canonical state from the pre-
   * slice-90 `globalThis.__gxtEngineInstances` slot to the module-local
   * `Map<string, any>` `_gxtEngineInstances` in `compile.ts`. The single
   * cross-package writer (`outlet.gts:310`) routes through this bridge
   * getter — the getter implementation handles the lazy-init under the
   * hood (returns the same Map every call; the `||=` is replaced by the
   * always-initialized module-local declaration). The 3 intra-`compile.ts`
   * readers route directly to the module-local `_gxtEngineInstances`
   * (slice-22/24/27/.../89 intra-file precedent). Net globalThis surface
   * delta: -1 slot.
   *
   * Bridge shape decision: single-method `getEngineInstances?(): Map<string,
   * any>` getter on `GxtCompilePipelineCapabilities` (slice-78 / slice-69 /
   * slice-43 single-method-getter pattern). No setter is required because
   * the Map identity never changes — only its contents are mutated by
   * consumers via `Map.get` / `Map.set` / `Map.clear` on the returned
   * reference. The `outlet.gts` writer becomes `const engineCache =
   * getGxtRenderer()?.compilePipeline.getEngineInstances?.(); if
   * (!engineCache) return;` — replacing the pre-slice-90 lazy-init
   * expression. The 3 intra-file readers bypass the bridge entirely (read
   * the module-local directly).
   *
   * Bridge-not-yet-installed edge: the cross-package writer in
   * `outlet.gts` uses `getGxtRenderer()?.compilePipeline.
   * getEngineInstances?.()`. Both optional chains short-circuit to
   * `undefined` when either the renderer or the method is not yet
   * installed; the call site guards on `if (!engineCache) return;`
   * which matches the pre-slice-90 semantics where, if the slot is
   * undefined, the lazy-init creates an empty Map and the `.get` returns
   * `undefined` (no cached engine; the body falls through to factory
   * lookup). The new short-circuit is slightly more conservative — it
   * skips the entire engine render for classic-Ember builds where
   * gxt-backend is never loaded. That's load-order-safe because in
   * classic-Ember `<ember-mount>` is never constructed (the gxt-backend
   * custom element is what defines that tag).
   *
   * Fast-check: the implementation returns the module-local `Map`
   * reference — one property read, zero allocations. The lazy-init `||=`
   * is gone because the module-local is initialized to `new Map()` at
   * module-load time (smaller hot-path).
   */
  getEngineInstances?(): Map<string, any>;

  /**
   * Bump the manager.ts-local `_updateHookPassId` counter at the start of a
   * new render pass. The counter is consulted by `markInstanceUpdated` /
   * `wasInstanceUpdatedThisPass` and `markInstanceRenderHookFired` /
   * `wasInstanceRenderHookFiredThisPass` (all manager.ts intra-file) to
   * gate update/render lifecycle hooks against per-instance pass tracking.
   * Incrementing the counter at the start of each `_gxtSyncDomNow` cycle
   * ensures the per-instance `_instanceUpdatePassMap` / `_instanceRenderHookPassMap`
   * WeakMap entries from the previous pass no longer match — the next call
   * to `wasInstanceUpdatedThisPass(instance)` returns `false`, so the
   * lifecycle-hook firing path runs again for the new pass (preventing
   * stale skips). Without this bump, the same instance would be skipped
   * across multiple render passes within one test run.
   *
   * Called from compile.ts's `_gxtSyncDomNow` try-block, immediately before
   * PHASE 0's if-watcher pre-flush (`_pendingIfWatcherNotifications`
   * processing).
   *
   * Slice-91 (Cluster B): replaces the pre-slice-91 globalThis writer
   * `(globalThis as any).__gxtNewRenderPass = function () { _updateHookPassId++; };`
   * at `manager.ts:2532` and the pre-slice-91 globalThis reader
   * `const newPass = (globalThis as any).__gxtNewRenderPass; if (typeof newPass
   * === 'function') newPass();` at `compile.ts:6394-6395`. The writer is
   * graduated to a module-local `function _gxtNewRenderPass(): void {
   * _updateHookPassId++; }` declaration next to the `_updateHookPassId`
   * counter in manager.ts (slice-87 / slice-88 function-pointer pattern,
   * canonical state lives where it's primarily mutated/read). The reader
   * routes through `getGxtRenderer()?.compilePipeline.newRenderPass?.()`,
   * the optional-chain providing the same null-tolerant guard as the
   * pre-slice-91 `typeof === 'function'` check for classic-Ember builds
   * (where gxt-backend was never loaded). Net -1 globalThis slot.
   *
   * Bridge shape decision: typed-bridge `newRenderPass(): void` method on
   * `GxtCompilePipelineCapabilities` (slice-55 `clearRenderErrors` /
   * slice-87 `notifyHelperPropertyChange` / slice-88 `clearHelperCache`
   * precedent — void-returning bridge method invoked from a sibling
   * intra-package reader). State home: manager.ts (canonical owner of
   * `_updateHookPassId`); the function lives there, registered via
   * `setGxtRenderer`'s compilePipeline namespace (alongside
   * `syncWrapper` / `syncAllWrappers` / slice-32/33/39 getters), NOT via
   * `installCompilePipelinePart` from compile.ts (different installer-
   * direction than slice 87/88/89/90, which all routed through
   * compile.ts or ember-gxt-wrappers.ts).
   *
   * Bridge-not-yet-installed edge: the cross-file reader in compile.ts
   * uses `getGxtRenderer()?.compilePipeline.newRenderPass?.()`. Both
   * optional chains short-circuit to `undefined` when either the renderer
   * or the method is not yet installed; the no-args `?.()` call simply
   * does nothing in that case (matches the pre-slice-91 semantics where,
   * if the slot was undefined, the `typeof === 'function'` guard skipped
   * the call). The new short-circuit is conservative — it skips the
   * pass-id bump entirely for classic-Ember builds where gxt-backend is
   * never loaded. That's load-order-safe because in classic-Ember
   * `_gxtSyncDomNow` is never invoked.
   *
   * Fast-check: the implementation is a single `_updateHookPassId++`
   * read-modify-write — one number increment, zero allocations. The
   * bridge call adds one `getGxtRenderer()` + one property dereference +
   * one optional-call to a one-line module-local mutation; trivially
   * cheap on the sync-cycle hot path.
   *
   * Previously: `(globalThis as any).__gxtNewRenderPass`.
   */
  newRenderPass?(): void;

  /**
   * Fire post-render lifecycle hooks (`didUpdate` / `didRender`) for all
   * component instances queued in manager.ts's module-local `_updatedInstances`
   * array. Called after DOM sync completes (PHASE 3 of `_gxtSyncDomNow`, after
   * the force-rerender DOM update). The implementation:
   *
   *   1. Bails immediately if `_updatedInstances.length === 0`.
   *   2. Stable-sorts the queue: deeper components first (via
   *      `_viewDepth`); siblings at the same depth fire in insertion order.
   *   3. Drains `_updatedInstances` to length 0 BEFORE firing hooks, so a
   *      follow-up sync triggered from inside a hook does not see the same
   *      hooks queued for re-fire.
   *   4. Saves/clears the two pending-sync flags (`getPendingSync` /
   *      `getPendingSyncFromPropertyChange`, both via the slice-36/37
   *      bridge surfaces) so the post-hook re-check can detect whether a
   *      hook (e.g., `this.set(...)` inside `didUpdate`) dirtied new state.
   *   5. Calls `triggerLifecycleHook(inst, 'didUpdate')` then
   *      `triggerLifecycleHook(inst, 'didRender')` for each instance in
   *      the sorted order.
   *   6. Drains pending `render.component` instrumentation finalizers via
   *      `_drainPendingRerenderInstrumentFinalizers` (classic Ember's
   *      `didUpdateLayout` equivalent).
   *   7. Inspects the post-hook pending-sync flag; if hooks did NOT
   *      produce new changes, restores the saved values verbatim; if
   *      they DID, OR's the saved values back in so nothing is lost.
   *   8. If hooks produced changes AND the recursion-depth guard
   *      `_postRenderHookReentryDepth` is below `_POST_RENDER_MAX_REENTRY`
   *      (3), bumps the guard and re-enters `__gxtSyncDomNow` via the
   *      slice-24 `compilePipeline.withSyncing(false, fn)` save-restore
   *      helper (clearing the syncing re-entrancy flag so the recursive
   *      syncDomNow call is permitted). On bridge-unavailable, calls
   *      `syncNow()` directly (the GXT pipeline isn't loaded, so there is
   *      no `_gxtSyncingFlag` to clear). The guard is decremented in a
   *      finally block.
   *
   * Called from compile.ts's `_gxtSyncDomNow` try block, PHASE 3 (after
   * force-rerender DOM update and the modifier-update-tracking flush in
   * PHASE 2d).
   *
   * Slice-92 (Cluster B): replaces the pre-slice-92 globalThis writer
   * `(globalThis as any).__gxtPostRenderHooks = function () { ... };`
   * at `manager.ts:4549` and the pre-slice-92 globalThis reader
   * `const postRender = (globalThis as any).__gxtPostRenderHooks; if
   * (typeof postRender === 'function') postRender();` at
   * `compile.ts:6753-6754`. The writer is graduated to a module-local
   * `function _gxtPostRenderHooks(): void { ... }` declaration next to
   * the `_postRenderHookReentryDepth` / `_POST_RENDER_MAX_REENTRY`
   * recursion-guard counter in manager.ts (slice-91 function-pointer
   * pattern, canonical state lives where it's primarily mutated/read).
   * The reader routes through
   * `getGxtRenderer()?.compilePipeline.postRenderHooks?.()`, the
   * optional-chain providing the same null-tolerant guard as the
   * pre-slice-92 `typeof === 'function'` check for classic-Ember builds
   * (where gxt-backend was never loaded). Net -1 globalThis slot.
   *
   * Bridge shape decision: typed-bridge `postRenderHooks(): void` method
   * on `GxtCompilePipelineCapabilities` (slice-55 `clearRenderErrors` /
   * slice-87 `notifyHelperPropertyChange` / slice-88 `clearHelperCache` /
   * slice-91 `newRenderPass` precedent — void-returning bridge method
   * invoked from a sibling intra-package reader). State home: manager.ts
   * (canonical owner of `_updatedInstances`, `_postRenderHookReentryDepth`,
   * `_POST_RENDER_MAX_REENTRY`, `_viewDepth`, and the lifecycle-hook /
   * instrumentation-finalizer machinery); the function lives there,
   * registered via `setGxtRenderer`'s compilePipeline namespace
   * (alongside the slice-91 `newRenderPass` entry), NOT via
   * `installCompilePipelinePart` from compile.ts (different installer-
   * direction than slice 87/88/89/90, which all routed through
   * compile.ts or ember-gxt-wrappers.ts).
   *
   * Bridge-not-yet-installed edge: the cross-file reader in compile.ts
   * uses `getGxtRenderer()?.compilePipeline.postRenderHooks?.()`. Both
   * optional chains short-circuit to `undefined` when either the renderer
   * or the method is not yet installed; the no-args `?.()` call simply
   * does nothing in that case (matches the pre-slice-92 semantics where,
   * if the slot was undefined, the `typeof === 'function'` guard skipped
   * the call). The new short-circuit is conservative — it skips the
   * post-render hook firing entirely for classic-Ember builds where
   * gxt-backend is never loaded. That's load-order-safe because in
   * classic-Ember `_gxtSyncDomNow` is never invoked.
   *
   * Re-entry via bridge: when hooks dirty new state and the recursion-
   * depth guard permits re-entry, the function calls the slice-24
   * `withSyncing(false, fn)` bridge helper which calls
   * `globalThis.__gxtSyncDomNow` (still a globalThis writer — not yet
   * migrated). That recursive `__gxtSyncDomNow` call lands back in
   * `_gxtSyncDomNow`'s try block and re-fires PHASE 3 (this same
   * post-render hooks bridge call) — the recursion-guard counter bounds
   * the depth to 3 so a perpetually self-dirtying hook cannot loop
   * forever.
   *
   * Fast-check: the implementation is the same body that lived inside
   * the pre-slice-92 globalThis function-expression — sort the queue,
   * fire two lifecycle hooks per instance, save/restore two pending
   * flags via the slice-36/37 bridge surfaces, drain instrumentation
   * finalizers, optionally re-enter sync via the slice-24 bridge. The
   * bridge call adds one `getGxtRenderer()` + one property dereference +
   * one optional-call to the same body; trivially cheap on the sync-cycle
   * hot path.
   *
   * Previously: `(globalThis as any).__gxtPostRenderHooks`.
   */
  postRenderHooks?(): void;

  /**
   * Force-rerender all GXT roots whose own tag moved in the current sync
   * cycle. Called as the fallback morph path from `_gxtSyncDomNow` (PHASE 2b)
   * after GXT's native cell-based DOM sync (PHASE 1) has run, and from
   * manager.ts's helper-recompute patched-recompute path (L602) to force a
   * full-tree morph that lets formulas reading helper cells re-evaluate.
   * The implementation:
   *
   *   1. Bails immediately if `_gxtForceRerenderInProgress` is `true` (slice-45
   *      module-local re-entrancy guard), preventing infinite loops when
   *      morphing triggers cell updates that schedule additional force-
   *      rerenders.
   *   2. Reads `getHadPendingSync()` (slice-35 bridge getter) and
   *      `getHadNestedObjectChange()` (slice-97 bridge getter) to decide
   *      whether to fall back to a full-tree force-rerender when no root's
   *      own tag moved.
   *   3. Consumes `_gxtDirtyRootsAtSync` (slice-46 module-local stash
   *      populated by `_gxtUpdateRootTagValues`) for the pre-sync dirty set,
   *      falling back to live tag-comparison for call-sites that don't go
   *      through the sync pipeline.
   *   4. Builds `effectiveDirtyRoots` (intersection of `dirtyRootsFromSync`
   *      with the live `allGxtRoots`) and `rootsToRender` (the dirty subset
   *      if non-empty, else `allGxtRoots` when `hadPendingSync &&
   *      hadNestedObjectChange`, else empty — no spurious full re-renders
   *      for child-tracked mutations that don't dirty any root tag).
   *   5. For each `rootToRender`: bumps the global render-pass ID
   *      (`__emberRenderPassId`), sets `__gxtIsForceRerender = true` for the
   *      duration of the `classicRoot.render()` call so the instance pool
   *      reuses existing instances (avoiding spurious init/render lifecycle-
   *      hook fires), restores the flag in a finally, and re-throws any
   *      deferred render errors stashed on `classicRoot.__gxtDeferredError`
   *      so they propagate to `assert.throws` in test contexts.
   *   6. The outer `finally` clears `_gxtForceRerenderInProgress`, calls
   *      `setHadPendingSync(false)` (slice-35 bridge setter), calls
   *      `setHadNestedObjectChange(false)` (slice-97 bridge setter), and
   *      clears `_gxtDirtyRootsAtSync = undefined` (slice-46 module-local).
   *
   * Called from:
   *   - `compile.ts:6716` — `_gxtSyncDomNow`'s PHASE 2b morph fallback,
   *     wrapping the call in a try/catch that stashes any rerender error in
   *     the module-local `_gxtDeferredSyncError` slot (slice-98 zero-bridge
   *     graduation from the retired `globalThis.__gxtDeferredSyncError`
   *     slot) for propagation after sync completes.
   *   - `manager.ts:602` — patched `recompute` body after helper-cache
   *     invalidation: sets `setHadPendingSync(true)` and
   *     `setHadNestedObjectChange(true)` (slice-97 bridge setter), then
   *     calls `forceEmberRerender()` to force a full-tree morph so the
   *     formula
   *     reading the helper cell re-evaluates against the new computed
   *     result.
   *
   * Slice-96 (Cluster B): replaces the pre-slice-96 globalThis writer
   * `(globalThis as any).__gxtForceEmberRerender = function () { ... };`
   * at `glimmer/lib/renderer.ts:1363` and the two pre-slice-96 globalThis
   * readers:
   *   - `compile.ts:6716` — `const forceRerender = (globalThis as any)
   *     .__gxtForceEmberRerender; if (typeof forceRerender === 'function')
   *     forceRerender();`
   *   - `manager.ts:602` — `const force = (globalThis as any)
   *     .__gxtForceEmberRerender; if (typeof force === 'function') force();`
   * The writer is graduated to a module-local `function
   * _gxtForceEmberRerender(): void { ... }` declaration in renderer.ts
   * (slice-91 / slice-92 function-pointer precedent, canonical state lives
   * where it's primarily mutated/read — the `renderers[]` registry plus
   * the slice-45/46 `_gxtForceRerenderInProgress` / `_gxtDirtyRootsAtSync`
   * module-local cycle state all live in renderer.ts). The two readers
   * route through `getGxtRenderer()?.compilePipeline.forceEmberRerender?.()`,
   * the optional-chain providing the same null-tolerant guard as the
   * pre-slice-96 `typeof === 'function'` check for classic-Ember builds
   * (where gxt-backend was never loaded). Net -1 globalThis slot, +1 new
   * bridge method on `compilePipeline`.
   *
   * Bridge shape decision: typed-bridge `forceEmberRerender(): void` method
   * on `GxtCompilePipelineCapabilities` (slice-91 `newRenderPass` /
   * slice-92 `postRenderHooks` precedent — void-returning bridge method
   * cross-package function-pointer pair, with state-home in the writer's
   * own file). Cross-package shape: writer in `@ember/-internals/glimmer`
   * (renderer.ts) + readers in `@ember/-internals/gxt-backend`
   * (manager.ts + compile.ts). Direction: renderer.ts contributes via
   * `installCompilePipelinePart({ forceEmberRerender: _gxtForceEmberRerender })`,
   * the same reverse-flow install used by slice-9's `installRootComponentPart`
   * (renderer.ts → gxt-bridge cross-package writer precedent).
   *
   * Namespace decision: `compilePipeline`. The function is semantically
   * part of the GXT post-runTask DOM sync pipeline (PHASE 2b morph
   * fallback, invoked from `_gxtSyncDomNow`'s try block alongside the
   * slice-91 `newRenderPass` / slice-92 `postRenderHooks` entries that
   * also live on `compilePipeline`). The state it consumes
   * (`_gxtForceRerenderInProgress`, `_gxtDirtyRootsAtSync`, `renderers[]`)
   * lives in renderer.ts; the install API runs at module init.
   *
   * Bridge-not-yet-installed edge: the two cross-file readers in
   * compile.ts and manager.ts use
   * `getGxtRenderer()?.compilePipeline.forceEmberRerender?.()`. Both
   * optional chains short-circuit to `undefined` when either the renderer
   * or the method is not yet installed; the no-args `?.()` call simply
   * does nothing in that case (matches the pre-slice-96 semantics where,
   * if the slot was undefined, the `typeof === 'function'` guard skipped
   * the call). In practice the bridge IS installed by the time
   * `_gxtSyncDomNow` fires or the helper-recompute path runs (both gated
   * on the GXT runtime being live, which is gated on renderer.ts module
   * init having completed). The new short-circuit is conservative — it
   * skips the morph entirely for classic-Ember builds where gxt-backend
   * is never loaded. That's load-order-safe because in classic-Ember
   * `_gxtSyncDomNow` is never invoked.
   *
   * Fast-check: the implementation is the same body that lived inside the
   * pre-slice-96 globalThis function-expression — re-entrancy guard,
   * dirty-roots collection across all `renderers[]`, scoped or full-tree
   * `classicRoot.render()` calls, deferred-error re-throw, finally-block
   * cycle-state reset. The bridge call adds one `getGxtRenderer()` + one
   * property dereference + one optional-call to the same body; trivially
   * cheap on the sync-cycle hot path (the morph itself is the dominant
   * cost, not the bridge dispatch).
   *
   * Previously: `(globalThis as any).__gxtForceEmberRerender`.
   */
  forceEmberRerender?(): void;

  /**
   * Read-only predicate for the `__gxtSuppressDirtyInRcSet` boolean flag.
   * Returns `true` iff the current synchronous stack is nested inside a
   * `withSuppressDirtyInRcSet(fn)` frame (one of the 4 manager.ts
   * internal-arg-write-back regions that must NOT schedule another GXT sync
   * cycle from inside their write-back).
   *
   * Sole consumer: `validator.ts:888`, inside the `classicDirtyTagForGuarded`
   * body. When TRUE, the validator dirties the tag and bumps the global
   * revision (so within-sync template re-reads see the new value) BUT
   * skips `__gxtExternalSchedule()` and `_glimmerGlobalContext.scheduleRevalidate()`
   * — preventing a backburner re-entry loop on curly component tests where
   * the rcSet internal write-back would otherwise trigger an immediate
   * re-schedule and recursive sync.
   *
   * Slice-95 (Cluster B): graduates the canonical state from the pre-
   * slice-95 `globalThis.__gxtSuppressDirtyInRcSet` slot to the module-
   * local `_gxtSuppressDirtyInRcSetFlag` in `compile.ts`. The single
   * cross-file reader in `validator.ts` routes through this bridge
   * predicate. Net globalThis surface delta: -1 slot (paired with
   * `withSuppressDirtyInRcSet`).
   *
   * Bridge-not-yet-installed edge: validator.ts uses
   * `getGxtRenderer()?.compilePipeline.isDirtyInRcSetSuppressed?.()` and
   * coerces to FALSE (the surrounding `if (!...)` treats undefined as
   * falsy → the suppression-OFF path runs). That matches pre-slice-95
   * semantics where the globalThis slot defaulted to undefined and the
   * `if (!gSched.__gxtSuppressDirtyInRcSet)` check passed (so the
   * `__gxtExternalSchedule` call ran). The bridge predicate is installed
   * at compile.ts module init via the final `installCompilePipelinePart`
   * block at file EOF; validator.ts's `classicDirtyTagFor` install runs
   * at manager.ts module init; by the time any rcSet write-back fires,
   * both have completed.
   *
   * Fast-check: reads the module-local `_gxtSuppressDirtyInRcSetFlag`
   * boolean — one boolean read; zero allocations. Matches slice-20/22/24/
   * 29/30/34's predicate body shape.
   */
  isDirtyInRcSetSuppressed?(): boolean;

  /**
   * Run `fn` while the `__gxtSuppressDirtyInRcSet` boolean flag is set to
   * `true` (save the prior value, set the flag, invoke `fn`, then restore
   * the prior value via `try/finally`). Returns whatever `fn` returns.
   * Re-entrancy-safe: an enclosing frame's value is preserved by the
   * save-restore pattern (nested calls stack correctly).
   *
   * Slice-95 (Cluster B): graduates the cross-file writer sites for
   * `__gxtSuppressDirtyInRcSet` to a typed bridge helper. Slice-18
   * `withInTriggerReRender` precedent — fixed-value (TRUE-for-body)
   * variant of slice-24's `withSyncing(value, fn)` since all 4 writer
   * regions in manager.ts use the identical save-set-TRUE-restore pattern
   * (no FALSE-for-body callers).
   *
   * Pre-slice-95 writers (4 sites, all intra-`manager.ts`, all save-
   * set-TRUE-for-body-restore via try/finally — pre-slice-95 each
   * expanded into a 3-statement triplet: capture prev → set TRUE inside
   * try → restore prev in finally):
   *  - `manager.ts:2782` — `_rcSet` (curly-component arg dispatch in the
   *    `if (newValue !== oldValue)` branch where `key !== 'elementId'`):
   *    suppresses the schedule for the `instance[key] = newValue` write-
   *    back paired with `instance.__gxtDispatchingArgs = true`.
   *  - `manager.ts:2820` — `_rcSet` (the arg-reset loop body for keys
   *    that disappear from the new args set): suppresses the schedule
   *    for the `instance[key] = undefined` write-back paired with
   *    `instance.__gxtDispatchingArgs = true`.
   *  - `manager.ts:4208` — dynamic-component arg-changed sync (the
   *    `if (argChanged)` body when `entry.instance && key !== 'class' &&
   *    !cellEntry.skipInstanceAssign`): suppresses the schedule for the
   *    `entry.instance[key] = newValue` write-back; this body has an
   *    inner try with catch-and-ignore to swallow assignment errors,
   *    with the suppression restore in the outer finally.
   *  - `manager.ts:4268` — dynamic-component arg-changed sync (the
   *    `else if (argActuallyChanged)` body in the locally-overridden
   *    branch): same shape as L4208 — suppresses the schedule for the
   *    `entry.instance[key] = newValue` write-back with an inner
   *    catch-and-ignore and an outer finally-restore.
   *
   * All 4 writer regions migrate to a `withSuppressDirtyInRcSet(() => {
   * entry.instance.__gxtDispatchingArgs = true; try { instance[key] =
   * newValue; } finally { entry.instance.__gxtDispatchingArgs = false; }
   * });` shape. The two manager.ts writers at L4208 and L4268 preserve
   * their pre-slice-95 inner `try { ... } catch (catch-and-ignore) finally
   * { __gxtDispatchingArgs = false }` shape inside the lambda body —
   * the wrapper's try/finally handles the suppress-flag restore, the
   * lambda's inner try/catch/finally handles the dispatching-arg restore
   * and assignment-error swallowing.
   *
   * Bridge shape decision: TRUE-for-body fixed wrapper (slice-18
   * `withInTriggerReRender` precedent — paired-method pattern: single
   * predicate + single TRUE-for-body wrapper, no separate setter).
   * Slice 95 cannot use slice-29's mark+consume because the flag uses
   * a try/finally save-set-restore pattern (the 4 paired open/close
   * triplets aren't one-shot consumer boundaries). Slice 95 cannot use
   * slice-35/36/37/38/40/41's paired get/set because all writers want
   * TRUE-for-body semantics (no FALSE-for-body or straight-line
   * assignment writer), making the wrapper a strictly tighter fit than
   * a paired setter the callers would have to wrap manually.
   *
   * State home: `compile.ts` (consistent with slice-17/18/20/22/24/29/30/
   * 34/35/36/37/38/40/41/89's "canonical state lives in compile.ts
   * alongside the other compilePipeline state" rule). The 4 writers are
   * in manager.ts (separate file within the same package); manager.ts
   * already imports `getGxtRenderer` (slice-6+), so no new import edges.
   *
   * Bridge-not-yet-installed edge: manager.ts uses
   * `getGxtRenderer()?.compilePipeline.withSuppressDirtyInRcSet?.(fn)` at
   * each of the 4 writer sites. If the bridge isn't installed yet, the
   * optional chain returns `undefined` and the body would never run.
   * Each writer site falls back to running the lambda body directly so
   * the assignment still happens. In practice the bridge IS installed by
   * the time any rcSet write-back fires (the dispatch path is gated on
   * a fully-rendered template, which is gated on compile.ts module init
   * having completed). Without the suppression in the fallback path, the
   * scheduler may queue an extra re-render — harmless but extra work.
   *
   * Fast-check: writes the module-local `_gxtSuppressDirtyInRcSetFlag`
   * boolean — one boolean read + one boolean write + one function call
   * + one boolean restore; zero allocations beyond the closure. Matches
   * slice-18/22/24's wrapper body shape.
   */
  withSuppressDirtyInRcSet?<T>(fn: () => T): T;

  /**
   * Read the `__gxtHadNestedObjectChange` boolean flag. Returns `true` iff
   * a nested-object property mutation has been observed since the last
   * `_gxtForceEmberRerender` finally-block (or between-test reset) cleared
   * the flag. A "nested-object change" is a property mutation on an object
   * that is NOT the SELF_TAG-owning root component — e.g., `set(m,
   * 'message', ...)` where `m` is a nested EmberObject reachable through a
   * component's @args, or `foo.set('text', ...)` where `foo` is a plain
   * tracked class instance. These mutations don't dirty any component's
   * SELF_TAG (Ember only dirties the object's own tag), so the cell-based
   * sync pipeline alone won't propagate the change to formulas like
   * `{{this.m.formattedMessage}}`. The flag signals to
   * `_gxtForceEmberRerender` that it should fall back to a full-tree
   * `classicRoot.render()` over all GXT roots so computed properties /
   * aliases re-evaluate against the new nested object state.
   *
   * Sole consumer (slice-97 pre-migration): `glimmer/lib/renderer.ts:1408`,
   * inside `_gxtForceEmberRerender`'s body — captured into
   * `hadNestedObjectChange` and combined with `hadPendingSync` to decide
   * whether to fall back to `allGxtRoots` when no root's own tag moved
   * (the `rootsToRender = effectiveDirtyRoots.length > 0 ?
   * effectiveDirtyRoots : hadPendingSync && hadNestedObjectChange ?
   * allGxtRoots : []` ternary at renderer.ts:1452).
   *
   * Pre-slice-97 writers setting TRUE (4 sites):
   *  - `compile.ts:4522` (intra-file, inside `__gxtTriggerReRender`'s
   *    nested-object-change detection, `_deferredTagDirties.length > 0`
   *    branch — Case 1: tag dirtying was reverse-looked-up via
   *    `_objectValueCellMap` explicit cell registration). Routes through
   *    the module-local `_gxtSetHadNestedObjectChange` directly.
   *  - `compile.ts:4565` (intra-file, inside the `else if (obj && typeof
   *    obj === 'object')` branch when `obj` is NOT a CUSTOM-managed
   *    component — Case 2: mutated object is not itself a root component,
   *    treated as a nested object for cross-root propagation). Routes
   *    through the module-local helper directly.
   *  - `compile.ts:4569` (intra-file, inside the `catch` of the
   *    custom-managed-component check — conservative fallback: if the
   *    check throws, treat as nested-object). Routes through the
   *    module-local helper directly.
   *  - `gxt-backend/manager.ts:601` (cross-file — helper-recompute path
   *    after cache invalidation; sets TRUE paired with
   *    `setHadPendingSync(true)` before calling
   *    `compilePipeline.forceEmberRerender?.()` so the full-tree morph
   *    runs and lets the formula reading the helper cell re-evaluate).
   *    Routes through this bridge setter.
   *
   * Pre-slice-97 clearers setting FALSE (2 sites):
   *  - `compile.ts:7088` (intra-file — between-test reset block alongside
   *    the slice-35/36/37 paired-sync-flag clearers). Routes through the
   *    module-local helper directly.
   *  - `glimmer/lib/renderer.ts:1494` (cross-package —
   *    `_gxtForceEmberRerender`'s finally-block clear alongside
   *    `setHadPendingSync(false)`). Routes through this bridge setter.
   *
   * Slice-97 (Cluster B): graduates the canonical state from the pre-
   * slice-97 `globalThis.__gxtHadNestedObjectChange` slot to the module-
   * local boolean `_gxtHadNestedObjectChangeFlag` in `compile.ts`. The 3
   * intra-file writers + 1 intra-file clearer route through the module-
   * local `_gxtSetHadNestedObjectChange(value)` helper directly (slice-22/
   * 24/27/30/31/32/33/34/35 intra-file-writer precedent); the cross-file
   * writer at `manager.ts:601` and the cross-package clearer at
   * `renderer.ts:1494` route through this bridge setter; the sole cross-
   * package reader at `renderer.ts:1408` routes through this bridge
   * getter. Net globalThis surface delta: -1 slot (paired with
   * `setHadNestedObjectChange`).
   *
   * Bridge-not-yet-installed edge: the cross-package reader uses
   * `getGxtRenderer()?.compilePipeline.getHadNestedObjectChange?.()` and
   * coerces with `!!` to FALSE. That matches pre-slice-97 semantics where
   * `globalThis.__gxtHadNestedObjectChange === undefined` (pre-first-
   * mutation edge) coerced via `!!` to FALSE. The reader at
   * renderer.ts:1408 runs only inside `_gxtForceEmberRerender` (reached
   * via Phase 2b of `__gxtSyncDomNow` or manager.ts:602's helper-
   * recompute path); both reach paths run AFTER compile.ts's module init
   * has completed the final `installCompilePipelinePart` block at file
   * EOF, so the bridge IS installed in practice and the getter returns
   * the real boolean value.
   *
   * Bridge shape decision: paired get/set (slice-14/35/36/37 paired-
   * methods pattern) — slice 97 has cross-file/cross-package WRITERS
   * (manager.ts:601 helper-recompute path + glimmer/lib/renderer.ts:1494
   * morph-fallback finally) in addition to cross-package readers
   * (renderer.ts:1408 morph-fallback gate) — both surfaces must be
   * reachable. Mirrors slice-35's `_gxtHadPendingSyncFlag` shape exactly
   * (both flags are boolean morph-pipeline state cleared by
   * `_gxtForceEmberRerender`'s finally and read inside
   * `_gxtForceEmberRerender` to decide whether to fall back to a full-
   * tree force-rerender — slice 97's paired bridge naturally follows
   * slice 35's paired bridge).
   *
   * State-home decision: `compile.ts` (3 of 4 writers and the between-
   * test reset clearer live in compile.ts; the cross-file writer in
   * manager.ts also lives in the gxt-backend package; only the morph-
   * fallback clearer and the morph-fallback reader live cross-package
   * in renderer.ts). Consistent with slice-17/18/20/22/24/29/30/34/35/
   * 36/37/38/40/41/89/95's "canonical state lives in compile.ts
   * alongside the other compilePipeline state" rule.
   *
   * Fast-check: reads the module-local `_gxtHadNestedObjectChangeFlag`
   * boolean — one boolean read; zero allocations. Matches slice-35's
   * `getHadPendingSync()` body shape.
   *
   * Previously: `(globalThis as any).__gxtHadNestedObjectChange`.
   */
  getHadNestedObjectChange?(): boolean;

  /**
   * Write the `__gxtHadNestedObjectChange` boolean flag. The flag's
   * lifetime and semantics are described in the `getHadNestedObjectChange`
   * doc above.
   *
   * Slice-97 (Cluster B): graduates the canonical state from the pre-
   * slice-97 `globalThis.__gxtHadNestedObjectChange` slot to the module-
   * local boolean `_gxtHadNestedObjectChangeFlag` in `compile.ts`. The 3
   * intra-file writers (compile.ts L4522/L4565/L4569) + 1 intra-file
   * clearer (compile.ts L7088 between-test reset) route through the
   * module-local `_gxtSetHadNestedObjectChange(value)` setter directly;
   * the 1 cross-file writer (manager.ts:601 helper-recompute path) +
   * the 1 cross-package clearer (glimmer/lib/renderer.ts:1494 morph-
   * fallback finally) route through this bridge setter. Net globalThis
   * surface delta: -1 slot (paired with `getHadNestedObjectChange`).
   *
   * Bridge-not-yet-installed edge: cross-file / cross-package writers
   * use `getGxtRenderer()?.compilePipeline.setHadNestedObjectChange?.(
   * value)`. Both optional chains short-circuit to `undefined` (no-op)
   * when either the renderer or the method is not yet installed — the
   * pre-slice-97 writers' assignment to
   * `globalThis.__gxtHadNestedObjectChange` also would have been observed
   * only by the reader inside `_gxtForceEmberRerender`, which runs AFTER
   * compile.ts's module init (so by the time any writer fires, the
   * bridge is installed in practice).
   *
   * Bridge shape decision: paired get/set (slice-14/35/36/37 paired-
   * methods pattern) — see `getHadNestedObjectChange` for the full
   * rationale (slice 97 has both cross-package readers AND cross-file/
   * cross-package writers, both surfaces must be reachable, mirrors
   * slice-35's `_gxtHadPendingSyncFlag` paired shape exactly).
   *
   * Fast-check: writes the module-local `_gxtHadNestedObjectChangeFlag`
   * boolean — one boolean assignment; zero allocations. Matches
   * slice-35's `setHadPendingSync()` body shape.
   *
   * Previously: `(globalThis as any).__gxtHadNestedObjectChange`.
   */
  setHadNestedObjectChange?(value: boolean): void;

  /**
   * Get the `_tagHelperInstanceCache` Map (the compile.ts-owned per-helper-
   * name cache for tag-helper instances created via `$_tag`). Returns a
   * `Map<string, { instance, recomputeTag }>` whose entries persist across
   * force-rerenders (which wipe and rebuild the DOM via `innerHTML = ''`)
   * so a single helper instance + its `recomputeTag` survive in-place
   * instead of being recreated each render pass.
   *
   * Consumer (cross-file): `ember-gxt-wrappers.ts` — inside the
   * `_tagDirtySentinel.lastArgsSer` setter (the bridge that propagates
   * classic-tag dirties from `dirtyTagForGuarded` into cached tag-helper
   * instances). When the synthetic sentinel entry is dirtied (by
   * `validator.ts` iterating `__gxtClassHelperInstanceCache` on every
   * `dirtyTagFor` call), the setter walks every cached tag-helper instance
   * and clears its `__gxtLastArgsSerialized` dedup key — forcing compile.ts's
   * helperGetter to re-run `compute()` instead of returning a stale cached
   * result. Without this propagation, classic-tag mutations on EXTERNAL
   * objects captured in a tag-helper's closure would not invalidate that
   * helper's compute() result, leading to stale renders.
   *
   * Consumer (intra-`compile.ts`): the `evictFromCache(_tagHelperInstanceCache)`
   * call inside `branchSwapHelperDestroyHook` (the `$_if` branch-swap helper-
   * destroy hook installed at compile.ts ~L5249). This reader was converted
   * to direct module-local access in slice 99 (the cache lives in the same
   * file as the consumer; no bridge surface required for the intra-file
   * read).
   *
   * Pre-slice-99 reader (1 site, cross-file):
   *  - `ember-gxt-wrappers.ts:248` — `const tagCache = (globalThis as any).
   *    __gxtTagHelperInstanceCache as Map<...> | undefined;` inside the
   *    `_tagDirtySentinel.lastArgsSer` setter (described above). The setter
   *    body `if (!tagCache || tagCache.size === 0) return;` short-circuits
   *    when the cache is empty or missing — matches the slice-99 bridge
   *    `getTagHelperInstanceCache?.()` returning undefined when compile.ts
   *    has not yet run its `installCompilePipelinePart` at EOF.
   *
   * Slice-99 (Cluster B): graduates the canonical state from the pre-slice-99
   * `globalThis.__gxtTagHelperInstanceCache` slot to the typed get-only
   * accessor. The intra-`compile.ts` reader was converted to direct module-
   * local access; the cross-file `ember-gxt-wrappers.ts` reader routes
   * through this bridge method. Bridge shape mirrors slice-69's
   * `getWrapperUserFalseSet` (get-only collection-return accessor) and
   * slice-78's `getResolverCacheCounters` (get-only typed-bridge accessor).
   * Net -1 globalThis slot, +1 bridge method.
   *
   * Bridge-not-yet-installed semantics: optional-chain
   * `getTagHelperInstanceCache?.()` returns undefined before compile.ts's
   * `installCompilePipelinePart` at EOF fires; the reader body's
   * `if (!tagCache || tagCache.size === 0) return;` short-circuits — matches
   * pre-slice-99 semantics where the slot was undefined → the loop body
   * skipped silently.
   *
   * Fast-check: 1 closure read (returning the captured `_tagHelperInstanceCache`
   * reference); zero allocations on every call. Identical hot-path cost to
   * the pre-slice-99 globalThis property read.
   */
  getTagHelperInstanceCache?(): Map<string, { instance: any; recomputeTag: any }> | undefined;
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
 * avoids runtime mutation entirely. (Slice 62 update: those two globalThis
 * slots are now module-local `const _gxtTemplateOnlyRenderedSet` /
 * `const _gxtTemplateOnlyStack` in `compile.ts` — see the slice 62 entry
 * further down for the full topology.)
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
   * (Slice 62 update: those two globalThis slots are now module-local
   * `const _gxtTemplateOnlyRenderedSet` / `const _gxtTemplateOnlyStack` in
   * `compile.ts`; the host hook body `_resetTemplateOnlyState` is unchanged
   * in shape — only its internals access the module-local bindings.)
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
