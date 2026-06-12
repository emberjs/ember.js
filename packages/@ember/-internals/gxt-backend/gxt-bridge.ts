/**
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
   */
  destroyDestroyable(destroyable: object): void;

  /**
   * Flush any custom-managed (manager.ts:_customManagedInstances) component
   * instances whose DOM nodes are no longer connected. Invoked from
   * `__gxtDestroyUnclaimedPoolEntries` near the start of its sweep.
   */
  destroyCustomManagedInstances(): void;

  /**
   * Drive the unclaimed-pool-entry destroy sweep. Called from compile.ts at
   * the end of `__gxtSyncDomNow` Phase 2 to fire lifecycle hooks on pool
   * entries that were in the previous render but not in the new one.
   */
  destroyUnclaimedPoolEntries(): void;

  /**
   * Destroy any classic-component instances whose wrapper element appears in
   * the given list of removed DOM nodes. Called from multiple compile.ts
   * sites after morph-driven DOM mutations.
   */
  destroyInstancesInNodes(removedNodes: ReadonlyArray<Node>): void;

  /**
   * Run the full interactive destroy lifecycle for all tracked component
   * instances. Called from compile.ts at QUnit afterEach teardown.
   */
  destroyTrackedInstances(): void;

  /**
   * Destroy a single Ember component instance with full lifecycle hooks.
   * Used by `$_dc_ember` (dynamic-component switch) in ember-gxt-wrappers.ts.
   */
  destroyEmberComponentInstance(instance: object): void;

  /**
   * Fire the deferred async teardown (didDestroyElement → willDestroy) for the
   * OLD rows of an `{{#each}}` that transitioned non-empty → empty. Called from
   * compile.ts's `_gxtSyncDomNow` Phase 3c, AFTER Phase 3b
   * (`flushAfterInsertQueue`) fired the NEW inverse content's
   * didInsertElement/didRender — matching classic Ember's
   * new-insert-before-async-destroy.
   */
  finalizeInverseOldRows?(rows: ReadonlyArray<object>, cycle: number): void;
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
 */
export interface GxtBacktrackingCapabilities {
  /**
   * Open a new backtracking-detection frame. `debugName` is captured for
   * inclusion in the assertion message if a backtracking write is observed
   * during the frame.
   */
  beginFrame(debugName?: string): void;

  /**
   * Close the current backtracking-detection frame. Always called in a
   * `finally` block paired with `beginFrame`.
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
   */
  checkBacktracking?(targetObj: unknown, key: string): void;

  /**
   * Host hook contributed by compile.ts (via `installBacktrackingPart`) that
   * rewrites the backtracking assertion message before manager.ts's
   * `checkBacktracking` dispatches it to `_assertFn`. Used to inject names of
   * rendered template-only components into the render tree (template-only
   * components have no instance and so are not visible in the parentView
   * chain that `checkBacktracking` walks).
   *
   * Best-effort: errors thrown from the hook are caught and the original
   * message is used.
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
 */
export interface GxtViewUtilsCapabilities {
  /**
   * Push a view onto the parent-view stack. Child components created during
   * the next render(s) read the top of this stack as their `parentView`.
   */
  pushParentView(view: object): void;

  /**
   * Pop the top entry from the parent-view stack. Always called in a
   * `finally` block paired with `pushParentView`.
   */
  popParentView(): void;

  /**
   * Read the top of the parent-view stack (or null when empty). Used by
   * compile.ts's `patchedIf` to CAPTURE the owning view at construction time
   * (when an enclosing `{{yield}}` has the invoking component on the stack) so
   * the captured parent can be re-pushed during reactive branch toggles — the
   * GXT-native if-opcode bypasses the syncState wrapper's push (it captured the
   * bound original `syncState` before compile.ts replaced it), so sub-components
   * created on toggle would otherwise resolve `parentView = null`.
   */
  getCurrentParentView?(): object | null;

  /**
   * Look up the view associated with a DOM element via the ember-source
   * ELEMENT_VIEW weakmap. Returns null when no view is associated.
   */
  getElementView(element: Element): object | null;

  /**
   * Look up the DOM element associated with a view via the ember-source
   * VIEW_ELEMENT weakmap. Returns null when no element is associated.
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
   * Best-effort: errors thrown from the hook are caught and ignored. Only one
   * contributor at a time is supported (compile.ts).
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
   */
  getWrapperUserFalseSet?(): Set<string> | undefined;

  /**
   * Flush all queued `didInsertElement` / `didRender` callbacks accumulated in
   * manager.ts's `_afterInsertQueue` during a render pass, then trigger
   * `rebuildViewTreeFromDom` (which itself dispatches the
   * `afterRebuildViewTreeFromDom` host hook). Called from the renderer after
   * the GXT `template.render()` call has synchronously appended all DOM into
   * the live document.
   *
   * NOTE: intra-`manager.ts` callers of the exported `flushAfterInsertQueue`
   * function bypass the bridge adapter (and thus the after-hook). The direct
   * intra-file caller is the renderer-side `flushAfterInsertQueue` at the tail
   * of `_render`, which doesn't NEED the in-element drain (in-element deferred
   * renders enqueue from compile.ts's `$_inElement` shim during a render pass;
   * the renderer-side flush happens at depth-0 pass-end which is independent).
   * The 2 cross-package callers (compile.ts:`__gxtSyncDomNow` Phase 3b +
   * ember-gxt-wrappers.ts: `$_dc_ember` swap path) DO need the drain, so they
   * route through the bridge adapter.
   *
   * Best-effort: errors thrown from the body or from the after-hook are
   * caught and ignored at the bridge-adapter level (both halves protected).
   */
  flushAfterInsertQueue?(): void;

  /**
   * Host hook contributed by compile.ts (via `installViewUtilsPart`) that runs
   * AFTER manager.ts's `flushAfterInsertQueue` body. Used to drain the in-
   * element deferred-render queue (`_drainInElementDeferQueue` module-local
   * pointer in compile.ts, seeded in the in-element bare block) so that
   * `{{#in-element}}` block bodies whose compile-time literal id targets
   * resolved to null during an active render pass get a second-chance
   * render once the outer parent's DocumentFragment has been committed to
   * the live document.
   *
   * Best-effort: errors thrown from the hook are caught and ignored at the
   * bridge-adapter level in manager.ts (the drain runs even if the body
   * throws — both halves are caught independently). Only one contributor at
   * a time is supported (compile.ts).
   */
  afterFlushAfterInsertQueue?(): void;

  /**
   * Read the current render-pass id counter. The counter is a monotonically
   * increasing integer advanced once per top-level render / re-render
   * transaction (`renderer.ts`'s force-rerender loop, the test-helper
   * `render` / `rerender` entry points). It serves as a "logical clock" for
   * the GXT-backend render machinery — gxt-backend modules cache per-pass
   * state on dozens of hot paths (instance-pool claim-flag resets, custom-
   * managed component pool resets, arg-getter memoization, template-only
   * rendered-set resets, style-binding XSS warn dedup, classic-component
   * rendered-in-pass tracking, formula-result cache invalidation,
   * template-factory hit/miss counters, etc.).
   *
   * Returns `0` when the bridge is not yet installed. All gxt-backend readers
   * route through `getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0`.
   */
  getRenderPassId?(): number;

  /**
   * Advance the render-pass id counter by 1. Paired with `getRenderPassId`.
   * Called by the renderer's force-rerender loop (intra-file, uses the
   * module-local `_incrementEmberRenderPassId` directly) and by the
   * test-helper `render` / `rerender` entry points (cross-package, routes
   * through this bridge method).
   *
   * Returns void. The new value is observable via `getRenderPassId()`.
   */
  incrementRenderPassId?(): void;
}

/**
 * Format / attribute-value helpers. Implemented by manager.ts and currently
 * only consumed intra-package, but exposed via the bridge to give future
 * cross-package consumers a typed entry point.
 */
export interface GxtFormatCapabilities {
  /**
   * Decide whether to emit a style-binding XSS warning for the given
   * (element, value) pair. The implementation tracks per-element dedup and
   * suppresses warnings during force-rerender (`__gxtIsForceRerender`).
   *
   * Returns `true` if the caller SHOULD emit the warning, `false` if the
   * element has already been warned about (or force-rerender is in flight).
   */
  shouldWarnStyle(element: unknown, value?: string): boolean;
}

/**
 * Compile-pipeline capabilities. Composite namespace: methods are contributed
 * both from manager.ts (initial `setGxtRenderer` install) and from compile.ts /
 * ember-template-compiler.ts via `installCompilePipelinePart`.
 *
 * Why incremental install? `manager.ts` and `compile.ts` deliberately don't
 * import each other (top-level circular-load hazard). A subset of compile-
 * pipeline hooks have their function definitions in compile.ts where they
 * close over compile-internal WeakMaps (`_arrayOwnerMap`, `_objectValueCellMap`)
 * or compile-local `let` state (`_intervalSyncBudget`). Relocating those
 * functions to manager.ts would require relocating the closures too, which
 * either fragments the maps' reader sites (3+ intra-compile.ts callers) or
 * pulls in scheduling state that has no place in manager.ts. A small
 * partial-install API is cleaner than forcing relocation.
 *
 * `compileTemplate` is exposed both here and as a globalThis writer in
 * compile.ts: the `@glimmer-workspace/integration-tests` `gxt-delegate.ts`
 * consumer lives in a workspace that does not depend on `@ember/-internals`
 * and so cannot import the bridge. That dual exposure is intentional.
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
   */
  syncWrapper(obj: unknown, keyName: string): void;

  /**
   * Snapshot all live component instances before a force-rerender. Used by
   * `__gxtDestroyUnclaimedPoolEntries` to detect which instances were
   * removed after the rebuild. Called from compile.ts at the start of
   * `__gxtSyncDomNow`'s Phase 2a.
   *
   * Also clears the marked-for-destruction set from the previous cycle.
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
   * The in-flight pass-id / cycle-id state set before the body and cleared
   * after it lives in the manager.ts module-locals `_gxtSyncAllInFlightPass`
   * / `_gxtSyncAllInFlightCycle`.
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
   * Note: the diagnostic harness reader at the repository-root
   * `index.html:102` is outside `packages/` and reads the `globalThis`
   * accessor directly (it cannot import from `gxt-bridge`). No source writer
   * publishes that globalThis slot, so the harness reader silently no-ops
   * (its `typeof === 'function'` guard handles the missing slot); production
   * builds neither load it nor run that cleanup.
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
   */
  addDynamicComponentListener(fn: () => boolean, options?: { stringPath?: boolean }): () => void;

  /**
   * Clear all registered dynamic-component change listeners and reset the
   * string-path listener counter to zero. Called from compile.ts's
   * `__gxtSyncDomNow` test-teardown Phase 2 (the cross-test reset block at
   * compile.ts:5800-5801) so listeners registered by a previous test do not
   * fire (and are not counted) during the next test.
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
   */
  triggerReRender?(obj: object, keyName: string, value?: unknown): void;

  /**
   * Register a BEFORE-chain host hook to run BEFORE the canonical
   * `triggerReRender` body. Returns an off-fn the caller invokes from its
   * destructor (or never, for module-init contributors that live for the
   * entire process) to de-register the hook. The off-fn is idempotent.
   *
   * Hook errors are caught and ignored.
   */
  addBeforeTriggerReRender?(fn: (obj: object, keyName: string) => void): () => void;

  /**
   * Register an AFTER-chain host hook to run AFTER the canonical
   * `triggerReRender` body. Returns an off-fn (idempotent).
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
   * Suppression semantics: the canonical `_gxtTriggerReRender` function in
   * compile.ts checks `_gxtTriggerSuppressedFlag` at its single entry point
   * and short-circuits when the flag is `true`. All readers — bridge
   * readers (`compilePipeline.triggerReRender(...)`), direct intra-file
   * callers in compile.ts, and the canonical body itself — observe the
   * same no-op for the duration of `fn`.
   */
  withTriggerSuppressed?<T>(fn: () => T): T;

  /**
   * Run `fn` with `__gxtInTriggerReRender` set to `true` (save the prior
   * value, set the flag, invoke `fn`, then restore the prior value via
   * `try/finally`). Returns whatever `fn` returns. Re-entrancy-safe because
   * an enclosing frame's value is preserved by the save-restore pattern.
   *
   * Reader contract: the flag is consumed by:
   *  - `metal/computed.ts:522` — `CP.get` short-circuits cache misses when
   *    `isInTriggerReRender() && revision === undefined` (preserves
   *    classic Ember's "don't eagerly evaluate never-consumed CPs during a
   *    change notification" semantic).
   *  - `@ember/object/core.ts:325` — DEBUG proxy trap's `_isInternalPath`
   *    predicate.
   *
   * See `isInTriggerReRender()` below for the read-side surface.
   */
  withInTriggerReRender?<T>(fn: () => T): T;

  /**
   * Read-only predicate for `__gxtInTriggerReRender`. Returns `true` iff the
   * current synchronous stack is nested inside a `withInTriggerReRender(fn)`
   * frame (or inside the canonical `triggerReRender` body, which is itself
   * wrapped by `withInTriggerReRender`).
   */
  isInTriggerReRender?(): boolean;

  /**
   * Read-only predicate for the render-pass depth counter at
   * `compile.ts:_renderPassDepth`. Returns `true` iff at least one render
   * pass is currently active (i.e., `_gxtSetIsRendering(true)` was called
   * more often than `_gxtSetIsRendering(false)` since module init).
   *
   * The globalThis writer `__gxtIsRendering` is retained because the DEBUG
   * proxy trap at `@ember/object/core.ts:321` reads it together with two
   * other globalThis flags (`__gxtSyncing`, `__gxtInTriggerReRender`) and is
   * not routed through the bridge. The bridge predicate reads the same
   * module-local `_renderPassDepth` counter as the globalThis function — they
   * are equivalent once installed.
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
   * Conditional-restore semantics: ALWAYS increment depth on entry. On exit
   * (in `finally`), ONLY decrement when we entered with depth == 0 (the call
   * frame is the outermost render). When nested inside another render pass
   * (entered with depth > 0), the decrement is SKIPPED, leaving the counter
   * inflated by 1 for the rest of the enclosing frame. This "drift" is
   * required to gate the in-element deferred-render drain trigger: the drain
   * fires on the depth-1→0 transition during the OUTER frame's decrement —
   * but ONLY when no nested frames inflated the counter. A naive
   * "always-increment, always-decrement" wrap regresses 3 tests in `Strict
   * Mode - renderComponent` ("multiple calls to render in to the same element
   * appear as siblings" and variants) where the extra inner-frame drain
   * replays a queued in-element render in the parent before the parent
   * commits, producing duplicated DOM output.
   *
   * The intra-file caller `compile.ts:13819` (templateFactory.render body)
   * calls `_gxtSetIsRendering` directly with unconditional increment/
   * decrement — its caller contract requires the bump for in-element
   * render-pass detection regardless of nesting, and the surrounding
   * try/catch already provides try/finally semantics.
   */
  withRendering?<T>(fn: () => T): T;

  /**
   * Read-only predicate for the `__gxtSyncing` boolean flag toggled by
   * `compile.ts`'s `__gxtSyncDomNow` body (and the manager.ts post-render
   * hook re-entry guard at `manager.ts:4202-4215`). Returns `true` iff the
   * current synchronous stack is nested inside the GXT post-`runTask` DOM
   * sync flush (Phase 0 through Phase 5 in `__gxtSyncDomNow`).
   *
   * Several intra-file readers continue to read the `__gxtSyncing` globalThis
   * flag directly (the `__gxtSyncDomNow` / interval-flush re-entrancy guards
   * in compile.ts, the sync-cycle instance marking in manager.ts, and
   * `destroyable.ts`'s join-flush-vs-sync-destroy choice). The DEBUG proxy
   * trap at `@ember/object/core.ts:324` routes through this predicate as part
   * of the 3-flag `_isInternalPath` group.
   */
  isSyncing?(): boolean;

  /**
   * Run `fn` while the `__gxtSyncing` boolean flag is set to `value`
   * (save the prior value, set the flag, invoke `fn`, then restore the
   * prior value via `try/finally`). Returns whatever `fn` returns.
   * Re-entrancy-safe: an enclosing frame's value is preserved by the
   * save-restore pattern (nested calls stack correctly).
   *
   * The intra-file `__gxtSyncDomNow` body and the cleanup path in
   * `__gxtCleanupActiveComponents` set the flag through the module-local
   * `_gxtSetSyncing` setter directly (their own try/finally provides the
   * cleanup pairing). The canonical state is the module-local
   * `_gxtSyncingFlag` in `compile.ts`; the cross-package `manager.ts`
   * post-render-hook re-entry uses `withSyncing(false, fn)`.
   */
  withSyncing?<T>(value: boolean, fn: () => T): T;

  /**
   * Run `fn` while the `__gxtCurrentlyRendering` boolean flag is set to
   * `true` (save the prior value, set the flag, invoke `fn`, then restore
   * the prior value via `try/finally`). Returns whatever `fn` returns.
   * Re-entrancy-safe: an enclosing frame's value is preserved by the
   * save-restore pattern (nested calls stack correctly).
   *
   * Writers: the `wrapHandler` event-handler wrap in `manager.ts` uses this
   * save-restore helper; the `templateFactory.render` body in `compile.ts`
   * sets the module-local `_gxtSetCurrentlyRendering` directly (it always
   * wants to detect "inside a template body call" regardless of nesting, and
   * its own try/finally provides the cleanup pairing). The canonical state is
   * the module-local `_gxtCurrentlyRenderingFlag` in `compile.ts`.
   *
   * The flag is read (via `isCurrentlyRendering()`) by `metal/tracked.ts` and
   * `glimmer-tracking.ts` to guard the cross-object reactivity trigger from a
   * non-component @tracked setter: when a render is already in flight, the
   * setter must NOT fire its own `triggerReRender` + external schedule.
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
   */
  isCurrentlyRendering?(): boolean;

  /**
   * Mark that a tracked write occurred since the last `UpdatingVM.execute`
   * call. Called from the `addBeforeTriggerReRender` host hook registered by
   * `ember-gxt-wrappers.ts`. The flag is consumed (and cleared) on the next
   * `UpdatingVM.execute` call by `consumeTrackedSetSinceRerender()` below.
   *
   * The canonical state is the module-local `_gxtTrackedSetSinceRerenderFlag`
   * in `compile.ts`.
   */
  markTrackedSetSinceRerender?(): void;

  /**
   * Atomically check + clear the "tracked set since last rerender" flag.
   * Returns the prior value of the flag and resets the canonical
   * module-local `_gxtTrackedSetSinceRerenderFlag` (compile.ts) to
   * `false`.
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
   * The single canonical writer at `compile.ts:__gxtSyncDomNow` body is
   * intra-file and uses the module-local `_gxtIncrementSyncCycleId()`
   * directly — NOT exposed via the bridge surface, because the writer is
   * always intra-file (no external caller is expected to bump the counter).
   * This is a deliberate read-only-bridge shape: external consumers can
   * observe the counter but not advance it.
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
   */
  getModifierInstallWatchers?(): Map<object, () => void> | undefined;

  /**
   * Read-only Array-getter exposing the canonical pending-modifier-destroys
   * queue. Returns the live module-local `_pendingModifierDestroys` Array
   * (always-defined at module init), `undefined` only when the bridge
   * implementation is not yet installed (defensive optional chain on the
   * method itself). The queue holds entries (heterogeneous —
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
   * Topology:
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
   * Readers:
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
   */
  getHadPendingSync?(): boolean;

  /**
   * Write the `__gxtHadPendingSync` boolean flag. The flag's lifetime and
   * semantics are described in the `getHadPendingSync` doc above.
   *
   * Writers (5 sites):
   *  - `gxt-backend/compile.ts:5636` (intra-file, routes through module-
   *    local `_gxtSetHadPendingSync` directly).
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
   * Readers (2 sites, both intra-`compile.ts`):
   *  - `compile.ts:5671` — `__gxtSyncDomNow` body — capture into
   *    `_gxtSetHadPendingSync(!!flag)`. The captured `__gxtHadPendingSync`
   *    is then read in Phase 1 gates and cross-package by glimmer's
   *    modifier-replay + force-rerender-start sites.
   *  - `compile.ts:5683` — `__gxtSyncDomNow` body — capture into
   *    `_gxtSetSyncIsPropertyDriven(!!flag)`. The captured
   *    `__gxtSyncIsPropertyDriven` is then read cross-file in manager.ts's
   *    `__gxtDestroyUnclaimedPoolEntries` destroy-error capture gate.
   */
  getPendingSyncFromPropertyChange?(): boolean;

  /**
   * Write the `__gxtPendingSyncFromPropertyChange` boolean flag. The
   * flag's lifetime and semantics are described in the
   * `getPendingSyncFromPropertyChange` doc above.
   *
   * Intra-`compile.ts` writers set the module-local
   * `_gxtSetPendingSyncFromPropertyChange(value)` setter directly; the
   * cross-file `manager.ts` writers (post-render-hooks save/restore +
   * handler-tail clear), the cross-package writers (outlet rerender in
   * templates/root.ts + transition LinkTo in routing/router.ts), and the
   * test-helper writers route through this bridge setter.
   *
   * Test-helper writer contract: clear the flag in
   * `teardown` / `runTask` / `runAppend` / `render` tail-finally blocks so
   * the setInterval(16ms) fallback flusher does NOT pick up stale sync state
   * from the previous test.
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
   * Readers:
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
   */
  getPendingSync?(): boolean;

  /**
   * Write the `__gxtPendingSync` boolean flag. The flag's lifetime and
   * semantics are described in the `getPendingSync` doc above.
   *
   * Intra-`compile.ts` writers set the module-local `_gxtSetPendingSync(value)`
   * setter directly; the cross-file `manager.ts` writers (post-render-hooks
   * save/restore + handler-tail clear), the cross-package writers
   * (renderer.ts revalidate + templates/root.ts outlet + routing/router.ts
   * transition), and the test-helper writers route through this bridge setter.
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
   * Readers (2 sites, both cross-package, at the same sites as
   * `getPendingSync`'s readers):
   *  - `glimmer/lib/renderer.ts:1282` — `_backburner.on('end', ...)`
   *    listener — gate the post-end syncDomNow flush.
   *  - `runloop/index.ts:84` — runloop `onEnd` hook — gate the GXT
   *    DOM-sync flush at the end of the outermost runloop.
   */
  getRunTaskActive?(): boolean;

  /**
   * Write the `__gxtRunTaskActive` boolean flag. The flag's lifetime
   * and semantics are described in the `getRunTaskActive` doc above.
   *
   * Writers (4 sites, all test-helper):
   *  - `internal-test-helpers/lib/run.ts:15` — `runAppend` body open —
   *    set TRUE before `run(view, 'appendTo')`.
   *  - `internal-test-helpers/lib/run.ts:35` — `runAppend` finally —
   *    clear after `appendTo` body completes.
   *  - `internal-test-helpers/lib/run.ts:130` — `runTask` body open —
   *    set TRUE before `run(callback)`.
   *  - `internal-test-helpers/lib/run.ts:143` — `runTask` finally —
   *    clear after `run(callback)` body completes.
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
   * Readers (1 site, cross-package — paired with the
   * clearer on the same logical step):
   *  - `internal-test-helpers/lib/run.ts:49` — `runAppend` post-`appendTo`
   *    block — reads the flag into a local (`afterRenderChanged`) to gate
   *    the `setPendingSyncFromPropertyChange(false)` reset below.
   */
  getAfterRenderPropertyChange?(): boolean;

  /**
   * Write the `__gxtAfterRenderPropertyChange` boolean flag. The flag's
   * lifetime and semantics are described in the
   * `getAfterRenderPropertyChange` doc above.
   *
   * Writers (1 site, cross-package — `run.ts` clearer; the
   * intra-`compile.ts` SET-TRUE writer at compile.ts:4082 routes via the
   * intra-file helper directly and does NOT use this bridge setter):
   *  - `internal-test-helpers/lib/run.ts:50` — `runAppend` post-`appendTo`
   *    block — clear the flag unconditionally after the
   *    `getAfterRenderPropertyChange()` read above (per-`runAppend`-cycle
   *    state).
   */
  setAfterRenderPropertyChange?(value: boolean): void;

  /**
   * Read the `__gxtInAfterRender` boolean flag. Returns `true` if a
   * `schedule('afterRender', cb)` wrapped callback body is currently
   * executing — i.e., we are nested inside `gxtAfterRenderWrapper` at
   * `@ember/runloop/index.ts:512-521`. Used by `_gxtTriggerReRender`
   * in `compile.ts:4129` to gate the
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
   * Readers (1 site intra-`compile.ts`; the cross-package
   * `runloop/index.ts:514` save-step read also routes through this getter):
   *  - `compile.ts:4129` — `_gxtTriggerReRender` body — gates the
   *    `_gxtSetAfterRenderPropertyChange(true)` setter.
   */
  getInAfterRender?(): boolean;

  /**
   * Write the `__gxtInAfterRender` boolean flag. The flag's lifetime
   * and semantics are described in the `getInAfterRender` doc above.
   *
   * Writers (3 sites, all intra-`@ember/runloop/index.ts`
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
   */
  setInAfterRender?(value: boolean): void;

  /**
   * Read the `__gxtMutContext` runtime context value. Returns the component
   * render context (`unknown` because callers in compile.ts handle it as
   * an opaque component instance — the same `this` value of the template
   * that invoked `(mut ...)` or `(__mutGet ...)`) captured by the most
   * recent active save/set frame, or `undefined` when no `mut` / `__mutGet`
   * dispatch is currently in flight (module-init default).
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
   * Readers (2 sites, both intra-`compile.ts`):
   *  - `compile.ts:6906` — `__EMBER_BUILTIN_HELPERS__.mut` body.
   *  - `compile.ts:7209` — `__EMBER_BUILTIN_HELPERS__.__mutGet` body.
   */
  getMutContext?(): unknown;

  /**
   * Write the `__gxtMutContext` runtime context value. The value's
   * lifetime and semantics are described in the `getMutContext` doc
   * above.
   *
   * Writers (6 sites, all intra-`ember-gxt-wrappers.ts`,
   * two save/set/finally-restore triplets around `helper(...)`
   * invocations):
   *  - `ember-gxt-wrappers.ts:530-536` — `__mutGet` branch
   *    save/set/finally-restore triplet.
   *  - `ember-gxt-wrappers.ts:592-599` — `mut` branch save/set/
   *    finally-restore triplet.
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
   * The (`_obj`, `_key`) arguments are CURRENTLY UNUSED — the cache
   * invalidation is unconditional rather than scoped to the object/key pair.
   * They are preserved in the signature for symmetry with the call site at
   * `manager.ts:565` (which passes `this, '__gxtRecomputeTagRef'`) and for
   * future per-key scoping if/when the helper cache grows a key-indexed
   * dependency tracker.
   *
   * Best-effort: caller wraps the bridge call in a `try/catch` (defensive
   * — the bridge method itself is loop-safe and won't throw, but the
   * surrounding `__gxtTriggerReRender` after-body iterates external state
   * that may not be in a consistent shape).
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
   * Readers (1 site, cross-package):
   *  - `glimmer/lib/templates/outlet.ts:30` — `connectedCallback` guard
   *    at the top of the body: `if ((globalThis as any).
   *    __gxtDestroyReattachInProgress) { return; }`.
   */
  getDestroyReattachInProgress?(): boolean;

  /**
   * Write the `__gxtDestroyReattachInProgress` boolean flag. The flag's
   * lifetime and semantics are described in the
   * `getDestroyReattachInProgress` doc above.
   *
   * Writers (4 sites, all intra-`gxt-backend`):
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
   * State home: `compile.ts` — per the "canonical state lives where it's
   * primarily mutated" rule, consistent with the other module-local
   * boolean-flag paired bridges.
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
   * Topology (1 writer + 3 readers):
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
   *      `getPendingSyncFromPropertyChange`, both via the bridge surfaces)
   *      so the post-hook re-check can detect whether a hook (e.g.,
   *      `this.set(...)` inside `didUpdate`) dirtied new state.
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
   *      `compilePipeline.withSyncing(false, fn)` save-restore
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
   * Re-entry via bridge: when hooks dirty new state and the recursion-
   * depth guard permits re-entry, the function calls the
   * `withSyncing(false, fn)` bridge helper which calls
   * `globalThis.__gxtSyncDomNow` (still a globalThis writer). That recursive
   * `__gxtSyncDomNow` call lands back in
   * `_gxtSyncDomNow`'s try block and re-fires PHASE 3 (this same
   * post-render hooks bridge call) — the recursion-guard counter bounds
   * the depth to 3 so a perpetually self-dirtying hook cannot loop
   * forever.
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
   *   1. Bails immediately if `_gxtForceRerenderInProgress` is `true` (the
   *      module-local re-entrancy guard), preventing infinite loops when
   *      morphing triggers cell updates that schedule additional force-
   *      rerenders.
   *   2. Reads `getHadPendingSync()` and `getHadNestedObjectChange()` to
   *      decide whether to fall back to a full-tree force-rerender when no
   *      root's own tag moved.
   *   3. Consumes `_gxtDirtyRootsAtSync` (the module-local stash populated by
   *      `_gxtUpdateRootTagValues`) for the pre-sync dirty set, falling back
   *      to live tag-comparison for call-sites that don't go through the sync
   *      pipeline.
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
   *      `setHadPendingSync(false)`, calls `setHadNestedObjectChange(false)`,
   *      and clears `_gxtDirtyRootsAtSync = undefined`.
   *
   * Called from:
   *   - `compile.ts:6716` — `_gxtSyncDomNow`'s PHASE 2b morph fallback,
   *     wrapping the call in a try/catch that stashes any rerender error in
   *     the module-local `_gxtDeferredSyncError` slot for propagation after
   *     sync completes.
   *   - `manager.ts:602` — patched `recompute` body after helper-cache
   *     invalidation: sets `setHadPendingSync(true)` and
   *     `setHadNestedObjectChange(true)`, then calls `forceEmberRerender()`
   *     to force a full-tree morph so the formula reading the helper cell
   *     re-evaluates against the new computed result.
   */
  forceEmberRerender?(): void;

  /**
   * Flush pending GXT DOM updates synchronously. Called by the runloop's
   * `onEnd` hook (when `__gxtPendingSync` is true and `__gxtRunTaskActive`
   * is false), by `runAppend` / `runTask` test helpers after their callback,
   * by the 16ms `setInterval` fallback in compile.ts when no other caller
   * has flushed in the budget window, by the manager.ts post-render-hook
   * re-entry path (wrapped in `withSyncing(false, ...)`), by
   * `validator.ts`'s `classicDirtyTagFor` after the global revision bump,
   * by the ember-gxt-wrappers helper recompute path (microtask-queued),
   * by the routing transition LinkTo path, by the OutletView re-render
   * fallback in renderer.ts, by the classic-reactor fire in renderer.ts,
   * and by root.ts's outlet-model-update path. The body lives in
   * `compile.ts` and consumes the canonical `_gxtPendingSyncFlag` /
   * `_gxtSyncingFlag` / `_gxtSyncIsPropertyDrivenFlag` / `_gxtSyncCycleId`
   * module-local state.
   */
  syncDomNow?(): void;

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
   */
  isDirtyInRcSetSuppressed?(): boolean;

  /**
   * Run `fn` while the `__gxtSuppressDirtyInRcSet` boolean flag is set to
   * `true` (save the prior value, set the flag, invoke `fn`, then restore
   * the prior value via `try/finally`). Returns whatever `fn` returns.
   * Re-entrancy-safe: an enclosing frame's value is preserved by the
   * save-restore pattern (nested calls stack correctly).
   *
   * Writers (4 sites, all intra-`manager.ts`, all save-set-TRUE-for-body-
   * restore via try/finally — each is a 3-statement triplet: capture prev →
   * set TRUE inside try → restore prev in finally):
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
   * Each writer region uses a `withSuppressDirtyInRcSet(() => {
   * entry.instance.__gxtDispatchingArgs = true; try { instance[key] =
   * newValue; } finally { entry.instance.__gxtDispatchingArgs = false; }
   * });` shape. The two manager.ts writers at L4208 and L4268 keep an inner
   * `try { ... } catch (catch-and-ignore) finally { __gxtDispatchingArgs =
   * false }` inside the lambda body — the wrapper's try/finally handles the
   * suppress-flag restore, the lambda's inner try/catch/finally handles the
   * dispatching-arg restore and assignment-error swallowing.
   *
   * State home: `compile.ts` (canonical state lives in compile.ts alongside
   * the other compilePipeline state). The 4 writers are in manager.ts
   * (a separate file within the same package), which already imports
   * `getGxtRenderer`.
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
   * Sole consumer: `glimmer/lib/renderer.ts:1408`,
   * inside `_gxtForceEmberRerender`'s body — captured into
   * `hadNestedObjectChange` and combined with `hadPendingSync` to decide
   * whether to fall back to `allGxtRoots` when no root's own tag moved
   * (the `rootsToRender = effectiveDirtyRoots.length > 0 ?
   * effectiveDirtyRoots : hadPendingSync && hadNestedObjectChange ?
   * allGxtRoots : []` ternary at renderer.ts:1452).
   *
   * Writers setting TRUE (4 sites):
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
   * Clearers setting FALSE (2 sites):
   *  - `compile.ts:7088` (intra-file — between-test reset block alongside
   *    the paired-sync-flag clearers). Routes through the module-local
   *    helper directly.
   *  - `glimmer/lib/renderer.ts:1494` (cross-package —
   *    `_gxtForceEmberRerender`'s finally-block clear alongside
   *    `setHadPendingSync(false)`). Routes through this bridge setter.
   */
  getHadNestedObjectChange?(): boolean;

  /**
   * Write the `__gxtHadNestedObjectChange` boolean flag. The flag's
   * lifetime and semantics are described in the `getHadNestedObjectChange`
   * doc above.
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
   * destroy hook installed at compile.ts ~L5249) reads the cache directly as a
   * module-local — it lives in the same file, so no bridge surface is needed.
   *
   * Cross-file reader (1 site): `ember-gxt-wrappers.ts:248` inside the
   * `_tagDirtySentinel.lastArgsSer` setter (described above), which reads the
   * cache via this bridge getter and short-circuits when it is empty or
   * missing (`if (!tagCache || tagCache.size === 0) return;`).
   *
   * Bridge-not-yet-installed semantics: the optional-chain
   * `getTagHelperInstanceCache?.()` returns undefined before compile.ts's
   * `installCompilePipelinePart` at EOF fires; the reader's
   * `if (!tagCache || tagCache.size === 0) return;` then short-circuits, so
   * the loop body skips silently.
   */
  getTagHelperInstanceCache?(): Map<string, { instance: any; recomputeTag: any }> | undefined;

  /**
   * Get the `classHelperInstanceCache` Map (the `ember-gxt-wrappers.ts`-owned
   * per-helper-name cache for class-based helper instances created via
   * `$_maybeHelper`). Returns the live `Map<string, any>` whose entries are
   * either a raw helper instance, a `{ __managerBucket: true, bucket, ... }`
   * wrapper for setHelperManager-bridged helpers, or — for the synthetic
   * `__tagDirtySentinel__` entry — the manager-bucket-shaped object whose
   * `lastArgsSer` setter propagates classic-tag dirties into the cached tag-
   * helper instances.
   *
   * Consumers (cross-file):
   *
   *   1. `validator.ts` — inside `dirtyTagFor` (called from
   *      `_glimmerGlobalContext.dirtyTagFor` and from
   *      `dirtyTagForGuarded`/Ember's classic tag-mutation path). On every
   *      classic-tag dirty the loop walks every cached class-based helper
   *      bucket and stamps a fresh `lastArgsSer = '__classic_tag_dirty__' +
   *      globalRevisionCounter` so that the next `$_maybeHelper` invocation
   *      takes the cache-miss branch and re-runs `delegate.getValue()`. The
   *      cache-key bump is essential because helpers that close over non-arg
   *      `@tracked` state (functional helpers reading `service.name`, class-
   *      based helpers reading a module-level tracked instance) would
   *      otherwise return stale cached values keyed solely by argsSer.
   *
   *   2. `compile.ts` — three intra-package read sites inside the `$_if`
   *      branch-swap helper-destroy hook (at L5285 `evictFromCache(...)` and
   *      at L5326/L5339 in `snapshotCacheKeys` / `destroyNewCacheEntriesSince`).
   *      The hook walks the cache, identifies cache entries whose instances
   *      belong to the just-evaluated `{{#if}}` branch, and removes them so
   *      the next render creates fresh helper instances with their full
   *      lifecycle (init / willDestroy / etc.). A fourth read at L5544 inside
   *      `destroyHelpersIn` (the `ifCondition.syncState` watcher) performs
   *      the same `cache.forEach` walk to evict by instance identity.
   *
   * Readers pattern (4 sites, all cross-file):
   *  - `validator.ts:954` — `(globalThis as any).__gxtClassHelperInstanceCache as Map<string, any> | undefined;`
   *  - `compile.ts:5285` — `evictFromCache(_g.__gxtClassHelperInstanceCache);` inside the `branchSwapHelperDestroyHook`
   *  - `compile.ts:5326` — `const cache = _g.__gxtClassHelperInstanceCache;` inside `snapshotCacheKeys`
   *  - `compile.ts:5339` — `const cache = _g.__gxtClassHelperInstanceCache;` inside `destroyNewCacheEntriesSince`
   *  - `compile.ts:5544` — `const cache = g2.__gxtClassHelperInstanceCache;` inside `destroyHelpersIn` (`ifCondition.syncState` watcher)
   *
   * Bridge-not-yet-installed semantics: optional-chain
   * `getClassHelperInstanceCache?.()` returns undefined before `ember-gxt-
   * wrappers.ts`'s `installCompilePipelinePart` at L215 fires (early classic-
   * tag-dirty firings during module init can race with the bridge install);
   * the reader bodies' existing `if (!cache || typeof cache.forEach !==
   * 'function') return;` / `if (helperCache && helperCache.size > 0)` guards
   * short-circuit, so the loop body skips silently.
   */
  getClassHelperInstanceCache?(): Map<string, any> | undefined;

  /**
   * Get the `_gxtHelperInstances` destroy-tracking array (compile.ts-owned
   * module-local). The array accumulates class-based helper instances created
   * via `$_tag` (compile.ts) and `$_maybeHelper` (ember-gxt-wrappers.ts) plus
   * setHelperManager-bridged destroyable buckets, so that test-teardown +
   * `_gxtDestroyTrackedInstances` Phase 4 can iterate and call
   * `instance.destroy()` (firing the classic-Helper `willDestroy` lifecycle
   * hook) before the next test starts. The array identity is stable across
   * the module lifetime; contents are mutated in place via
   * `pushHelperInstance` (writers) and
   * `length = 0` (test-teardown clear at compile.ts:7651, also performed by
   * `internal-test-helpers/lib/run.ts:131` post-iterate-destroy).
   *
   * Consumers (cross-file readers — iterate + destroy + clear):
   *
   *   1. `gxt-backend/manager.ts:5375` — `Phase 4` of `_gxtDestroyTrackedInstances`,
   *      iterates the array and calls `destroy()` on every instance that has
   *      not yet been destroyed/destroying, capturing errors via
   *      `captureRenderError(e)` so they propagate to `assert.throws`. The
   *      array is NOT cleared here (`Phase 4` is one of several phases; the
   *      array is cleared later in `_gxtClearOnSetup` at compile.ts:7651
   *      and by `run.ts:131` post-`destroy()` cleanup).
   *
   *   2. `internal-test-helpers/lib/run.ts:120` — after the `run(destroy,
   *      toDestroy)` call swallows "already destroyed" errors during test
   *      cleanup. Iterates the array, calls `destroy()` on every instance
   *      that has not yet been destroyed/destroying (errors swallowed), then
   *      clears the array via `length = 0` (line 131). This is the
   *      destroy-on-component-destroy path that fires when a component
   *      lifecycle ends, distinct from the test-teardown reset that fires
   *      between tests.
   *
   * Readers pattern (2 sites, cross-file):
   *  - `manager.ts:5375` — `const helperInstances = (globalThis as any).
   *    __gxtHelperInstances; if (Array.isArray(helperInstances)) { ... }`
   *  - `run.ts:120` — `const helperInstances = (globalThis as any).
   *    __gxtHelperInstances; if (Array.isArray(helperInstances) &&
   *    helperInstances.length > 0) { ... helperInstances.length = 0; }`
   *
   * Bridge-not-yet-installed semantics: optional-chain `getHelperInstances?.()`
   * returns undefined before compile.ts's `installCompilePipelinePart` at
   * EOF fires; the reader bodies' existing `if (Array.isArray(...) ...)`
   * guards short-circuit, so the destroy loop skips silently.
   */
  getHelperInstances?(): any[] | undefined;

  /**
   * Push a class-based helper instance (or setHelperManager-bridged
   * destroyable bucket) onto the `_gxtHelperInstances` destroy-tracking
   * array. Fires the optional push-hook registered via
   * `setHelperInstancePushHook` (manager.ts's `_installHelperRecomputeBridge`)
   * BEFORE the array push — the hook installs the classic-helper-recompute
   * GXT bridge on the pushed instance (defineProperty + `cellFor`-backed
   * `value` accessor on the RECOMPUTE_TAG symbol, plus a patched
   * `recompute()` method that bumps the GXT cell after the original fires
   * so `gxtEffect` re-runs and the `_tagHelperInstanceCache` dedup key
   * invalidates — see the `_installHelperRecomputeBridge` doc in manager.ts
   * L501-664). The hook is optional (null until manager.ts registers it via
   * queueMicrotask after compile.ts's `installCompilePipelinePart` runs);
   * when null the push proceeds without the bridge install. Errors from the
   * hook are caught and swallowed.
   *
   * Consumers (cross-file writers — push-only, never read):
   *
   *   1. `ember-gxt-wrappers.ts:586` — inside the `$_maybeHelper`
   *      setHelperManager-bridged-delegate path. After `delegate.createHelper(...)`
   *      creates the helper bucket and the `delegate.getDestroyable(bucket)`
   *      call returns the destroyable instance (when the delegate's
   *      capabilities include `hasDestroyable`), the destroyable is pushed
   *      onto the array so test-teardown calls its `destroy()` method.
   *
   *   2. `ember-gxt-wrappers.ts:906` — inside the `$_maybeHelper`
   *      setHelperManager-bridged-delegate path's branch-swap recreation
   *      branch (when a previously cached bucket needs full recreation).
   *      Same `delegate.getDestroyable(bucket)` push pattern as #1, but
   *      also runs the `__gxtCurrentHelperScope.add(destroyable)`
   *      `{{#if}}`-branch-scope wiring for branch-teardown destroy fire.
   *
   *   3. `ember-gxt-wrappers.ts:1080` — inside the `$_maybeHelper`
   *      class-based-helper path (factory.create() cache miss). When a
   *      fresh class-based helper instance is created and inserted into
   *      `classHelperInstanceCache`, it is also registered for destruction
   *      via this push — fires the manager.ts recompute bridge install on
   *      the new instance so its `recompute()` participates in GXT
   *      reactivity.
   *
   * Intra-`compile.ts` writer (1 site, uses module-local
   * `_gxtPushHelperInstance` directly): compile.ts:10295 — inside `$_tag`'s
   * class-based-helper instance creation block (when a fresh class-helper is
   * created and inserted into the `_tagHelperInstanceCache` sibling cache).
   * The direct module-local call bypasses the bridge.
   *
   * Writers pattern (3 sites, all cross-file):
   *  - `ember-gxt-wrappers.ts:586` — `const helperInstances = g.__gxtHelperInstances;
   *    if (Array.isArray(helperInstances)) { helperInstances.push(destroyable); }`
   *  - `ember-gxt-wrappers.ts:906` — same shape as L586
   *  - `ember-gxt-wrappers.ts:1080` — same shape as L586
   *
   * Bridge-not-yet-installed semantics: optional-chain `pushHelperInstance?.()`
   * is a no-op before compile.ts's `installCompilePipelinePart` at EOF fires,
   * and on classic-Ember builds where compile.ts is not loaded. The
   * destroy-tracking is a GXT-mode-only concern; skipping it in classic-Ember
   * has no observable effect (the helper instances are destroyed by Ember's
   * classic owner.destroy() path).
   */
  pushHelperInstance?(inst: any): void;

  /**
   * Register the per-push hook fired by `pushHelperInstance` BEFORE the
   * array push. Used by `manager.ts` to install
   * `_installHelperRecomputeBridge` — the function that wires every
   * pushed class-based helper instance into GXT's reactive graph
   * (defineProperty + `cellFor` on the RECOMPUTE_TAG symbol's `value`
   * property, plus a patched `recompute()` method that bumps the GXT
   * cell after the original fires so `gxtEffect` re-runs and the
   * `_tagHelperInstanceCache` dedup key invalidates).
   *
   * manager.ts registers the hook via
   * `compilePipeline.setHelperInstancePushHook?.(_installHelperRecomputeBridge)`
   * deferred through queueMicrotask (so the call fires AFTER compile.ts's
   * `installCompilePipelinePart` registers the setter). The
   * `pushHelperInstance` implementation in compile.ts fires the registered
   * hook in a try/catch (best-effort, errors swallowed).
   *
   * Bridge-not-yet-installed semantics: manager.ts's queueMicrotask
   * dispatch ensures the bridge is installed before any cross-file push
   * fires (pushes happen at render time, microtasks drain at end of
   * sync module-init). Optional-chain `setHelperInstancePushHook?.()`
   * no-ops on classic-Ember builds where compile.ts is not loaded —
   * in that build, the push paths are also unreachable (gxt-backend is
   * never loaded), so the missed hook install is benign.
   */
  setHelperInstancePushHook?(hook: (inst: any) => void): void;

  /**
   * Recompute the cached values of all classic computed-property descriptors
   * on `obj` whose `_dependentKeys` array references `changedKey` (either
   * directly or as a dotted-path prefix `<changedKey>.foo`). Returns a list
   * of `{ key, value }` pairs for each recomputed CP, ready for the caller
   * to push into the corresponding GXT cell via `cellFor(obj, key).update(value)`.
   *
   * Implementation lives in `@ember/-internals/metal/lib/property_events.ts`
   * (where the classic `beginPropertyChanges` / `endPropertyChanges` deferred
   * counter lives — the function MUST early-return an empty array inside a
   * deferred batch so dependent CP re-evaluation is postponed until batch
   * close, mirroring classic Ember semantics). Routes the meta lookup
   * through `peekMeta` and the per-CP recompute through `descriptor.get(obj,
   * propKey)` (cache-aware path) with fallbacks to `descriptor._getter` and
   * the no-arg `descriptor.get` for older descriptor shapes. CPs with no
   * cached revision (`meta.revisionFor(propKey) === undefined`) are skipped
   * to avoid eagerly invoking user getters with side effects on properties
   * the caller has never read.
   *
   * Sole consumer: `compile.ts:4459` inside `__gxtTriggerReRender`'s
   * post-`cellFor(obj, keyName).update(newValue)` derived-CP propagation
   * loop. Wrapped in a try/catch so any descriptor / meta access failure
   * silently skips the CP fan-out (the primary cell update already fired
   * above, so renders still observe the user-set value; dependent CPs will
   * lazily recompute on next read).
   */
  recomputeDependents?(obj: object, changedKey: string): Array<{ key: string; value: unknown }>;

  /**
   * Notify Ember's property-change system that `obj[keyName]` has changed.
   * Invokes the metal `notifyPropertyChange(obj, keyName, _meta?, value?)`
   * canonical writer — same body that runs `markObjectAsDirty`, fires
   * `propertyDidChange` callbacks, propagates to sync observers, and (in
   * GXT mode) drives the GXT cell-update fan-out. Returns void.
   *
   * Readers:
   *   1. Cross-package: at `gxt-backend/manager.ts:4461`, inside the
   *      classic-component `$_dc` dynamic-component arg-sync fan-out, calls
   *      `getGxtRenderer()?.compilePipeline.notifyPropertyChange?.(
   *         entry.instance, key)`. The optional chain provides a
   *      null-tolerant guard.
   *   2. Intra-package: the `__GXT_MODE__`-gated `_notifyPropChange(this,
   *      key)` call inside the `@tracked` setter at `metal/lib/tracked.ts:287`
   *      imports `notifyPropertyChange` directly from `./property_events`
   *      (the same sibling-import shape as `array_events.ts` /
   *      `property_set.ts` / `set_properties.ts`), bypassing the bridge.
   */
  notifyPropertyChange?(obj: object, keyName: string, _meta?: unknown, value?: unknown): void;

  /**
   * Reset GXT state between tests. Destroys all tracked component instances
   * (firing willDestroy hooks), clears block-params / slot-params / slots-
   * context stacks, drains the curried-render-infos array, clears the
   * helper-instance cache (`$_maybeHelper`) and the tag-helper-instance
   * cache (`$_tag`), clears component instance pools, clears stale
   * ifWatchers, destroys cached engine instances from `{{mount}}` so
   * `Namespace.destroy()` removes them from `NAMESPACES`, clears pending
   * if-watcher notifications, clears dynamic-component change listeners
   * and the stale `$_dc_ember` getter, resets the GXT pending-sync /
   * pending-sync-from-property-change / had-pending-sync / had-nested-
   * object-change / syncing flags, resets the rendering `$slots` / `$fw`
   * globals, and clears the GXT VM's internal `TREE` / `CHILD` / `PARENT`
   * / `relatedTags` / `tagsToRevalidate` / `opsForTag` Maps to prevent
   * unbounded memory growth across tests. Each sub-step is wrapped in its
   * own try/catch so a failure in one bucket doesn't skip the rest.
   *
   * Implementation lives in `gxt-backend/compile.ts` (the canonical home of
   * the block-params / slot-params / curried-render-infos / engine-
   * instances / pending-sync / had-nested-object-change / syncing module-
   * locals AND the only file with line-of-sight to the GXT-runtime `getVM`
   * / `getRenderTree` globals exposed in dev mode). Sub-step dispatch routes
   * through the `clearInstancePools`, `clearDynamicComponentListeners`,
   * `clearHelperCache` and `destruction.destroyTrackedInstances` bridge
   * entries and intra-file helpers `_gxtClearTagHelperCache` /
   * `_gxtClearIfWatchers` / `_gxtSetPendingSync` etc. The function is
   * registered on the bridge via `installCompilePipelinePart({
   * cleanupActiveComponents: _gxtCleanupActiveComponents })` at compile.ts's
   * EOF install block.
   *
   * Consumers (3 cross-package readers, all `afterEach` hooks in test-case
   * base classes in `@ember/internal-test-helpers`):
   *   - `lib/test-cases/abstract-application.ts:71` —
   *     `ApplicationTestCase#afterEach` (cleans GXT state before
   *     `runDestroy(this.applicationInstance)` / `runDestroy(this.application)`).
   *   - `lib/test-cases/abstract.ts:76` —
   *     `AbstractStrictTestCase#afterEach` (cleans GXT state before
   *     `runDestroy(this)`).
   *   - `lib/test-cases/rendering.ts:94` —
   *     `RenderingTestCase#afterEach` (cleans GXT state before
   *     `runDestroy(this.component)` / `runDestroy(this.owner)`).
   */
  cleanupActiveComponents?(): void;

  /**
   * Run `fn` while the morph-render in-progress flag is `true` AND the
   * morph-modifier-invocations array is exposed to the modifier-manager
   * handle path. The save-restore pair sets both pieces of state on entry,
   * invokes `fn` (the `(gxtTemplate as any).render(freshContext, tempContainer)`
   * call in `renderer.ts:967-983`), and clears the flag back to `false` and
   * the invocations slot back to `null` on completion (including when `fn`
   * throws) via try/finally. The caller passes the empty invocations array
   * it owns — `withMorphRender` only writes the bridge-visible slot and never
   * mutates the array itself; mutation happens via the modifier-manager
   * `handle` reader (which pushes `{ modifier, element, props, hashArgs }`
   * entries onto the same array the caller still holds a reference to).
   *
   *   const morphModInvocations: any[] = [];
   *   (globalThis as any).__gxtMorphModifierInvocations = morphModInvocations;
   *   (globalThis as any).__gxtMorphRenderInProgress = true;
   *   try {
   *     (gxtTemplate as any).render(freshContext, tempContainer);
   *   } finally {
   *     (globalThis as any).__gxtMorphRenderInProgress = false;
   *     (globalThis as any).__gxtMorphModifierInvocations = null;
   *     popParentView();
   *   }
   *
   * Reader contract (3 readers, all in `gxt-backend`):
   *  - `manager.ts:8938` — modifier-manager `handle` flag-check gate (intercept
   *    modifier installation during morph re-renders). Routed through
   *    `getGxtRenderer()?.compilePipeline.isMorphRenderInProgress?.()`.
   *  - `manager.ts:8941` — modifier-manager `handle` invocations-array push
   *    (queues the modifier invocation for post-morph replay). Routed
   *    through `getGxtRenderer()?.compilePipeline.getMorphModifierInvocations?.()`.
   *  - `compile.ts:15905` — `$_each` empty-comment cleanup gate during
   *    morph re-renders (skips empty-comment removal on temp containers).
   *    Intra-file reader; routes directly through the module-local
   *    `_gxtIsMorphRenderInProgress` helper.
   *
   * The canonical state is the module-local `_gxtMorphRenderInProgressFlag` +
   * `_gxtMorphModifierInvocations` bindings in `compile.ts`; the bridge
   * methods are the sole cross-package surface, and the intra-file reader
   * (`compile.ts:15905`) uses the module-local helper directly.
   */
  withMorphRender?<T>(invocations: any[], fn: () => T): T;

  /**
   * Read-only predicate for the morph-render in-progress flag set by
   * `withMorphRender(invocations, fn)` above. Returns `true` iff the
   * current synchronous stack is nested inside the temp-container render
   * pass that produces the diff input for `morphChildren(gxtRenderTarget,
   * tempContainer)` in renderer.ts:986. Used by `manager.ts:8938`'s
   * modifier-manager `handle` gate (intercepts modifier installation on
   * temp elements — those installs would drift the add/remove counter
   * tracked by `INTERNAL_MODIFIER_MANAGERS`) and by `compile.ts:15905`'s
   * `$_each` empty-comment cleanup gate (skips empty-comment removal so
   * the morph diff sees the same comment topology on both sides).
   */
  isMorphRenderInProgress?(): boolean;

  /**
   * Read-only accessor for the morph-modifier-invocations array exposed
   * during a `withMorphRender(invocations, fn)` frame. Returns the array
   * passed to `withMorphRender`, or `null` when no morph render is in
   * progress (slot is cleared in the wrapper's `finally`). The
   * modifier-manager `handle` reader at `manager.ts:8941` reads the array
   * (when non-null) and pushes a `{ modifier, element, props, hashArgs }`
   * entry to queue the invocation for post-morph replay against the real
   * DOM element (the modifier-replay loop in renderer.ts immediately after
   * the morph-and-diff pass).
   */
  getMorphModifierInvocations?(): any[] | null;

  /**
   * Mark a component instance as having been explicitly rerendered via
   * `.rerender()`. Adds the instance to the manager.ts module-local
   * `_forcedRerenderInstances` Set; the next `__gxtSyncAllWrappers` pass
   * fires update lifecycle hooks for the instance AND for every ancestor
   * up the `parentView` chain (matching Ember's tree-revalidation behavior
   * where parent views also receive update hooks when a child is
   * rerendered). The Set is consulted via `_shouldForceRerender(instance)`
   * (manager.ts intra-file helper) during the post-sync hook fan-out.
   *
   * Called from `Component.prototype._rerender` (fired when the user calls
   * `component.rerender()`) through
   * `getGxtRenderer()?.compilePipeline.forceRerender?.(this)` — the
   * optional-chain skips the mark in classic-Ember builds where gxt-backend
   * was never loaded.
   *
   * Distinct from `forceEmberRerender()` — that is a no-args full-tree morph
   * fallback fired from `__gxtSyncDomNow` Phase 2b and from the helper-
   * recompute path. This `forceRerender(instance)` takes an instance argument
   * and only marks it for post-sync update-hook fan-out; it does NOT trigger
   * a render itself (the dirtyTag call in `_rerender` does that).
   */
  forceRerender?(instance: any): void;

  /**
   * Run `fn` while the `__gxtInOutletRender` flag is `true`; the flag is
   * restored to its prior value on completion via `try/finally` (including
   * when `fn` throws). Returns whatever `fn` returns. The flag is consumed
   * by `gxt-backend/manager.ts:3306`'s `_buildRenderTree` body — used
   * together with `__currentOutletState` to decide whether to rebuild the
   * parentView-derived `renderTreeParts` with the proper outlet hierarchy
   * that the Glimmer VM produces (route-name "{{outlet}} for X" / route X
   * entries). Outside the outlet render frame the flag is `false` and
   * `_buildRenderTree` retains the bare parentView-derived render-tree
   * parts.
   *
   * The writer is the outlet-render path in `glimmer/lib/templates/root.ts`
   * (set TRUE just before the `renderTemplateWithContext` call, FALSE in the
   * enclosing `finally`); the single reader is `manager.ts:3306`'s
   * `_buildRenderTree`, which reads via `isInOutletRender?.() ?? false` (the
   * `?? false` preserves the bridge-not-yet-installed edge). The canonical
   * state is `_gxtInOutletRenderFlag` in compile.ts.
   *
   * Re-entrancy: on entry, save the prior flag; set to `true`; invoke `fn`;
   * on completion (including throw), restore the prior flag via try/finally.
   * Nested calls stack correctly. In practice no nested outlet-render occurs
   * (the outlet body is the top-level frame and is not re-entered during its
   * `renderTemplateWithContext` call).
   */
  withInOutletRender?<T>(fn: () => T): T;

  /**
   * Read-only predicate for the in-outlet-render flag set by
   * `withInOutletRender(fn)` above. Returns `true` iff the current
   * synchronous stack is nested inside the `renderTemplateWithContext`
   * call in `glimmer/lib/templates/root.ts`'s outlet-render path.
   */
  isInOutletRender?(): boolean;

  /**
   * Set the captured top-level outlet ref. Called by
   * `glimmer/lib/templates/root.ts` after the outlet-render block creates
   * a fresh `instance.outletRef`, so downstream consumers can walk the
   * outlet hierarchy on demand. The captured ref is the head of an
   * `outlets.main.outlets.main...` chain that mirrors the route-nesting
   * structure produced by Glimmer VM's outlet-render path.
   *
   * Writer: `glimmer/lib/templates/root.ts` captures `instance.outletRef`
   * after the outlet-render block, inside the closure-built re-render
   * function. Two readers route through `getTopOutletRef?.()`:
   *   - `manager.ts:3320` (`_buildRenderTree` outlet branch — walks
   *     `topOutletRef.outlets.main...` to emit the `{{outlet}} for X / X /
   *     {{outlet}} for Y / Y / ...` `renderTreeParts` sequence that matches
   *     Glimmer VM's render-tree output);
   *   - `glimmer/lib/renderer.ts:1133` (OutletView property-driven re-render
   *     fallback — uses the captured ref when `(gxtRoot as any).ref` is
   *     missing).
   * The bridge fallback `?? undefined` preserves the not-yet-set semantics.
   * The canonical state is `_gxtTopOutletRef` in compile.ts.
   *
   * Overwrite contract: each write OVERWRITES the prior captured ref. There
   * is no save-restore wrap (unlike `withInOutletRender`) because the
   * captured ref is a persistent latest-value, not a scoped frame.
   * Successive outlet renders capture progressively-newer refs, and consumers
   * always read the LAST-CAPTURED ref; the `_buildRenderTree` reader fires
   * after the writer has captured the current frame's ref.
   */
  setTopOutletRef?(ref: any): void;

  /**
   * Read the captured top-level outlet ref written by `setTopOutletRef`
   * above. Returns `undefined` if no outlet render has yet captured a ref.
   */
  getTopOutletRef?(): any;

  /**
   * Set the current `{{#if}}`-branch helper-teardown scope. Called by
   * compile.ts's `patchGlobalIf`/`wrapBranch` save-restore frames (three
   * intra-file writer pairs at compile.ts:5488/5624, 5489 and 5592/5616,
   * 5593) to publish the per-branch `Set<any>` (`trueBranchHelpers` /
   * `falseBranchHelpers`) for the duration of a branch evaluation body
   * (`fn.apply(this, branchArgs)` / `inner.apply(this, innerArgs)`).
   * Three readers consult the slot to associate freshly-created class-
   * based helper instances with the enclosing branch's teardown scope so
   * that destroy + willDestroy fire on branch swap, matching Ember's
   * classic Helper lifecycle (not only on top-level component teardown).
   *
   * Readers route through `getCurrentHelperScope?.()` and treat a
   * non-`null`/`undefined` `scope` with a callable `.add(...)` as the active
   * branch scope; absence or non-Set values short-circuit silently:
   *   - compile.ts:10345 — intra-file, inside `$_tag` class-based-helper
   *     instance creation; after pushing the freshly-created instance into
   *     `_tagHelperInstanceCache` + the destroy-tracking array, calls
   *     `ifScopeTag.add(helperInstance)` to wire the instance to the
   *     enclosing branch scope.
   *   - ember-gxt-wrappers.ts:918 — cross-file, inside `$_maybeHelper`'s
   *     branch-swap recreation branch, calls `ifScope2.add(destroyable)`.
   *   - ember-gxt-wrappers.ts:1092 — cross-file, inside `$_maybeHelper`'s
   *     class-based-helper path (factory.create() cache miss), calls
   *     `ifScope.add(instance)`.
   *
   * The canonical state is `_gxtCurrentHelperScope` in compile.ts. The
   * writers are all intra-file (compile.ts's `patchGlobalIf`/`wrapBranch`
   * save-restore frames), and the intra-file reader at compile.ts:10345 uses
   * the module-local directly; the bridge `set` surface is shipped so that
   * any future cross-file writer can extend through the typed surface rather
   * than re-publishing on globalThis.
   *
   * Overwrite contract: each write OVERWRITES the prior captured scope.
   * Intra-file callers save the prior scope into a local `prev`/`prev2`
   * binding and restore it in `finally` so nested branch evaluations restore
   * the outer scope. Bridge writers are responsible for their own
   * save-restore (the bridge does NOT auto-wrap).
   */
  setCurrentHelperScope?(scope: any): void;

  /**
   * Read the current `{{#if}}`-branch helper-teardown scope written by
   * `setCurrentHelperScope` above (or by compile.ts's intra-file save-
   * restore frames using the module-local binding directly). Returns
   * `undefined` if no branch frame is currently active.
   */
  getCurrentHelperScope?(): any;

  /**
   * Wrap a force-rerender body in a balanced set-TRUE / try / finally-restore
   * pair so that the GXT render pipeline can short-circuit lifecycle/warning/
   * destroy paths during the synchronous full-rebuild driven by
   * `Component.prototype.rerender()` (and any other force-rerender caller in
   * `glimmer/lib/renderer.ts`). No depth counter, no transition side-effects.
   *
   * The writer is the force-rerender path in `glimmer/lib/renderer.ts` (set
   * TRUE just before the `classicRoot.render()` call, FALSE in the enclosing
   * `finally`). The canonical state is `_gxtIsForceRerenderFlag` in
   * compile.ts. The readers route through `isForceRerender?.() ?? false`
   * (the `?? false` preserves the bridge-not-yet-installed edge):
   *
   *   - `gxt-backend/manager.ts:815` (`_shouldWarnStyle` — suppress style
   *     warnings during force-rerender; the initial render already warned);
   *   - `gxt-backend/manager.ts:1557` (`checkBacktracking`/pool-claim branch
   *     — during force-rerender, mark ALL unclaimed pool entries for ALL
   *     factories under the parent so component-name swaps {{component
   *     this.name}} destroy the prior factory's claimed instance);
   *   - `gxt-backend/manager.ts:2934` (`pushedUpdatedInstance` guard — skip
   *     `didUpdateAttrs` / `didReceiveAttrs` fan-out during force-rerender;
   *     `__gxtSyncAllWrappers` fires the correct hooks after DOM rebuild);
   *   - `gxt-backend/manager.ts:5996` (ember-component init force-rerender
   *     bypass — remove cellFor getters that shadow PURE prototype getters
   *     so the new proxy reads from the fresh prototype getter);
   *   - `gxt-backend/manager.ts:11903` (`_buildDom` `isForceRerender` capture
   *     for the reused-from-pool init-hook-skip path);
   *   - `gxt-backend/compile.ts:10832` (`__forceRerenderSnapshot` save inside
   *     the `$_tag` component thunk, used to drive willRender/didUpdateAttrs
   *     fan-out on reused/pool instances AFTER `handle()` returns);
   *   - `gxt-backend/compile.ts:11425` (`runTask` lifecycle suppression —
   *     don't warn about style-binding XSS during force-rerender; the
   *     initial render already warned);
   *   - `gxt-backend/outlet.gts:290` (custom-element outlet
   *     `disconnectedCallback` — during force-rerender, do NOT destroy the
   *     cached engine instance; it will be reused via the shared engine
   *     cache);
   *   - `glimmer/lib/templates/root.ts:588` (OutletView short-circuit —
   *     return empty nodes during force-rerender when
   *     `__gxtRootOutletRerender` is registered; the outlet content is
   *     managed separately via setOutletState → __gxtRootOutletRerender,
   *     so a second renderTemplateWithContext call here would append a
   *     duplicate copy of the application template).
   *
   * Re-entrancy: on entry, save the prior flag; set to `true`; invoke `fn`;
   * on completion (including throw), restore the prior flag via try/finally.
   * Nested calls stack correctly. In practice no nested force-rerender occurs
   * (the force-rerender body is the top-level renderTemplateWithContext frame
   * and is not re-entered during its `classicRoot.render()` call).
   *
   * Deferred-error preservation: the force-rerender body catches a render
   * error and stashes it on `classicRoot.__gxtDeferredError` between the
   * set-true and the finally-set-false. The `fn` argument carries that
   * try/catch internally, so the bridge sees a normal-return `fn` and the
   * deferred-error stash happens before the bridge's `finally` resets the
   * flag.
   */
  withForceRerender?<T>(fn: () => T): T;

  /**
   * Read-only predicate for the force-rerender flag set by
   * `withForceRerender(fn)` above. Returns `true` iff the current
   * synchronous stack is nested inside the `classicRoot.render()` call in
   * `glimmer/lib/renderer.ts`'s force-rerender path.
   */
  isForceRerender?(): boolean;

  /**
   * Register the root-outlet-rerender dispatch closure. Companion to
   * `getRootOutletRerender` (read surface) and
   * `setRootOutletRerenderWrap` (instrumentation wrapper registration).
   *
   * The dispatcher closure looks up the per-outletRef rerender function in
   * the `_gxtRootOutletRerenderMap` module-local in
   * `glimmer/lib/templates/root.ts`; unregistered refs are ignored. Multiple
   * concurrent ApplicationInstances (Ember Islands setup) each register their
   * own closure keyed by `instance.outletRef`, so `setOutletState` on either
   * root re-renders into the correct DOM target without clobbering the other.
   *
   * Three readers consult the dispatcher via `getRootOutletRerender?.() ??
   * null` (the `?? null` keeps the `if (typeof rootRenderFn === 'function')`
   * reader guard intact when the bridge is not installed):
   *   - `glimmer/lib/renderer.ts:1131` (OutletView force-rerender re-render
   *     path);
   *   - `glimmer/lib/views/outlet.ts:157` (`setOutletState` direct trigger
   *     path);
   *   - `glimmer/lib/templates/root.ts:591` (OutletView short-circuit truthy
   *     guard — when a dispatcher is registered AND force-rerender is active,
   *     the OutletView returns empty nodes because the outlet content is
   *     managed separately via setOutletState → dispatcher).
   *
   * The canonical state is `_gxtRootOutletRerenderRaw` +
   * `_gxtRootOutletRerenderWrap` in compile.ts.
   *
   * Why three methods, not two? The dispatcher write carries implicit
   * set-time `render.outlet` instrumentation wrapping. To express that
   * typed, the wrap must be registerable independently from the dispatcher:
   * manager.ts owns the wrap (it closes over module-local instrumentation
   * helpers), root.ts owns the raw dispatcher closure. A single-method shape
   * would either fragment state across manager.ts and compile.ts or pull
   * manager.ts's instrumentation helpers into compile.ts.
   *
   * Module-load ordering: manager.ts calls `setRootOutletRerenderWrap(wrap)`
   * at module init; once compile.ts has registered its
   * `installCompilePipelinePart` payload (also at module init) the wrap is
   * stored, so root.ts's later `setRootOutletRerender(dispatcher)` applies it
   * immediately. In `__GXT_MODE__`, compile.ts and manager.ts both load
   * before any template render.
   *
   * Writes are last-writer-wins; the dispatcher is a single closure shared
   * across all readers, and per-outletRef dispatch happens inside it via the
   * `_gxtRootOutletRerenderMap` in root.ts.
   */
  setRootOutletRerender?(fn: ((ref: any) => void) | null): void;

  /**
   * Read the currently-registered root-outlet-rerender dispatcher
   * closure (with `render.outlet` instrumentation wrap applied if a
   * wrap is registered).
   */
  getRootOutletRerender?(): ((ref: any) => void) | null;

  /**
   * Register an instrumentation wrap that will be applied to every
   * dispatcher passed to `setRootOutletRerender(fn)`. Applied at set-time
   * (rather than get-time) for simpler reader semantics.
   *
   * Wrap idempotency: the wrap function in manager.ts checks
   * `(fn as any).__gxtInstrumented` and short-circuits to the already-wrapped
   * function, so applying the wrap to an already-wrapped dispatcher does not
   * double-instrument.
   */
  setRootOutletRerenderWrap?(wrap: (fn: any) => any): void;

  /**
   * Write the "skip text effects" flag consulted by `compile.ts`'s text-node
   * reactive-binding setup inside the `$_text` glimmer-template result fork.
   * Companion to `getSkipTextEffects` (read surface below).
   *
   * The renderer wraps each renderComponent template render in a
   * save-on-entry / restore-in-finally pair (reading the prior value via
   * `getSkipTextEffects()`, setting TRUE only when already rendering, and
   * writing the prior value back via `setSkipTextEffects(prev)`) so that
   * nested `renderComponent` calls (made during an existing render pass —
   * e.g. from a `@cached` getter during template evaluation) suppress
   * GXT-effect creation for text nodes. The single reader at
   * `gxt-backend/compile.ts:15624` (inside the `$_text` reactive-binding
   * setup) returns the bare text node instead of setting up a `gxtEffect`
   * when the flag is truthy.
   *
   * The reason for the skip: nested renders are static snapshots — the
   * parent render destroys and recreates the nested render whenever its
   * tracked deps change. Independent text effects in the nested render would
   * fire out-of-order (before the parent re-renders) and cause double getter
   * evaluations. Top-level renderComponent calls DO need text effects for
   * trackedObject reactivity, hence the conditional set-true gated on
   * "already rendering". The canonical state is `_gxtSkipTextEffectsFlag` in
   * compile.ts.
   */
  setSkipTextEffects?(value: boolean): void;

  /**
   * Read-only accessor for the "skip text effects" flag set by
   * `setSkipTextEffects(value)` above. Returns `true` iff the current
   * synchronous stack is inside a nested `renderComponent` call (i.e.,
   * one made during an existing render pass) and the `$_text`
   * reactive-binding fork should short-circuit `gxtEffect()` creation.
   */
  getSkipTextEffects?(): boolean;

  /**
   * Paired accessors for the GXT root rendering context. The canonical state
   * is the module-local `_gxtRootContext` in compile.ts; cross-file
   * writer/reader pairs (renderer.ts, root.ts, outlet.gts, runtime-hbs.ts)
   * route through this bridge, with several intra-compile.ts readers
   * (including the resolver fallback and the rendering-context recovery
   * paths) reading the module-local directly.
   *
   * Why a paired GETTER+SETTER rather than a single
   * `getOrCreateRootContext()` helper: each cross-file site has slightly
   * different construction details (renderer.ts and root.ts call
   * `provideContext(root, RENDERING_CONTEXT, domApi)` to seed the rendering
   * context with a DOM API; outlet.gts and runtime-hbs.ts do not).
   * Centralising creation in one bridge method would require either
   * replicating the DOM-API seed (incorrect for outlet.gts/runtime-hbs.ts —
   * they rely on compile.ts's lazy-init that defers DOM-API attach to
   * `gxtInitDOM`) or growing an options parameter. Paired get/set keeps the
   * construction logic at each site while routing only the canonical-state
   * lookup and write-through through a typed bridge.
   */
  getRootContext?(): any;
  setRootContext?(value: any): void;

  /**
   * Consumers (cross-file lazy-init writers/readers):
   *
   *   1. `glimmer/lib/templates/root.ts:465-468` — inside the
   *      `RootTemplate` render path, after the renderContext is constructed
   *      for the resolved component. The site fetches the map via the
   *      optional-chain and runs the `has` / `set` / `get().add` dance on the
   *      returned WeakMap (the lazy-init is internal to this bridge).
   *
   *   2. `glimmer/lib/templates/root.ts:776-779` — inside the
   *      controller-bound outlet rendering path. Same lazy-init shape
   *      as #1 but the WeakMap is keyed by the controller instance
   *      (not the component). The two registrations share the same
   *      WeakMap so subsequent `notifyIfWatchers` walks can find render
   *      contexts derived from either the component or the controller.
   *
   *   3. `@ember/routing/route.ts:922` — inside `refresh()` (QP fix for
   *      Issue #13263). Reads the WeakMap to find render contexts that
   *      wrap the route's controller, then mirrors their own QP values
   *      back to the controller so the QP observer chain fires on
   *      subsequent refreshes. Read-only consumer (no write).
   *
   * Intra-`compile.ts` consumers (5 sites, all use the module-local
   * `_getOrCreateGxtComponentContexts` helper directly):
   *  - compile.ts:5005 — inside the value-`set()` watcher walk that
   *    dirties cells on every render-context derived from the just-
   *    mutated component (the candidate-expansion read).
   *  - compile.ts:5428 — inside `_orderIfWatchers` candidate expansion.
   *  - compile.ts:5495 — inside `notifyIfWatchers` candidate expansion.
   *  - compile.ts:7347 — inside `flushPendingIfWatchers` Phase D fan-
   *    out (legacy watcher reach).
   *  - compile.ts:16199-16202 — inside `templateFactory.render`'s
   *    render-context registration block; the helper returns the
   *    always-stable map and the site runs the `has`/`set`/`get().add` dance
   *    on it.
   *
   * The test-teardown reset at `compile.ts:7818` (inside `_gxtClearOnSetup`)
   * calls the module-local `_resetGxtComponentContexts()` helper, which
   * re-allocates a fresh WeakMap and stores it in the canonical binding.
   * Cross-file readers re-fetch through this bridge on every access (no
   * long-lived caching), so the new WeakMap propagates immediately on the
   * next call.
   *
   * Readers/writer pattern (~9 sites across 3 files):
   *  - compile.ts × 6 (L5005 read, L5428 read, L5495 read, L7347 read,
   *    L7818 reset-write, L16199-16202 lazy-init write + read)
   *  - root.ts × 2 (L465-468 lazy-init write + read, L776-779 lazy-init
   *    write + read)
   *  - route.ts × 1 (L922 read-only)
   *
   * Bridge-not-yet-installed semantics: the cross-file readers use
   * `getGxtRenderer()?.compilePipeline.getComponentContextsMap?.()` which
   * returns `undefined` if the renderer / bridge has not been installed yet,
   * and their existing falsy-guards short-circuit. compile.ts's
   * `installCompilePipelinePart` runs at module-init time (EOF), before any
   * of the cross-file callers fire (all are inside render-time method bodies,
   * not module init), so by the time any cross-file caller hits the bridge
   * the install has completed.
   *
   * Why a SINGLE get-only with internal lazy-init rather than paired get+set
   * (as `getRootContext`/`setRootContext` use): there the cross-file writers
   * had distinct construction details (DOM-API seeding vs deferred attach)
   * that ruled out a centralised create-helper. Here the lazy-init is a
   * TRIVIAL `new WeakMap()` — no DOM seeding, no per-site customisation — so
   * the stable-reference + internal-lazy-init pattern
   * (`getClassHelperInstanceCache`, `getTagHelperInstanceCache`) applies. The
   * WeakMap identity is shared across all sites by construction (single bridge
   * return value), removing any ambiguity about which map a given writer
   * targets.
   *
   * The canonical state is `_gxtComponentContexts` in compile.ts.
   */
  getComponentContextsMap?(): WeakMap<object, Set<object>>;
}

/**
 * Render-pass lifecycle capabilities. Implemented by manager.ts (the canonical
 * `beginRenderPass` / `endRenderPass` / `markTemplateRendered` definitions),
 * with an optional `beforeBeginRenderPass` host hook contributed by compile.ts
 * via `installRenderPassPart`.
 *
 * Consumers: glimmer/lib/templates/root.ts (cross-package — outlet rendering
 * enables backtracking detection around the template render call) and the
 * internal compile.ts pre-hook (intra-package).
 *
 * Begin/end are paired in `try/finally` — every begin must have a matching end.
 */
export interface GxtRenderPassCapabilities {
  /**
   * Open a new render pass. Clears the marked-template-rendered set and sets
   * the in-render-pass flag. Dispatches the registered `beforeBeginRenderPass`
   * host hook FIRST so contributors (e.g. compile.ts) can clear their own
   * pass-local state before manager.ts's bookkeeping runs.
   */
  beginRenderPass(): void;

  /**
   * Close the current render pass. Clears the marked-template-rendered set
   * and clears the in-render-pass flag.
   */
  endRenderPass(): void;

  /**
   * Mark a template-rendered instance for backtracking detection. The
   * implementation also walks own/prototype keys to capture nested
   * non-component objects (so shared dependencies on `this.wrapper.content`
   * are caught too).
   */
  markTemplateRendered(instance: unknown): void;

  /**
   * Host hook contributed by compile.ts (via `installRenderPassPart`) that
   * runs BEFORE manager.ts's `beginRenderPass` body. Used to clear
   * compile.ts-local template-only render state (the module-local
   * `_gxtTemplateOnlyRenderedSet` / `_gxtTemplateOnlyStack` bindings, via
   * `_resetTemplateOnlyState`) at the start of each render pass.
   *
   * Best-effort: errors thrown from the hook are caught and ignored. Only one
   * contributor at a time is supported (compile.ts).
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
 * Why split into its own namespace (rather than dropped into
 * `compilePipeline`)? `compilePipeline` is conceptually "the compile-side
 * surface contributed by compile.ts / ember-template-compiler.ts". Renderer-
 * owned hooks belong on their own namespace so the surface area stays legible
 * (`rootComponent.isRootComponent(...)` vs. `compilePipeline.isRootComponent(...)`
 * — the former immediately tells the reader the implementation lives in the
 * renderer file).
 */
export interface GxtRootComponentCapabilities {
  /**
   * Return `true` if `obj` is the `root` of one of the registered renderers'
   * top-level GXT roots. Used by compile.ts's `__gxtTriggerReRender` path to
   * distinguish own-SELF_TAG changes (handled by the cell-based sync
   * pipeline) from nested-object changes (which need a force-rerender
   * fallback). Returns `false` for non-objects, missing renderers, or any
   * object that isn't itself a registered root.
   */
  isRootComponent?(obj: unknown): boolean;

  /**
   * Walk every registered renderer's GXT roots, recording which were dirty
   * (their `gxtLastTagValue` differs from the current tag value) on the
   * module-local `_gxtDirtyRootsAtSync` in `renderer.ts`, then update each
   * root's `gxtLastTagValue` to match the current value. Used by
   * `__gxtSyncDomNow`'s Phase 1b — after cell-based updates have applied,
   * roots are marked clean so the Phase 2b force-rerender doesn't re-fire on
   * already-applied changes.
   */
  updateRootTagValues?(): void;
}

/**
 * The aggregate GXT renderer capabilities object. Grouped into namespaces
 * (destruction, backtracking, view-utils, format, compile-pipeline,
 * render-pass, runtime, root-component).
 *
 * Why a single object rather than many individual exports? Easier to extend
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

// Deferred-install queue for the `compilePipeline` namespace. Contributions
// from compile.ts / ember-template-compiler.ts arrive via
// `installCompilePipelinePart` and may fire BEFORE manager.ts's
// `setGxtRenderer` call (the load-order of the two large module-init paths
// depends on the entry point — entering via `@ember/template-compiler` loads
// compile.ts first; entering via the renderer loads manager.ts first). Buffer
// until the renderer is available, then flush.
let _pendingCompilePipelineParts: Partial<GxtCompilePipelineCapabilities>[] = [];

// Deferred-install queue for the `runtime` namespace. The writer
// (`gxt-with-runtime-hbs.ts`) re-exports `$_MANAGERS` from manager.ts, so
// importing the writer file pulls manager.ts in transitively — but the
// top-level install statement in gxt-with-runtime-hbs.ts can run before that
// transitive `setGxtRenderer` has executed on some import paths, leaving a
// null renderer. Buffer until the renderer is available, then flush.
let _pendingRuntimeParts: Partial<GxtRuntimeCapabilities>[] = [];

// Deferred-install queue for the `renderPass` namespace. The host-hook
// contributor (`compile.ts`) may load before OR after manager.ts depending
// on the entry point. Buffer until the renderer is available, then flush.
let _pendingRenderPassParts: Partial<GxtRenderPassCapabilities>[] = [];

// Deferred-install queue for the `rootComponent` namespace, whose writer
// (`glimmer/lib/renderer.ts`) is OUTSIDE gxt-backend. renderer.ts may load
// BEFORE manager.ts in some entry paths (e.g., when an app boots from
// `@ember/-internals/glimmer` and gxt-backend is pulled in lazily via the
// compile-pipeline import edge). Buffer until the renderer is available, then
// flush.
let _pendingRootComponentParts: Partial<GxtRootComponentCapabilities>[] = [];

// Deferred-install queue for the `backtracking` namespace's
// `transformBacktrackingMessage` host hook contributed by compile.ts.
// compile.ts may load before manager.ts depending on entry point; buffer
// until the renderer is available, then flush.
let _pendingBacktrackingParts: Partial<GxtBacktrackingCapabilities>[] = [];

// Deferred-install queue for the `viewUtils` namespace's
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
 * initial install. See the design note in `GxtCompilePipelineCapabilities`.
 *
 * The `runtime` slot is populated entirely via `installRuntimePart` from
 * `gxt-with-runtime-hbs.ts`; manager.ts seeds an empty `runtime: {}` so the
 * namespace exists for `Object.assign` to merge into.
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
 * Why: a subset of compile-pipeline hooks have their function definitions in
 * compile.ts (closing over compile-local WeakMaps / module-local `let` state)
 * or in ember-template-compiler.ts (closing over imported counters). Those
 * functions cannot be relocated to manager.ts without fragmenting their
 * reader sites or pulling unrelated state across the file boundary. The
 * partial-install API lets each writer file contribute its own methods.
 *
 * Contract: callable at any point during module init. If `setGxtRenderer`
 * has already fired (manager.ts loaded first), the part is merged
 * immediately via `Object.assign` into the existing `compilePipeline`
 * object — so already-captured references (e.g. a `const cp =
 * getGxtRenderer()?.compilePipeline` stored at top-level) see the new
 * methods. If `setGxtRenderer` has NOT yet fired (compile.ts loaded first),
 * the part is buffered and flushed when `setGxtRenderer` runs.
 */
export function installCompilePipelinePart(part: Partial<GxtCompilePipelineCapabilities>): void {
  if (_renderer === null) {
    _pendingCompilePipelineParts.push(part);
    return;
  }
  Object.assign(_renderer.compilePipeline, part);
}

/**
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
 * The `beginRenderPass` / `endRenderPass` / `markTemplateRendered` methods
 * are seeded by manager.ts's initial `setGxtRenderer` call; `beforeBeginRenderPass`
 * arrives later from compile.ts (typical load order: compile.ts top-level runs
 * the install AFTER manager.ts has already published the triad — but
 * cross-entry import paths can flip the order, so the same pending-queue
 * pattern is used).
 */
export function installRenderPassPart(part: Partial<GxtRenderPassCapabilities>): void {
  if (_renderer === null) {
    _pendingRenderPassParts.push(part);
    return;
  }
  Object.assign(_renderer.renderPass, part);
}

/**
 * Install API for the `rootComponent` namespace, contributed by
 * `glimmer/lib/renderer.ts` (a writer file OUTSIDE gxt-backend). If
 * `setGxtRenderer` has already fired (manager.ts loaded first), the part is
 * merged immediately via `Object.assign`; otherwise it is buffered and flushed
 * when `setGxtRenderer` runs. The install-API pattern is direction-agnostic
 * and supports both intra-gxt-backend and external-to-gxt-backend writers. See
 * `GxtRootComponentCapabilities` for the namespace docs.
 */
export function installRootComponentPart(part: Partial<GxtRootComponentCapabilities>): void {
  if (_renderer === null) {
    _pendingRootComponentParts.push(part);
    return;
  }
  Object.assign(_renderer.rootComponent, part);
}

/**
 * The `beginFrame` / `endFrame` / `checkBacktracking` methods are seeded by
 * manager.ts's initial `setGxtRenderer` call; `transformBacktrackingMessage`
 * arrives later from compile.ts. Typical load order: compile.ts top-level runs
 * the install AFTER manager.ts has already published `checkBacktracking` — but
 * cross-entry import paths can flip the order, so the same pending-queue
 * pattern is used.
 */
export function installBacktrackingPart(part: Partial<GxtBacktrackingCapabilities>): void {
  if (_renderer === null) {
    _pendingBacktrackingParts.push(part);
    return;
  }
  Object.assign(_renderer.backtracking, part);
}

/**
 * The `pushParentView` / `popParentView` / `getElementView` / `getViewElement` /
 * `rebuildViewTreeFromDom` methods are seeded by manager.ts's initial
 * `setGxtRenderer` call; `afterRebuildViewTreeFromDom` arrives later from
 * compile.ts. Typical load order: compile.ts top-level runs the install AFTER
 * manager.ts has already published `rebuildViewTreeFromDom` — but cross-entry
 * import paths can flip the order, so the same pending-queue pattern is used.
 */
export function installViewUtilsPart(part: Partial<GxtViewUtilsCapabilities>): void {
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
  // Classic builds can still EVALUATE gxt-backend module init — the vite test
  // page statically imports the compat layer and the classic rollup graph
  // reaches manager.ts, whose top-level setGxtRenderer publishes the registry
  // regardless of backend. Every consumer treats "classic mode" as "reader
  // sees null"; enforce that here with the inlined build flag so all
  // optional-chained call sites no-op in classic bundles independent of graph
  // reachability. (Without this, classic notifyPropertyChange drove GXT's
  // triggerReRender on every property change — extra lifecycle hooks, eager
  // CP getter evaluation, lost {{#each}} updates.)
  if (!__GXT_MODE__) {
    return null;
  }
  return _renderer;
}
