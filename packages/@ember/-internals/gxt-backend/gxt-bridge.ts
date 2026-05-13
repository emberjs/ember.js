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
 * Backtracking capabilities. Implemented by validator.ts, consumed by
 * helper-manager.ts and ember-gxt-wrappers.ts (both intra-package) when
 * wrapping createHelper/getValue invocations so read-then-write inside a
 * helper compute is detected as a backtracking re-render.
 *
 * Begin/end are paired in `try/finally` — every begin must have a matching
 * end. The implementations are no-ops outside of an enclosing frame; missing
 * a begin (frame stays null) is safe.
 *
 * NOT included in this slice (intentionally deferred):
 *  - `__gxtCheckBacktracking` (manager.ts) — compile.ts's
 *    `_installTemplateOnlyRenderTreeInjection` wraps the function by
 *    REASSIGNING globalThis.__gxtCheckBacktracking. The bridge's single-
 *    install setGxtRenderer pattern doesn't support that mutation model
 *    without redesign. Cross-package readers in metal/property_set.ts,
 *    metal/tracked.ts and glimmer-tracking.ts continue to read via
 *    globalThis until a future slice resolves the wrap-by-reassignment.
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
 * NOT included in this slice (intentionally deferred — same constraints as
 * slice 2's `__gxtCheckBacktracking` exclusion):
 *  - `__gxtRebuildViewTreeFromDom` (manager.ts) — compile.ts's
 *    `_wrapGxtRebuildViewTree` patches the function by REASSIGNING
 *    globalThis.__gxtRebuildViewTreeFromDom (with retry-interval install
 *    handling). The bridge's single-install setGxtRenderer pattern does not
 *    support that mutation model without redesign. Cross-package readers in
 *    views/lib/system/utils.ts (getRootViews/getChildViews) continue to read
 *    via globalThis until a future slice resolves the wrap-by-reassignment
 *    pattern (likely by relocating the rebuild-wrap inside manager.ts).
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
 * Compile-pipeline capabilities. Implemented by manager.ts, consumed by
 * compile.ts (intra-package). The slice covers function-ref hooks where the
 * writer lives in manager.ts and the reader needs to invoke the function
 * without a direct import edge to manager.ts.
 *
 * NOT included in this slice (intentionally deferred — same exclusion classes
 * documented on prior slices):
 *  - `__gxtCompileTemplate` (writer in compile.ts, readers in glimmer/index.ts
 *    + template-compiler/lib/template.ts + glimmer-workspace integration-tests)
 *    — writer is in compile.ts NOT manager.ts; bridge install pattern installs
 *    once at manager.ts EOF. Migrating requires either (a) relocating the
 *    install call to compile.ts EOF (breaks "single install" convention) or
 *    (b) extending the bridge with `installCompilePipelinePart({...})` for
 *    incremental wiring. Defer until a future slice has a critical mass of
 *    compile.ts-writer hooks to justify the API growth.
 *  - `__gxtInstrumentFactory` (writer in ember-template-compiler.ts, reader
 *    in glimmer/index.ts) — same constraint as `__gxtCompileTemplate`. Writer
 *    is in a third file (neither manager nor compile). Defer.
 *  - `__gxtResetIntervalBudget` (writer in compile.ts, readers in
 *    internal-test-helpers/run.ts) — same constraint as `__gxtCompileTemplate`.
 *  - `__gxtRegisterArrayOwner`, `__gxtRegisterObjectValueOwner` (writers in
 *    compile.ts, readers split across manager.ts + glimmer/renderer.ts +
 *    glimmer/templates/root.ts) — multi-package readers plus writer-in-compile.
 *    Migrating cleanly requires relocating the writers to manager.ts (the
 *    functions are small enough that relocation is feasible) — defer until a
 *    future "compile-pipeline / register-owners" slice can group them.
 *  - `__gxtIsRootComponent`, `__gxtUpdateRootTagValues` (writers in
 *    glimmer/lib/renderer.ts, readers in gxt-backend) — REVERSE-FLOW
 *    (writer outside gxt-backend, reader inside). The bridge convention has
 *    the writer inside gxt-backend (the renderer). Migrating these would
 *    invert the bridge direction and is structurally different from prior
 *    slices.
 *  - `__gxtDirectModule` (writer in gxt-with-runtime-hbs.ts, reader in
 *    manager.ts) — writer is in a third gxt-backend file. Relocating the
 *    writer to manager.ts is feasible (manager.ts already imports
 *    `@lifeart/gxt`) but the relocation has independent risk; defer.
 *  - `__gxtMarkTemplateRendered` / `__gxtBeginRenderPass` / `__gxtEndRenderPass`
 *    — render-pass triad. `__gxtBeginRenderPass` is wrap-by-reassignment at
 *    compile.ts:5106 (same exclusion class as slice 2's `__gxtCheckBacktracking`
 *    and slice 3's `__gxtRebuildViewTreeFromDom`). The triad must move together
 *    once that wrap is resolved.
 *  - `__gxtClearIfWatchers` — intra-compile.ts read+write (writer at L3487,
 *    reader at L5798). State-flag pattern in a single file; cleaner cleanup
 *    is a module-local `const` in an intra-file refactor.
 *  - `__gxtTrackArgSource` / `__gxtLastArgSourceCtx` / `__gxtLastArgSourceKey`
 *    — intra-manager.ts state flags. Same exclusion pattern as slice 3's
 *    `__gxtSuppressDirtyTagForDuringRebuild` and slice 4's
 *    `__gxtLastSafeStringResult`.
 *  - `__gxtSyncAllWrappers` (compile.ts:5155 reassigns) — wrap-by-reassignment.
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
}

/**
 * The aggregate GXT renderer capabilities object. Pilot exposed only the
 * destruction slice; subsequent slices added backtracking, view-utils,
 * format, and compile-pipeline. Future slices will be additional readonly
 * properties on this same interface (e.g. `schedule`, `lifecycle`,
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
}

let _renderer: GxtRenderer | null = null;

/**
 * Install the renderer capabilities object. Called exactly once at
 * gxt-backend module init by manager.ts. Multiple calls overwrite, but this
 * is intentional only for tooling/tests; production code calls it once.
 */
export function setGxtRenderer(renderer: GxtRenderer): void {
  _renderer = renderer;
}

/**
 * Read the renderer. Returns `null` when gxt-backend was never loaded (i.e.,
 * classic-Ember build) — callers must guard with `if (renderer)`. Under
 * `__GXT_MODE__ = false`, the entire calling branch DCEs away.
 */
export function getGxtRenderer(): GxtRenderer | null {
  return _renderer;
}
