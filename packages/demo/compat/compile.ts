/**
 * GXT-compatible @ember/template-compilation implementation
 *
 * This module provides runtime template compilation using the GXT runtime compiler.
 * It implements the same interface as @ember/template-compilation but uses GXT
 * for template compilation instead of Glimmer VM.
 */

// Import the GXT runtime compiler
// @ts-ignore - direct path to avoid GXT Babel plugin
import {
  compileTemplate as gxtCompileTemplate,
  setupGlobalScope,
  isGlobalScopeReady,
} from '../node_modules/@lifeart/gxt/dist/gxt.runtime-compiler.es.js';

// Use direct path to avoid GXT Babel plugin processing (which injects duplicate declarations)
// @ts-ignore - direct path import
import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
  $_MANAGERS,
  RENDERED_NODES_PROPERTY,
  COMPONENT_ID_PROPERTY,
  RENDERING_CONTEXT_PROPERTY,
  initDOM as gxtInitDOM,
  setIsRendering as gxtSetIsRendering,
  syncDom as _syncDomFromDirectImport,
  cellFor as _cellForFromDirectImport,
  effect as _effectFromDirectImport,
  // Symbols needed by renderer.ts / root.ts exposed via globalThis
  RENDERING_CONTEXT as _GXT_RENDERING_CONTEXT,
  HTMLBrowserDOMApi as _GXT_HTMLBrowserDOMApi,
  provideContext as _gxtProvideContext,
  getParentContext as _gxtGetParentContext,
  destroyElementSync as _gxtDestroyElementSync,
  renderComponent as _gxtRenderComponent,
  Component as _GXT_Component,
} from '../node_modules/@lifeart/gxt/dist/gxt.index.es.js';

// After setupGlobalScope(), __gxtCellFor and __gxtEffect are set from GXT's
// runtime module instance (sharing currentTracker with formulas).
// Use those for cell creation/tracking. Fall back to direct imports if not available.
// These are module-level vars reassigned after setupGlobalScope.
var cellFor = _cellForFromDirectImport;
var gxtEffect = _effectFromDirectImport;
var gxtSyncDom = _syncDomFromDirectImport;

// Expose GXT symbols on globalThis so renderer.ts and root.ts can access them
// without importing from @lifeart/gxt (whose pre-bundled version drops these exports)
(globalThis as any).__gxtSymbols = {
  RENDERING_CONTEXT: _GXT_RENDERING_CONTEXT,
  HTMLBrowserDOMApi: _GXT_HTMLBrowserDOMApi,
  provideContext: _gxtProvideContext,
  getParentContext: _gxtGetParentContext,
  destroyElementSync: _gxtDestroyElementSync,
  renderComponent: _gxtRenderComponent,
  Component: _GXT_Component,
  createRoot: gxtCreateRoot,
  setParentContext: gxtSetParentContext,
};

// Install shared Ember wrappers for $_maybeHelper and $_tag on globalThis
import { installEmberWrappers } from './ember-gxt-wrappers';

const _SLOTS_SYM = Symbol.for('gxt-slots');

// Ensure global scope is set up
if (!isGlobalScopeReady()) {
  setupGlobalScope();
}

// Use cellFor/effect/syncDom from GXT's runtime (same module instance as formulas).
// setupGlobalScope() exposes these from the SAME module instance that holds
// tagsToRevalidate, relatedTags, and currentTracker. Using these ensures
// cell tracking and sync work across the Ember compat layer.
if ((globalThis as any).__gxtCellFor) cellFor = (globalThis as any).__gxtCellFor;
if ((globalThis as any).__gxtEffect) gxtEffect = (globalThis as any).__gxtEffect;
if ((globalThis as any).__gxtSyncDom) gxtSyncDom = (globalThis as any).__gxtSyncDom;
// Re-expose for manager.ts
(globalThis as any).__gxtCellFor = cellFor;
(globalThis as any).__gxtEffect = gxtEffect;

// Install Ember-aware wrappers for $_maybeHelper on globalThis
installEmberWrappers();

// Override GXT's $__fn to support mut cells.
// GXT's $__fn unwraps function args by calling them with no args, which breaks
// mut cells (calling mutCell() returns the current value instead of the setter).
{
  const g = globalThis as any;
  const originalFn = g.$__fn;
  if (originalFn) {
    g.$__fn = function $__fn_ember(fn: any, ...partialArgs: any[]) {
      // If the first arg is a mut cell, don't unwrap it
      if (fn && fn.__isMutCell) {
        return (...callArgs: any[]) => {
          const resolvedArgs = partialArgs.map((a: any) =>
            typeof a === 'function' && !a.__isMutCell ? a() : a
          );
          return fn(...resolvedArgs, ...callArgs);
        };
      }
      // Also check if the first arg is a function that, when called, returns a mut cell
      // GXT wraps helper results in getters
      if (typeof fn === 'function' && !fn.__isMutCell) {
        try {
          const result = fn();
          if (result && result.__isMutCell) {
            return (...callArgs: any[]) => {
              const resolvedArgs = partialArgs.map((a: any) =>
                typeof a === 'function' && !a.__isMutCell ? a() : a
              );
              // Re-evaluate the getter to get the current mut cell
              const currentMut = fn();
              return currentMut(...resolvedArgs, ...callArgs);
            };
          }
        } catch { /* ignore */ }
      }
      return originalFn(fn, ...partialArgs);
    };
  }
}

// NOTE: $_if reactivity is limited by GXT's async branch rendering.
// When the condition changes, GXT's IfCondition.renderBranch calls
// destroyBranch() (async) before rendering the new branch. This means
// synchronous test assertions won't see the updated DOM immediately.
// This affects tests like "yield to inverse", "isStream", etc.

// Helper: resolve all curried arg values (evaluating getters) into a snapshot.
function _resolveCurriedArgs(curried: any): { name: any; args: Record<string, any>; positionals: any[] } {
  const cArgs = curried.__curriedArgs || {};
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(cArgs)) {
    resolved[key] = (typeof value === 'function' && !(value as any).__isCurriedComponent && !(value as any).prototype)
      ? (value as any)() : value;
  }
  const cPos = curried.__curriedPositionals || [];
  const resolvedPos: any[] = [];
  for (const val of cPos) {
    resolvedPos.push((typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype)
      ? val() : val);
  }
  return { name: curried.__name, args: resolved, positionals: resolvedPos };
}

// Helper: snapshot curried args on a render info for later comparison.
function _snapshotCurriedArgs(info: any, curried: any) {
  const snap = _resolveCurriedArgs(curried);
  info.__lastSnapshot = snap;
}

// Helper: check if curried component has changed compared to last snapshot.
function _curriedComponentChanged(info: any, curried: any): boolean {
  const last = info.__lastSnapshot;
  if (!last) return true; // No previous snapshot — treat as changed
  const current = _resolveCurriedArgs(curried);
  if (last.name !== current.name) return true;
  // Compare named args
  const lastKeys = Object.keys(last.args);
  const currentKeys = Object.keys(current.args);
  if (lastKeys.length !== currentKeys.length) return true;
  for (const key of currentKeys) {
    if (last.args[key] !== current.args[key]) return true;
  }
  // Compare positionals
  if (last.positionals.length !== current.positionals.length) return true;
  for (let i = 0; i < current.positionals.length; i++) {
    if (last.positionals[i] !== current.positionals[i]) return true;
  }
  return false;
}

// Override $_componentHelper with Ember-aware version that creates CurriedComponent.
// Uses lazy lookup of CurriedComponent class because manager.ts may load after compile.ts.
{
  const g = globalThis as any;

  if (g.$_componentHelper) {
    const unwrapArg = (v: any) => typeof v === 'function' && !v.prototype ? v() : v;

    g.$_componentHelper = function $_componentHelper_ember(params: any[], hash: Record<string, any>) {
      const createCurried = g.__createCurriedComponent;
      if (!createCurried) {
        // Fallback: no createCurriedComponent available yet, return the original behavior
        return params[0];
      }

      // Resolve the first arg (component name/ref)
      const first = unwrapArg(params[0]);

      // Collect named args from hash (keep getters for reactivity).
      // Also eagerly evaluate each getter to establish GXT cell tracking
      // in the calling formula's context — this ensures the parent template
      // re-evaluates when curried arg dependencies change.
      const namedArgs: Record<string, any> = {};
      if (hash) {
        for (const key of Object.keys(hash)) {
          const val = hash[key];
          namedArgs[key] = val;
          // Touch the value to track the cell dependency
          if (typeof val === 'function' && !val.prototype) {
            try { val(); } catch { /* ignore */ }
          }
        }
      }

      // Collect remaining positional params (after the first which is the component ref)
      // For each positional getter, also store a setter if derivable (for mut support).
      // Capture the parent render context for two-way binding via mut.
      const parentRenderCtx = (g as any).__lastRenderContext;
      const positionals: any[] = [];
      for (let i = 1; i < params.length; i++) {
        const p = params[i];
        // Annotate getter functions with the parent context for mut support
        if (typeof p === 'function' && !p.prototype && parentRenderCtx) {
          (p as any).__mutParentCtx = parentRenderCtx;
        }
        positionals.push(p);
        // Touch positional values to track cell dependencies
        if (typeof p === 'function' && !p.prototype) {
          try { p(); } catch { /* ignore */ }
        }
      }

      // Validate that a string component name can be resolved.
      // This throws eagerly during template evaluation (matching Ember's behavior
      // of asserting during render for non-existent components).
      if (typeof first === 'string' && first.length > 0) {
        const owner = g.owner;
        if (owner) {
          const factory = owner.factoryFor?.(`component:${first}`);
          const template = owner.lookup?.(`template:components/${first}`);
          if (!factory && !template) {
            const err = new Error(
              `Attempted to resolve \`${first}\`, which was expected to be a component, but nothing was found. ` +
              `Could not find component named "${first}" (no component or template with that name was found)`
            );
            // Capture the error so flushRenderErrors() can re-throw it
            // (GXT may catch the thrown error during formula evaluation)
            const captureErr = g.__captureRenderError;
            if (typeof captureErr === 'function') {
              captureErr(err);
            }
            throw err;
          }
        }
      }

      // Create a curried component
      return createCurried(first, namedArgs, positionals);
    };
  }
}

// Override GXT's $__if with Ember-aware truthiness rules.
// Ember considers empty arrays, proxy objects with isTruthy=false, and
// empty HTMLSafe strings as falsy, unlike JavaScript's standard truthiness.
{
  const g = globalThis as any;
  const _isArray = Array.isArray;
  const _isProxy = (v: any) => v && typeof v === 'object' && (v._content !== undefined || v.content !== undefined);

  function emberToBool(predicate: unknown): boolean {
    if (predicate && typeof predicate === 'object') {
      // Proxy: check isTruthy
      if (_isProxy(predicate)) {
        return Boolean((predicate as any).isTruthy ?? (predicate as any).content);
      }
      // Array: empty is falsy
      if (_isArray(predicate)) {
        return (predicate as any[]).length !== 0;
      }
      // HTMLSafe: check toString()
      if (typeof (predicate as any).toHTML === 'function') {
        return Boolean((predicate as any).toString());
      }
    }
    return Boolean(predicate);
  }

  // Register Ember truthiness for GXT's $_if (block control flow)
  // GXT's IfCondition.setupCondition checks __gxtToBool before its own !!v
  g.__gxtToBool = emberToBool;

  // Replace $__if on globalThis with Ember-aware version
  if (g.$__if) {
    g.$__if = function $__if_ember(condition: unknown, ifTrue: unknown, ifFalse: unknown = '') {
      // Unwrap GXT getter
      const rawCond = typeof condition === 'function' && !condition.prototype ? condition() : condition;
      // Apply Ember truthiness
      const cond = emberToBool(rawCond);
      const result = cond ? ifTrue : ifFalse;
      // Unwrap result getter
      return typeof result === 'function' && !result.prototype ? result() : result;
    };
  }
}

// GXT external schedule hook: GXT's cell.update() calls scheduleRevalidate()
// which now checks globalThis.__gxtExternalSchedule before using queueMicrotask.
// We set it to a no-op so GXT doesn't auto-schedule DOM sync — instead we
// control when gxtSyncDom() is called (after runTask, or via setTimeout fallback).
(globalThis as any).__gxtPendingSync = false;
(globalThis as any).__gxtExternalSchedule = function() {
  (globalThis as any).__gxtPendingSync = true;
};

// GXT re-render trigger hook - called by Ember's notifyPropertyChange.
// Since GXT's own cell updates are captured by __gxtExternalSchedule,
// this hook only needs to mark that a sync is pending.
(globalThis as any).__gxtTriggerReRender = function(obj: object, keyName: string) {
  const newValue = (obj as any)[keyName];
  try {
    // Use skipDefine=false to install getter/setter on the object.
    // This ensures GXT formulas tracking this property will detect changes.
    const c = cellFor(obj, keyName, /* skipDefine */ false);
    if (c) c.update(newValue);
  } catch {
    // cellFor may not apply to all objects - try with skipDefine=true as fallback
    try {
      const c = cellFor(obj, keyName, /* skipDefine */ true);
      if (c) c.update(newValue);
    } catch { /* ignore */ }
  }
  // Also update cells on the prototype chain.
  // cellFor creates cells keyed by object identity. If a cell-backed getter
  // was installed on a prototype (e.g., via Component.extend({foo: true})),
  // the cell is keyed to that prototype, not the instance. We need to update
  // that prototype cell so GXT formulas tracking it will re-evaluate.
  try {
    let proto = Object.getPrototypeOf(obj);
    for (let depth = 0; depth < 5 && proto && proto !== Object.prototype; depth++) {
      const desc = Object.getOwnPropertyDescriptor(proto, keyName);
      if (desc && desc.get) {
        // This prototype has a getter for this key — likely a cell-backed getter
        const protoCell = cellFor(proto, keyName, /* skipDefine */ true);
        if (protoCell) protoCell.update(newValue);
        break; // Only need to update the first matching prototype
      }
      proto = Object.getPrototypeOf(proto);
    }
  } catch { /* ignore */ }
  // Also dirty cells on ALL render contexts derived from this component.
  // GXT's $_if formula tracks cells on Object.create(component) wrappers.
  // The contexts map is keyed by prototype, so we check both obj and its prototype.
  try {
    const ctxsMap = (globalThis as any).__gxtComponentContexts;
    if (ctxsMap) {
      // Check both the object itself and its prototype as keys
      const candidates = [obj];
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto && proto !== Object.prototype) candidates.push(proto);
      } catch { /* ignore */ }

      for (const candidate of candidates) {
        const ctxs = ctxsMap.get(candidate);
        if (ctxs) {
          const newValue = (obj as any)[keyName];
          for (const ctx of ctxs) {
            try {
              // Use the raw target if ctx is a Proxy — cells are installed on the
              // raw target during initial render, so we must update the SAME cell.
              const cellTarget = (ctx as any).__gxtRawTarget || ctx;
              const rc = cellFor(cellTarget, keyName, /* skipDefine */ false);
              if (rc) {
                rc.update(newValue);
              }
            } catch { /* ignore */ }
          }
        }
      }
    }
  } catch { /* ignore */ }
  // For nested paths like 'colors.apple', also dirty the root property cell.
  // Templates read `this.colors` which creates a cell for 'colors'. When
  // set(obj, 'colors.apple', val) fires, we need to dirty 'colors' too
  // so the template re-evaluates the full path.
  if (keyName.includes('.')) {
    const rootKey = keyName.split('.')[0]!;
    try {
      const rootCell = cellFor(obj, rootKey, /* skipDefine */ true);
      if (rootCell) rootCell.update((obj as any)[rootKey]);
    } catch { /* ignore */ }
  }
  // Sync wrapper element if the object has attribute/class bindings
  try {
    const syncWrapper = (globalThis as any).__gxtSyncWrapper;
    if (syncWrapper) syncWrapper(obj, keyName);
  } catch { /* ignore */ }

  (globalThis as any).__gxtPendingSync = true;
  // Only do a quick cell sync here — don't fire lifecycle hooks or
  // run __gxtSyncAllWrappers. Property changes may be batched (e.g.,
  // setProperties), so lifecycle hooks should fire once after ALL
  // property changes are applied, not after each individual change.
  // The full lifecycle hook cycle runs in __gxtSyncDomNow (called
  // after runTask completes).
  if (!(globalThis as any).__gxtSyncing) {
    (globalThis as any).__gxtSyncing = true;
    try {
      gxtSyncDom();
    } catch { /* ignore */ }
    finally { (globalThis as any).__gxtSyncing = false; }
  }
  // Manually notify any $_if conditions watching this property.
  // This bypasses GXT's broken cross-module-instance cell tracking.
  // Must happen AFTER __gxtSyncing is cleared so IfCondition.renderBranch
  // can properly insert new DOM nodes without re-entrancy issues.
  try {
    notifyIfWatchers(obj, keyName);
  } catch { /* ignore */ }
};

// Expose cellFor on globalThis so manager.ts can use it without circular imports.
(globalThis as any).__gxtCellFor = cellFor;

// ---- Cross-module-instance $_if fix ----
//
// Problem: Vite serves GXT's internal chunks (vm-*.js, dom-*.js) with inconsistent
// ?v= query strings, creating TWO module instances of the reactive core. Cells/opcodes
// from one instance don't trigger re-evaluation in the other. This breaks $_if
// condition tracking when properties change via Ember's set().
//
// Additional: IfCondition's internal placeholder gets disconnected when Ember's
// compat layer moves rendered nodes into wrapper divs. Fix: include placeholder
// and target in the extracted RENDERED_NODES so itemToNode preserves them.
//
// Solution: Patch $_if to capture IfCondition instances. Register manual callbacks
// keyed by (object, property). When __gxtTriggerReRender fires, call syncState
// on the IfCondition directly.

const ifWatchers = new WeakMap<object, Map<string, Set<() => void>>>();

function registerIfWatcher(rawTarget: object, key: string, callback: () => void) {
  let keyMap = ifWatchers.get(rawTarget);
  if (!keyMap) { keyMap = new Map(); ifWatchers.set(rawTarget, keyMap); }
  let watchers = keyMap.get(key);
  if (!watchers) { watchers = new Set(); keyMap.set(key, watchers); }
  watchers.add(callback);
}

function notifyIfWatchers(obj: object, key: string) {
  const candidates = [obj];
  try {
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype) candidates.push(proto);
  } catch { /* ignore */ }
  const ctxsMap = (globalThis as any).__gxtComponentContexts;
  if (ctxsMap) {
    for (const candidate of [...candidates]) {
      const ctxs = ctxsMap.get(candidate);
      if (ctxs) {
        for (const ctx of ctxs) {
          const raw = ctx?.__gxtRawTarget || ctx;
          if (!candidates.includes(raw)) candidates.push(raw);
        }
      }
    }
  }
  for (const target of candidates) {
    const keyMap = ifWatchers.get(target);
    if (!keyMap) continue;
    const watchers = keyMap.get(key);
    if (!watchers) continue;
    for (const cb of watchers) {
      try { cb(); } catch { /* ignore */ }
    }
  }
}

// Patch $_if to capture IfCondition instances and fix placeholder connectivity.
function patchGlobalIf() {
  const g = globalThis as any;
  if (!g.$_if || g.$_if.__emberPatched) return false;
  const origIf = g.$_if;
  g.$_if = function patchedIf(
    conditionOrCell: any,
    trueBranch: any,
    falseBranch: any,
    ctx: any
  ) {
    const watchTarget = conditionOrCell?.__gxtWatchTarget;
    const watchKey = conditionOrCell?.__gxtWatchKey;

    const ifCondition = origIf(conditionOrCell, trueBranch, falseBranch, ctx);

    if (watchTarget && watchKey && ifCondition) {
      // Mark as Ember-managed so itemToNode handles it correctly
      ifCondition.__emberIfCondition = true;

      // Fix placeholder connectivity: ensure the IfCondition's target
      // (DocumentFragment containing placeholder + rendered content)
      // is returned as a single unit. Replace RENDERED_NODES with the
      // target's childNodes so itemToNode returns the whole fragment.
      if (ifCondition.target && ifCondition.placeholder) {
        const renderedProp = RENDERED_NODES_PROPERTY;
        if (renderedProp) {
          // Replace the RENDERED_NODES with the target itself
          // This ensures itemToNode returns all nodes including placeholder
          const target = ifCondition.target;
          if (target.childNodes) {
            ifCondition[renderedProp] = Array.from(target.childNodes);
          }
        }
      }

      // Register manual watcher for property change notification
      if (typeof ifCondition.syncState === 'function') {
        const emberToBool = g.__gxtToBool || Boolean;
        registerIfWatcher(watchTarget, watchKey, () => {
          try {
            const currentValue = conditionOrCell();
            ifCondition.syncState(emberToBool(currentValue));
          } catch { /* ignore */ }
        });
      }
    }

    return ifCondition;
  };
  g.$_if.__emberPatched = true;
  return true;
}
patchGlobalIf();
queueMicrotask(patchGlobalIf);

// Get a getter function for a property on the render context.
(globalThis as any).__gxtGetCellOrFormula = function(obj: any, key: string) {
  const raw = obj?.__gxtRawTarget || obj;
  try { cellFor(raw, key, /* skipDefine */ false); } catch { /* ignore */ }
  const getter: any = function() { return obj[key]; };
  getter.__gxtWatchTarget = raw;
  getter.__gxtWatchKey = key;
  return getter;
};

// Flush pending GXT DOM updates synchronously.
// Called after runTask() completes so test assertions see updated DOM.
(globalThis as any).__gxtSyncDomNow = function() {
  if ((globalThis as any).__gxtPendingSync) {
    (globalThis as any).__gxtPendingSync = false;
    // Start a new render pass to prevent double-firing of lifecycle hooks
    const newPass = (globalThis as any).__gxtNewRenderPass;
    if (typeof newPass === 'function') newPass();
    try { ((globalThis as any).__gxtSyncDom || gxtSyncDom)(); } catch { /* ignore */ }
    // PHASE 1: Update arg cells and fire pre-render lifecycle hooks BEFORE
    // the force-rerender. The force-rerender (innerHTML='' + rebuild) resets
    // arg cells to current values, so changes must be detected first.
    try {
      const syncAll = (globalThis as any).__gxtSyncAllWrappers;
      if (typeof syncAll === 'function') {
        syncAll(); // Pre-render hooks + arg cell updates
        try { ((globalThis as any).__gxtSyncDom || gxtSyncDom)(); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    // PHASE 2a: Snapshot live instances before force-rerender
    try {
      const snapshot = (globalThis as any).__gxtSnapshotLiveInstances;
      if (typeof snapshot === 'function') snapshot();
    } catch { /* ignore */ }
    // PHASE 2b: Force Ember renderer re-render for GXT roots.
    // GXT's cell tracking may not pick up changes from Ember's set(),
    // so we trigger a full re-render via the renderer's root.render().
    // The __gxtIsForceRerender flag tells the component manager to reuse
    // existing instances and skip init/render lifecycle hooks.
    try {
      const forceRerender = (globalThis as any).__gxtForceEmberRerender;
      if (typeof forceRerender === 'function') forceRerender();
    } catch { /* ignore */ }
    // PHASE 2c: Destroy unclaimed instances — components that were in
    // the old render but not in the new one (e.g., {{each}} items removed).
    try {
      const destroyUnclaimed = (globalThis as any).__gxtDestroyUnclaimedPoolEntries;
      if (typeof destroyUnclaimed === 'function') destroyUnclaimed();
    } catch { /* ignore */ }
    // PHASE 3: Post-render hooks (didUpdate, didRender) — fire after DOM
    // is fully updated by the force-rerender.
    try {
      const postRender = (globalThis as any).__gxtPostRenderHooks;
      if (typeof postRender === 'function') postRender();
    } catch { /* ignore */ }
    // Re-render CurriedComponent marker regions
    try {
      const infos = (globalThis as any).__curriedRenderInfos;
      if (infos) {
        for (const info of infos) {
          const { item: getter, startMarker: sm, endMarker: em, renderCurriedComponent: render, managers: mgrs } = info;
          const parent = sm.parentNode;
          if (!parent) continue;
          try {
            // Curried-node path: re-invoke item() to get a fresh Node
            if (info.__isCurriedNodePath) {
              const newNode = render();
              if (newNode) {
                let node = sm.nextSibling;
                while (node && node !== em) {
                  const next = node.nextSibling;
                  parent.removeChild(node);
                  node = next;
                }
                parent.insertBefore(newNode, em);
              }
              continue;
            }

            const newResult = getter();
            const newFinal = (typeof newResult === 'function' && !newResult?.__isCurriedComponent)
              ? newResult() : newResult;

            // Skip teardown if same component with unchanged args (preserves DOM stability)
            if (newFinal && newFinal.__isCurriedComponent &&
                sm.nextSibling !== em &&
                !_curriedComponentChanged(info, newFinal)) {
              continue;
            }

            let node = sm.nextSibling;
            while (node && node !== em) {
              const next = node.nextSibling;
              parent.removeChild(node);
              node = next;
            }

            if (newFinal && newFinal.__isCurriedComponent && mgrs.component.canHandle(newFinal)) {
              const newNode = render(newFinal);
              if (newNode) parent.insertBefore(newNode, em);
              _snapshotCurriedArgs(info, newFinal);
            }
          } catch { /* ignore render errors */ }
        }
      }
    } catch { /* ignore */ }
  }
};

// Also schedule a fallback setTimeout flush for non-test scenarios
// where __gxtSyncDomNow isn't called explicitly
setInterval(() => {
  if ((globalThis as any).__gxtPendingSync) {
    (globalThis as any).__gxtSyncDomNow();
  }
}, 16); // ~60fps

// Cleanup function to reset GXT state between tests
(globalThis as any).__gxtCleanupActiveComponents = function() {
  // Destroy all tracked component instances first (fires willDestroy hooks)
  const destroyTracked = (globalThis as any).__gxtDestroyTrackedInstances;
  if (typeof destroyTracked === 'function') {
    destroyTracked();
  }
  // Reset block params stack
  blockParamsStack.length = 0;
  // Reset current slot params
  currentSlotParams = null;
  (globalThis as any).__currentSlotParams = null;
  // Reset sync scheduled flag
  (globalThis as any).__gxtSyncScheduled = false;
  // Reset slots context stack
  slotsContextStack.length = 0;
  // Clear template cache to avoid stale templates across tests
  templateCache.clear();
  // Clear curried render infos
  if ((globalThis as any).__curriedRenderInfos) {
    (globalThis as any).__curriedRenderInfos.length = 0;
  }
  // Clear helper instances (already destroyed by __gxtDestroyTrackedInstances)
  if ((globalThis as any).__gxtHelperInstances) {
    (globalThis as any).__gxtHelperInstances.length = 0;
  }
  // Clear the helper instance cache used by $_maybeHelper
  if (typeof (globalThis as any).__gxtClearHelperCache === 'function') {
    (globalThis as any).__gxtClearHelperCache();
  }
  // Clear the helper instance cache used by $_tag
  if (typeof (globalThis as any).__gxtClearTagHelperCache === 'function') {
    (globalThis as any).__gxtClearTagHelperCache();
  }
};

// Set GXT mode flag
(globalThis as any).__GXT_MODE__ = true;

// Track class-based helper instances for destruction during test teardown
(globalThis as any).__gxtHelperInstances = (globalThis as any).__gxtHelperInstances || [];

// Cache for helper instances created in $_tag to prevent re-creation during
// force re-render (which does innerHTML='' + full rebuild). Keyed by helper name.
// Cleared during test teardown via __gxtClearTagHelperCache.
const _tagHelperInstanceCache = new Map<string, { instance: any; recomputeTag: any }>();
(globalThis as any).__gxtClearTagHelperCache = () => _tagHelperInstanceCache.clear();

// Expose $_MANAGERS on globalThis so the $_tag wrapper can access it
// (manager.ts will configure it later, but we need the same reference)
(globalThis as any).$_MANAGERS = $_MANAGERS;

// Register built-in keyword helpers for GXT integration
// These are simplified implementations for GXT since it doesn't have Glimmer VM's reference system
(globalThis as any).__EMBER_BUILTIN_HELPERS__ = {
  // readonly: Returns the value as-is (GXT doesn't have two-way binding to protect against)
  readonly: (value: any) => {
    return typeof value === 'function' ? value() : value;
  },
  // mut: Returns a setter function for two-way binding.
  // When used with (fn (mut this.val) newValue), the returned function
  // updates the property on the component via Ember.set().
  // The template transform adds a path string as the second arg.
  // The context is captured at creation time via __gxtMutContext.
  mut: (value: any, path?: string) => {
    // Capture context at creation time (set by $_maybeHelper wrapper)
    const capturedCtx = (globalThis as any).__gxtMutContext;
    // If no path provided, return the resolved value (fallback)
    if (!path || typeof path !== 'string') {
      return typeof value === 'function' ? value() : value;
    }
    // Determine the property name from the path
    const propName = path.startsWith('this.') ? path.slice(5) : (path.startsWith('@') ? path.slice(1) : path);
    // Look up the source getter for two-way binding (from curried component positional args)
    const sourceGetter = capturedCtx?.__mutArgSources?.[propName];
    // Create a "mut cell" function: calling it with a value sets the property
    const mutCell = function mutCell(newValue?: any) {
      if (arguments.length === 0) {
        // Read mode: return current value
        return typeof value === 'function' ? value() : value;
      }
      // Write mode: set the property through the binding chain
      if (sourceGetter) {
        // We have a source getter from the parent template.
        // Parse its toString() to extract the property path, then set through it.
        const parentCtx = sourceGetter.__mutParentCtx;
        if (parentCtx) {
          const getterStr = sourceGetter.toString();
          // Match patterns like: () => this.model?.val2, () => this.model.val2
          const pathMatch = getterStr.match(/this\.([a-zA-Z_$][a-zA-Z0-9_$?.]*)/);
          if (pathMatch) {
            // Clean the path: remove optional chaining operators
            const fullPath = pathMatch[1].replace(/\?/g, '');
            // Split into parts and set the nested property
            const parts = fullPath.split('.');
            if (parts.length === 1) {
              // Simple property: this.val
              if (typeof parentCtx.set === 'function') {
                parentCtx.set(parts[0]!, newValue);
              } else {
                parentCtx[parts[0]!] = newValue;
              }
            } else {
              // Nested property: this.model.val2
              // Navigate to the parent object, then set the final property
              let obj = parentCtx;
              for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]!];
                if (obj == null) break;
              }
              if (obj != null) {
                const lastProp = parts[parts.length - 1]!;
                obj[lastProp] = newValue;
              }
              // Trigger re-render by dirtying the root property cell on the parent context
              const triggerReRender = (globalThis as any).__gxtTriggerReRender;
              if (triggerReRender) {
                triggerReRender(parentCtx, parts[0]!);
              }
            }
            // Also set the local property on the component
            if (capturedCtx && capturedCtx !== parentCtx) {
              if (typeof capturedCtx.set === 'function') {
                capturedCtx.set(propName, newValue);
              } else {
                capturedCtx[propName] = newValue;
              }
            }
            return newValue;
          }
        }
      }
      // Fallback: set on the component's own context
      if (capturedCtx) {
        if (typeof capturedCtx.set === 'function') {
          capturedCtx.set(propName, newValue);
        } else {
          capturedCtx[propName] = newValue;
        }
      }
      return newValue;
    };
    // Mark as a mut cell so fn helper doesn't try to unwrap it
    (mutCell as any).__isMutCell = true;
    // valueOf returns current value for template rendering
    mutCell.toString = () => String(typeof value === 'function' ? value() : value);
    mutCell.valueOf = () => typeof value === 'function' ? value() : value;
    return mutCell;
  },
  // unbound: Returns the value without tracking
  unbound: (value: any) => {
    return typeof value === 'function' ? value() : value;
  },
  // concat: Concatenates arguments into a string
  concat: (...args: any[]) => {
    return args.map(a => (typeof a === 'function' && !a.prototype) ? a() : a).join('');
  },
  // array: Creates an array from arguments
  array: (...args: any[]) => {
    return args.map(a => (typeof a === 'function' && !a.prototype) ? a() : a);
  },
  // hash: Creates an object from named arguments (handled specially)
  hash: (obj: any) => obj,
  // gxt-entries-of: Converts an object to [[key, value], ...] for {{#each-in}}
  'gxt-entries-of': (obj: any) => {
    const resolved = typeof obj === 'function' ? obj() : obj;
    if (!resolved || typeof resolved !== 'object') return [];
    // Support Map-like objects
    if (typeof resolved.entries === 'function' && typeof resolved.forEach === 'function') {
      return Array.from(resolved.entries());
    }
    return Object.keys(resolved).map(key => [key, (resolved as any)[key]]);
  },
  // get: Dynamic property lookup — supports dot-path keys like 'foo.bar'
  get: (obj: any, key: any) => {
    const resolvedObj = typeof obj === 'function' ? obj() : obj;
    const resolvedKey = typeof key === 'function' ? key() : key;
    if (resolvedObj == null) return undefined;
    if (typeof resolvedKey === 'string' && resolvedKey.includes('.')) {
      let current = resolvedObj;
      for (const part of resolvedKey.split('.')) {
        if (current == null) return undefined;
        current = current[part];
      }
      return current;
    }
    return resolvedObj[resolvedKey];
  },
  // fn: Partially applies a function with arguments
  fn: (func: any, ...args: any[]) => {
    return (...callArgs: any[]) => {
      // Resolve the function — it may be a GXT getter wrapping the actual function
      let resolvedFn = func;
      // Unwrap nested getters until we get the actual function or value
      // But don't unwrap mut cells — they are callable setter functions
      while (typeof resolvedFn === 'function' && resolvedFn.length === 0 && !resolvedFn.__isMutCell) {
        const inner = resolvedFn();
        if (inner === resolvedFn) break; // prevent infinite loop
        // If inner is a mut cell, use it directly
        if (typeof inner === 'function' && inner.__isMutCell) { resolvedFn = inner; break; }
        if (typeof inner !== 'function') { resolvedFn = inner; break; }
        resolvedFn = inner;
      }
      const resolvedArgs = args.map(a => typeof a === 'function' && !a.__isMutCell ? a() : a);
      if (typeof resolvedFn === 'function') {
        return resolvedFn(...resolvedArgs, ...callArgs);
      }
      return undefined;
    };
  },
};

// Global block params stack for yielded values
// When a slot is rendered with block params, they're pushed here
// The $_blockParam helper reads from the top of the stack
const blockParamsStack: any[][] = [];
(globalThis as any).__blockParamsStack = blockParamsStack;

// Per-context block params storage for persistence across re-renders
// WeakMap allows garbage collection when context is no longer referenced
const contextBlockParams = new WeakMap<object, any[]>();
(globalThis as any).__contextBlockParams = contextBlockParams;

// Current slot params - persists until next slot is called
// This is used for re-renders where the stack has been popped
// Key insight: for simple non-nested slot cases, keeping the "last" params
// allows re-renders to access them even after the slot function returns
let currentSlotParams: any[] | null = null;
(globalThis as any).__currentSlotParams = null;

// Helper function to get a block param by index
// This is called by compiled templates that use {{($_blockParam N)}}
(globalThis as any).$_blockParam = function(index: number) {
  const currentParams = blockParamsStack[blockParamsStack.length - 1];
  const rawValue = currentParams ? currentParams[index] : undefined;
  // Unwrap reactive value to get current value
  return unwrapReactiveValue(rawValue);
};

// Helper to unwrap a potentially reactive value
// This is called each time a block param is accessed to ensure fresh values
function unwrapReactiveValue(value: any): any {
  if (value === undefined || value === null) return value;

  // Check if it's a GXT reactive cell (has 'fn' property and 'isConst')
  if (typeof value === 'object' && 'fn' in value && 'isConst' in value) {
    try {
      return value.fn();
    } catch {
      return value;
    }
  }

  // Check if it's a function that should be evaluated (reactive getter)
  if (typeof value === 'function') {
    try {
      return value();
    } catch {
      return value;
    }
  }

  return value;
}

const bpDescriptors: Record<string, PropertyDescriptor> = {};
for (let i = 0; i < 10; i++) {
  const bpName = `$_bp${i}`;
  bpDescriptors[bpName] = {
    get() {
      let rawValue: any;

      // First check if this context has persistent block params
      // This handles re-renders after the slot function has returned
      const persistentParams = contextBlockParams.get(this);
      if (persistentParams && persistentParams[i] !== undefined) {
        rawValue = persistentParams[i];
      } else {
        // Check the global stack (during initial slot execution)
        const stack = (globalThis as any).__blockParamsStack;
        const stackParams = stack && stack[stack.length - 1];
        if (stackParams && stackParams[i] !== undefined) {
          rawValue = stackParams[i];
        } else {
          // Fall back to current slot params (for re-renders after slot returned)
          const current = (globalThis as any).__currentSlotParams;
          if (current && current[i] !== undefined) {
            rawValue = current[i];
          }
        }
      }

      // CRITICAL: Unwrap reactive values each time to support reactivity
      // When the component's property changes, this getter will return the new value
      return unwrapReactiveValue(rawValue);
    },
    configurable: true,
    enumerable: false,
  };
}
try {
  Object.defineProperties(Object.prototype, bpDescriptors);
} catch (e) {
  // If we can't define on Object.prototype, fall back to globalThis
  for (let i = 0; i < 10; i++) {
    Object.defineProperty(globalThis, `$_bp${i}`, bpDescriptors[`$_bp${i}`]);
  }
}

// Also expose through EmberFunctionalHelpers for GXT's helper resolution
if (typeof (globalThis as any).EmberFunctionalHelpers === 'undefined') {
  (globalThis as any).EmberFunctionalHelpers = new Set();
}
(globalThis as any).EmberFunctionalHelpers.add((globalThis as any).$_blockParam);

// Stack to track the current slots context during rendering
// Components push their $slots here when rendering, so has-block can check it
const slotsContextStack: any[] = [];
(globalThis as any).__slotsContextStack = slotsContextStack;

// has-block helper - returns true if a block was provided
// Usage: {{has-block}} or {{has-block "inverse"}}
(globalThis as any).$_hasBlock = function(blockName?: string) {
  const name = blockName || 'default';
  const slots = slotsContextStack[slotsContextStack.length - 1];
  const hasIt = slots && typeof slots[name] === 'function';
  return hasIt;
};

// has-block-params helper - returns true if the block accepts params
// This is tricky to implement properly, but we can approximate:
// - If there's no block, return false
// - If there's a block and we have blockParamsInfo, check it
// - Otherwise, return false as a conservative default
(globalThis as any).$_hasBlockParams = function(blockName?: string) {
  const name = blockName || 'default';
  const slots = slotsContextStack[slotsContextStack.length - 1];
  if (!slots || typeof slots[name] !== 'function') {
    return false;
  }
  // Check if the slot has block params info attached
  const slotFn = slots[name];
  if (slotFn.__hasBlockParams !== undefined) {
    return slotFn.__hasBlockParams;
  }
  // Conservative default - if we don't know, assume false
  // In real Ember, this would inspect the template's block params
  return false;
};

// Override $_c to handle CurriedComponent — when a GXT binding (e.g., from {{#let}})
// resolves to a CurriedComponent, we need to render it through the Ember component manager
// instead of GXT's normal component constructor path.
const g = globalThis as any;
if (g.$_c && !g.$_c.__emberWrapped) {
  const originalC = g.$_c;

  g.$_c = function $_c_ember(comp: any, args: any, ctx: any) {
    if (comp && comp.__isCurriedComponent) {
      // Build args from the GXT args object
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const $PROPS = Symbol.for('gxt-props');
        const $SLOTS = Symbol.for('gxt-slots');
        const fw = args?.[$PROPS] || null;

        // Extract named args from the GXT args object
        const namedArgs: any = {};
        if (args) {
          for (const key of Object.keys(args)) {
            if (key === 'args' || key.startsWith('$')) continue;
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(namedArgs, key, desc);
            }
          }
          // Also check args.args (GXT puts named args in args['args'])
          const argsObj = args['args'];
          if (argsObj && typeof argsObj === 'object') {
            for (const key of Object.keys(argsObj)) {
              if (!key.startsWith('$')) {
                const desc = Object.getOwnPropertyDescriptor(argsObj, key);
                if (desc) {
                  Object.defineProperty(namedArgs, key, desc);
                }
              }
            }
          }

          // Extract slots from GXT args for {{yield}} support
          const gxtSlots = args?.[$SLOTS] || args?.args?.[$SLOTS];
          if (gxtSlots && typeof gxtSlots === 'object') {
            namedArgs.$slots = gxtSlots;
          }
        }

        const handleResult = managers.component.handle(comp, namedArgs, fw, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
      }
    }

    // Also handle functions with __stringComponentName (from old $_componentHelper)
    if (typeof comp === 'function' && comp.__stringComponentName) {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const namedArgs: any = {};
        if (args) {
          for (const key of Object.keys(args)) {
            if (key === 'args' || key.startsWith('$')) continue;
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(namedArgs, key, desc);
            }
          }
        }
        const handleResult = managers.component.handle(comp, namedArgs, null, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
      }
    }

    return originalC(comp, args, ctx);
  };
  g.$_c.__emberWrapped = true;
}

// Override $_tag to check for Ember components before creating HTML elements
// GXT compiles PascalCase tags like <FooBar /> to $_tag('FooBar', ...) but
// these should be handled by the component manager for Ember integration
if (g.$_tag && !g.$_tag.__compileWrapped) {
  const originalTag = g.$_tag;

  // GXT's $_tag signature: $_tag(tag, tagProps, ctx, children)
  g.$_tag = function $_tag_ember(
    tag: string | (() => string),
    tagProps: any,
    ctx: any,
    children: any[]
  ): any {
    const resolvedTag = typeof tag === 'function' ? tag() : tag;

    // Ensure ctx has a TRUTHY GXT component ID for addToTree parent tracking.
    // GXT's tree.ts checks `if (!PARENT_ID)` which treats 0 as falsy.
    if (ctx && typeof ctx === 'object' && COMPONENT_ID_PROPERTY) {
      if (!ctx[COMPONENT_ID_PROPERTY as any]) {
        ctx[COMPONENT_ID_PROPERTY as any] = g.__gxtContextId = (g.__gxtContextId || 100) + 1;
      }
    }

    // Handle dynamic component patterns: <@foo /> and <this.foo />
    // These are invalid HTML tag names that need special handling
    if (resolvedTag && typeof resolvedTag === 'string') {
      // Handle <@foo /> - component passed as argument
      if (resolvedTag.startsWith('@')) {
        const argName = resolvedTag.slice(1); // Remove '@'
        // Get the component from the context's args
        // GXT uses plain string 'args' ($args = 'args')
        const ctxArgs = ctx?.['args'] || ctx?.args || {};
        const componentValue = ctxArgs[argName];
        if (componentValue) {
          // Extract args from tagProps for dynamic component rendering
          const dynArgs: any = {};
          if (tagProps && tagProps !== g.$_edp) {
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              for (const [key, value] of attrs) {
                if (key.startsWith('@')) {
                  const dynArgName = key.slice(1);
                  Object.defineProperty(dynArgs, dynArgName, {
                    get: () => typeof value === 'function' ? value() : value,
                    enumerable: true,
                    configurable: true,
                  });
                }
              }
            }
          }

          // Build slots from children (block content)
          // This enables {{yield}} in the component to render the block content
          // GXT puts text children in tagProps[2] (events position) when it doesn't
          // recognize the tag as a component (e.g., @inner). Extract from there too.
          const blockChildren: any[] = children && children.length > 0 ? [...children] : [];
          if (blockChildren.length === 0 && tagProps && tagProps !== g.$_edp) {
            const textEntries = tagProps[2];
            if (Array.isArray(textEntries)) {
              for (const entry of textEntries) {
                if (Array.isArray(entry) && entry.length === 2) {
                  blockChildren.push(entry[1]);
                }
              }
            }
          }
          if (blockChildren.length > 0) {
            const defaultSlotFn = (slotCtx: any) => {
              return blockChildren.map((child: any) => {
                if (typeof child === 'function') {
                  return child();
                }
                return child;
              });
            };
            dynArgs.$slots = { default: defaultSlotFn };
          }

          // Build fw (forwarding) structure
          const domAttrs: [string, any][] = [];
          let events: [string, any][] = [];
          if (tagProps && tagProps !== g.$_edp) {
            if (Array.isArray(tagProps[1])) {
              for (const [key, value] of tagProps[1]) {
                if (!key.startsWith('@')) {
                  domAttrs.push([key, value]);
                }
              }
            }
            // Only use tagProps[2] as events if we didn't already use them as block children
            if (Array.isArray(tagProps[2]) && blockChildren.length === 0) {
              events = tagProps[2];
            }
          }
          const fw = [[], domAttrs, events];

          // Render the dynamic component
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, dynArgs, fw, ctx);
          }
        }
        // If no component found, return empty comment
        return document.createComment(`dynamic component @${argName} not found`);
      }

      // Handle <this.foo /> - component from context property
      if (resolvedTag.startsWith('this.')) {
        const propPath = resolvedTag.slice(5); // Remove 'this.'
        // Get the component from the context
        let componentValue = ctx;
        for (const part of propPath.split('.')) {
          componentValue = componentValue?.[part];
        }
        if (componentValue) {
          // Extract args from tagProps for dynamic component rendering
          const dynArgs: any = {};
          if (tagProps && tagProps !== g.$_edp) {
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              for (const [key, value] of attrs) {
                if (key.startsWith('@')) {
                  const argName = key.slice(1);
                  Object.defineProperty(dynArgs, argName, {
                    get: () => typeof value === 'function' ? value() : value,
                    enumerable: true,
                    configurable: true,
                  });
                }
              }
            }
          }

          // Build slots from children (block content)
          // GXT puts text children in tagProps[2] for unrecognized tags
          const thisDynChildren: any[] = children && children.length > 0 ? [...children] : [];
          if (thisDynChildren.length === 0 && tagProps && tagProps !== g.$_edp) {
            const textEntries = tagProps[2];
            if (Array.isArray(textEntries)) {
              for (const entry of textEntries) {
                if (Array.isArray(entry) && entry.length === 2) {
                  thisDynChildren.push(entry[1]);
                }
              }
            }
          }
          if (thisDynChildren.length > 0) {
            const defaultSlotFn = (slotCtx: any) => {
              return thisDynChildren.map((child: any) => {
                if (typeof child === 'function') {
                  return child();
                }
                return child;
              });
            };
            dynArgs.$slots = { default: defaultSlotFn };
          }

          // Build fw (forwarding) structure
          const domAttrs: [string, any][] = [];
          let events: [string, any][] = [];
          if (tagProps && tagProps !== g.$_edp) {
            if (Array.isArray(tagProps[1])) {
              for (const [key, value] of tagProps[1]) {
                if (!key.startsWith('@')) {
                  domAttrs.push([key, value]);
                }
              }
            }
            if (Array.isArray(tagProps[2]) && thisDynChildren.length === 0) {
              events = tagProps[2];
            }
          }
          const fw = [[], domAttrs, events];

          // Render the dynamic component
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, dynArgs, fw, ctx);
          }
        }
        // If no component found, return empty comment
        return document.createComment(`dynamic component this.${propPath} not found`);
      }
    }

    // Handle named blocks like <:header> and <:default>
    // These are not real elements - they're markers for named slots
    // Return a special object that can be detected when building slots
    if (resolvedTag && typeof resolvedTag === 'string' && resolvedTag.startsWith(':')) {
      const slotName = resolvedTag.slice(1); // Remove the leading ':'

      // Check for block params - they're in the forwarded props (fw) or tagProps
      // When there's "as |param|", GXT passes block params info in tagProps
      let hasBlockParams = false;
      if (tagProps && tagProps !== g.$_edp) {
        // Check if attrs (index 1) contains block params marker
        const attrs = tagProps[1];
        if (Array.isArray(attrs)) {
          for (const [key, value] of attrs) {
            if (key === '@__hasBlockParams__') {
              hasBlockParams = true;
              break;
            }
          }
        }
        // Also check fw (forwarded) for block params info
        const fw = tagProps[3];
        if (fw && fw.__hasBlockParams) {
          hasBlockParams = true;
        }
      }

      const namedBlock = {
        __isNamedBlock: true,
        __slotName: slotName,
        __children: children,
        __hasBlockParams: hasBlockParams,
      };
      return namedBlock;
    }

    // Special handling for EmberHtmlRaw component (triple mustaches)
    // This component outputs raw HTML without escaping.
    // Returns an object with __htmlRaw marker so itemToNode can handle
    // it with proper reactive updates (using the same effect scope).
    if (resolvedTag === 'EmberHtmlRaw') {
      let valueGetter: any;
      if (tagProps && tagProps !== g.$_edp) {
        const attrs = tagProps[1];
        if (Array.isArray(attrs)) {
          for (const [key, val] of attrs) {
            if (key === '@value') {
              valueGetter = val;
              break;
            }
          }
        }
      }

      // Return a getter function that itemToNode will call inside gxtEffect.
      // Mark it as __htmlRaw so itemToNode uses innerHTML instead of textContent.
      const htmlGetter = () => {
        const raw = typeof valueGetter === 'function' ? valueGetter() : valueGetter;
        const actual = typeof raw === 'function' ? raw() : raw;
        if (actual == null) return '';
        return actual?.toHTML?.() ?? String(actual);
      };
      (htmlGetter as any).__htmlRaw = true;
      return htmlGetter;
    }

    // Check if this looks like a component name (PascalCase or contains hyphen)
    const mightBeComponent = resolvedTag &&
      typeof resolvedTag === 'string' &&
      (resolvedTag[0] === resolvedTag[0].toUpperCase() || resolvedTag.includes('-'));

    // Access managers dynamically - they may be set up after this module loads
    const managers = g.$_MANAGERS;

    if (mightBeComponent && managers?.component?.canHandle) {
      // Convert PascalCase to kebab-case for Ember component lookup
      const kebabName = resolvedTag
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();

      // Check for HELPER first — inline curlies like {{to-js "foo"}} get transformed
      // to <ToJs @__pos0__="foo" /> by transformCurlyBlockComponents. These should be
      // handled as helpers, not components.
      const owner = g.owner;
      if (owner) {
        const helperFactory = owner.factoryFor?.(`helper:${kebabName}`);
        const helperLookup = !helperFactory ? owner.lookup?.(`helper:${kebabName}`) : null;
        if (helperFactory || helperLookup) {
          // Collect raw attr getters (keep them lazy for reactivity)
          const rawAttrs: Array<[string, any]> = [];
          if (tagProps && tagProps !== g.$_edp) {
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              rawAttrs.push(...attrs);
            }
          }

          // Create or reuse a persistent class-based helper instance.
          // The cache prevents re-creation when __gxtForceEmberRerender does
          // a full innerHTML='' + rebuild, which would otherwise create a new
          // instance and inflate createCount / computeCount.
          let helperInstance: any = null;
          let recomputeTag: any = null;

          if (helperFactory) {
            const factoryClass = helperFactory.class;
            const isClassBased = factoryClass && factoryClass.prototype &&
              typeof factoryClass.prototype.compute === 'function';
            if (isClassBased) {
              const cached = _tagHelperInstanceCache.get(kebabName);
              if (cached && cached.instance && !cached.instance.isDestroyed && !cached.instance.isDestroying) {
                helperInstance = cached.instance;
                recomputeTag = cached.recomputeTag;
              } else {
                try {
                  helperInstance = helperFactory.create();
                  // Find RECOMPUTE_TAG symbol on the instance
                  const symKeys = Object.getOwnPropertySymbols(helperInstance);
                  for (const sym of symKeys) {
                    if (sym.toString().includes('RECOMPUTE_TAG')) {
                      recomputeTag = helperInstance[sym];
                      break;
                    }
                  }
                  _tagHelperInstanceCache.set(kebabName, { instance: helperInstance, recomputeTag });
                  // Register for destruction
                  const destroyableInstances = g.__gxtHelperInstances;
                  if (Array.isArray(destroyableInstances)) {
                    destroyableInstances.push(helperInstance);
                  }
                } catch {
                  helperInstance = null;
                }
              }
            }
          }

          // Build a getter that resolves args lazily and invokes the helper.
          const helperGetter = () => {
            const positional: any[] = [];
            const named: Record<string, any> = {};
            for (const [key, value] of rawAttrs) {
              const resolved = typeof value === 'function' ? value() : value;
              if (key.startsWith('@__pos') && key.endsWith('__') && key !== '@__posCount__') {
                const idx = parseInt(key.slice(6, -2));
                positional[idx] = resolved;
              } else if (key.startsWith('@') && !key.startsWith('@__')) {
                named[key.slice(1)] = resolved;
              }
            }

            if (helperInstance && typeof helperInstance.compute === 'function') {
              // Deduplicate: if args haven't changed, return cached result.
              // The force-rerender (innerHTML='' + rebuild) creates a NEW gxtEffect closure
              // that fires immediately with the same args, causing double-computation.
              // We store the cache on the helperInstance itself (which is shared via
              // _tagHelperInstanceCache) so it survives across closure re-creation.
              let argsSerialized: string | null = null;
              // Include recompute tag value in dedup key so recompute() invalidates cache
              const recomputeVal = (recomputeTag && typeof recomputeTag === 'object' && 'value' in recomputeTag)
                ? recomputeTag.value : 0;
              try { argsSerialized = JSON.stringify({ p: positional, n: named, r: recomputeVal }); } catch { /* skip dedup */ }
              if (argsSerialized !== null && argsSerialized === helperInstance.__gxtLastArgsSerialized) {
                // recomputeTag.value already consumed above for the dedup key
                return helperInstance.__gxtLastResult;
              }
              const result = helperInstance.compute(positional, named);
              helperInstance.__gxtLastArgsSerialized = argsSerialized;
              helperInstance.__gxtLastResult = result;
              // Consume RECOMPUTE_TAG cell for reactivity
              if (recomputeTag && typeof recomputeTag === 'object' && 'value' in recomputeTag) {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                recomputeTag.value;
              }
              return result;
            }

            // Simple helper: delegate to $_maybeHelper
            const maybeHelper = g.$_maybeHelper;
            if (typeof maybeHelper === 'function') {
              return maybeHelper(kebabName, positional, named, ctx);
            }
            return undefined;
          };

          // Create a reactive text node. The gxtEffect tracks cell reads
          // inside helperGetter and updates the text node when deps change.
          // We must avoid double-calling compute: the effect fires immediately
          // on creation (first evaluation), so we let it set the initial value.
          const textNode = document.createTextNode('');
          try {
            gxtEffect(() => {
              const v = helperGetter();
              textNode.textContent = v == null ? '' : String(v);
            });
          } catch { /* effect setup may fail */ }
          return textNode;
        }
      }

      // Check if the component manager can handle this
      if (managers.component.canHandle(kebabName)) {
        // Build args from tagProps - convert Props format to args object
        // IMPORTANT: Keep args LAZY - don't evaluate functions yet!
        // Block params from parent slots won't be available until slot.default runs
        let args: any = {};
        const domAttrs: [string, any][] = []; // Attributes to forward via ...attributes

        if (tagProps && tagProps !== g.$_edp) {
          // tagProps is [props[], attrs[], events[], fw?]
          // - props[0]: HTML properties including class (key "" = class, key "id" = id, etc.)
          // - attrs[1]: Attributes with @ prefix for named args, or data-* attributes
          // - events[2]: Event handlers
          // - fw[3]: Forwarded props from parent (for nested components)

          // Process props (index 0) - includes class and other HTML properties
          const props = tagProps[0];
          if (Array.isArray(props)) {
            for (const [key, value] of props) {
              // Empty key means class attribute in GXT's format
              const attrKey = key === '' ? 'class' : key;
              // Collect for forwarding via ...attributes
              domAttrs.push([attrKey, value]);
              // Also add class/classNames to args so wrapper building and sync can access them
              if (attrKey === 'class' || attrKey === 'classNames') {
                Object.defineProperty(args, attrKey, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
              // HTML id prop (not @id named arg) - use special key to distinguish
              // from @id which maps to elementId (frozen after first render)
              if (attrKey === 'id') {
                Object.defineProperty(args, '__htmlId', {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
            }
          }

          // Process attrs (index 1) - includes @ args and data-* attributes
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, value] of attrs) {
              if (key.startsWith('@')) {
                // Named arg - keep as lazy getter
                // The value might be a function that references block params
                // which won't be available until we're inside a slot context
                const argName = key.slice(1);
                Object.defineProperty(args, argName, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              } else {
                // HTML attribute (like data-test) - collect for forwarding
                domAttrs.push([key, value]);
                // Also keep in args for direct access as lazy getter
                Object.defineProperty(args, key, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
            }
          }
        }

        // Build fw (forwarding) structure for the component manager
        // fw[0] = domAttrs (for ...attributes)
        // fw[1] = slots (for {{yield}})
        // fw[2] = events/modifiers (to forward to elements with ...attributes)
        const slots: Record<string, any> = {};

        // Collect events/modifiers from tagProps[2] for forwarding
        let events: [string, any][] = [];
        if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[2])) {
          events = tagProps[2];
        }
        // Helper to detect if children use block params
        // Block params are accessed via $_bp0, $_bp1 getters on Object.prototype
        const detectBlockParams = (slotChildren: any[]): boolean => {
          // Check if any child function references block params
          for (const child of slotChildren) {
            if (typeof child === 'function') {
              const fnStr = child.toString();
              // Look for $_bp references which indicate block params are used
              if (/\$_bp\d/.test(fnStr)) {
                return true;
              }
            }
          }
          return false;
        };

        if (children && children.length > 0) {
          // Separate named blocks from default slot children
          // Named blocks are marked with __isNamedBlock from :name element handling
          const namedBlocks: Map<string, { children: any[]; hasBlockParams: boolean }> = new Map();
          const defaultChildren: any[] = [];

          for (const child of children) {
            // Check if it's a named block marker
            if (child && typeof child === 'object' && child.__isNamedBlock) {
              const slotName = child.__slotName;
              if (!namedBlocks.has(slotName)) {
                namedBlocks.set(slotName, { children: [], hasBlockParams: false });
              }
              const slot = namedBlocks.get(slotName)!;
              // Add the named block's children to its slot
              if (child.__children) {
                slot.children.push(...child.__children);
              }
              // Copy the hasBlockParams flag from the named block marker
              if (child.__hasBlockParams) {
                slot.hasBlockParams = true;
              }
            } else {
              // Regular child goes to default slot
              defaultChildren.push(child);
            }
          }

          // Helper to create a slot function
          // explicitHasBlockParams: if true/false is explicitly provided, use it
          // otherwise detect from children
          const createSlotFn = (slotChildren: any[], explicitHasBlockParams?: boolean) => {
            // Use explicit flag if provided, otherwise detect from children
            const hasBlockParams = explicitHasBlockParams !== undefined
              ? explicitHasBlockParams
              : detectBlockParams(slotChildren);

            const slotFn = (slotCtx: any, ...params: any[]) => {
              const unwrappedParams = params.map(param => {
                if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                  try { return param.fn(); } catch { return param; }
                }
                if (typeof param === 'function') {
                  try { return param(); } catch { return param; }
                }
                return param;
              });

              // Store on slotCtx for context-based lookup
              const contextParams = (globalThis as any).__contextBlockParams as WeakMap<object, any[]>;
              if (contextParams && slotCtx && typeof slotCtx === 'object') {
                contextParams.set(slotCtx, [...unwrappedParams]);
              }

              // Also store as current slot params for re-renders
              // This persists until the next slot call, allowing reactivity
              // to access block params even after the slot function returns
              (globalThis as any).__currentSlotParams = unwrappedParams;

              const stack = (globalThis as any).__blockParamsStack;
              stack.push(unwrappedParams);

              try {
                // Return raw children as-is. GXT's rendering pipeline
                // (renderElement → resolveRenderable) will handle functions
                // by wrapping them in formulas that track cell dependencies.
                // This provides native GXT reactivity: when a tracked cell
                // changes (e.g., this.message), the formula re-evaluates
                // and the text node updates automatically.
                return [...slotChildren];
              } finally {
                stack.pop();
                // NOTE: We do NOT clear __currentSlotParams here
                // This allows re-renders (via GXT reactivity) to access
                // the params even after the slot function has returned
              }
            };

            // Mark slot with block params info for has-block-params helper
            (slotFn as any).__hasBlockParams = hasBlockParams;

            return slotFn;
          };

          // Create slot functions for named blocks
          for (const [slotName, slotData] of namedBlocks) {
            // Pass both children and the explicit hasBlockParams flag
            slots[slotName] = createSlotFn(slotData.children, slotData.hasBlockParams);
          }

          // Create default slot if there are default children
          // Check args.__hasBlockParams__ marker for explicit block params declaration
          if (defaultChildren.length > 0) {
            // Get the explicit hasBlockParams flag from args if present
            const explicitHasBlockParams = args.__hasBlockParams__ !== undefined
              ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
              : undefined;
            slots.default = createSlotFn(defaultChildren, explicitHasBlockParams);
          }
        }

        // Legacy: If no slots were created but children exist, create default slot
        // (This handles the case where there are no named blocks)
        if (children && children.length > 0 && !slots.default && Object.keys(slots).length === 0) {
          // Check for explicit hasBlockParams marker from args
          const explicitHasBlockParams = args.__hasBlockParams__ !== undefined
            ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
            : undefined;
          // Detect from children if not explicitly set
          const hasBlockParams = explicitHasBlockParams !== undefined
            ? explicitHasBlockParams
            : detectBlockParams(children);

          const slotFn = (slotCtx: any, ...params: any[]) => {
            // CRITICAL: Do NOT unwrap params here - keep them as raw values (potentially reactive)
            // The $_bp0, $_bp1, etc. getters will unwrap them when accessed
            // This allows reactivity to work: when the component's property changes,
            // the next access to $_bp0 will return the new value
            const rawParams = [...params];

            // Store on slotCtx for context-based lookup
            const contextParams = (globalThis as any).__contextBlockParams as WeakMap<object, any[]>;
            if (contextParams && slotCtx && typeof slotCtx === 'object') {
              contextParams.set(slotCtx, rawParams);
            }

            // Also store as current slot params for re-renders
            // This persists until the next slot call, allowing reactivity
            // to access block params even after the slot function returns
            (globalThis as any).__currentSlotParams = rawParams;

            // Push block params onto the global stack
            // The $_blockParam helper reads from this stack
            const stack = (globalThis as any).__blockParamsStack;
            stack.push(rawParams);

            try {
              // Return raw children as-is. GXT's rendering pipeline
              // handles functions via resolveRenderable → formula tracking.
              return [...children];
            } finally {
              // Pop block params from stack
              // NOTE: We do NOT clear __currentSlotParams here
              // This allows re-renders (via GXT reactivity) to access
              // the params even after the slot function has returned
              stack.pop();
            }
          };

          // Mark slot with block params info
          (slotFn as any).__hasBlockParams = hasBlockParams;
          slots.default = slotFn;
        }

        // Check for __hasBlock__ marker - indicates curly block invocation or
        // empty angle-bracket invocation <Component></Component>
        // Even if children are empty, we need to create a default slot
        // so that (has-block) returns true
        if (args.__hasBlock__ && !slots.default) {
          const blockName = typeof args.__hasBlock__ === 'function' ? args.__hasBlock__() : args.__hasBlock__;
          // Check if block params were declared
          const hasBlockParams = args.__hasBlockParams__ !== undefined
            ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
            : false;
          // Create an empty slot function for the specified block
          const slotFn = (slotCtx: any, ...params: any[]) => {
            return []; // Empty slot - just return empty array
          };
          // Set the hasBlockParams flag on the slot
          (slotFn as any).__hasBlockParams = hasBlockParams;
          slots[blockName || 'default'] = slotFn;
          // Remove the markers from args so they're not passed to the component
          delete args.__hasBlock__;
          delete args.__hasBlockParams__;
        }

        // GXT FwType is [TagProp[], TagAttr[], TagEvent[]] - all arrays
        // We pass domAttrs as attrs (position 1), events as events (position 2)
        // Slots are passed separately via args.$slots
        const fw = [[], domAttrs, events];  // [props, attrs, events]

        // Pass slots via args so manager.ts can access them.
        // Set on both string key and Symbol key to survive GXT's slot processing.
        args.$slots = slots;
        args[Symbol.for('gxt-slots')] = slots;

        // Return a THUNK that renders the component when called
        // This is crucial for block params: when <Outer><Inner @msg={{param}} /></Outer>
        // is compiled, $_tag('Inner', ...) is called BEFORE $_tag('Outer', ...)
        // (due to JavaScript array literal evaluation order)
        // By returning a thunk, we defer the actual rendering until slot.default
        // calls the children functions - at which point block params are set up

        // Create a stable instance ID for this component position in the template
        // This ID is preserved across re-renders of the same template position
        const GXT_THUNK_ID = Symbol.for('gxt-thunk-id');
        if (!args[GXT_THUNK_ID]) {
          args[GXT_THUNK_ID] = Symbol('thunk-instance');
        }
        const thunkId = args[GXT_THUNK_ID];

        const renderComponent = function __componentThunk() {
          // Now evaluate args and render the component
          // The args getters will access block params from the stack
          // Pass the stable thunkId to enable instance caching
          (args as any).__thunkId = thunkId;
          const handleResult = managers.component.handle(kebabName, args, fw, ctx);
          if (typeof handleResult === 'function') {
            return handleResult();
          }
          return handleResult;
        };
        // Mark as component thunk for debugging
        (renderComponent as any).__isComponentThunk = true;
        (renderComponent as any).__componentName = kebabName;

        return renderComponent;
      }

    }

    // Fall back to original $_tag for regular HTML elements
    // GXT handles ...attributes internally by:
    // 1. Applying modifiers from $fw to elements with ...attributes
    // 2. Passing $fw as tagProps[3] for reference
    // We should NOT apply modifiers again here - GXT already handles them.
    // We only need to apply forwarded DOM attributes (fw[0]) that GXT doesn't handle.
    // GXT order: tag, tagProps, ctx, children
    const result = originalTag(tag, tagProps, ctx, children);

    // Apply forwarded DOM attributes from $fw if present
    // $fw is passed as tagProps[3] and contains [domAttrs, slots, events/modifiers]
    // NOTE: We don't apply modifiers (fw[2]) here - GXT handles those internally
    const fw = tagProps?.[3];

    if (fw && Array.isArray(fw)) {
      const fwAttrs = fw[0];

      // Only apply DOM attributes (fw[0]) - GXT handles modifiers (fw[2]) internally
      if (result && typeof result === 'object' && Array.isArray(fwAttrs) && fwAttrs.length > 0) {
        const applyAttrsToElement = (el: Element) => {
          for (const [key, value] of fwAttrs) {
            const attrValue = typeof value === 'function' ? value() : value;
            if (key === 'class') {
              // Append to existing class rather than replacing
              if (el.className) {
                el.className = el.className + ' ' + attrValue;
              } else {
                el.className = attrValue;
              }
            } else {
              el.setAttribute(key, String(attrValue));
            }
          }
        };

        // Check if result is a DOM element directly
        if (result instanceof Element) {
          applyAttrsToElement(result);
        } else {
          // Check for GXT context object with symbol-keyed nodes
          const symbols = Object.getOwnPropertySymbols(result);
          for (const sym of symbols) {
            const nodes = result[sym];
            if (Array.isArray(nodes)) {
              for (const node of nodes) {
                if (node instanceof Element) {
                  applyAttrsToElement(node);
                }
              }
            }
          }
        }
      }
    }

    return result;
  };

  // Mark as wrapped to prevent re-wrapping
  g.$_tag.__compileWrapped = true;
}

// Note: $_dc override not needed currently. Dynamic component block forms
// ({{#component this.xxx}}) are left untransformed for GXT to handle via
// its component keyword support.

/**
 * Transform capitalized component names to kebab-case for runtime resolution.
 */
function transformCapitalizedComponents(code: string): string {
  let result = code;

  // List of known Ember built-in components that need transformation
  const knownComponents = ['LinkTo', 'Outlet'];

  for (const component of knownComponents) {
    const kebab = component.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

    // Opening tag: <LinkTo to <link-to
    const openTagRegex = new RegExp(`<${component}(?=[\\s/>])`, 'g');
    result = result.replace(openTagRegex, `<${kebab}`);

    // Closing tag: </LinkTo> to </link-to>
    const closeTagRegex = new RegExp(`</${component}>`, 'g');
    result = result.replace(closeTagRegex, `</${kebab}>`);
  }

  return result;
}

/**
 * Transform {{outlet}} to <ember-outlet />
 */
function transformOutletHelper(code: string): string {
  return code.replace(/\{\{\s*outlet\s*\}\}/g, '<ember-outlet />');
}

/**
 * Transform triple mustaches {{{expr}}} to raw HTML output
 * Triple mustaches in Handlebars output HTML without escaping
 * We transform them to a special component that handles raw HTML
 */
function transformTripleMustaches(code: string): string {
  // Match {{{...}}} but not {{{{...}}}}
  // Transform to <EmberHtmlRaw @value={{expr}} /> component
  return code.replace(/\{\{\{([^}]+)\}\}\}/g, (match, expr) => {
    return `<EmberHtmlRaw @value={{${expr.trim()}}} />`;
  });
}

/**
 * Transform angle-bracket components with positional parameters
 * <SampleComponent "Foo" 4 "Bar" @namedArg=val /> -> <SampleComponent @__pos0__="Foo" @__pos1__={{4}} @__pos2__="Bar" @__posCount__={{3}} @namedArg=val />
 */
function transformAngleBracketPositionalParams(code: string): string {
  // Match angle-bracket component with potential positional params
  // Pattern: <PascalCaseName followed by content that includes unattributed values
  const componentPattern = /<([A-Z][a-zA-Z0-9]*)(\s+[^>]*?)?(\s*\/>|>)/g;

  return code.replace(componentPattern, (match, tagName, attrsSection, closing) => {
    if (!attrsSection || !attrsSection.trim()) {
      return match; // No attrs, nothing to transform
    }

    let remaining = attrsSection.trim();
    const positionalParams: string[] = [];
    const namedParams: string[] = [];

    // Parse the attrs string token by token
    while (remaining.length > 0) {
      remaining = remaining.trim();
      if (remaining.length === 0) break;

      // Check for named parameter: @name=value or name=value
      const namedMatch = remaining.match(/^(@?[a-zA-Z_][a-zA-Z0-9_-]*)=/);
      if (namedMatch) {
        const fullName = namedMatch[1];
        let valueStr = remaining.slice(namedMatch[0].length);
        let value: string;

        // Determine the value type and extract it
        if (valueStr.startsWith('{{')) {
          // Mustache: find matching }}
          let depth = 0;
          let i = 0;
          for (; i < valueStr.length; i++) {
            if (valueStr[i] === '{' && valueStr[i + 1] === '{') depth++;
            else if (valueStr[i] === '}' && valueStr[i + 1] === '}') {
              depth--;
              if (depth === 0) {
                i += 2;
                break;
              }
            }
          }
          value = valueStr.slice(0, i);
        } else if (valueStr.startsWith('"')) {
          const match = valueStr.match(/^"(?:[^"\\]|\\.)*"/);
          value = match ? match[0] : valueStr.split(/\s/)[0] || '';
        } else if (valueStr.startsWith("'")) {
          const match = valueStr.match(/^'(?:[^'\\]|\\.)*'/);
          value = match ? match[0] : valueStr.split(/\s/)[0] || '';
        } else {
          value = valueStr.split(/[\s>]/)[0] || '';
        }

        namedParams.push(`${fullName}=${value}`);
        remaining = remaining.slice(namedMatch[0].length + value.length);
        continue;
      }

      // Check for as |...| block params marker
      if (remaining.startsWith('as ')) {
        // Keep the rest as-is
        namedParams.push(remaining);
        break;
      }

      // Check for positional parameter: "string", 'string', {{expr}}, number, or boolean
      // Quoted string
      const quotedMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if (quotedMatch) {
        positionalParams.push(quotedMatch[1]);
        remaining = remaining.slice(quotedMatch[1].length);
        continue;
      }

      // Mustache expression
      if (remaining.startsWith('{{')) {
        let depth = 0;
        let i = 0;
        for (; i < remaining.length; i++) {
          if (remaining[i] === '{' && remaining[i + 1] === '{') depth++;
          else if (remaining[i] === '}' && remaining[i + 1] === '}') {
            depth--;
            if (depth === 0) {
              i += 2;
              break;
            }
          }
        }
        positionalParams.push(remaining.slice(0, i));
        remaining = remaining.slice(i);
        continue;
      }

      // Number or boolean
      const numberMatch = remaining.match(/^(-?\d+(?:\.\d+)?|true|false)\b/);
      if (numberMatch) {
        positionalParams.push(numberMatch[1]);
        remaining = remaining.slice(numberMatch[1].length);
        continue;
      }

      // Path like this.name (as positional param)
      const pathMatch = remaining.match(/^(this\.[a-zA-Z0-9_.]+)/);
      if (pathMatch) {
        positionalParams.push(`{{${pathMatch[1]}}}`);
        remaining = remaining.slice(pathMatch[1].length);
        continue;
      }

      // Skip unknown character
      remaining = remaining.slice(1);
    }

    // If no positional params, return unchanged
    if (positionalParams.length === 0) {
      return match;
    }

    // Build the new attrs string
    let newAttrs = '';

    // First add positional params as @__posN__ args
    for (let i = 0; i < positionalParams.length; i++) {
      const p = positionalParams[i];
      if (p.startsWith('"') || p.startsWith("'")) {
        newAttrs += ` @__pos${i}__=${p}`;
      } else if (p.startsWith('{{') && p.endsWith('}}')) {
        newAttrs += ` @__pos${i}__=${p}`;
      } else {
        // Numbers and booleans
        newAttrs += ` @__pos${i}__={{${p}}}`;
      }
    }
    newAttrs += ` @__posCount__={{${positionalParams.length}}}`;

    // Then add named params
    for (const param of namedParams) {
      newAttrs += ` ${param}`;
    }

    return `<${tagName}${newAttrs}${closing}`;
  });
}

/**
 * Transform {{component}} helper to angle-bracket syntax
 * - {{#component "foo-bar"}}content{{/component}} → <FooBar>content</FooBar>
 * - {{#component "foo-bar" arg=val}}content{{/component}} → <FooBar @arg={{val}}>content</FooBar>
 * - {{component "foo-bar"}} → <FooBar />
 */
function transformComponentHelper(code: string): string {
  let result = code;

  // Helper to convert kebab-case to PascalCase
  const toPascalCase = (name: string) => {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  };

  // Helper to convert attrs like arg=val to @arg={{val}}
  const transformAttrs = (attrs: string) => {
    if (!attrs.trim()) return '';

    let transformed = attrs.trim();

    // Transform each attribute - need to handle:
    // name=value, name={{value}}, name="value", name='value', name=this.value
    transformed = transformed.replace(/([a-zA-Z][a-zA-Z0-9-]*)=(\{\{[^}]+\}\}|"[^"]*"|'[^']*'|this\.[a-zA-Z0-9.]+|[^\s}]+)/g,
      (match, name, value) => {
        // Add @ prefix if not already present
        const attrName = name.startsWith('@') ? name : `@${name}`;
        // Wrap value in {{}} if it's a bare path and not already wrapped
        let attrValue = value;
        if (!value.startsWith('{{') && !value.startsWith('"') && !value.startsWith("'")) {
          // Bare values: this.xxx, item.name, true, false, numbers, etc.
          attrValue = `{{${value}}}`;
        }
        return `${attrName}=${attrValue}`;
      });

    // Return with leading space
    return ' ' + transformed;
  };

  // Block form: {{#component "name"}}...{{/component}}
  // Need to handle nested components properly using depth-based matching
  // to support nested {{#component}} blocks
  {
    let iterations = 0;
    const maxIter = 50;
    while (/\{\{#component\s/.test(result) && iterations < maxIter) {
      iterations++;
      // Find the first {{#component ...}} block
      const openMatch = result.match(/\{\{#component\s+(["']([^"']+)["']|this\.[a-zA-Z0-9_.]+)([^}]*)\}\}/);
      if (!openMatch) break;

      const fullOpen = openMatch[0];
      const startIdx = result.indexOf(fullOpen);
      const isStringName = openMatch[2] !== undefined;
      const name = isStringName ? openMatch[2] : openMatch[1]; // string name or this.xxx
      const attrs = openMatch[3] || '';

      // Find the matching {{/component}} with depth tracking
      let depth = 1;
      let searchPos = startIdx + fullOpen.length;
      let endIdx = -1;

      while (depth > 0 && searchPos < result.length) {
        const nextOpen = result.indexOf('{{#component ', searchPos);
        const nextClose = result.indexOf('{{/component}}', searchPos);

        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchPos = nextOpen + 13; // past '{{#component '
        } else {
          depth--;
          if (depth === 0) {
            endIdx = nextClose + '{{/component}}'.length;
          } else {
            searchPos = nextClose + '{{/component}}'.length;
          }
        }
      }

      if (endIdx === -1) break;

      const content = result.slice(startIdx + fullOpen.length, endIdx - '{{/component}}'.length);

      let replacement: string;
      if (isStringName) {
        if (attrs && /(?<!=)\s*\(/.test(attrs)) {
          // Has subexpressions, skip
          break;
        }
        const pascalName = toPascalCase(name);
        const transformedAttrs = transformAttrs(attrs);
        replacement = `<${pascalName}${transformedAttrs}>${content}</${pascalName}>`;
      } else {
        // Dynamic name: this.componentName
        // Don't transform - leave as {{#component this.xxx}} for GXT to handle
        // GXT's $_dc doesn't support string component names directly
        break;
      }

      result = result.slice(0, startIdx) + replacement + result.slice(endIdx);
    }
  }

  // Inline form: {{component "name" arg=val}}
  // Skip transformation if attrs contain positional subexpressions (e.g., (component ...))
  // that are NOT part of a named arg value. Named arg values with subexpressions
  // like greeting=(hash ...) are OK to transform, but bare (component ...) positional
  // args cannot be converted to angle-bracket syntax.
  const inlinePattern = /\{\{component\s+["']([^"']+)["']([^}]*)\}\}/g;
  result = result.replace(inlinePattern, (match, name, attrs) => {
    if (attrs) {
      // Check for bare positional subexpressions: (word ...) NOT preceded by =
      // This detects positional args like (component "-foo") but not named args like greeting=(hash ...)
      if (/(?<!=)\s*\(/.test(attrs)) {
        return match; // Leave as-is for GXT to handle via $_componentHelper
      }
    }
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs} />`;
  });

  return result;
}

/**
 * Transform curly-style arguments to angle-bracket @-prefixed arguments.
 * E.g., 'label="Foo" count=this.count' -> ' @label="Foo" @count={{this.count}}'
 * Also handles positional parameters:
 * E.g., '"Foo" 42 key=val' -> ' @__pos0__="Foo" @__pos1__={{42}} @__posCount__={{2}} @key={{val}}'
 */
function transformCurlyArgsToAngleBracket(args: string): string {
  if (!args) return '';

  let remaining = args.trim();
  const positionalParams: string[] = [];
  const namedParams: string[] = [];

  // Parse args token by token (similar to transformAttrs in transformCurlyBlockComponents)
  while (remaining.length > 0) {
    remaining = remaining.trim();
    if (remaining.length === 0) break;

    // Skip 'as |...|' block params clause
    const asMatch = remaining.match(/^as\s*\|([^|]+)\|/);
    if (asMatch) {
      // Preserve block params clause - it will be handled elsewhere
      remaining = remaining.slice(asMatch[0].length);
      continue;
    }

    // Named parameter: key=value
    const nameMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9-]*)=/);
    if (nameMatch) {
      const name = nameMatch[1];
      let valueStr = remaining.slice(nameMatch[0].length);
      let value: string;

      if (valueStr.startsWith('{{')) {
        const endIdx = valueStr.indexOf('}}');
        value = endIdx !== -1 ? valueStr.slice(0, endIdx + 2) : valueStr.split(/\s/)[0] || '';
      } else if (valueStr.startsWith('"')) {
        const match = valueStr.match(/^"(?:[^"\\]|\\.)*"/);
        value = match ? match[0] : valueStr.split(/\s/)[0] || '';
      } else if (valueStr.startsWith("'")) {
        const match = valueStr.match(/^'(?:[^'\\]|\\.)*'/);
        value = match ? match[0] : valueStr.split(/\s/)[0] || '';
      } else if (valueStr.startsWith('(')) {
        // Match balanced parens for subexpressions
        let depth = 0, i = 0;
        for (; i < valueStr.length; i++) {
          if (valueStr[i] === '(') depth++;
          else if (valueStr[i] === ')') { depth--; if (depth === 0) { i++; break; } }
        }
        value = valueStr.slice(0, i);
      } else {
        value = valueStr.split(/[\s}]/)[0] || '';
      }

      const attrName = `@${name}`;
      let attrValue = value;
      // Wrap non-quoted, non-mustache values in {{}}
      if (!value.startsWith('{{') && !value.startsWith('"') && !value.startsWith("'")) {
        attrValue = `{{${value}}}`;
      }
      namedParams.push(`${attrName}=${attrValue}`);
      remaining = remaining.slice(nameMatch[0].length + value.length);
      continue;
    }

    // Positional: quoted string
    const quotedMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
    if (quotedMatch) {
      positionalParams.push(quotedMatch[1]);
      remaining = remaining.slice(quotedMatch[1].length);
      continue;
    }

    // Positional: mustache expression
    const mustacheMatch = remaining.match(/^(\{\{[^}]+\}\})/);
    if (mustacheMatch) {
      positionalParams.push(mustacheMatch[1]);
      remaining = remaining.slice(mustacheMatch[1].length);
      continue;
    }

    // Positional: number or boolean
    const numberMatch = remaining.match(/^(-?\d+(?:\.\d+)?|true|false)\b/);
    if (numberMatch) {
      positionalParams.push(numberMatch[1]);
      remaining = remaining.slice(numberMatch[1].length);
      continue;
    }

    // Positional: subexpression
    if (remaining.startsWith('(')) {
      let depth = 0, i = 0;
      for (; i < remaining.length; i++) {
        if (remaining[i] === '(') depth++;
        else if (remaining[i] === ')') { depth--; if (depth === 0) { i++; break; } }
      }
      const expr = remaining.slice(0, i);
      positionalParams.push(expr);
      remaining = remaining.slice(i);
      continue;
    }

    // Positional: path like this.name or @foo or bare identifier
    const pathMatch = remaining.match(/^(this\.[a-zA-Z0-9_.]+|@[a-zA-Z][a-zA-Z0-9-]*|[a-zA-Z_][a-zA-Z0-9_.]*)/);
    if (pathMatch) {
      // Check if followed by '=' - then it's a named param starting, don't consume as positional
      if (remaining.charAt(pathMatch[0].length) === '=') {
        // This is actually a named param without our regex matching - advance
        remaining = remaining.slice(1);
        continue;
      }
      positionalParams.push(`{{${pathMatch[1]}}}`);
      remaining = remaining.slice(pathMatch[1].length);
      continue;
    }

    // Skip unknown character
    remaining = remaining.slice(1);
  }

  // Build the result
  let result = '';
  if (namedParams.length > 0) {
    result += ' ' + namedParams.join(' ');
  }
  if (positionalParams.length > 0) {
    for (let i = 0; i < positionalParams.length; i++) {
      const p = positionalParams[i];
      if (p.startsWith('"') || p.startsWith("'")) {
        result += ` @__pos${i}__=${p}`;
      } else if (p.startsWith('{{') && p.endsWith('}}')) {
        result += ` @__pos${i}__=${p}`;
      } else if (p.startsWith('(')) {
        result += ` @__pos${i}__={{${p}}}`;
      } else {
        result += ` @__pos${i}__={{${p}}}`;
      }
    }
    result += ` @__posCount__={{${positionalParams.length}}}`;
  }
  return result;
}

/**
 * Transform Ember's block params syntax so that block param references use a global accessor.
 *
 * The key insight is that GXT compiles expressions to arrow functions which capture `this`
 * lexically. We cannot change `this` for arrow functions with .call(). Instead, we use
 * a global object that can be accessed from anywhere.
 *
 * This function transforms:
 *   <Foo as |x y|>{{x}} {{y}}</Foo>
 * To:
 *   <Foo>{{$_bp.0}} {{$_bp.1}}</Foo>
 *
 * Before evaluating children, we set globalThis.$_bp = params, allowing the functions
 * to access the yield values through this global reference.
 */
function transformBlockParams(templateString: string): { transformed: string; blockParamMappings: Map<string, string[]> } {
  let result = templateString;
  const blockParamMappings = new Map<string, string[]>();

  // Find all components with `as |...|` block params
  // Pattern: <ComponentName (attrs) as |param1 param2 ...|>
  // Note: Attribute names can include underscores (e.g., @__hasBlock__)
  const blockParamPattern = /<([A-Z][a-zA-Z0-9-]*)((?:\s+(?:[@a-zA-Z_][a-zA-Z0-9_-]*(?:=(?:"[^"]*"|'[^']*'|\{\{[^}]*\}\}|[^\s>]*))?))*)(\s+as\s*\|([^|]+)\|)(\s*)>/g;

  interface BlockParamScope {
    componentName: string;
    params: string[];
    startIndex: number;
    endIndex: number;
    openTagEnd: number;
  }

  const scopes: BlockParamScope[] = [];
  let match;

  // First pass: find all block param scopes
  while ((match = blockParamPattern.exec(result)) !== null) {
    const [fullMatch, componentName, attrs, asClause, paramsStr] = match;
    const startIndex = match.index;
    const openTagEnd = startIndex + fullMatch.length;

    // Parse params (space-separated)
    const params = paramsStr.trim().split(/\s+/);

    // Find the closing tag for this component
    const closingTag = `</${componentName}>`;
    let depth = 1;
    let searchPos = openTagEnd;
    let endIndex = -1;

    // Simple tag matching (doesn't handle all edge cases but works for most templates)
    const tagOpenPattern = new RegExp(`<${componentName}(?:\\s|>|/>)`, 'g');
    const tagClosePattern = new RegExp(`</${componentName}>`, 'g');

    // Find matching closing tag
    while (depth > 0 && searchPos < result.length) {
      tagOpenPattern.lastIndex = searchPos;
      tagClosePattern.lastIndex = searchPos;

      const openMatch = tagOpenPattern.exec(result);
      const closeMatch = tagClosePattern.exec(result);

      if (!closeMatch) break;

      if (openMatch && openMatch.index < closeMatch.index && !openMatch[0].endsWith('/>')) {
        depth++;
        searchPos = openMatch.index + openMatch[0].length;
      } else {
        depth--;
        if (depth === 0) {
          endIndex = closeMatch.index + closeMatch[0].length;
        } else {
          searchPos = closeMatch.index + closeMatch[0].length;
        }
      }
    }

    if (endIndex === -1) continue;

    scopes.push({
      componentName,
      params,
      startIndex,
      endIndex,
      openTagEnd,
    });

    blockParamMappings.set(componentName + '_' + startIndex, params);
  }

  // Second pass: transform references within each scope (process in reverse to preserve indices)
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    const { params, startIndex, endIndex, openTagEnd, componentName } = scope;

    // Extract the block content
    const blockContent = result.slice(openTagEnd, endIndex - `</${componentName}>`.length);

    // Replace each param reference with a positional accessor
    // Transform {{param}} to {{this.$_bp0}} and {{param.prop}} to {{this.$_bp0.prop}}
    // The slot function will set up $_bp0, $_bp1, etc. on the context
    let transformedContent = blockContent;
    for (let j = 0; j < params.length; j++) {
      const param = params[j];
      const bpVar = `$_bp${j}`;

      // Replace {{param.property}} with {{this.$_bp0.property}} (do this first for longer matches)
      const pathPattern = new RegExp(`\\{\\{\\s*${param}(\\.[a-zA-Z0-9_.]+)\\s*\\}\\}`, 'g');
      transformedContent = transformedContent.replace(pathPattern, `{{this.${bpVar}$1}}`);

      // Replace {{param}} with {{this.$_bp0}} (simple case)
      const simplePattern = new RegExp(`\\{\\{\\s*${param}\\s*\\}\\}`, 'g');
      transformedContent = transformedContent.replace(simplePattern, `{{this.${bpVar}}}`);

      // Replace in attribute values: @attr={{param.property}}
      const attrPathPattern = new RegExp(`([@a-zA-Z][a-zA-Z0-9-]*=)\\{\\{${param}(\\.[a-zA-Z0-9_.]+)\\}\\}`, 'g');
      transformedContent = transformedContent.replace(attrPathPattern, `$1{{this.${bpVar}$2}}`);

      // Replace in attribute values: @attr={{param}}
      const attrPattern = new RegExp(`([@a-zA-Z][a-zA-Z0-9-]*=)\\{\\{${param}\\}\\}`, 'g');
      transformedContent = transformedContent.replace(attrPattern, `$1{{this.${bpVar}}}`);

      // Replace param used as component tag name: <Param ...> -> <this.$_bp0 ...>
      // This handles the case where a block param is a component reference
      // (e.g., {{#let (component 'foo') as |Comp|}}<Comp />{{/let}})
      // Also handles lowercase block params used as angle bracket tags
      // (e.g., {{#yielding-component as |comp|}}<comp />{{/yielding-component}})
      {
        // Self-closing tag: <Param ... /> -> <this.$_bp0 ... />
        const selfClosePattern = new RegExp(`<${param}((?:\\s+[^>]*)?)\\s*/>`, 'g');
        transformedContent = transformedContent.replace(selfClosePattern, `<this.${bpVar}$1 />`);

        // Open tag: <Param ...> -> <this.$_bp0 ...>
        const openTagPattern = new RegExp(`<${param}((?:\\s+[^>]*)?)>`, 'g');
        transformedContent = transformedContent.replace(openTagPattern, `<this.${bpVar}$1>`);

        // Close tag: </Param> -> </this.$_bp0>
        const closeTagPattern = new RegExp(`</${param}>`, 'g');
        transformedContent = transformedContent.replace(closeTagPattern, `</this.${bpVar}>`);
      }

      // Replace param.property used as component tag: <param.baz ...> -> <this.$_bp0.baz ...>
      {
        const dotSelfClosePattern = new RegExp(`<${param}\\.(\\S+?)((?:\\s+[^>]*)?)\\s*/>`, 'g');
        transformedContent = transformedContent.replace(dotSelfClosePattern, `<this.${bpVar}.$1$2 />`);

        const dotOpenPattern = new RegExp(`<${param}\\.(\\S+?)((?:\\s+[^>]*)?)>`, 'g');
        transformedContent = transformedContent.replace(dotOpenPattern, `<this.${bpVar}.$1$2>`);

        const dotClosePattern = new RegExp(`</${param}\\.(\\S+?)>`, 'g');
        transformedContent = transformedContent.replace(dotClosePattern, `</this.${bpVar}.$1>`);
      }

      // Handle curly invocations of block params with arguments:
      // {{param.prop argName=argVal}} -> <this.$_bp0.prop @argName={{argVal}} />
      // {{param.prop positional1 argName=argVal}} -> <this.$_bp0.prop @__pos0__={{positional1}} @__posCount__={{1}} @argName={{argVal}} />
      // {{param positional1 positional2}} -> <this.$_bp0 @__pos0__={{positional1}} @__pos1__={{positional2}} @__posCount__={{2}} />
      // {{#param.prop argName=argVal}}content{{/param.prop}} -> <this.$_bp0.prop @argName={{argVal}}>content</this.$_bp0.prop>
      // {{#param argName=argVal}}content{{/param}} -> <this.$_bp0 @argName={{argVal}}>content</this.$_bp0>
      {
        // Block form: {{#param.prop args}}content{{/param.prop}}
        const blockDotPattern = new RegExp(
          `\\{\\{#${param}(\\.[a-zA-Z0-9_.]+)(\\s[^}]*)\\}\\}([\\s\\S]*?)\\{\\{/${param}\\1\\}\\}`, 'g'
        );
        transformedContent = transformedContent.replace(blockDotPattern, (match: string, dotPath: string, args: string, content: string) => {
          const transformedArgs = transformCurlyArgsToAngleBracket(args.trim());
          return `<this.${bpVar}${dotPath}${transformedArgs}>${content}</this.${bpVar}${dotPath}>`;
        });

        // Block form: {{#param args}}content{{/param}}
        const blockSimplePattern = new RegExp(
          `\\{\\{#${param}(\\s[^}]*)\\}\\}([\\s\\S]*?)\\{\\{/${param}\\}\\}`, 'g'
        );
        transformedContent = transformedContent.replace(blockSimplePattern, (match: string, args: string, content: string) => {
          const transformedArgs = transformCurlyArgsToAngleBracket(args.trim());
          return `<this.${bpVar}${transformedArgs}>${content}</this.${bpVar}>`;
        });

        // Inline form with args: {{param.prop arg1 key=val}} (must have at least one arg after the path)
        // Make sure not to match simple {{param.prop}} (no extra args)
        const inlineDotWithArgsPattern = new RegExp(
          `\\{\\{\\s*${param}(\\.[a-zA-Z0-9_.]+)(\\s+[^}]+)\\}\\}`, 'g'
        );
        transformedContent = transformedContent.replace(inlineDotWithArgsPattern, (match: string, dotPath: string, args: string) => {
          const transformedArgs = transformCurlyArgsToAngleBracket(args.trim());
          return `<this.${bpVar}${dotPath}${transformedArgs} />`;
        });

        // Inline form with args: {{param arg1 key=val}} (must have at least one arg)
        // Be careful not to match {{param}} or {{param.prop}} without args
        const inlineSimpleWithArgsPattern = new RegExp(
          `\\{\\{\\s*${param}(\\s+(?!\\.|\\})[^}]+)\\}\\}`, 'g'
        );
        transformedContent = transformedContent.replace(inlineSimpleWithArgsPattern, (match: string, args: string) => {
          const transformedArgs = transformCurlyArgsToAngleBracket(args.trim());
          return `<this.${bpVar}${transformedArgs} />`;
        });
      }
    }

    // Reconstruct the element without the `as |...|` part
    // Add a marker to indicate that block params were declared
    const originalOpenTag = result.slice(startIndex, openTagEnd);
    const tagWithoutBlockParams = originalOpenTag.replace(/\s+as\s*\|[^|]+\|/, '');
    // Insert the __hasBlockParams__ marker before the closing >
    const newOpenTag = tagWithoutBlockParams.replace(/>$/, ' @__hasBlockParams__="default">');

    const closingTag = `</${componentName}>`;
    const newElement = newOpenTag + transformedContent + closingTag;

    result = result.slice(0, startIndex) + newElement + result.slice(endIndex);
  }

  return { transformed: result, blockParamMappings };
}

/**
 * Check if a position in a template string is inside an HTML attribute value.
 * Scans backwards from the offset to determine if we're between quotes in an
 * attribute context like `<div attr="...HERE...">`.
 *
 * This prevents transforming helpers like `{{foo-bar}}` into components when
 * they appear inside attribute values (e.g. `<div data-x="{{foo-bar}}">`).
 */
function isInsideHtmlAttributeValue(str: string, offset: number): boolean {
  // Scan backwards from the offset to find if we're inside an attribute value.
  // We look for the pattern: attrName= followed by a quote that is still open.
  // Track quote state by scanning from the last '<' before the offset.
  let angleBracketPos = -1;
  for (let i = offset - 1; i >= 0; i--) {
    if (str[i] === '>') {
      // We hit a closing angle bracket before an opening one,
      // so we're not inside an HTML tag at all
      return false;
    }
    if (str[i] === '<') {
      angleBracketPos = i;
      break;
    }
  }

  if (angleBracketPos === -1) {
    // No opening '<' found before this position - not inside a tag
    return false;
  }

  // Now scan from the '<' to the offset, tracking quote state
  let inQuote: string | null = null;
  for (let i = angleBracketPos; i < offset; i++) {
    const ch = str[i];
    if (inQuote === null) {
      if (ch === '"' || ch === "'") {
        inQuote = ch;
      }
    } else if (ch === inQuote) {
      inQuote = null;
    }
  }

  // If we're still inside an open quote, the mustache is in an attribute value
  return inQuote !== null;
}

/**
 * Transform curly block component syntax to angle-bracket syntax
 * - {{#foo-bar}}content{{/foo-bar}} → <FooBar>content</FooBar>
 * - {{#foo-bar arg=val}}content{{/foo-bar}} → <FooBar @arg={{val}}>content</FooBar>
 * - {{foo-bar}} → <FooBar />
 */
function transformCurlyBlockComponents(code: string): string {
  let result = code;

  // Helper to convert kebab-case to PascalCase
  const toPascalCase = (name: string) => {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  };

  // Helper to convert attrs like arg=val to @arg={{val}}
  // Also handles positional parameters
  const transformAttrs = (attrs: string) => {
    if (!attrs.trim()) return '';

    let remaining = attrs.trim();
    const positionalParams: string[] = [];
    const namedParams: string[] = [];

    // Helper to match balanced parentheses
    const matchBalancedParens = (str: string): string | null => {
      if (!str.startsWith('(')) return null;
      let depth = 0;
      let i = 0;
      for (; i < str.length; i++) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') {
          depth--;
          if (depth === 0) return str.slice(0, i + 1);
        }
      }
      return null;
    };

    // Parse the attrs string token by token
    while (remaining.length > 0) {
      remaining = remaining.trim();
      if (remaining.length === 0) break;

      // Check for named parameter: name=value
      // Value can be: {{...}}, "...", '...', (...), or bare word/path
      const nameMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9-]*)=/);
      if (nameMatch) {
        const name = nameMatch[1];
        let valueStr = remaining.slice(nameMatch[0].length);
        let value: string;

        // Determine the value type and extract it
        if (valueStr.startsWith('{{')) {
          // Mustache: match until }}
          const endIdx = valueStr.indexOf('}}');
          if (endIdx !== -1) {
            value = valueStr.slice(0, endIdx + 2);
          } else {
            value = valueStr.split(/\s/)[0] || '';
          }
        } else if (valueStr.startsWith('"')) {
          // Double quoted string
          const match = valueStr.match(/^"(?:[^"\\]|\\.)*"/);
          value = match ? match[0] : valueStr.split(/\s/)[0] || '';
        } else if (valueStr.startsWith("'")) {
          // Single quoted string
          const match = valueStr.match(/^'(?:[^'\\]|\\.)*'/);
          value = match ? match[0] : valueStr.split(/\s/)[0] || '';
        } else if (valueStr.startsWith('(')) {
          // Subexpression: match balanced parens
          const parenMatch = matchBalancedParens(valueStr);
          value = parenMatch || valueStr.split(/\s/)[0] || '';
        } else {
          // Bare word/path
          value = valueStr.split(/[\s}]/)[0] || '';
        }

        const attrName = name.startsWith('@') ? name : `@${name}`;
        let attrValue = value;
        // Wrap subexpressions and bare words in {{}}
        if (!value.startsWith('{{') && !value.startsWith('"') && !value.startsWith("'")) {
          attrValue = `{{${value}}}`;
        }
        namedParams.push(`${attrName}=${attrValue}`);
        remaining = remaining.slice(nameMatch[0].length + value.length);
        continue;
      }

      // Check for positional parameter: "string" or 'string' or {{expr}} or (subexpr) or number or this.path
      // Subexpression: balanced parentheses like (helper-name arg1 arg2)
      const subexprMatch = matchBalancedParens(remaining);
      if (subexprMatch) {
        // Wrap subexpression in {{}} so GXT compiles it as a helper call
        positionalParams.push(`{{${subexprMatch}}}`);
        remaining = remaining.slice(subexprMatch.length);
        continue;
      }

      // Quoted string
      const quotedMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if (quotedMatch) {
        positionalParams.push(quotedMatch[1]);
        remaining = remaining.slice(quotedMatch[1].length);
        continue;
      }

      // Mustache expression
      const mustacheMatch = remaining.match(/^(\{\{[^}]+\}\})/);
      if (mustacheMatch) {
        positionalParams.push(mustacheMatch[1]);
        remaining = remaining.slice(mustacheMatch[1].length);
        continue;
      }

      // Number or boolean
      const numberMatch = remaining.match(/^(-?\d+(?:\.\d+)?|true|false)\b/);
      if (numberMatch) {
        positionalParams.push(numberMatch[1]);
        remaining = remaining.slice(numberMatch[1].length);
        continue;
      }

      // Path like this.name or @foo
      const pathMatch = remaining.match(/^(this\.[a-zA-Z0-9_.]+|@[a-zA-Z][a-zA-Z0-9-]*)/);
      if (pathMatch) {
        positionalParams.push(`{{${pathMatch[1]}}}`);
        remaining = remaining.slice(pathMatch[1].length);
        continue;
      }

      // Skip unknown character
      remaining = remaining.slice(1);
    }

    // Build the result
    let result = '';
    if (namedParams.length > 0) {
      result += ' ' + namedParams.join(' ');
    }
    if (positionalParams.length > 0) {
      // Pass positional params as individual @__pos0__, @__pos1__, etc. arguments
      // The component manager will map these to named params based on positionalParams
      for (let i = 0; i < positionalParams.length; i++) {
        const p = positionalParams[i];
        // If it's a quoted string, use it directly
        if (p.startsWith('"') || p.startsWith("'")) {
          result += ` @__pos${i}__=${p}`;
        }
        // If it's a mustache, pass it through
        else if (p.startsWith('{{') && p.endsWith('}}')) {
          result += ` @__pos${i}__=${p}`;
        }
        // Numbers and booleans need to be wrapped
        else {
          result += ` @__pos${i}__={{${p}}}`;
        }
      }
      // Also pass the count
      result += ` @__posCount__={{${positionalParams.length}}}`;
    }
    return result;
  };

  // Known block helpers that should NOT be transformed (they're control flow, not components)
  const blockHelpers = ['if', 'unless', 'each', 'each-in', 'with', 'let', 'in-element'];

  // Block form: {{#component-name attrs}}...{{/component-name}}
  // Use a recursive approach to handle nested blocks
  const transformBlocks = (input: string): string => {
    // Match opening block: {{#name attrs}}
    const blockOpenPattern = /\{\{#([a-z][a-zA-Z0-9-]*)([^}]*)\}\}/;

    let output = input;
    let match;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops
    const skipMap = new Map<string, string>(); // Store markers to restore

    while ((match = blockOpenPattern.exec(output)) !== null && iterations < maxIterations) {
      iterations++;
      const [fullMatch, name, attrs] = match;
      const startIndex = match.index;

      // Skip known block helpers - preserve the full original opening tag
      if (blockHelpers.includes(name)) {
        // Mark the opening tag as processed so we don't match it again
        // Use a unique marker that won't conflict with template content
        const markerId = `__SKIP_${name}_${iterations}__`;
        output = output.slice(0, startIndex) + markerId + output.slice(startIndex + fullMatch.length);
        skipMap.set(markerId, fullMatch);
        continue;
      }

      // Find the matching closing tag
      const closingTag = `{{/${name}}}`;
      let depth = 1;
      let searchPos = startIndex + fullMatch.length;
      let endIndex = -1;

      while (depth > 0 && searchPos < output.length) {
        const nextOpen = output.indexOf(`{{#${name}`, searchPos);
        const nextClose = output.indexOf(closingTag, searchPos);

        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchPos = nextOpen + 3;
        } else {
          depth--;
          if (depth === 0) {
            endIndex = nextClose + closingTag.length;
          } else {
            searchPos = nextClose + closingTag.length;
          }
        }
      }

      if (endIndex === -1) {
        // Can't find closing tag, skip this opening tag
        const markerId = `__SKIP_${name}_${iterations}_nf__`;
        output = output.slice(0, startIndex) + markerId + output.slice(startIndex + fullMatch.length);
        skipMap.set(markerId, fullMatch);
        continue;
      }

      // Extract content between opening and closing tags
      let content = output.slice(startIndex + fullMatch.length, endIndex - closingTag.length);

      // Check for {{else}} block - split into default and inverse content
      // Note: Only split on top-level {{else}}, not nested ones
      let defaultContent = content;
      let inverseContent = '';
      const elseMatch = content.match(/\{\{else\}\}/);
      if (elseMatch) {
        // Simple split - assumes no nested {{else}} at the same level
        // TODO: Handle nested else properly with depth tracking
        const elseIndex = content.indexOf('{{else}}');
        defaultContent = content.slice(0, elseIndex);
        inverseContent = content.slice(elseIndex + 8); // 8 = length of '{{else}}'
      }

      // Transform to angle-bracket syntax
      const pascalName = toPascalCase(name);

      // Check for block params: `as |param1 param2|`
      const blockParamMatch = attrs.match(/\s+as\s*\|([^|]+)\|/);
      let blockParamClause = '';
      let attrsWithoutBlockParams = attrs;
      if (blockParamMatch) {
        blockParamClause = ` as |${blockParamMatch[1]}|`;
        attrsWithoutBlockParams = attrs.replace(blockParamMatch[0], '');
      }

      const transformedAttrs = transformAttrs(attrsWithoutBlockParams);

      let replacement: string;
      // Check if there was an {{else}} block (even if empty)
      // elseMatch is set if we found {{else}}, regardless of content length

      if (elseMatch) {
        // Has else block - use named blocks syntax
        // <Component><:default>content</:default><:inverse>else content</:inverse></Component>
        replacement = `<${pascalName}${transformedAttrs}${blockParamClause}><:default>${defaultContent}</:default><:inverse>${inverseContent}</:inverse></${pascalName}>`;
      } else {
        // No else block - regular content
        // Add __hasBlock__ marker if block is empty (for has-block helper)
        const hasBlockMarker = defaultContent.trim() === '' ? ' @__hasBlock__="default"' : '';
        replacement = `<${pascalName}${transformedAttrs}${hasBlockMarker}${blockParamClause}>${defaultContent}</${pascalName}>`;
      }

      output = output.slice(0, startIndex) + replacement + output.slice(endIndex);
    }

    // Restore skipped blocks from the map
    for (const [marker, original] of skipMap) {
      output = output.replace(marker, original);
    }

    return output;
  };

  result = transformBlocks(result);

  // Inline form: {{component-name arg=val}} (not followed by block content)
  // Only transform if it looks like a component (has hyphen = kebab-case)
  // Be careful not to transform helpers like {{if}} or {{log}}
  // Also skip mustaches inside HTML attribute values (e.g. <div data-x="{{foo-bar}}">)
  const inlinePattern = /\{\{([a-z][a-zA-Z0-9]*-[a-zA-Z0-9-]*)([^}]*)\}\}/g;
  result = result.replace(inlinePattern, (match, name, attrs, offset) => {
    // Check if this mustache is inside an HTML attribute value by scanning
    // backwards from the match position for an unmatched opening quote
    if (isInsideHtmlAttributeValue(result, offset)) {
      return match; // Leave it as-is; it's a helper call in attribute context
    }
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs} />`;
  });

  return result;
}

// Template cache for performance
const templateCache = new Map<string, any>();

/**
 * Runtime precompileTemplate implementation using GXT runtime compiler
 * Returns a template factory function that takes an owner and returns a template.
 */
export function precompileTemplate(templateString: string, options?: {
  strictMode?: boolean;
  scope?: () => Record<string, unknown>;
  moduleName?: string;
}) {
  // Check cache first
  const cacheKey = templateString + (options?.moduleName || '');
  const cached = templateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Transform the template
  let transformedTemplate = templateString;

  // Fix empty true-branch in {{#if}}: GXT compiler can't handle
  // {{#if cond}}{{else}}content{{/if}} (empty true branch).
  // Insert a zero-width space so the true branch isn't empty.
  transformedTemplate = transformedTemplate.replace(
    /\{\{#(if|unless)\s+([^}]+)\}\}\s*\{\{else\}\}/g,
    '{{#$1 $2}} {{else}}'
  );

  // Transform bare {{this}} to {{this.__gxtSelfString__}} so GXT renders toString() value
  // Ember's {{this}} in curly component templates calls toString() on the component instance.
  // We use a getter property (__gxtSelfString__) that calls toString() on the component.
  if (/\{\{this\}\}/.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(/\{\{this\}\}/g, '{{this.__gxtSelfString__}}');
  }

  // Transform {{#each-in obj as |key value|}}...{{/each-in}} to
  // {{#each (object-entries obj) as |entry|}}...{{/each-in}}
  // where entry[0] = key, entry[1] = value
  // This is handled by a runtime helper registered below
  if (/\{\{#each-in\b/.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(
      /\{\{#each-in\s+([^\s}]+)\s+as\s*\|([^|]+)\|\s*\}\}/g,
      (match, obj, params) => {
        const parts = params.trim().split(/\s+/);
        const keyParam = parts[0] || 'key';
        const valueParam = parts[1] || 'value';
        // Transform to {{#each}} over entries with destructuring via let
        return `{{#each (gxt-entries-of ${obj}) as |__eachInEntry__|}}{{#let __eachInEntry__.0 __eachInEntry__.1 as |${keyParam} ${valueParam}|}}`;
      }
    );
    transformedTemplate = transformedTemplate.replace(
      /\{\{\/each-in\}\}/g,
      '{{/let}}{{/each}}'
    );
  }

  // Transform (mut this.prop) / (mut @arg) to pass the property path as a second arg
  // so the mut helper can create a proper setter function.
  // (mut this.foo) → (mut this.foo "this.foo")
  // (mut @bar)     → (mut @bar "@bar")
  transformedTemplate = transformedTemplate.replace(
    /\(mut\s+(this\.[a-zA-Z0-9_.]+|@[a-zA-Z0-9_.]+)\)/g,
    (_match, path) => `(mut ${path} "${path}")`
  );

  transformedTemplate = transformCapitalizedComponents(transformedTemplate);
  if (/\{\{\s*outlet\s*\}\}/.test(transformedTemplate)) {
    transformedTemplate = transformOutletHelper(transformedTemplate);
  }
  // Transform triple mustaches {{{expr}}} to raw HTML component
  if (/\{\{\{/.test(transformedTemplate)) {
    transformedTemplate = transformTripleMustaches(transformedTemplate);
  }
  // Transform {{component}} helper to angle-bracket
  if (/\{\{#?component\s+/.test(transformedTemplate)) {
    transformedTemplate = transformComponentHelper(transformedTemplate);
  }

  // Transform built-in curly components ({{input ...}} and {{textarea ...}}) to angle-bracket syntax
  // These don't have hyphens so transformCurlyBlockComponents won't handle them
  transformedTemplate = transformedTemplate.replace(
    /\{\{(input|textarea)(\s[^}]*)?\}\}/g,
    (match, name, attrs) => {
      const pascalName = name === 'input' ? 'Input' : 'Textarea';
      if (attrs && attrs.trim()) {
        const transformedAttrs = transformCurlyArgsToAngleBracket(attrs.trim());
        return `<${pascalName}${transformedAttrs} />`;
      }
      return `<${pascalName} />`;
    }
  );

  // Transform curly block component syntax to angle-bracket
  // {{#foo-bar}}...{{/foo-bar}} → <FooBar>...</FooBar>
  // Also transforms inline {{foo-bar ...}} calls
  if (/\{\{#?[a-z][a-zA-Z0-9]*-[a-zA-Z0-9-]*[\s}]/.test(transformedTemplate)) {
    transformedTemplate = transformCurlyBlockComponents(transformedTemplate);
  }

  // Transform {{#@argName args}}content{{/@argName}} block invocations to angle bracket
  // These are block invocations of components passed as named args
  if (/\{\{#@/.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(
      /\{\{#@([a-zA-Z][a-zA-Z0-9]*)([^}]*)\}\}([\s\S]*?)\{\{\/@\1\}\}/g,
      (match, argName, attrs, content) => {
        const transformedAttrs = attrs.trim() ? transformCurlyArgsToAngleBracket(attrs.trim()) : '';
        return `<@${argName}${transformedAttrs}>${content}</@${argName}>`;
      }
    );
  }

  // Transform empty angle-bracket component invocations: <Component></Component>
  // These need a @__hasBlock__ marker so has-block returns true.
  // Self-closing <Component /> does NOT get the marker (has-block = false).
  // Only matches components (PascalCase or kebab-case starting with uppercase).
  transformedTemplate = transformedTemplate.replace(
    /<([A-Z][a-zA-Z0-9]*)(\s[^>]*)?(?<!\/)>(\s*)<\/\1>/g,
    (match, tagName, attrs, whitespace) => {
      // Already has __hasBlock__? Skip.
      if (attrs && attrs.includes('__hasBlock__')) return match;
      const attrStr = attrs || '';
      return `<${tagName}${attrStr} @__hasBlock__="default">${whitespace}</${tagName}>`;
    }
  );

  // Transform angle-bracket components with positional parameters
  // <SampleComponent "Foo" 4 "Bar" @namedArg=val /> -> <SampleComponent @__pos0__="Foo" @__pos1__={{4}} ... @__posCount__={{3}} @namedArg=val />
  transformedTemplate = transformAngleBracketPositionalParams(transformedTemplate);

  // Transform reserved word variable names to this.varName to avoid invalid JS
  // e.g., class=class -> class=this.class (because `class` is a reserved word)
  const reservedWords = ['class', 'default', 'new', 'delete', 'void', 'typeof', 'instanceof', 'in', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'with', 'debugger', 'import', 'export', 'extends', 'super', 'static', 'yield', 'await', 'enum', 'implements', 'interface', 'package', 'private', 'protected', 'public'];
  for (const word of reservedWords) {
    // Match word=word pattern (not word="value" or word={{expr}})
    const pattern = new RegExp(`(\\s)(${word})=(${word})(?=[\\s}/>])`, 'g');
    transformedTemplate = transformedTemplate.replace(pattern, `$1$2=this.$3`);
  }

  // Transform block params: <Foo as |x|>{{x}}</Foo> → <Foo>{{@__bp_0__}}</Foo>
  // This transforms block param references to special @args that we pass through slots
  let blockParamMappings = new Map<string, string[]>();
  if (/\s+as\s*\|[^|]+\|/.test(transformedTemplate)) {
    const result = transformBlockParams(transformedTemplate);
    transformedTemplate = result.transformed;
    blockParamMappings = result.blockParamMappings;
  }

  // Second pass: Add __hasBlock__ marker for empty block param component invocations
  // After block params transform, <componentWithHasBlock></componentWithHasBlock> becomes
  // <this.$_bp0></this.$_bp0>. These need the marker for has-block to work correctly.
  // Match <this.$_bpN ...></this.$_bpN> (empty content = has-block true)
  transformedTemplate = transformedTemplate.replace(
    /<(this\.\$_bp\d+(?:\.[a-zA-Z0-9_.]+)?)(\s[^>]*)?>(\s*)<\/\1>/g,
    (match, tagName, attrs, whitespace) => {
      if (attrs && attrs.includes('__hasBlock__')) return match;
      const attrStr = attrs || '';
      return `<${tagName}${attrStr} @__hasBlock__="default">${whitespace}</${tagName}>`;
    }
  );

  // Transform has-block and has-block-params helpers to global function calls
  // (has-block) -> (this.$_hasBlock)
  // (has-block "inverse") -> (this.$_hasBlock "inverse")
  if (/\(has-block/.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(/\(has-block-params(?:\s+"([^"]+)")?\)/g, (match, blockName) => {
      return blockName ? `(this.$_hasBlockParams "${blockName}")` : '(this.$_hasBlockParams)';
    });
    transformedTemplate = transformedTemplate.replace(/\(has-block(?:\s+"([^"]+)")?\)/g, (match, blockName) => {
      return blockName ? `(this.$_hasBlock "${blockName}")` : '(this.$_hasBlock)';
    });
  }

  // Compile using GXT runtime compiler
  const compilationResult = gxtCompileTemplate(transformedTemplate, {
    moduleName: options?.moduleName || 'gxt-runtime-template',
    flags: {
      IS_GLIMMER_COMPAT_MODE: true,
      WITH_EMBER_INTEGRATION: true,
      WITH_HELPER_MANAGER: true,
      WITH_MODIFIER_MANAGER: true,
      WITH_CONTEXT_API: true,
      TRY_CATCH_ERROR_HANDLING: false,
    },
  });

  if (compilationResult.errors && compilationResult.errors.length > 0) {
    console.warn('[gxt-compile] Compilation errors:', compilationResult.errors);
    console.warn('[gxt-compile] Template:', transformedTemplate.slice(0, 200));
  }


  // Always recreate the template function to:
  // 1. Replace async $_each with synchronous $_eachSync
  // 2. Inject $slots reference (globalThis.$slots) for {{yield}} support
  // 3. Inject $a alias for @named args
  if (compilationResult.code) {
    let modifiedCode = compilationResult.code;
    // Replace async $_each with synchronous $_eachSync
    if (modifiedCode.includes('$_each(')) {
      modifiedCode = modifiedCode.replace(/\$_each\(/g, '$_eachSync(');
    }
    // Transform $_if(() => this.PROP, ...) to use __gxtGetCellOrFormula.
    // This tags the condition getter so our patched $_if can register
    // manual watchers for cross-module-instance notification.
    if (modifiedCode.includes('$_if(')) {
      modifiedCode = modifiedCode.replace(
        /\$_if\(\(?(\(\)\s*=>\s*this\.([a-zA-Z_$][a-zA-Z0-9_$]*))\)?\s*,/g,
        (match, getter, propName) => {
          return `$_if(globalThis.__gxtGetCellOrFormula(this, '${propName}'),`;
        }
      );
    }
    compilationResult.code = modifiedCode;
    try {
      const needsArgsAlias = modifiedCode.includes('$a.');
      const needsSlots = modifiedCode.includes('$slots');
      const g = globalThis as any;
      const templateFnCode = `
        "use strict";
        return function() {
          ${needsArgsAlias ? "const $a = this['args'];" : ''}
          ${needsSlots ? "const $slots = globalThis.$slots || {};" : ''}
          return ${modifiedCode};
        };
      `;
      compilationResult.templateFn = Function(templateFnCode)();
    } catch (e) {
      console.error('[gxt-compile] Failed to recreate template function:', e);
    }
  }



  // Helper function to convert template results to nodes
  const itemToNode = (item: any, depth = 0): Node | null => {
    if (item instanceof Node) {
      return item;
    }
    // GXT returns getter functions for dynamic values like {{@greeting}}
    // Create a REACTIVE text node that updates when dependencies change
    if (typeof item === 'function') {
      try {
        // Triple-stache (raw HTML): use marker comments with innerHTML updates
        if ((item as any).__htmlRaw) {
          const startMarker = document.createComment('');
          const endMarker = document.createComment('');
          const fragment = document.createDocumentFragment();
          fragment.appendChild(startMarker);

          // Initial render
          const initialHtml = item();
          if (initialHtml) {
            const tpl = document.createElement('template');
            tpl.innerHTML = initialHtml;
            while (tpl.content.firstChild) {
              fragment.appendChild(tpl.content.firstChild);
            }
          }
          fragment.appendChild(endMarker);

          // Reactive update — replaces content between markers
          try {
            gxtEffect(() => {
              const html = item();
              const parent = startMarker.parentNode;
              if (!parent) return;
              // Remove existing content between markers
              let node = startMarker.nextSibling;
              while (node && node !== endMarker) {
                const next = node.nextSibling;
                parent.removeChild(node);
                node = next;
              }
              // Insert new HTML content
              if (html) {
                const tpl = document.createElement('template');
                tpl.innerHTML = html;
                while (tpl.content.firstChild) {
                  parent.insertBefore(tpl.content.firstChild, endMarker);
                }
              }
            });
          } catch { /* effect setup may fail */ }

          return fragment;
        }

        const result = item();
        // If result is a function, it's a nested getter (e.g., from $__if)
        // BUT: do NOT call CurriedComponent functions — they need the reactive rendering path below
        const finalResult = (typeof result === 'function' && !result.__isCurriedComponent)
          ? result()
          : result;

        if (finalResult instanceof Node) {
          return finalResult;
        }

        // Check if the result is a CurriedComponent — render it as a component
        // Use marker-based reactive rendering so that when curried args change
        // (e.g., set('model.greeting', 'Hola')), the DOM is replaced.
        if (finalResult && finalResult.__isCurriedComponent) {
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(finalResult)) {
            const renderCurriedComponent = (curried: any): Node | null => {
              if (!curried) return null;
              const handleResult = managers.component.handle(curried, {}, null, null);
              if (typeof handleResult === 'function') {
                const rendered = handleResult();
                if (rendered instanceof Node) return rendered;
                return itemToNode(rendered, depth + 1);
              }
              if (handleResult instanceof Node) return handleResult;
              return itemToNode(handleResult, depth + 1);
            };

            const startMarker = document.createComment('curried-start');
            const endMarker = document.createComment('curried-end');
            const fragment = document.createDocumentFragment();
            fragment.appendChild(startMarker);

            // Initial render
            const initialNode = renderCurriedComponent(finalResult);
            if (initialNode) {
              fragment.appendChild(initialNode);
            }
            fragment.appendChild(endMarker);

            // Reactive update — when the getter re-evaluates to a new/different
            // CurriedComponent, replace the content between markers.
            // The effect tracks cell reads inside item() so it fires when
            // any dependency (e.g., this.model.greeting) changes.
            try {
              // Store the getter so we can manually trigger re-renders
              const curriedRenderInfo: any = {
                item,
                startMarker,
                endMarker,
                renderCurriedComponent,
                managers,
                lastRenderedName: finalResult.__name,
              };
              // Snapshot initial curried args for change detection
              _snapshotCurriedArgs(curriedRenderInfo, finalResult);
              // Register for manual re-rendering on property changes
              if (!(globalThis as any).__curriedRenderInfos) {
                (globalThis as any).__curriedRenderInfos = [];
              }
              (globalThis as any).__curriedRenderInfos.push(curriedRenderInfo);

              gxtEffect(() => {
                const newResult = item();
                const newFinal = (typeof newResult === 'function' && !newResult?.__isCurriedComponent)
                  ? newResult()
                  : newResult;

                // Also evaluate curried arg getters to establish tracking —
                // when a curried arg changes (e.g., this.model.expectedText),
                // this effect must re-fire so we can update the component.
                if (newFinal && newFinal.__isCurriedComponent && newFinal.__curriedArgs) {
                  for (const val of Object.values(newFinal.__curriedArgs)) {
                    if (typeof val === 'function' && !val.prototype && !(val as any).__isCurriedComponent) {
                      try { val(); } catch { /* ignore */ }
                    }
                  }
                }

                const parent = startMarker.parentNode;
                if (!parent) return;

                // Skip teardown if same component with unchanged args (preserves DOM stability)
                if (newFinal && newFinal.__isCurriedComponent &&
                    startMarker.nextSibling !== endMarker &&
                    !_curriedComponentChanged(curriedRenderInfo, newFinal)) {
                  return;
                }

                // Remove existing content between markers
                let node = startMarker.nextSibling;
                while (node && node !== endMarker) {
                  const next = node.nextSibling;
                  parent.removeChild(node);
                  node = next;
                }

                // Insert new content if we have a valid curried component
                if (newFinal && newFinal.__isCurriedComponent && managers.component.canHandle(newFinal)) {
                  const newNode = renderCurriedComponent(newFinal);
                  if (newNode) {
                    parent.insertBefore(newNode, endMarker);
                  }
                  curriedRenderInfo.lastRenderedName = newFinal.__name;
                  _snapshotCurriedArgs(curriedRenderInfo, newFinal);
                } else if (newFinal && typeof newFinal === 'string') {
                  // Component name resolved to string — try rendering directly
                  if (managers.component.canHandle(newFinal)) {
                    const handleResult = managers.component.handle(newFinal, {}, null, null);
                    if (typeof handleResult === 'function') {
                      const rendered = handleResult();
                      if (rendered instanceof Node) {
                        parent.insertBefore(rendered, endMarker);
                      }
                    } else if (handleResult instanceof Node) {
                      parent.insertBefore(handleResult, endMarker);
                    }
                  }
                  curriedRenderInfo.lastRenderedName = newFinal;
                }
              });
            } catch { /* effect setup may fail */ }

            return fragment;
          }
        }

        // Check if the result is a raw HTML value (from triple-stache {{{expr}}})
        // These have __htmlRaw or toHTML marker and need innerHTML rendering
        if (finalResult && typeof finalResult === 'object' && (finalResult.__htmlRaw || typeof finalResult.toHTML === 'function')) {
          const getHtml = () => {
            const v = item();
            const fv = typeof v === 'function' ? v() : v;
            if (fv == null) return '';
            if (fv.toHTML) return fv.toHTML();
            return String(fv);
          };
          const startMarker = document.createComment('');
          const endMarker = document.createComment('');
          const fragment = document.createDocumentFragment();
          fragment.appendChild(startMarker);
          const initialHtml = getHtml();
          if (initialHtml) {
            const tpl = document.createElement('template');
            tpl.innerHTML = initialHtml;
            while (tpl.content.firstChild) {
              fragment.appendChild(tpl.content.firstChild);
            }
          }
          fragment.appendChild(endMarker);
          // Reactive update
          try {
            gxtEffect(() => {
              const html = getHtml();
              const parent = startMarker.parentNode;
              if (!parent) return;
              let node = startMarker.nextSibling;
              while (node && node !== endMarker) {
                const next = node.nextSibling;
                parent.removeChild(node);
                node = next;
              }
              if (html) {
                const tpl = document.createElement('template');
                tpl.innerHTML = html;
                while (tpl.content.firstChild) {
                  parent.insertBefore(tpl.content.firstChild, endMarker);
                }
              }
            });
          } catch { /* effect setup may fail */ }
          return fragment;
        }

        // If result is an object with GXT node structure, process it
        if (finalResult && typeof finalResult === 'object' && !(finalResult instanceof Node)) {
          return itemToNode(finalResult, depth + 1);
        }

        // Create a text node with the initial value
        const textValue = finalResult == null ? '' : String(finalResult);
        const textNode = document.createTextNode(textValue);

        // Set up reactive text binding via GXT effect().
        // Cell-backed getters on the instance make property reads trackable.
        // effect() tracks those cell reads. When set() updates the value,
        // the cell is dirtied, gxtSyncDom() runs the effect, and the
        // text node content is updated.
        try {
          gxtEffect(() => {
            const v = item();
            const fv = typeof v === 'function' ? v() : v;
            textNode.textContent = fv == null ? '' : String(fv);
          });
        } catch {
          // Effect setup failed — text node stays static
        }

        return textNode;
      } catch (e) {
        // Re-throw assertion errors (e.g., "Could not find component named ...")
        // so they propagate to the test harness
        if (e instanceof Error && (
          e.message.includes('Could not find component') ||
          e.message.includes('Attempted to resolve') ||
          e.message.includes('Assertion Failed')
        )) {
          throw e;
        }
        return null;
      }
    }
    if (typeof item === 'string') {
      return document.createTextNode(item);
    }
    if (typeof item === 'number' || typeof item === 'boolean') {
      return document.createTextNode(String(item));
    }
    // Check for htmlSafe strings (SafeString objects with toHTML method)
    if (item && typeof item === 'object' && typeof item.toHTML === 'function') {
      const htmlContent = item.toHTML();
      // Create a document fragment with the HTML content
      const template = document.createElement('template');
      template.innerHTML = htmlContent;
      const fragment = document.createDocumentFragment();
      while (template.content.firstChild) {
        fragment.appendChild(template.content.firstChild);
      }
      return fragment;
    }
    if (item && typeof item === 'object') {
      // Check for CurriedComponent — render it as a component
      if (item && item.__isCurriedComponent) {
        const managers = (globalThis as any).$_MANAGERS;
        if (managers?.component?.canHandle?.(item)) {
          const handleResult = managers.component.handle(item, {}, null, null);
          if (typeof handleResult === 'function') {
            const rendered = handleResult();
            if (rendered instanceof Node) return rendered;
            return itemToNode(rendered, depth + 1);
          }
          if (handleResult instanceof Node) return handleResult;
          return itemToNode(handleResult, depth + 1);
        }
      }

      // Check for GXT list context (from $_each/$_eachSync results)
      // These have topMarker and bottomMarker properties, and the content is between them
      if (item.topMarker && item.bottomMarker) {
        const topMarker = item.topMarker;
        const bottomMarker = item.bottomMarker;
        const parent = topMarker.parentNode;
        if (parent) {
          // Create a fragment containing all nodes between markers (inclusive of markers for GXT tracking)
          const fragment = document.createDocumentFragment();
          // GXT needs the markers for list tracking, so include them
          let node = topMarker;
          while (node) {
            const next = node.nextSibling;
            fragment.appendChild(node);
            if (node === bottomMarker) break;
            node = next;
          }
          return fragment;
        }
        return null;
      }

      // Check for GXT reactive cell with 'fn' property (from $_slot results)
      // GXT's slots return reactive cells that have a 'fn' getter function
      if (typeof item.fn === 'function' && 'isConst' in item) {
        try {
          const cellValue = item.fn();
          return itemToNode(cellValue);
        } catch (e) {
          // fn() may throw if the cell is destroyed
        }
      }

      // Check for $nodes or nodes property
      const nodesProp = item.$nodes || item.nodes;
      if (nodesProp) {
        const frag = document.createDocumentFragment();
        for (const n of nodesProp) {
          const node = itemToNode(n);
          if (node) frag.appendChild(node);
        }
        return frag.childNodes.length > 0 ? frag : null;
      }

      // Check for Symbol-based node storage (GXT context objects)
      const symbols = Object.getOwnPropertySymbols(item);
      for (const sym of symbols) {
        const val = item[sym];
        if (Array.isArray(val) && val.length > 0) {
          const hasNodes = val.some((v: any) =>
            v instanceof Node ||
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'function' ||
            (v && typeof v === 'object'));

          if (hasNodes) {
            const frag = document.createDocumentFragment();
            for (const n of val) {
              const node = itemToNode(n);
              if (node) frag.appendChild(node);
            }
            return frag.childNodes.length > 0 ? frag : null;
          }
        }
      }
    }
    return null;
  };

  // Create the template factory function (takes owner, returns template)
  const templateFactory = function(owner?: any) {
    const templateId = `gxt-template-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create a template object that Ember expects
    const template = {
      __gxtCompiled: true,
      __gxtRuntimeCompiled: true,
      moduleName: options?.moduleName || 'gxt-runtime-template',
      id: templateId,
      result: 'ok' as const,
      meta: { owner },

      // The compiled template function
      _templateFn: compilationResult.templateFn,
      _code: compilationResult.code,

      // For debugging
      toString() {
        return `[gxt-template: ${templateString.slice(0, 50)}...]`;
      },

      // Required by Ember's template system - provides a compilable program
      asLayout() {
        return {
          compile: () => ({ handle: 0, symbolTable: { hasEval: false, symbols: [] } }),
          id: templateId,
          moduleName: options?.moduleName || 'gxt-runtime-template',
        };
      },

      asWrappedLayout() {
        return this.asLayout();
      },

      // Render function for Ember integration
      render(context: any, parentElement: Element | null) {
        if (!parentElement) {
          console.warn('[gxt-compile] No parent element provided for render');
          return { nodes: [] };
        }

        // Set up $slots and $fw as globals for the template function to access
        // The GXT runtime compiler generates code that references these directly
        const g = globalThis as any;
        const prevSlots = g.$slots;
        const prevFw = g.$fw;

        try {
          // Set up GXT context for proper rendering
          const gxtRoot = gxtCreateRoot(document);
          gxtSetParentContext(gxtRoot);

          // Copy GXT rendering context from root to our render context
          try {
            const rootRenderingCtx = gxtRoot[RENDERING_CONTEXT_PROPERTY as any] || gxtInitDOM(gxtRoot);
            if (rootRenderingCtx && RENDERING_CONTEXT_PROPERTY) {
              renderContext[RENDERING_CONTEXT_PROPERTY as any] = rootRenderingCtx;
            }
          } catch { /* ignore */ }

          g.$slots = context.$slots || context[_SLOTS_SYM] || {};
          g.$fw = context.$fw || [[], [], []];


          // Initialize GXT context symbols on the render context if not present
          // GXT requires these for proper parent/child tracking
          // Use the actual symbols exported from GXT

          // Use the context directly — don't wrap with Object.create()!
          // The context IS the Proxy from createRenderContext. Wrapping it would
          // bypass the Proxy's get handler, breaking cell-based reactive tracking.
          const renderContext = context;

          // Register render context for cross-cell dirtying
          (globalThis as any).__lastRenderContext = context;
          if (context && typeof context === 'object') {
            const proto = Object.getPrototypeOf(context);
            if (proto && proto !== Object.prototype) {
              if (!(globalThis as any).__gxtComponentContexts) {
                (globalThis as any).__gxtComponentContexts = new WeakMap();
              }
              const ctxsMap = (globalThis as any).__gxtComponentContexts;
              if (!ctxsMap.has(proto)) {
                ctxsMap.set(proto, new Set());
              }
              ctxsMap.get(proto).add(context);
            }
          }


          // Set up the GXT context symbols using the proper exported symbols
          if (RENDERED_NODES_PROPERTY && !renderContext[RENDERED_NODES_PROPERTY as any]) {
            renderContext[RENDERED_NODES_PROPERTY as any] = [];
          }
          if (COMPONENT_ID_PROPERTY && !renderContext[COMPONENT_ID_PROPERTY as any]) {
            // Generate a unique context ID
            renderContext[COMPONENT_ID_PROPERTY as any] = g.__gxtContextId = (g.__gxtContextId || 100) + 1;
          }

          // Ensure 'args' key is ALWAYS accessible on the render context
          // GXT's runtime compiler uses $args = 'args' (a string), so templates
          // access args via this['args'].foo (aliased as $a.foo)
          if (!renderContext['args']) {
            renderContext['args'] = context['args'] || context.args || {};
          }

          // Add has-block helpers to the render context
          // These check the slots context stack to see if blocks were provided
          const currentSlots = g.$slots;
          renderContext.$_hasBlock = function(blockName?: string) {
            const name = blockName || 'default';
            return currentSlots && typeof currentSlots[name] === 'function';
          };
          renderContext.$_hasBlockParams = function(blockName?: string) {
            const name = blockName || 'default';
            if (!currentSlots || typeof currentSlots[name] !== 'function') {
              return false;
            }
            // Check if the slot has block params info attached
            const slotFn = currentSlots[name];
            if (slotFn.__hasBlockParams !== undefined) {
              return slotFn.__hasBlockParams;
            }
            // Conservative default
            return false;
          };

          // Set up $_scope for GXT's $_maybeHelper name resolution.
          // When templates use bare names like {{cond1}} (without this.),
          // GXT compiles to $_maybeHelper("cond1", [], ctx). The scope is
          // checked to resolve the name. We set $_scope to the render context
          // so bare names resolve to component properties through cell getters.
          const argsObj = renderContext['args'] || renderContext[$ARGS_KEY] || {};
          if (!argsObj.$_scope) {
            argsObj.$_scope = renderContext;
          }

          // Push slots onto the global stack for nested has-block checks
          const slotsStack = (globalThis as any).__slotsContextStack;
          slotsStack.push(currentSlots);

          // Install cells on the render context for user-defined properties BEFORE
          // the template evaluates. This ensures GXT formulas reading this.prop
          // will track the cell, enabling reactive updates when set() is called later.
          // We walk the prototype chain (up to the base Ember component) to find
          // properties set via Component.extend({ fooBar: true }).
          let _cellInstallCount = 0;
          try {
            const internalKeys = new Set([
              'args', 'attrs', 'element', 'parentView', 'tagName', 'layoutName',
              'layout', 'classNames', 'classNameBindings', 'attributeBindings',
              'concatenatedProperties', 'mergedProperties', 'isDestroying', 'isDestroyed',
              'renderer', 'init', 'constructor', 'willDestroy', 'toString',
            ]);
            // Use the raw target if render context is a Proxy (so cells are keyed
            // to the same object that __gxtTriggerReRender uses).
            const cellTarget = (renderContext as any).__gxtRawTarget || renderContext;
            let proto = cellTarget;
            // Walk prototype chain, stopping at Object.prototype
            const visited = new Set<string>();
            for (let depth = 0; depth < 5 && proto; depth++) {
              const keys = Object.getOwnPropertyNames(proto);
              for (const key of keys) {
                if (visited.has(key)) continue;
                visited.add(key);
                if (key.startsWith('_') || key.startsWith('$') || internalKeys.has(key)) continue;
                const desc = Object.getOwnPropertyDescriptor(proto, key);
                if (desc && !desc.get && !desc.set && desc.configurable &&
                    typeof desc.value !== 'function') {
                  try {
                    // Install cell on the raw target (not the proxy)
                    // This ensures the same cell is used for reads and writes
                    cellFor(cellTarget, key as any, /* skipDefine */ false);
                    _cellInstallCount++;
                  } catch { /* ignore non-configurable properties */ }
                }
              }
              const nextProto = Object.getPrototypeOf(proto);
              if (!nextProto || nextProto === Object.prototype) break;
              proto = nextProto;
            }
          } catch { /* ignore */ }
          // _cellInstallCount tracked for debugging

          // Cell promotion handled by __gxtForceEmberRerender (full re-render)

          // Call the compiled template function with the render context.
          // Enable isRendering so GXT formulas track cell dependencies.
          let result;
          gxtSetIsRendering(true);
          try {
            result = compilationResult.templateFn.call(renderContext);
          } finally {
            gxtSetIsRendering(false);
            // Pop slots from stack
            slotsStack.pop();
          }

          // Handle the result
          const nodes: Node[] = [];
          if (Array.isArray(result)) {
            for (const item of result) {
              const node = itemToNode(item);
              if (node) {
                if (node instanceof DocumentFragment) {
                  const childNodes = Array.from(node.childNodes);
                  for (const child of childNodes) {
                    nodes.push(child);
                    parentElement.appendChild(child);
                  }
                } else {
                  nodes.push(node);
                  parentElement.appendChild(node);
                }
              }
            }
          } else {
            const node = itemToNode(result);
            if (node) {
              if (node instanceof DocumentFragment) {
                const childNodes = Array.from(node.childNodes);
                for (const child of childNodes) {
                  nodes.push(child);
                  parentElement.appendChild(child);
                }
              } else {
                nodes.push(node);
                parentElement.appendChild(node);
              }
            }
          }

          // Restore previous global values
          g.$slots = prevSlots;
          g.$fw = prevFw;

          return { nodes, ctx: context };
        } catch (err) {
          // Restore globals even on error
          g.$slots = prevSlots;
          g.$fw = prevFw;

          // Rethrow assertion errors so they propagate to test harnesses
          if (err && (err.message?.includes('Assertion Failed') || err.message?.includes('Could not find'))) {
            throw err;
          }
          // Swallow other render errors gracefully
          console.error('Render error:', err);
        }
      },
    };

    return template;
  };

  // Add properties to the factory function itself for compatibility
  (templateFactory as any).__gxtCompiled = true;
  (templateFactory as any).__gxtRuntimeCompiled = true;
  (templateFactory as any).moduleName = options?.moduleName || 'gxt-runtime-template';
  (templateFactory as any).id = `gxt-factory-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Cache the result
  templateCache.set(cacheKey, templateFactory);

  return templateFactory;
}

/**
 * Compile a template string at runtime using GXT
 */
export function compileTemplate(templateString: string, options?: any) {
  return precompileTemplate(templateString, options);
}

/**
 * Register the template compiler (for compatibility)
 */
export function __registerTemplateCompiler(compiler: any) {
  // Store reference for debugging
  (globalThis as any).__registeredTemplateCompiler = compiler;
}

/**
 * Ember template compiler interface
 */
export const __emberTemplateCompiler = {
  compile: compileTemplate,
  precompile(templateString: string, options?: any) {
    // For precompile, just return a JSON representation
    // The actual compilation happens at runtime
    return JSON.stringify({
      source: templateString,
      moduleName: options?.moduleName,
      isGxt: true,
    });
  },
};

export default function templateCompilation() {
  return {
    precompileTemplate,
    compileTemplate,
    __registerTemplateCompiler,
    __emberTemplateCompiler,
  };
}

// Register the GXT compiler globally for @ember/template-compiler to use
(globalThis as any).__gxtCompileTemplate = compileTemplate;
