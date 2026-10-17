/**
 * Typed registry shared by the `@ember/-internals/gxt-backend` modules
 * (manager.ts, compile.ts, ember-gxt-wrappers.ts, ...) and a few consumers in
 * other packages, used instead of ad-hoc `globalThis` channels.
 *
 * This module is a leaf: it imports nothing from gxt-backend. manager.ts and
 * compile.ts do not import each other (a direct edge would risk a circular
 * load during module init), so they communicate through this registry.
 *
 * manager.ts calls `setGxtRenderer` once at module init. Other modules add the
 * members they own with the `install*Part` functions, which are buffered until
 * the renderer exists. In classic builds `getGxtRenderer()` returns `null`, so
 * callers use optional chaining: `getGxtRenderer()?.compilePipeline.foo?.()`.
 */
import type { CapturedRenderNode } from '@glimmer/interfaces';

/**
 * Render-context key for the named args of the root, outlet, engine-mount and
 * classic-component render contexts. Ember-only and separate from the plain
 * string key `'args'` (gxt's `$args`), which is where gxt reads named args; the
 * ember wrappers read this key first (`<@foo/>` and `{{#@foo}}` lookups,
 * `$_maybeHelper` context detection). gxt's own context keys (`$SLOTS_SYMBOL`,
 * `$PROPS_SYMBOL`) come from `@lifeart/gxt`.
 */
export const GXT_ARGS_SYMBOL: symbol = Symbol.for('gxt-args');

/**
 * Keys that glimmer's GXT render paths never back with a cell when they make a
 * render context's (or a component's) properties reactive. Each install loop
 * also skips `_`-prefixed keys, and the context loops `$`-prefixed ones.
 * `GXT_CONTEXT_SKIP_KEYS`: render-context bookkeeping and object lifecycle.
 * `GXT_VIEW_SKIP_KEYS`: classic view and component internals.
 */
export const GXT_CONTEXT_SKIP_KEYS: readonly string[] = [
  'args',
  'owner',
  'outletState',
  'constructor',
  'init',
  'willDestroy',
  'toString',
  'isDestroying',
  'isDestroyed',
];
export const GXT_VIEW_SKIP_KEYS: readonly string[] = [
  'element',
  'tagName',
  'layoutName',
  'layout',
  'elementId',
  'renderer',
  'parentView',
  'attributeBindings',
  'classNameBindings',
  'classNames',
  'concatenatedProperties',
  'mergedProperties',
];

/**
 * Defines, on the render context of a route template (`Object.create(
 * controller)`), each getter of the controller's class that the context does
 * not define: read with the controller as `this` (a `@tracked` property keeps
 * its value per instance, an `@action` binds the controller), and only when
 * the template reads it, as Glimmer reads `this.x`. The first read keeps the
 * value in the context's cell for the key (`cellFor`), which a change of the
 * controller's properties updates (compile.ts `_gxtTriggerReRenderSyncCore`);
 * a getter the template never reads never runs.
 */
export function defineControllerGetters(
  context: object,
  controller: object,
  cellFor: (obj: object, key: string, skipDefine: boolean) => unknown,
  skipKeys: ReadonlySet<string>
): void {
  const seen = new Set<string>();
  let proto = Object.getPrototypeOf(controller);
  while (proto !== null && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (seen.has(key)) continue;
      seen.add(key);
      if (key.startsWith('_') || key.startsWith('$') || skipKeys.has(key)) continue;
      if (!Object.getOwnPropertyDescriptor(proto, key)?.get) continue;
      if (Object.getOwnPropertyDescriptor(context, key)) continue;
      const hold = (value: unknown): void => {
        Object.defineProperty(context, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        cellFor(context, key, false);
      };
      Object.defineProperty(context, key, {
        get() {
          hold((controller as Record<string, unknown>)[key]);
          return (context as Record<string, unknown>)[key];
        },
        set: hold,
        enumerable: true,
        configurable: true,
      });
    }
    proto = Object.getPrototypeOf(proto);
  }
}

/**
 * Teardown of component instances and destroyables. Implemented by manager.ts.
 */
export interface GxtDestructionCapabilities {
  /**
   * Destroy pooled component instances that were rendered before the latest
   * re-render but not reclaimed by it, firing their teardown hooks.
   */
  destroyUnclaimedPoolEntries(): void;

  /**
   * Destroy the classic-component instances whose wrapper element is among
   * `removedNodes`.
   */
  destroyInstancesInNodes(removedNodes: ReadonlyArray<Node>): void;

  /** Run the full destroy lifecycle for every tracked component instance. */
  destroyTrackedInstances(): void;

  /** Destroy one component instance with its lifecycle hooks. */
  destroyEmberComponentInstance(instance: object): void;

  /**
   * Run the deferred `didDestroyElement` / `willDestroy` teardown for the old
   * rows of an `{{#each}}` that became empty. Called after the `{{else}}`
   * content's insert hooks have fired, matching classic Ember's order.
   */
  finalizeInverseOldRows?(rows: ReadonlyArray<object>, cycle: number): void;

  /**
   * Register the content of a dynamic component invocation that starts at
   * `first`: `region.first()` is the first node of what it renders now. A
   * component with a custom manager whose nodes start with that content is in
   * the document while the content is, whatever definition it renders.
   */
  registerDynamicRegion?(first: Node, region: { first(): Node }): void;

  /**
   * The block a component rendered now is in: the block whose content is
   * rendering (`renderInBlock`), else the root of the render.
   */
  currentBlock?(): object | null;

  /**
   * Render `render` as the content of `block`, a block created in `parent`
   * (the `currentBlock()` where it was created): the components with a custom
   * manager that it renders are destroyed when `block` or `parent` is.
   */
  renderInBlock?<T>(block: object, parent: object | null, render: () => T): T;

  /**
   * Destroy the components with a custom manager rendered in `block` and in the
   * blocks created in it: at the end of the sync, or now outside one.
   */
  destroyBlock?(block: object): void;

  /**
   * Destroy the components with a custom manager of the blocks destroyed so
   * far, in one run loop (the end of the sync).
   */
  destroyComponentsOfDestroyedBlocks?(): void;
}

/**
 * Backtracking-rerender detection. `beginFrame` / `endFrame` come from
 * validator.ts and `checkBacktracking` from manager.ts; compile.ts adds
 * `transformBacktrackingMessage`. Frames are paired in `try/finally`.
 */
export interface GxtBacktrackingCapabilities {
  /**
   * Open a detection frame. `debugName` is included in the assertion message
   * if a backtracking write happens during the frame.
   */
  beginFrame(debugName?: string): void;

  /** Close the current detection frame. Always paired with `beginFrame`. */
  endFrame(): void;

  /**
   * Assert if setting `key` on `targetObj` is a backtracking write, i.e. the
   * target was already rendered in the current render pass. No-op outside a
   * render pass. Called from the `set()` and `@tracked` setter paths.
   */
  checkBacktracking?(targetObj: unknown, key: string): void;

  /**
   * Rewrite the assertion message before `checkBacktracking` dispatches it.
   * compile.ts uses it to add template-only components to the render tree.
   * If it throws, the original message is used.
   */
  transformBacktrackingMessage?(msg: string): string;
}

/**
 * Parent-view stack and view/element registry helpers. Implemented by
 * manager.ts; compile.ts and glimmer's renderer.ts contribute members via
 * `installViewUtilsPart`. Push/pop are paired in `try/finally`.
 */
export interface GxtViewUtilsCapabilities {
  /** Push `view` as the `parentView` of components created by the next render. */
  pushParentView(view: object): void;

  /** Pop the parent-view stack. Always paired with `pushParentView`. */
  popParentView(): void;

  /**
   * The top of the parent-view stack, or null. compile.ts captures it so the
   * owning view can be pushed again when an `{{#if}}` branch toggles later.
   */
  getCurrentParentView?(): object | null;

  /** The view registered for `element`, or null. */
  getElementView(element: Element): object | null;

  /** The element registered for `view`, or null. */
  getViewElement(view: object): Element | null;

  /**
   * Rebuild the view tree's parent/child links from DOM ancestry, then run
   * `afterRebuildViewTreeFromDom`. Re-entrant calls are ignored.
   */
  rebuildViewTreeFromDom?(explicitRegistry?: unknown): void;

  /**
   * Runs after `rebuildViewTreeFromDom`. Contributed by compile.ts: resets the
   * view-registry children of `{{#if}}` wrappers the user collapsed and drains
   * the in-element deferred-render queue. Errors are caught.
   */
  afterRebuildViewTreeFromDom?(explicitRegistry?: unknown): void;

  /**
   * Ids of classic-component wrappers whose `{{#if}}` the user toggled to
   * false. Owned by compile.ts; manager.ts reads it to keep `isExpanded` false
   * on re-created instances. Callers must not mutate it.
   */
  getWrapperUserFalseSet?(): Set<string> | undefined;

  /**
   * Fire the queued `didInsertElement` / `didRender` hooks and rebuild the
   * view tree, then run `afterFlushAfterInsertQueue`. Errors from either step
   * are caught.
   */
  flushAfterInsertQueue?(): void;

  /**
   * Runs after `flushAfterInsertQueue`. Contributed by compile.ts to drain the
   * in-element deferred-render queue once the parent's DOM is in the document.
   */
  afterFlushAfterInsertQueue?(): void;

  /**
   * The render-pass id, advanced once per top-level render; gxt-backend uses
   * it to reset per-pass caches. Contributed by glimmer's renderer.ts; callers
   * default to `0` when it is not installed.
   */
  getRenderPassId?(): number;

  /** Advance the render-pass id (renderer and test-helper `render` / `rerender`). */
  incrementRenderPassId?(): void;
}

/**
 * Compile/sync-pipeline hooks and shared render state. Seeded by manager.ts and
 * extended through `installCompilePipelinePart` by the module that owns each piece
 * (compile.ts, ember-gxt-wrappers.ts, ember-template-compiler.ts, renderer.ts, metal).
 */
export interface GxtCompilePipelineCapabilities {
  /**
   * Re-apply a classic component's wrapper-element attribute and class
   * bindings after `keyName` changed. Not installed when classic components
   * are compiled out (`__GXT_CLASSIC_COMPONENTS__`).
   */
  syncWrapper(obj: unknown, keyName: string): void;

  /**
   * Snapshot the live component instances before a force-rerender, so
   * `destroyUnclaimedPoolEntries` can tell which ones were removed.
   */
  snapshotLiveInstances(): void;

  /**
   * Per-sync pass run before the force-rerender: refresh changed arg cells,
   * fire the pre-render hooks and sync wrapper bindings, then run the
   * dynamic-component listeners.
   */
  syncAllWrappers(): void;

  /** Empty all component-instance pools, including custom-manager pools. */
  clearInstancePools(): void;

  /**
   * Clear the render-error queue without throwing (unlike `flushRenderErrors`).
   * Test helpers call it once they have handled a render error, so the queued
   * copy is not re-thrown later.
   */
  clearRenderErrors(): void;

  /**
   * Queue a render error. The render in progress re-throws it when it ends
   * (`renderPass.flushRenderErrors`).
   */
  captureRenderError(err: unknown): void;

  /** Classic `dirtyTagFor`, but a no-op while the view tree is rebuilt from the DOM. */
  classicDirtyTagFor(obj: object, key: string | symbol): void;

  /** The `this` of the template rendering now. */
  currentTemplateThis?(): unknown;

  /**
   * Run `fn` with `context` as the `this` of the template rendering now: a
   * getter a template created reads its `(hash)` members' paths on it
   * (compile.ts `$__hash_ember`) when another template's render runs it.
   */
  withTemplateThis?<T>(context: unknown, fn: () => T): T;

  /** GXT's `cellFor(obj, key)`: the reactive cell backing a property. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cellFor(obj: object, key: string | symbol, debug?: boolean): any;

  /**
   * Register a listener run after each `syncAllWrappers` pass to apply
   * dynamic-component swaps. Returns an idempotent unregister function.
   * `stringPath: true` counts it for `hasStringDynamicComponentListeners`.
   */
  addDynamicComponentListener(fn: () => boolean, options?: { stringPath?: boolean }): () => void;

  /** Remove all dynamic-component listeners and reset the string-path count. */
  clearDynamicComponentListeners(): void;

  /**
   * Whether a string-path dynamic-component listener is registered. compile.ts
   * then skips the force-rerender morph, since those swaps are applied through
   * cells.
   */
  hasStringDynamicComponentListeners(): boolean;

  /**
   * Compile a template string into a GXT template factory. Contributed by
   * compile.ts. Besides Ember's compile options it takes `plugins.ast` (AST
   * plugins, run in the gxt compiler's transform hook). A template the GXT
   * compiler cannot compile throws the compiler's error.
   */
  compileTemplate?(templateString: string, options?: unknown): unknown;

  /**
   * Wrap a template factory so the template-cache counters match the classic
   * Glimmer path. Contributed by ember-template-compiler.ts.
   */
  instrumentFactory?(factory: unknown, compileOptions?: unknown): unknown;

  /**
   * Reset the budget of compile.ts's interval-driven fallback sync, so a long
   * test cannot starve it. Called by the test helpers after explicit syncs.
   */
  resetIntervalBudget?(): void;

  /**
   * Record `(ownerObj, ownerKey)` as an owner of `array`, so KVO mutations
   * such as `pushObject` dirty the owner's cell. Contributed by compile.ts.
   */
  registerArrayOwner?(array: unknown, ownerObj: object, ownerKey: string): void;

  /**
   * Record `(ownerObj, ownerKey)` as an owner of the object `value`, so writes
   * to its properties dirty the owner's cell. Contributed by compile.ts.
   */
  registerObjectValueOwner?(value: unknown, ownerObj: object, ownerKey: string): void;

  /**
   * Re-run the bindings that read a property of `obj` through the cell of an
   * owner holding it (`registerObjectValueOwner`): validator.ts's
   * `dirtyTagFor(obj, key)`. Contributed by compile.ts.
   */
  revalidateObjectValueOwners?(obj: object): void;

  /**
   * Associate a new component instance with the `{{#each}}` row currently
   * rendering, so the row's teardown fires its `willDestroyElement` /
   * `willClearRender` before DOM removal. No-op outside an each row.
   */
  captureRowInstance?(instance: unknown): void;

  /**
   * Propagate a change of `obj[keyName]` into GXT's reactive cells. Called from
   * `notifyPropertyChange`; pass `value` when known to skip re-reading the
   * property. No-op inside `withTriggerSuppressed`.
   */
  triggerReRender?(obj: object, keyName: string, value?: unknown): void;

  /**
   * Register a hook run before each `triggerReRender`. Returns an idempotent
   * unregister function. Hook errors are ignored.
   */
  addBeforeTriggerReRender?(fn: (obj: object, keyName: string) => void): () => void;

  /**
   * Register a hook run after each `triggerReRender`. Returns an idempotent
   * unregister function. Hook errors are ignored.
   */
  addAfterTriggerReRender?(fn: (obj: object, keyName: string) => void): () => void;

  /**
   * Run `fn` with `triggerReRender` disabled, restoring the previous state
   * afterwards (also on throw). Returns `fn`'s result.
   */
  withTriggerSuppressed?<T>(fn: () => T): T;

  /**
   * Run `fn` with the in-trigger-rerender flag set, restoring the previous
   * value afterwards. `CP.get` reads the flag to avoid computing never-read
   * computed properties during a change notification.
   */
  withInTriggerReRender?<T>(fn: () => T): T;

  /** Whether the stack is inside `triggerReRender` or `withInTriggerReRender`. */
  isInTriggerReRender?(): boolean;

  /** Whether a template render pass is in progress. */
  isRendering?(): boolean;

  /**
   * Run `fn` inside a render pass (depth incremented, then decremented in a
   * `finally`). When the outermost pass ends, the in-element deferred-render
   * queue is drained.
   */
  withRendering?<T>(fn: () => T): T;

  /** Whether a DOM sync flush (`syncDomNow`) is in progress. */
  isSyncing?(): boolean;

  /**
   * Run `fn` as a modifier manager's install or update, which is Glimmer's
   * commit: a cell it writes while the sync re-executes the changed bindings
   * is rendered by another pass of that sync. manager.ts wraps the install and
   * update hooks in it.
   */
  withModifierCommit?<T>(fn: () => T): T;

  /**
   * validator.ts's `dirtyTagFor` dirtied the gxt cell `cell`: inside
   * `withModifierCommit`, the sync renders it like a written cell.
   */
  noteDirtiedCell?(cell: object): void;

  /**
   * Run `fn` with the currently-rendering flag set, restoring the previous
   * value afterwards. manager.ts wraps event handlers in it; `@tracked`
   * setters do not trigger their own re-render while it is set.
   */
  withCurrentlyRendering?<T>(fn: () => T): T;

  /** Whether the stack is inside `withCurrentlyRendering` or a template render body. */
  isCurrentlyRendering?(): boolean;

  /** Record that a tracked write happened since the last `UpdatingVM.execute`. */
  markTrackedSetSinceRerender?(): void;

  /** Return the tracked-write mark and clear it. */
  consumeTrackedSetSinceRerender?(): boolean;

  /**
   * Counter bumped once per `syncDomNow` flush, used to dedupe per-cycle work
   * (modifier updates, lifecycle hooks). Only compile.ts advances it.
   */
  getSyncCycleId?(): number;

  /** manager.ts's set of component-instance pool arrays. Callers must not mutate it. */
  getAllPoolArrays?(): Set<unknown[]> | undefined;

  /**
   * Watchers for modifiers whose install hook is running, keyed by instance.
   * A modifier that changes its own state during install gets one extra
   * `updateModifier`, as in classic Ember.
   */
  getModifierInstallWatchers?(): Map<object, () => void> | undefined;

  /**
   * The live queue of deferred modifier destroys. An entry is destroyed unless
   * an evaluation of its modifier's invocation took it back, so a modifier
   * that is merely re-evaluated survives. Callers drain it in place.
   */
  getPendingModifierDestroys?(): unknown[] | undefined;

  /**
   * Destroy the queued modifiers that no evaluation of their invocation took
   * back, and empty the queue (the end of a sync). Implemented by manager.ts.
   */
  destroyPendingModifiers?(): void;

  /**
   * Whether the current `syncDomNow` flush was started by a property change.
   * Unlike `getHadPendingSync` it survives the force-rerender; manager.ts uses
   * it to ignore destroy errors from spurious unclaimed-instance sweeps.
   */
  isSyncIsPropertyDriven?(): boolean;

  /**
   * Whether the current sync was driven by a property change rather than by
   * cell creation during initial render. Cleared by `forceEmberRerender`.
   */
  getHadPendingSync?(): boolean;

  /** Write the flag read by `getHadPendingSync`. */
  setHadPendingSync?(value: boolean): void;

  /**
   * Whether a property change has been seen since the last `syncDomNow` flush
   * captured and cleared this flag.
   */
  getPendingSyncFromPropertyChange?(): boolean;

  /** Write the flag read by `getPendingSyncFromPropertyChange`. */
  setPendingSyncFromPropertyChange?(value: boolean): void;

  /**
   * Whether a DOM sync is pending. Checked by `syncDomNow`, the interval
   * fallback and the runloop end hooks before flushing.
   */
  getPendingSync?(): boolean;

  /** Write the flag read by `getPendingSync`. */
  setPendingSync?(value: boolean): void;

  /** compile.ts's block-params stack, by reference. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBlockParamsStack?(): any[][];
  /** compile.ts's slots-context stack, by reference. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSlotsContextStack?(): any[];
  /** compile.ts's table of Ember built-in helpers, by reference. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBuiltinHelpers?(): Record<string, any>;
  /** Read the cell for `obj[key]` so the active formula depends on it. */
  subscribeCell?(obj: object, key: string): void;
  /** The raw object behind an `{{#each}}` item proxy, or `undefined`. */
  eachItemRawFor?(maybeProxy: unknown): unknown;
  /** manager.ts's `$_MANAGERS` table, by reference. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getManagers?(): { component: any; modifier: any; helper: any };
  /** Advance the managed-component generation (called by the test run loop). */
  resetManagedComponentCounters?(): void;

  /**
   * Whether a test helper's `runTask` / `runAppend` body is running. The
   * runloop end hooks then skip their own DOM flush, since the helper syncs
   * afterwards.
   */
  getRunTaskActive?(): boolean;

  /** Write the flag read by `getRunTaskActive` (test helpers only). */
  setRunTaskActive?(value: boolean): void;

  /**
   * Whether a property changed inside a `schedule('afterRender')` callback.
   * `runAppend` reads it to decide whether that change still needs a sync.
   */
  getAfterRenderPropertyChange?(): boolean;

  /** Write the flag read by `getAfterRenderPropertyChange`. */
  setAfterRenderPropertyChange?(value: boolean): void;

  /** Whether a `schedule('afterRender')` callback is running. */
  getInAfterRender?(): boolean;

  /**
   * Write the flag read by `getInAfterRender`. `@ember/runloop` saves and
   * restores it around each `afterRender` callback.
   */
  setInAfterRender?(value: boolean): void;

  /**
   * The component context of the `mut` / `__mutGet` helper call in progress,
   * or `undefined`. Owned by ember-gxt-wrappers.ts; compile.ts's `mut` helpers
   * read it when created, because the closures they return run later.
   */
  getMutContext?(): unknown;

  /**
   * Live component/helper/modifier definition counters kept by
   * ember-gxt-wrappers.ts, mirroring Glimmer's `ConstantsImpl` counters (the
   * VM is bypassed in GXT mode). Callers must not mutate them.
   */
  getResolverCacheCounters?(): {
    componentDefinitionCount: number;
    helperDefinitionCount: number;
    modifierDefinitionCount: number;
  };

  /**
   * Invalidate the cached args of every manager-backed class helper so the
   * next render recomputes it. `obj` and `key` are currently unused.
   */
  notifyHelperPropertyChange?(obj: unknown, key: string): void;

  /**
   * Reset ember-gxt-wrappers.ts's helper-instance caches between tests,
   * keeping the tag-dirty sentinel entry.
   */
  clearHelperCache?(): void;

  /**
   * Whether detached component elements are temporarily re-attached so their
   * destroy hooks see them in the document. `<ember-outlet>`'s
   * `connectedCallback` skips rendering while it is set.
   */
  getDestroyReattachInProgress?(): boolean;

  /** Write the flag read by `getDestroyReattachInProgress`. */
  setDestroyReattachInProgress?(value: boolean): void;

  /**
   * Engine instances by name, reused across `{{mount}}` re-renders so an
   * engine is not instantiated twice. Destroyed and cleared between tests.
   */
  getEngineInstances?(): Map<string, any>;

  /**
   * Start a new pass for manager.ts's per-instance update/render hook
   * tracking, so those hooks can fire again. Called at the start of each sync.
   */
  newRenderPass?(): void;

  /**
   * Fire the queued `didUpdate` / `didRender` hooks, deepest components first.
   * Returns whether the hooks dirtied new state (the sync then renders again).
   */
  postRenderHooks?(): boolean;

  /**
   * Re-render the GXT roots whose tag changed during this sync, or every root
   * after a nested-object change. Re-entrant calls are ignored. Contributed by
   * glimmer's renderer.ts.
   */
  forceEmberRerender?(): void;

  /**
   * Flush pending GXT DOM updates synchronously (the end-of-runloop and
   * post-`runTask` sync). Implemented by compile.ts.
   */
  syncDomNow?(): void;

  /**
   * Whether `withSuppressDirtyInRcSet` is active. validator.ts's `dirtyTagFor`
   * then dirties the tag but does not schedule another sync.
   */
  isDirtyInRcSetSuppressed?(): boolean;

  /**
   * Run `fn` with sync scheduling suppressed in `dirtyTagFor`, restoring the
   * previous value afterwards. Used by manager.ts's internal arg write-backs,
   * which would otherwise re-enter the run loop.
   */
  withSuppressDirtyInRcSet?<T>(fn: () => T): T;

  /**
   * Whether a property changed on an object other than a root component since
   * the last `forceEmberRerender`. Such changes dirty no root tag, so
   * `forceEmberRerender` then re-renders every root.
   */
  getHadNestedObjectChange?(): boolean;

  /** Write the flag read by `getHadNestedObjectChange`. */
  setHadNestedObjectChange?(value: boolean): void;

  /**
   * compile.ts's cache of helper instances created by `$_tag`, by helper name.
   * Entries survive force-rerenders; ember-gxt-wrappers.ts invalidates them
   * when a classic tag is dirtied.
   */
  getTagHelperInstanceCache?(): Map<string, { instance: any; recomputeTag: any }> | undefined;

  /**
   * ember-gxt-wrappers.ts's cache of class-based helper instances and manager
   * buckets created by `$_maybeHelper`. validator.ts invalidates it on each
   * `dirtyTagFor`; compile.ts evicts entries when an `{{#if}}` branch goes away.
   */
  getClassHelperInstanceCache?(): Map<string, any> | undefined;

  /**
   * The live list of helper instances to destroy at teardown. Contributed by
   * compile.ts; callers iterate and clear it in place.
   */
  getHelperInstances?(): any[] | undefined;

  /**
   * Add a helper instance (or destroyable bucket) to `getHelperInstances()`,
   * first calling the hook set by `setHelperInstancePushHook` (errors ignored).
   */
  pushHelperInstance?(inst: any): void;

  /**
   * Set the hook run by `pushHelperInstance`. manager.ts uses it to connect
   * each class helper's `recompute()` to GXT reactivity.
   */
  setHelperInstancePushHook?(hook: (inst: any) => void): void;

  /**
   * The tag a classic `Helper` instance keeps under glimmer's `RECOMPUTE_TAG`
   * (dirtied by `recompute()`); `undefined` for anything else.
   */
  getHelperRecomputeTag?(instance: object): unknown;

  /** Whether `value` is a `templateOnly()` component definition. */
  isTemplateOnlyDefinition?(value: unknown): boolean;

  /**
   * Create a plain element of a build-time (.gjs/.gts) template with `create`
   * (gxt's `$_tag`, same arguments), its content mustaches rendering what
   * their values are (text, trusted HTML, a DOM node). Contributed by
   * compile.ts; ember-gxt-wrappers' `$_tag`, which build-time templates call,
   * creates its elements through it.
   */
  createElementWithContent?(
    create: Function,
    tag: unknown,
    tagProps: unknown,
    ctx: unknown,
    children: unknown
  ): unknown;

  /**
   * Recompute the cached computed properties of `obj` that depend on
   * `changedKey` and return their new values; returns `[]` inside a
   * property-change batch. Contributed by metal's property_events.ts.
   */
  recomputeDependents?(obj: object, changedKey: string): Array<{ key: string; value: unknown }>;

  /** metal's `notifyPropertyChange`. Contributed by metal's property_events.ts. */
  notifyPropertyChange?(obj: object, keyName: string, _meta?: unknown, value?: unknown): void;

  /**
   * Reset GXT render state between tests: destroy tracked instances and clear
   * pools, caches, listeners, stacks and sync flags. Called from the test
   * cases' `afterEach`.
   */
  cleanupActiveComponents?(): void;

  /**
   * Mark `instance` (from `component.rerender()`) so the next
   * `syncAllWrappers` fires update hooks for it and its ancestors. Does not
   * render by itself.
   */
  forceRerender?(instance: any): void;

  /**
   * Run `fn` with the in-outlet-render flag set, restoring the previous value
   * afterwards. manager.ts reads it to build the outlet part of the render tree.
   */
  withInOutletRender?<T>(fn: () => T): T;

  /** Whether the stack is inside `withInOutletRender`. */
  isInOutletRender?(): boolean;

  /**
   * Record the top-level outlet ref of the latest outlet render, replacing
   * the previous one. Used to walk the outlet hierarchy.
   */
  setTopOutletRef?(ref: any): void;

  /** The ref last passed to `setTopOutletRef`, or `undefined`. */
  getTopOutletRef?(): any;

  /**
   * The helper-teardown scope of the `{{#if}}` branch being rendered, or
   * `null`. Helpers created in a branch are destroyed with it.
   */
  getCurrentHelperScope?(): any;

  /**
   * Run `fn` with the force-rerender flag set, restoring the previous value
   * afterwards. Readers use it to avoid repeating initial-render work (style
   * warnings, attr hooks, engine teardown) and to reuse pooled instances.
   */
  withForceRerender?<T>(fn: () => T): T;

  /** Whether the stack is inside `withForceRerender`. */
  isForceRerender?(): boolean;

  /**
   * Register (or clear, with `null`) the root-outlet rerender dispatcher owned
   * by glimmer's templates/root.ts. It is stored already wrapped by the wrap
   * set with `setRootOutletRerenderWrap`.
   */
  setRootOutletRerender?(fn: ((ref: any) => void) | null): void;

  /** The registered (wrapped) root-outlet rerender dispatcher, or `null`. */
  getRootOutletRerender?(): ((ref: any) => void) | null;

  /**
   * Set the wrap applied to the root-outlet dispatcher; manager.ts uses it for
   * `render.outlet` instrumentation. An already-registered dispatcher is re-wrapped.
   */
  setRootOutletRerenderWrap?(wrap: (fn: any) => any): void;

  /** compile.ts's root GXT rendering context. */
  getRootContext?(): any;
  /** Replace the root rendering context; each caller seeds it as it needs. */
  setRootContext?(value: any): void;

  /**
   * Map from a component or controller to the render contexts derived from it,
   * created lazily. It is replaced between tests, so callers re-fetch it on
   * every use.
   */
  getComponentContextsMap?(): WeakMap<object, Set<object>>;
}

/**
 * Render-pass bookkeeping for backtracking detection. Implemented by manager.ts;
 * compile.ts adds `beforeBeginRenderPass`. Begin/end are paired in `try/finally`.
 */
export interface GxtRenderPassCapabilities {
  /**
   * Open a render pass: run `beforeBeginRenderPass`, then clear the set of
   * rendered instances.
   */
  beginRenderPass(): void;

  /** Close the render pass and clear the set of rendered instances. */
  endRenderPass(): void;

  /**
   * Fire the queued `didInsertElement` / `didRender` hooks once a root's DOM
   * is in the document. Hook errors are queued for `flushRenderErrors`. Unlike
   * `viewUtils.flushAfterInsertQueue`, runs no `afterFlushAfterInsertQueue`.
   */
  flushAfterInsertQueue(): void;

  /**
   * Mark the start of a render. The render-error queue is global; the errors
   * queued after this mark belong to the render that took it.
   */
  renderErrorMark(): number;

  /**
   * End of a render that completed: re-throw the first render error queued
   * since `mark`, if any, and remove all of them from the queue. Errors queued
   * before `mark` stay.
   */
  flushRenderErrors(mark: number): void;

  /**
   * End of a render that threw to its caller: remove the render errors queued
   * since `mark` without throwing them (the queue can hold a copy of the error
   * the caller receives).
   */
  dropRenderErrors(mark: number): void;

  /**
   * Mark `instance` as rendered in this pass, so a later write to it is
   * reported as backtracking. Non-component objects it references are marked too.
   */
  markTemplateRendered(instance: unknown): void;

  /**
   * Runs at the start of `beginRenderPass`; compile.ts uses it to reset its
   * template-only render state. Errors are ignored.
   */
  beforeBeginRenderPass?(): void;
}

/**
 * Root-component state owned by glimmer's renderer.ts, which contributes it via
 * `installRootComponentPart`. compile.ts reads it while syncing.
 */
export interface GxtRootComponentCapabilities {
  /**
   * Whether `obj` is the root component of a registered renderer. Changes on a
   * root are handled by cell sync; other objects need a force-rerender.
   */
  isRootComponent?(obj: unknown): boolean;

  /**
   * Record which roots' tags changed (for `forceEmberRerender`) and mark all
   * roots clean, so already-applied cell updates don't force a re-render.
   */
  updateRootTagValues?(): void;
}

/**
 * The debug render tree of `renderComponent` renders (gxt-backend
 * debug-render-tree.ts). Implemented by manager.ts. A node is opaque here.
 */
export interface GxtDebugRenderTreeCapabilities {
  /** A new root node: the components a render renders are created under it. */
  createRoot(): object;

  /**
   * Run `render` with `root` as the node what it renders is created under
   * (`null`: nothing is recorded).
   */
  renderWith<T>(root: object | null, render: () => T): T;

  /** The captured tree of `root`. */
  capture(root: object): CapturedRenderNode;

  /** Whether a captured argument is the error that reading it threw. */
  isArgumentCaptureError(value: unknown): boolean;
}

/**
 * The capabilities object installed by manager.ts via `setGxtRenderer`, grouped
 * by namespace. Callers go through `getGxtRenderer()?.<namespace>`.
 */
export interface GxtRenderer {
  readonly destruction: GxtDestructionCapabilities;
  readonly debugRenderTree?: GxtDebugRenderTreeCapabilities;
  readonly backtracking: GxtBacktrackingCapabilities;
  readonly viewUtils: GxtViewUtilsCapabilities;
  readonly compilePipeline: GxtCompilePipelineCapabilities;

  /**
   * The parts of the `@lifeart/gxt` runtime used outside gxt-backend, provided
   * by manager.ts so glimmer code does not import the GXT runtime itself.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly gxtLib: any;

  /** manager.ts's template and manager registries, by reference. */
  readonly registries: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly componentTemplates: WeakMap<object, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly componentManagers: WeakMap<object, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly internalManagers: WeakMap<object, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly internalHelperManagers: WeakMap<object, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly internalModifierManagers: WeakMap<object, any>;
  };
  readonly renderPass: GxtRenderPassCapabilities;
  readonly rootComponent: GxtRootComponentCapabilities;
}

let _renderer: GxtRenderer | null = null;

// The namespaces other modules add members to with `install*Part`, in the
// order `setGxtRenderer` merges buffered parts.
type GxtPartNamespace =
  | 'compilePipeline'
  | 'renderPass'
  | 'rootComponent'
  | 'backtracking'
  | 'viewUtils';
const PART_NAMESPACES: readonly GxtPartNamespace[] = [
  'compilePipeline',
  'renderPass',
  'rootComponent',
  'backtracking',
  'viewUtils',
];

// Parts installed before `setGxtRenderer` runs (module load order depends on
// the entry point). `setGxtRenderer` merges them into the renderer.
const _pendingParts: { [K in GxtPartNamespace]: Partial<GxtRenderer[K]>[] } = {
  compilePipeline: [],
  renderPass: [],
  rootComponent: [],
  backtracking: [],
  viewUtils: [],
};

/**
 * Install the renderer. Called once, by manager.ts at module init. Parts
 * installed earlier are merged into it.
 */
export function setGxtRenderer(renderer: GxtRenderer): void {
  _renderer = renderer;
  for (const ns of PART_NAMESPACES) {
    const pending = _pendingParts[ns];
    if (pending.length > 0) {
      for (const part of pending) {
        Object.assign(renderer[ns], part);
      }
      _pendingParts[ns] = [];
    }
  }
}

/**
 * Add members to a renderer namespace. If the renderer is installed they are
 * assigned onto the existing object (so held references see them); otherwise
 * they are buffered until `setGxtRenderer`.
 */
function installPart<K extends GxtPartNamespace>(ns: K, part: Partial<GxtRenderer[K]>): void {
  if (_renderer === null) {
    (_pendingParts[ns] as Partial<GxtRenderer[K]>[]).push(part);
    return;
  }
  Object.assign(_renderer[ns], part);
}

/** Add members to the `compilePipeline` namespace (see `installPart`). */
export function installCompilePipelinePart(part: Partial<GxtCompilePipelineCapabilities>): void {
  installPart('compilePipeline', part);
}

/**
 * Install-time check for compile-pipeline members that callers use without a
 * fallback: throws unless each one is installed, or buffered for
 * `setGxtRenderer`.
 */
export function assertCompilePipelineInstalled(
  names: readonly (keyof GxtCompilePipelineCapabilities)[]
): void {
  for (const name of names) {
    const installed =
      (_renderer !== null && typeof _renderer.compilePipeline[name] === 'function') ||
      _pendingParts.compilePipeline.some((part) => typeof part[name] === 'function');
    if (!installed) {
      throw new Error(`[gxt] compile pipeline member \`${name}\` is not installed`);
    }
  }
}

/** Add members to the `renderPass` namespace (see `installPart`). */
export function installRenderPassPart(part: Partial<GxtRenderPassCapabilities>): void {
  installPart('renderPass', part);
}

/** Add members to the `rootComponent` namespace (see `installPart`). */
export function installRootComponentPart(part: Partial<GxtRootComponentCapabilities>): void {
  installPart('rootComponent', part);
}

/** Add members to the `backtracking` namespace (see `installPart`). */
export function installBacktrackingPart(part: Partial<GxtBacktrackingCapabilities>): void {
  installPart('backtracking', part);
}

/** Add members to the `viewUtils` namespace (see `installPart`). */
export function installViewUtilsPart(part: Partial<GxtViewUtilsCapabilities>): void {
  installPart('viewUtils', part);
}

// The current outlet state and the set of connected `<ember-outlet>` elements,
// shared by glimmer's outlet/root templates and OutletView and by gxt-backend's
// `<ember-outlet>`, manager.ts and compile.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _currentOutletState: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _activeOutletElements = new Set<any>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCurrentOutletState(): any {
  return _currentOutletState;
}

export function setCurrentOutletState(state: unknown): void {
  _currentOutletState = state;
}

/** The connected `<ember-outlet>` elements; callers add, delete and iterate this Set. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getActiveOutletElements(): Set<any> {
  return _activeOutletElements;
}

// The ambient owner, set and restored around ownership boundaries (root render,
// engine mount, component and helper resolution). Runtime-compiled templates
// read it through an injected `__gxtAmbientOwner` parameter bound to
// `getAmbientOwner`.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ambientOwner: any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAmbientOwner(): any {
  return _ambientOwner;
}

export function setAmbientOwner(owner: unknown): void {
  _ambientOwner = owner;
}

// The `componentGetter` of the dynamic component currently being rendered.
// ember-gxt-wrappers.ts sets and restores it around nested renders, manager.ts
// reads it to build latest-args getters, and compile.ts resets it between tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _dcComponentGetter: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDcComponentGetter(): any {
  return _dcComponentGetter;
}

export function setDcComponentGetter(getter: unknown): void {
  _dcComponentGetter = getter;
}

// Calls @ember/debug's current `assert`, so `expectAssertion` can catch it. Set
// by manager.ts at init and used by validator.ts's backtracking assertions;
// helper-manager.ts temporarily wraps it.
let _emberAssertDirect: ((msg: string, test: unknown) => void) | null = null;

export function getEmberAssertDirect(): ((msg: string, test: unknown) => void) | null {
  return _emberAssertDirect;
}

export function setEmberAssertDirect(fn: ((msg: string, test: unknown) => void) | null): void {
  _emberAssertDirect = fn;
}

// The route outlets of the compat backend (gxt-backend/outlet.ts). Upstream
// renders routes through route managers and a `RootOutlet` component; GXT
// renders them through its own outlet machinery, from the `{ render, outlets }`
// outlet-state chain. route.ts and router.ts reach it only through these hooks,
// so classic builds never load it.
export interface GxtRouteOutletHooks {
  /** `Route#setup`: record the route's render state (owner, controller, model, template). */
  renderRoute(route: object): void;
  /** `Route#teardownViews`: drop the route's render state. */
  teardownRoute(route: object): void;
  /**
   * `EmberRouter#_setOutlets`: render the active route infos. A route whose
   * manager's `getRouteWrapper()` is the classic route manager's wrapper
   * (`getClassicRouteWrapper`) renders through the GXT outlet machinery; any
   * other wrapper renders with the level's state curried onto it.
   */
  setOutlets(router: object, routeInfos: readonly object[]): void;
  /**
   * Render a level whose route manager provides its own wrapper into `target`.
   * The caller sets the current outlet state and the owner, as for a classic
   * level.
   */
  renderWrappedLevel(level: object, target: Element): void;
  /**
   * `args` with `@outlet`, what a classic route template's `<@outlet />`
   * invokes: the next level (`{{outlet}}`).
   */
  withOutletArg<T extends object>(args: T): T;
}

let _routeOutletHooks: GxtRouteOutletHooks | null = null;

// The classic route manager's wrapper (`CLASSIC_OUTLET`), registered by
// routing/route-managers/classic/outlet-component.ts in GXT builds.
let _classicRouteWrapper: object | null = null;

export function getClassicRouteWrapper(): object | null {
  return _classicRouteWrapper;
}

export function setClassicRouteWrapper(wrapper: object): void {
  _classicRouteWrapper = wrapper;
}

export function getRouteOutletHooks(): GxtRouteOutletHooks | null {
  return _routeOutletHooks;
}

export function setRouteOutletHooks(hooks: GxtRouteOutletHooks | null): void {
  _routeOutletHooks = hooks;
}

// Re-renders the outlets bound to a controller. Installed by glimmer's
// templates/root.ts; compile.ts calls it when a controller's model or query
// params change.
let _controllerOutletRerender: ((controller: object, keyName?: string) => void) | null = null;

export function getControllerOutletRerender():
  | ((controller: object, keyName?: string) => void)
  | null {
  return _controllerOutletRerender;
}

export function setControllerOutletRerender(
  fn: ((controller: object, keyName?: string) => void) | null
): void {
  _controllerOutletRerender = fn;
}

// The curried-component factory. manager.ts registers the implementation and
// ember-gxt-wrappers.ts a wrapper around it (resolver-cache counting).
// `getCreateCurriedComponent` composes them lazily; both setters reset the
// cached composition, so registration order does not matter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CurriedFactory = (nameOrComp: any, args: any, positionals: any[]) => any;
let _createCurriedComponentImpl: CurriedFactory | null = null;
let _createCurriedComponentWrapper: ((inner: CurriedFactory) => CurriedFactory) | null = null;
let _createCurriedComponentComposed: CurriedFactory | null = null;

export function setCreateCurriedComponent(fn: CurriedFactory): void {
  _createCurriedComponentImpl = fn;
  _createCurriedComponentComposed = null;
}

export function setCreateCurriedComponentWrapper(
  wrap: (inner: CurriedFactory) => CurriedFactory
): void {
  _createCurriedComponentWrapper = wrap;
  _createCurriedComponentComposed = null;
}

export function getCreateCurriedComponent(): CurriedFactory | null {
  if (_createCurriedComponentComposed === null && _createCurriedComponentImpl !== null) {
    _createCurriedComponentComposed = _createCurriedComponentWrapper
      ? _createCurriedComponentWrapper(_createCurriedComponentImpl)
      : _createCurriedComponentImpl;
  }
  return _createCurriedComponentComposed;
}

/**
 * The installed renderer, or `null`. Always `null` in classic builds, so
 * optional-chained callers are no-ops there.
 */
export function getGxtRenderer(): GxtRenderer | null {
  // Classic builds may still evaluate manager.ts (and so install a renderer);
  // the build flag keeps readers seeing `null` regardless.
  if (!__GXT_MODE__) {
    return null;
  }
  return _renderer;
}
