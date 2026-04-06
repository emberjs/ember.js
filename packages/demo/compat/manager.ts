/**
 * GXT Component Manager for Ember.js Integration
 *
 * This module provides the bridge between GXT's rendering system and Ember's
 * component model. It handles:
 * - Classic curly component rendering with wrapper elements
 * - Component instance caching for stable identity across re-renders
 * - Lifecycle hooks (didInsertElement, didReceiveAttrs, etc.)
 * - Parent view stack management for childViews
 * - String-based component resolution from the Ember registry
 */

import { assert, getDebugFunction } from '@ember/debug';
// Import directly from utils to avoid pulling in the full @ember/-internals/views
// barrel export (which triggers circular dependency issues with CoreView/Mixin)
import { setViewElement, setElementView, getViewElement, getElementView, addChildView as _addChildView, getViewId } from '@ember/-internals/views/lib/system/utils';

// Helper to detect assertion-related throws that must escape catch blocks.
function _isAssertionLike(e: unknown): boolean {
  if (e instanceof Error) {
    return e.message?.includes('Assertion Failed') === true;
  }
  if (e !== null && e !== undefined && typeof e === 'object') return true;
  return false;
}

// Inline the style warning message to avoid potential import issues
function constructStyleDeprecationMessage(affectedStyle: string): string {
  return (
    'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
    'please ensure that values being bound are properly escaped. For more information, ' +
    'including how to disable this warning, see ' +
    'https://deprecations.emberjs.com/v1.x/#toc_binding-style-attributes. ' +
    'Style affected: "' +
    affectedStyle +
    '"'
  );
}
import { CustomHelperManager, FunctionHelperManager, FROM_CAPABILITIES } from './helper-manager';
import { runDestructors as _gxtRunDestructors, formula as _gxtFormula, effect as _gxtEffect } from '@lifeart/gxt';
import { destroy as _destroyDestroyable } from './destroyable';

// Expose destroy helpers so compile.ts can flush pending modifier destroys
// synchronously at the end of a sync cycle.
(globalThis as any).__gxtRunDestructorsFn = _gxtRunDestructors;
(globalThis as any).__gxtDestroyDestroyableFn = _destroyDestroyable;

// PROPERTY_DID_CHANGE symbol — imported lazily to avoid circular dependency
import { PROPERTY_DID_CHANGE } from '@ember/-internals/metal';
export { CustomHelperManager, FunctionHelperManager, FROM_CAPABILITIES } from './helper-manager';

const DEFAULT_HELPER_MANAGER = new CustomHelperManager(() => new FunctionHelperManager());

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ComponentFactory {
  create: (options: any) => any;
  class?: any;
}

interface PoolEntry {
  instance: any;
  claimed: boolean;
  updatedThisPass: boolean; // Track if we've already run update hooks this pass
}

// =============================================================================
// Symbols and Constants
// =============================================================================

const $PROPS_SYMBOL = Symbol.for('gxt-props');
const $SLOTS_SYMBOL = Symbol.for('gxt-slots');
// GXT uses the plain string 'args' as the key ($args = 'args' in shared.ts)
const $ARGS_KEY = 'args';

// GXT internal keys that should NOT appear in user-visible args/attrs objects.
// These are set by compile.ts / manager.ts on the args object for internal plumbing.
const GXT_INTERNAL_ARG_KEYS = new Set([
  '$slots', '$fw', '$_scope', '$_eval', '$_hasBlock', '$_hasBlockParams',
  '__thunkId', 'named', 'positional', 'hash',
]);

/** Returns true if `key` is a GXT internal arg key that should be hidden from user code. */
function _isGxtInternalArgKey(key: string): boolean {
  if (GXT_INTERNAL_ARG_KEYS.has(key)) return true;
  if (key.startsWith('$_')) return true;
  // Filter __xxx__ double-underscore internal keys EXCEPT __hasBlock__ and __hasBlockParams__
  // which are needed for component block detection.
  if (key.startsWith('__') && key !== '__hasBlock__' && key !== '__hasBlockParams__') return true;
  return false;
}

// Auto-incrementing ID for wrapper elements
let emberViewIdCounter = 0;

// =============================================================================
// CurriedComponent — represents a component + pre-bound (curried) arguments
// =============================================================================

/**
 * Create a curried component — a callable function that wraps a component
 * with pre-bound arguments. Curried components can be nested (re-curried)
 * and rendered in template positions.
 */
export function createCurriedComponent(
  nameOrComponent: string | Function | any,
  args: Record<string, any>,
  positionals: any[] = []
): any {
  let name: string | Function;
  let curriedArgs: Record<string, any>;
  let curriedPositionals: any[];

  if (nameOrComponent && nameOrComponent.__isCurriedComponent) {
    // Nested currying — merge args and positionals.
    name = nameOrComponent.__name;
    curriedArgs = { ...nameOrComponent.__curriedArgs, ...args };
    curriedPositionals = [...nameOrComponent.__curriedPositionals, ...positionals];
  } else {
    name = nameOrComponent;
    curriedArgs = { ...args };
    curriedPositionals = [...positionals];
  }

  // Create a callable function so GXT can invoke it like a component/helper.
  // When called by GXT (e.g., from let block resolution or {{object.comp args}}),
  // render the component. If called with an args object, merge it with curried args.
  const curried = function curriedComponentFn(...runtimeArgs: any[]) {
    const managers = (globalThis as any).$_MANAGERS;
    if (managers?.component?.canHandle?.(curried)) {
      // Check if runtime args include named args (from GXT calling curried({key: value}))
      let invocationArgs: any = {};
      if (runtimeArgs.length > 0 && runtimeArgs[0] && typeof runtimeArgs[0] === 'object' && !Array.isArray(runtimeArgs[0])) {
        invocationArgs = runtimeArgs[0];
      } else if (runtimeArgs.length > 0) {
        // Positional args (e.g., curried(1, 2, 3) from {{foo 1 2 3}})
        // Map them to __pos0__, __pos1__, etc. for the component manager
        for (let i = 0; i < runtimeArgs.length; i++) {
          const val = runtimeArgs[i];
          invocationArgs[`__pos${i}__`] = val;
        }
        invocationArgs.__posCount__ = runtimeArgs.length;
      }

      const handleResult = managers.component.handle(curried, invocationArgs, null, null);
      if (typeof handleResult === 'function') {
        return handleResult();
      }
      return handleResult;
    }
    return undefined;
  };

  // Mark as curried component
  curried.__isCurriedComponent = true;
  curried.__name = name;
  curried.__curriedArgs = curriedArgs;
  curried.__curriedPositionals = curriedPositionals;
  // Capture the current owner so it can be used as fallback during re-evaluation
  // when globalThis.owner may be null (e.g., dash-prefixed contextual components).
  curried.__owner = (nameOrComponent && nameOrComponent.__isCurriedComponent && nameOrComponent.__owner)
    || (globalThis as any).owner;

  return curried;
}

// Legacy class-based check — still support instanceof for existing code
export class CurriedComponent {
  // Marker class for instanceof checks
  static isCurriedComponent(value: any): boolean {
    return value && value.__isCurriedComponent === true;
  }
}

// Make the check function globally accessible
(globalThis as any).__EmberCurriedComponent = {
  // Use a duck-type check instead of instanceof
  __isCurriedComponentClass: true,
};
(globalThis as any).__isEmberCurriedComponent = function(value: any) {
  return value && value.__isCurriedComponent === true;
};
(globalThis as any).__createCurriedComponent = createCurriedComponent;
(globalThis as any).__captureRenderError = captureRenderError;

// =============================================================================
// Global Registries
// =============================================================================

globalThis.EmberFunctionalHelpers = globalThis.EmberFunctionalHelpers || new Set();
globalThis.COMPONENT_TEMPLATES = globalThis.COMPONENT_TEMPLATES || new WeakMap();
globalThis.COMPONENT_MANAGERS = globalThis.COMPONENT_MANAGERS || new WeakMap();
globalThis.INTERNAL_MANAGERS = globalThis.INTERNAL_MANAGERS || new WeakMap();
globalThis.INTERNAL_HELPER_MANAGERS = globalThis.INTERNAL_HELPER_MANAGERS || new WeakMap();
globalThis.INTERNAL_MODIFIER_MANAGERS = globalThis.INTERNAL_MODIFIER_MANAGERS || new WeakMap();
// Expose FROM_CAPABILITIES on globalThis so ember-gxt-wrappers.ts can validate capabilities
(globalThis as any).FROM_CAPABILITIES = FROM_CAPABILITIES;

// =============================================================================
// Custom Managed Component Instance Tracking (for destructor support)
// =============================================================================

interface CustomManagedEntry {
  node: Node;       // A DOM node belonging to the component (for disconnect detection)
  destroyFn: () => void;
  destroyed: boolean;
}

const _customManagedInstances: CustomManagedEntry[] = [];

/**
 * Destroy any custom-managed component instances whose DOM nodes are no longer connected.
 * Called during the destroy phase (e.g., after a conditional block removes content).
 */
(globalThis as any).__gxtDestroyCustomManagedInstances = function() {
  for (let i = _customManagedInstances.length - 1; i >= 0; i--) {
    const entry = _customManagedInstances[i]!;
    if (!entry.destroyed && !entry.node.isConnected) {
      entry.destroyed = true;
      try { entry.destroyFn(); } catch { /* ignore destroy errors */ }
      _customManagedInstances.splice(i, 1);
    }
  }
};

// =============================================================================
// Parent View Stack
// =============================================================================

/**
 * Stack to track parent views during rendering.
 * When a component renders, it pushes itself onto the stack so child
 * components can access their parentView via getCurrentParentView().
 */
const parentViewStack: any[] = [];

export function pushParentView(view: any): void {
  parentViewStack.push(view);
}

export function popParentView(): any {
  return parentViewStack.pop();
}

function getCurrentParentView(): any | null {
  return parentViewStack.length > 0 ? parentViewStack[parentViewStack.length - 1] : null;
}

/**
 * Add a child view to a parent's childViews array.
 * Mimics Ember's CoreView.addChildView behavior.
 */
function addChildView(parent: any, child: any): void {
  if (!parent || !child) return;

  // Use Ember's official addChildView which tracks via CHILD_VIEW_IDS WeakMap.
  // This ensures component.childViews getter returns the correct children.
  try {
    _addChildView(parent, child);
  } catch {
    // Fallback: if official addChildView fails, at least set parentView
  }

  child.parentView = parent;
}

// =============================================================================
// Instance Pool Caching
// =============================================================================

/**
 * Pool-based instance caching for component reuse across re-renders.
 *
 * Structure: parentView -> Map of componentClass -> Array of { instance, claimed }
 *
 * On each render cycle:
 * 1. Reset claimed flags for all instances
 * 2. When a component is needed, find an unclaimed instance from the pool
 * 3. Mark it as claimed and update its args
 * 4. If no unclaimed instance exists, create a new one and add to pool
 */
const instancePools = new WeakMap<any, Map<any, PoolEntry[]>>();
const parentRenderFrames = new WeakMap<any, Symbol>();

// Track all pool arrays for iteration in __gxtDestroyUnclaimedPoolEntries
const _allPoolArrays = new Set<PoolEntry[]>();
(globalThis as any).__gxtAllPoolArrays = _allPoolArrays;

// Sentinel object for root-level components (no parent view)
const ROOT_PARENT_SENTINEL = {};

// Expose a function to clear all instance pools between tests.
// This prevents stale component instances from leaking across tests.
(globalThis as any).__gxtClearInstancePools = function() {
  for (const pool of _allPoolArrays) {
    pool.length = 0;
  }
  _allPoolArrays.clear();
};

/**
 * Get or create a component instance from the pool.
 * Implements stable instance identity across re-renders.
 */
function getCachedOrCreateInstance(
  factory: ComponentFactory,
  args: any,
  componentClass: any,
  owner: any,
  explicitParentView?: any
): any {
  const cacheKey = componentClass || factory;
  const currentParentView = explicitParentView !== undefined ? explicitParentView : getCurrentParentView();
  const parentKey = currentParentView || ROOT_PARENT_SENTINEL;


  // Get or create pool for this parent
  let componentPools = instancePools.get(parentKey);
  if (!componentPools) {
    componentPools = new Map();
    instancePools.set(parentKey, componentPools);
  }

  let pool = componentPools.get(cacheKey);
  if (!pool) {
    pool = [];
    componentPools.set(cacheKey, pool);
    _allPoolArrays.add(pool);
  }

  // Track render pass ID - reset claimed flags when a new render pass starts
  const currentPassId = (globalThis as any).__emberRenderPassId || 0;
  if ((pool as any).__lastPassId !== currentPassId) {
    // New render pass - reset claimed and updatedThisPass flags
    (pool as any).__lastPassId = currentPassId;
    for (const entry of pool) {
      entry.claimed = false;
      entry.updatedThisPass = false;
    }
  }

  // Extract elementId from args if provided
  // Map 'id' arg to 'elementId' (Ember convention)
  let requestedElementId: string | undefined;
  if (args) {
    // Check for conflicting id and elementId
    const hasId = 'id' in args && args.id !== undefined;
    const hasElementId = 'elementId' in args && args.elementId !== undefined;
    assert(
      "You cannot invoke a component with both 'id' and 'elementId' at the same time.",
      !(hasId && hasElementId)
    );

    const idArg = args.id ?? args.elementId;
    requestedElementId = typeof idArg === 'function' ? idArg() : idArg;
  }

  let poolEntry: PoolEntry | undefined;

  if (requestedElementId) {
    // Explicit elementId provided - find instance with matching elementId
    // Convert to string for comparison since Ember may store elementId as string
    const reqIdStr = String(requestedElementId);
    poolEntry = pool.find((e) => !e.claimed && String(e.instance?.elementId) === reqIdStr);

    // If no exact match found, fall back to sequential ordering.
    // This handles the case where elementId arg changes but we should reuse the same instance
    // (elementId is frozen after first render, so the instance won't have the new requestedElementId)
    if (!poolEntry) {
      poolEntry = pool.find((e) => !e.claimed);
    }
  } else {
    // No explicit elementId - use sequential ordering
    // First unclaimed instance gets claimed
    poolEntry = pool.find((e) => !e.claimed);
  }

  if (poolEntry) {
    // Claim this instance and update with new args
    poolEntry.claimed = true;
    const hasChanges = updateInstanceWithNewArgs(poolEntry.instance, args);

    // Sync wrapper element attributes/classes when args change
    if (hasChanges) {
      const wrapper = getViewElement(poolEntry.instance) || poolEntry.instance._element;
      if (wrapper instanceof HTMLElement) {
        syncWrapperElement(poolEntry.instance, wrapper, componentClass, args);
      }
    }

    // Mark as reused so renderClassicComponent can skip lifecycle hooks
    // during force-rerender (innerHTML='' + rebuild)
    poolEntry.instance.__gxtReusedFromPool = true;
    poolEntry.instance.__gxtPoolHasArgChanges = hasChanges;

    return poolEntry.instance;
  }

  // Before creating a new instance, check if there's already an instance
  // for this template position (identified by __thunkId) in another pool.
  // This handles GXT re-evaluating formulas during the same render pass
  // with a different parentView context (e.g., after the parentView stack has been popped).
  const thunkId = args?.__thunkId;
  if (thunkId) {
    for (const poolArr of _allPoolArrays) {
      const existing = poolArr.find((e) => e.claimed && e.instance?.__gxtThunkId === thunkId);
      if (existing) {
        // Already created in this render pass — return the same instance
        return existing.instance;
      }
    }
  }

  // No matching instance - create a new one
  const instance = createComponentInstance(factory, args, currentParentView, owner);

  // Store thunkId on instance for dedup during re-evaluations
  if (thunkId) {
    instance.__gxtThunkId = thunkId;
  }

  // During force-rerender, mark all unclaimed entries in ALL pools for this
  // parent. When the component name changes (e.g., {{component this.name}}),
  // the new instance goes into a different pool (keyed by factory). The old
  // instance in the previous pool is unclaimed and should be destroyed.
  if ((globalThis as any).__gxtIsForceRerender) {
    const parentPools = instancePools.get(parentKey);
    if (parentPools) {
      for (const [, poolArr] of parentPools) {
        for (const entry of poolArr) {
          if (!entry.claimed && entry.instance && !entry.instance.isDestroyed && !entry.instance.isDestroying) {
            let markedSet = (globalThis as any).__gxtInstancesMarkedForDestruction;
            if (!markedSet) {
              markedSet = new Set();
              (globalThis as any).__gxtInstancesMarkedForDestruction = markedSet;
            }
            markedSet.add(entry.instance);
          }
        }
      }
    }
  }

  // Add to pool and mark as claimed
  // updatedThisPass is false since this is initial creation, not an update
  pool.push({ instance, claimed: true, updatedThisPass: false });

  return instance;
}

/**
 * Create a new component instance with processed args.
 */
function createComponentInstance(
  factory: ComponentFactory,
  args: any,
  parentView: any,
  owner: any
): any {
  const props: Record<string, any> = {};
  const attrs: Record<string, any> = {};
  const argGetters: Record<string, Function> = {};
  const lastArgValues: Record<string, any> = {};
  const readonlyKeys = new Set<string>();
  const mutCellKeys = new Set<string>();
  const rawArgGetters: Record<string, Function> = {}; // unprocessed getters for mut cell lookup

  // Process args into Ember's expected format
  const keys = extractArgKeys(args);

  for (const key of keys) {
    const { raw, resolved, getter, isMutCell, isReadonly, mutCell } = getArgValue(args, key);

    // Skip classNames - handled separately in wrapper building
    if (key === 'classNames') {
      if (getter) {
        argGetters[key] = getter;
      }
      lastArgValues[key] = resolved;
      continue;
    }

    // Track readonly and mut cell keys
    if (isReadonly) {
      readonlyKeys.add(key);
    }
    if (isMutCell) {
      mutCellKeys.add(key);
    }

    // Store the raw (unprocessed) arg getter for mut cell detection later
    const descriptor = Object.getOwnPropertyDescriptor(args, key);
    if (descriptor?.get) {
      rawArgGetters[key] = descriptor.get;
    } else if (typeof raw === 'function') {
      rawArgGetters[key] = raw;
    }

    props[key] = resolved;
    lastArgValues[key] = resolved;

    if (getter) {
      argGetters[key] = getter;
    }

    // Build attrs based on the type of binding:
    if (isMutCell && mutCell) {
      // For mut cells: attrs[key] IS the mutCell directly (has .value and .update())
      attrs[key] = mutCell;
    } else if (isReadonly) {
      // For readonly: attrs[key] IS the plain value (no .update())
      attrs[key] = resolved;
    } else {
      // For regular args: automatic mutable binding with .value and .update()
      attrs[key] = {
        get value() {
          return getter ? getter() : resolved;
        },
        update(newValue: any) {
          // This will be replaced with a proper updater in createRenderContext
        }
      };
    }
  }

  // Capture 'class' getter separately — it was excluded from extractArgKeys
  // to avoid overwriting the instance's 'class' property, but we need the getter
  // for reactive wrapper class updates (syncWrapperElement).
  if (args && 'class' in args) {
    const { getter } = getArgValue(args, 'class');
    if (getter) {
      argGetters['class'] = getter;
    }
  }

  // Capture '__htmlId' getter for reactive HTML id binding.
  // This is set when id=... (HTML prop) is used, distinct from @id (named arg).
  if (args && '__htmlId' in args) {
    const { getter } = getArgValue(args, '__htmlId');
    if (getter) {
      argGetters['__htmlId'] = getter;
    }
  }

  props.attrs = attrs;
  props.parentView = parentView;
  props.__argGetters = argGetters;
  props.__lastArgValues = lastArgValues;

  // Map 'id' arg to 'elementId' for Ember component initialization
  if ('id' in props && props.id !== undefined) {
    props.elementId = props.id;
    props.__elementIdFromId = true; // Flag: elementId was mapped from id, not explicit
  }
  // Also handle direct elementId arg
  if ('elementId' in props && props.elementId !== undefined && !('id' in props)) {
    // elementId is already set, just ensure it's preserved
  }

  // Create the instance — let init errors propagate naturally so they
  // reach assert.throws in tests (GXT dist has no try-catch wrapper).
  const instance = factory.create(props);

  // Validate tagless component constraints early (before view registry registration)
  // so that the expected assert fires before any other errors.
  const instanceTagName = instance?.tagName;
  if (instanceTagName === '') {
    const cnBindings = instance?.classNameBindings || factory?.class?.prototype?.classNameBindings;
    assert(
      'You cannot use `classNameBindings` on a tag-less component',
      !cnBindings || !Array.isArray(cnBindings) || cnBindings.length === 0
    );
    const atBindings = instance?.attributeBindings || factory?.class?.prototype?.attributeBindings;
    assert(
      'You cannot use `attributeBindings` on a tag-less component',
      !atBindings || !Array.isArray(atBindings) || atBindings.length === 0
    );
    const argElementId = args && 'elementId' in args && args.elementId !== undefined;
    const instanceElementId = instance?.elementId && !instance.__elementIdFromId;
    assert(
      'You cannot use `elementId` on a tag-less component',
      !argElementId && !instanceElementId
    );
  }

  // Ensure arg tracking is on the instance
  if (!instance.__argGetters) instance.__argGetters = argGetters;
  if (!instance.__lastArgValues) instance.__lastArgValues = lastArgValues;
  // Store mut/readonly tracking for two-way binding and attrs
  instance.__gxtReadonlyKeys = readonlyKeys;
  instance.__gxtMutCellKeys = mutCellKeys;
  instance.__gxtRawArgGetters = rawArgGetters;
  // Store mut arg sources for two-way binding via (mut this.prop) support
  if (args?.__mutArgSources) {
    instance.__mutArgSources = args.__mutArgSources;
  }

  // Install reactive getters for args that have closures.
  // This ensures instance.foo always returns the current arg value,
  // even when GXT doesn't re-invoke the component function on re-render.
  for (const key of Object.keys(argGetters)) {
    if (key === 'id' || key === 'elementId') continue;
    const getter = argGetters[key]!;
    try {
      let localValue = instance[key]; // current value (from factory.create or init)
      const argValue = getter();
      // If instance value differs from arg value, the component overrode it in init()
      let useLocal = localValue !== argValue;
      Object.defineProperty(instance, key, {
        get() {
          if (useLocal) return localValue;
          try { return getter(); } catch { return localValue; }
        },
        set(v: any) {
          // When __gxtDispatchingArgs is set, this is an arg update from parent.
          // Switch to arg-driven mode so the getter returns the arg value.
          if ((instance as any).__gxtDispatchingArgs) {
            localValue = v;
            useLocal = false;
            // Clear local override when arg update comes from parent
            if (instance.__gxtLocalOverrides) instance.__gxtLocalOverrides.delete(key);
          } else {
            localValue = v;
            useLocal = true;
            // Track local override so __gxtSyncAllWrappers skips this key
            if (!instance.__gxtLocalOverrides) instance.__gxtLocalOverrides = new Set();
            instance.__gxtLocalOverrides.add(key);
          }
        },
        configurable: true,
        enumerable: true,
      });
    } catch { /* some properties may not be configurable */ }
  }

  // Install two-way binding via PROPERTY_DID_CHANGE override.
  // In classic Ember, when component.set(key, value) is called for an arg
  // that was passed from the parent (e.g., {{foo-bar bar=this.localBar}}),
  // the change should propagate upstream to the parent.
  //
  // Strategy: For any key that has an argGetter (i.e., was passed as an arg),
  // when set() is called, find the parent and set the same property there.
  // The argGetter itself captures the parent scope, so we can detect the parent
  // by tracking which object the getter reads from.
  const argKeySet = new Set(Object.keys(argGetters));
  if (argKeySet.size > 0 && instance) {
    // Detect two-way binding sources by calling each arg getter with tracking enabled
    const twoWayBindings: Record<string, { sourceCtx: any; sourceKey: string }> = {};
    for (const key of argKeySet) {
      if (key === 'id' || key === 'elementId') continue;
      const argGetter = argGetters[key]!;
      // Try proxy-based tracking first (works when parent has a proxy render context)
      try {
        (globalThis as any).__gxtTrackArgSource = true;
        (globalThis as any).__gxtLastArgSourceKey = null;
        (globalThis as any).__gxtLastArgSourceCtx = null;
        argGetter();
        const detectedKey = (globalThis as any).__gxtLastArgSourceKey;
        const detectedCtx = (globalThis as any).__gxtLastArgSourceCtx;
        (globalThis as any).__gxtTrackArgSource = false;
        if (detectedKey && detectedCtx) {
          twoWayBindings[key] = { sourceCtx: detectedCtx, sourceKey: detectedKey };
        }
      } catch {
        (globalThis as any).__gxtTrackArgSource = false;
      }
      // If proxy-based tracking didn't find a source, try cell-interception.
      // The arg getter reads from the parent's cell-backed property. We temporarily
      // wrap the parent's getters to detect which property is accessed.
      if (!twoWayBindings[key] && parentView) {
        try {
          const descriptors: Record<string, { obj: any; desc: PropertyDescriptor }> = {};
          let detectedProp: string | null = null;
          // Install temporary traps on parent's getter properties
          let obj = parentView;
          for (let depth = 0; depth < 3 && obj && obj !== Object.prototype; depth++) {
            for (const propName of Object.getOwnPropertyNames(obj)) {
              if (propName.startsWith('_') || propName.startsWith('$') || propName === 'constructor') continue;
              const desc = Object.getOwnPropertyDescriptor(obj, propName);
              if (desc?.get && desc.configurable) {
                descriptors[propName] = { obj, desc };
                const origGet = desc.get;
                Object.defineProperty(obj, propName, {
                  get() { detectedProp = propName; return origGet.call(this); },
                  set: desc.set,
                  configurable: true,
                  enumerable: desc.enumerable,
                });
              }
            }
            obj = Object.getPrototypeOf(obj);
          }
          // Call the arg getter - it should trigger one of our traps
          try { argGetter(); } catch { /* ignore */ }
          // Restore original descriptors
          for (const [propName, { obj: origObj, desc }] of Object.entries(descriptors)) {
            try { Object.defineProperty(origObj, propName, desc); } catch { /* ignore */ }
          }
          if (detectedProp) {
            twoWayBindings[key] = { sourceCtx: parentView, sourceKey: detectedProp };
          }
        } catch { /* ignore detection failure */ }
      }
    }
    instance.__gxtTwoWayBindings = twoWayBindings;

    // Override PROPERTY_DID_CHANGE on the instance.
    const triggerReRender = (globalThis as any).__gxtTriggerReRender;
    const origPDC = instance[PROPERTY_DID_CHANGE]?.bind(instance);
    instance[PROPERTY_DID_CHANGE] = function(key: string, value?: unknown) {
      // Skip if instance is destroyed or destroying (prevents "set on destroyed object")
      if (instance.isDestroyed || instance.isDestroying) return;
      // Skip propagation during attrs dispatch (prevents infinite loops)
      if ((instance as any).__gxtDispatchingArgs) return;

      // Skip two-way propagation for readonly keys (readonly prevents upstream mutation)
      if (readonlyKeys.has(key)) {
        if (origPDC) try { origPDC(key, value); } catch { /* ignore */ }
        return;
      }

      // Only propagate binding logic for keys that were passed as args
      if (!argKeySet.has(key)) {
        if (origPDC) try { origPDC(key, value); } catch { /* ignore */ }
        return;
      }

      const resolvedValue = arguments.length >= 2 ? value : instance[key];

      // Check if the raw arg getter returns a mut cell — use .update() for direct propagation
      const rawGetter = rawArgGetters[key];
      if (rawGetter) {
        try {
          const rawVal = rawGetter();
          if (rawVal && rawVal.__isMutCell) {
            rawVal.update(resolvedValue);
            if (triggerReRender && instance.parentView) {
              triggerReRender(instance.parentView, key);
            }
            return;
          }
        } catch { /* ignore */ }
      }

      // Try detected binding first
      const binding = twoWayBindings[key];
      if (binding) {
        const { sourceCtx, sourceKey } = binding;
        if (sourceCtx && sourceKey) {
          // Use set() if available to trigger PROPERTY_DID_CHANGE chain on the source
          const sourceInstance = sourceCtx.__gxtRawTarget || sourceCtx;
          if (typeof sourceInstance.set === 'function') {
            sourceInstance.set(sourceKey, resolvedValue);
          } else {
            sourceCtx[sourceKey] = resolvedValue;
          }
          if (triggerReRender) triggerReRender(sourceInstance, sourceKey);
          return;
        }
      }

      // Fallback: propagate to parentView if it exists and has the same property
      const pv = instance.parentView;
      if (pv && key in pv) {
        try {
          if (typeof pv.set === 'function') {
            pv.set(key, resolvedValue);
          } else {
            pv[key] = resolvedValue;
            if (triggerReRender) triggerReRender(pv, key);
          }
        } catch { /* ignore */ }
      }
    };
  }

  // Register with parent's childViews
  if (parentView) {
    addChildView(parentView, instance);
  }

  // Register in the view registry so collectChildViews() can find this component.
  // This is normally done by the renderer's register() method.
  // Only do this in interactive mode (non-interactive mode expects no registered views).
  if (isInteractiveModeChecked()) {
    try {
      const gOwner = (globalThis as any).owner;
      if (gOwner) {
        const viewRegistry = gOwner.lookup?.('-view-registry:main');
        if (viewRegistry) {
          const viewId = getViewId(instance);
          if (viewId && !viewRegistry[viewId]) {
            viewRegistry[viewId] = instance;
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Trigger initial didReceiveAttrs
  triggerLifecycleHook(instance, 'didReceiveAttrs');

  return instance;
}

/**
 * Update a cached instance when arg values have changed.
 */
// Track which instances have already had update hooks fired this render pass
// to prevent double-firing from both updateInstanceWithNewArgs and __gxtSyncAllWrappers
let _updateHookPassId = 0;
const _instanceUpdatePassMap = new WeakMap<any, number>();

function markInstanceUpdated(instance: any): void {
  _instanceUpdatePassMap.set(instance, _updateHookPassId);
}

function wasInstanceUpdatedThisPass(instance: any): boolean {
  return _instanceUpdatePassMap.get(instance) === _updateHookPassId;
}

// Increment the pass ID at the start of each render cycle
(globalThis as any).__gxtNewRenderPass = function() {
  _updateHookPassId++;
};

function updateInstanceWithNewArgs(instance: any, args: any): boolean {
  if (!instance || !args) return false;

  const argGetters = instance.__argGetters;
  const lastArgValues = instance.__lastArgValues;

  if (!argGetters || !lastArgValues) return false;

  // First pass: detect if there are any changes
  let hasChanges = false;
  const newKeys = extractArgKeys(args);
  const newKeySet = new Set(newKeys);

  for (const key of newKeys) {
    const { resolved: newValue } = getArgValue(args, key);
    const oldValue = lastArgValues[key];

    if (newValue !== oldValue) {
      hasChanges = true;
      break; // Only need to know if there's at least one change
    }
  }

  // Also check for removed args: if a previously-present arg is no longer provided,
  // we need to reset it to undefined. This prevents stale values from leaking when
  // instances are reused from the pool for invocations with different arg sets.
  if (!hasChanges) {
    for (const key of Object.keys(lastArgValues)) {
      if (key === 'elementId' || key === 'id') continue;
      if (!newKeySet.has(key) && lastArgValues[key] !== undefined) {
        hasChanges = true;
        break;
      }
    }
  }

  if (hasChanges) {
    // Second pass: apply the changes (set properties first, then fire hooks)
    for (const key of newKeys) {
      const { resolved: newValue } = getArgValue(args, key);
      const oldValue = lastArgValues[key];

      if (newValue !== oldValue) {
        // Update the instance property (but not elementId - it's frozen)
        if (key !== 'elementId') {
          // Set dispatching flag so setters know this is an arg update from parent
          try {
            instance.__gxtDispatchingArgs = true;
            instance[key] = newValue;
          } finally {
            instance.__gxtDispatchingArgs = false;
          }
        }
        lastArgValues[key] = newValue;
      }
    }

    // Reset args that are no longer provided
    for (const key of Object.keys(lastArgValues)) {
      if (key === 'elementId' || key === 'id') continue;
      if (!newKeySet.has(key) && lastArgValues[key] !== undefined) {
        try {
          instance.__gxtDispatchingArgs = true;
          instance[key] = undefined;
        } finally {
          instance.__gxtDispatchingArgs = false;
        }
        // If the property has a cell-backed getter from createRenderContext,
        // the setter may have set _useLocal=false but the getter still calls
        // the old arg getter (which returns the stale value). Install a new
        // property descriptor that returns undefined, overwriting the stale
        // cell-backed getter.
        if (instance[key] !== undefined) {
          try {
            Object.defineProperty(instance, key, {
              value: undefined,
              writable: true,
              enumerable: true,
              configurable: true,
            });
          } catch { /* non-configurable */ }
        }
        // Also remove from argGetters to prevent createRenderContext from
        // re-installing a getter that reads from the old args object.
        if (instance.__argGetters && key in instance.__argGetters) {
          delete instance.__argGetters[key];
        }
        lastArgValues[key] = undefined;
      }
    }

    // Hook order matches Ember's curly component manager:
    // didUpdateAttrs, didReceiveAttrs (always), then willUpdate, willRender (interactive only)
    // Only fire once per render pass to prevent double-firing when the same instance
    // is visited multiple times (e.g., parent visited once per child invocation)
    // Skip during force-rerender (innerHTML='' + rebuild): the element is not in
    // the DOM at this point, so hooks that check this.element would fail.
    // __gxtSyncAllWrappers will fire the correct hooks after DOM is rebuilt.
    if (!wasInstanceUpdatedThisPass(instance) && !(globalThis as any).__gxtIsForceRerender) {
      triggerLifecycleHook(instance, 'didUpdateAttrs');
      triggerLifecycleHook(instance, 'didReceiveAttrs');
      // Mark this instance as having had update hooks fired this pass
      markInstanceUpdated(instance);
    }
  }

  return hasChanges;
}

// =============================================================================
// Arg Processing Utilities
// =============================================================================

/**
 * Extract keys from args object, excluding internal symbols.
 */
function extractArgKeys(args: any): string[] {
  if (!args || typeof args !== 'object') return [];

  return Object.keys(args).filter(key =>
    !_isGxtInternalArgKey(key) &&
    key !== 'class' &&
    key !== 'classNames' &&  // Don't overwrite component's classNames property
    !key.startsWith('Symbol')
  );
}

/**
 * Get both raw and resolved value for an arg.
 */
function getArgValue(args: any, key: string): { raw: any; resolved: any; getter?: () => any; isMutCell?: boolean; isReadonly?: boolean; mutCell?: any } {
  // Check if the arg is defined as a getter (GXT compiles args as getters)
  const descriptor = Object.getOwnPropertyDescriptor(args, key);
  if (descriptor?.get) {
    // Arg is a getter - capture the getter function for reactive updates
    let resolved = descriptor.get();
    // Detect mut cell: the getter returns a mutCell function
    if (resolved && resolved.__isMutCell) {
      const mutCell = resolved;
      // Build an unwrapping getter that returns the plain value (not the mutCell)
      const mutUnwrapGetter = () => {
        const v = descriptor.get!();
        if (v && v.__isMutCell) return v.value;
        return v;
      };
      return { raw: descriptor.get, resolved: mutCell.value, getter: mutUnwrapGetter, isMutCell: true, mutCell };
    }
    // Detect readonly cell: the getter returns { __isReadonly, __readonlyValue }
    if (resolved && resolved.__isReadonly) {
      const readonlyVal = resolved.__readonlyValue;
      // Build a getter that unwraps readonly each time for reactivity
      const readonlyGetter = () => {
        const v = descriptor.get!();
        if (v && v.__isReadonly) return v.__readonlyValue;
        return typeof v === 'function' ? v() : v;
      };
      return { raw: descriptor.get, resolved: readonlyVal, getter: readonlyGetter, isReadonly: true };
    }
    return { raw: descriptor.get, resolved, getter: descriptor.get };
  }
  const raw = args[key];
  // Don't unwrap CurriedComponent functions — they should be stored as-is
  if (raw && raw.__isCurriedComponent) {
    return { raw, resolved: raw };
  }
  // Don't unwrap fn helper results — they are callable functions, not GXT getters
  if (raw && raw.__isFnHelper) {
    return { raw, resolved: raw };
  }
  let resolved = typeof raw === 'function' ? raw() : raw;
  // Detect mut cell from non-getter args
  if (resolved && resolved.__isMutCell) {
    const mutCell = resolved;
    const mutUnwrapGetter = typeof raw === 'function' ? () => {
      const v = raw();
      if (v && v.__isMutCell) return v.value;
      return v;
    } : undefined;
    return { raw, resolved: mutCell.value, getter: mutUnwrapGetter, isMutCell: true, mutCell };
  }
  // Detect readonly cell from non-getter args
  if (resolved && resolved.__isReadonly) {
    const readonlyVal = resolved.__readonlyValue;
    const readonlyGetter = typeof raw === 'function' ? () => {
      const v = raw();
      if (v && v.__isReadonly) return v.__readonlyValue;
      return typeof v === 'function' ? v() : v;
    } : undefined;
    return { raw, resolved: readonlyVal, getter: readonlyGetter, isReadonly: true };
  }
  return { raw, resolved, getter: typeof raw === 'function' ? raw : undefined };
}

// =============================================================================
// Lifecycle Hooks
// =============================================================================

/**
 * Trigger a lifecycle hook on a component instance.
 *
 * Ember's component manager only calls trigger() which fires the event.
 * The Component class has methods like didReceiveAttrs() that are meant
 * to be overridden by subclasses. When trigger() is called, registered
 * listeners fire, but the method itself needs to be called separately.
 *
 * We use trigger() which follows Ember's pattern - the methods are called
 * via event listeners set up by Ember's component infrastructure.
 */
// Set of lifecycle hooks that should ONLY fire in interactive mode.
// In non-interactive (SSR) mode, these are suppressed per Ember's curly component manager.
// =============================================================================
// After-Insert Hook Queue
// =============================================================================
// In GXT, component wrappers are created inside renderClassicComponent and
// returned to GXT which then appends them to the parent.  This means the
// element is NOT in the live DOM when renderClassicComponent finishes.
// didInsertElement / didRender (and the inDOM transition) must therefore be
// deferred until the outermost render has completed and GXT has inserted
// everything into the document.
//
// We collect callbacks in _afterInsertQueue during rendering and expose
// flushAfterInsertQueue() so the renderer (ClassicRootState.render) can
// drain the queue after template.render() has returned.
// The queue is ordered children-first (natural call-stack order) which
// matches Ember's expected bottom-up firing of these hooks.
const _afterInsertQueue: Array<() => void> = [];

/**
 * Queue of errors captured during rendering that should be re-thrown
 * after the render completes. This allows GXT's error-swallowing
 * component() wrapper to not lose user-thrown errors from init(),
 * didInsertElement(), destroy(), etc.
 */
const _renderErrors: Error[] = [];

/**
 * Backtracking re-render detection.
 * Tracks instances whose templates have been rendered in the current render pass.
 * If set() is called on a rendered instance during the same pass, it's a
 * "backtracking" modification that Ember's Glimmer VM would assert against.
 */
const _templateRenderedInstances = new Set<any>();
let _isInRenderPass = false;

export function markTemplateRendered(instance: any): void {
  if (instance) {
    _templateRenderedInstances.add(instance);
  }
}

export function beginRenderPass(): void {
  _isInRenderPass = true;
  _templateRenderedInstances.clear();
}

export function endRenderPass(): void {
  _isInRenderPass = false;
  _templateRenderedInstances.clear();
}

/**
 * Check if setting a property on an instance constitutes backtracking.
 * Called from Ember's set() during rendering to detect modifications
 * to already-rendered component state.
 */
(globalThis as any).__gxtCheckBacktracking = function(targetObj: any, key: string): void {
  if (!_isInRenderPass) return;
  if (!_templateRenderedInstances.has(targetObj)) return;
  // This instance's template was already rendered in this pass.
  // Setting a property on it is backtracking.
  const objName = targetObj?.toString?.() || '<unknown>';
  assert(
    `You modified "${key}" on "${objName}" after it was rendered. This was unreliable in Ember and is no longer allowed. [GXT] Backtracking re-render detected.`,
    false
  );
};

export function captureRenderError(err: unknown): void {
  if (err instanceof Error) {
    _renderErrors.push(err);
  } else {
    _renderErrors.push(new Error(String(err)));
  }
  // Track error count so the renderer can distinguish render-phase errors
  // (init failures) from lifecycle-phase errors (didInsertElement failures).
  (globalThis as any).__gxtRenderErrorCount = _renderErrors.length;
}

/**
 * Flush any render errors captured during the render cycle.
 * Throws the first one (so assert.throws in tests can catch it).
 */
export function flushRenderErrors(): void {
  (globalThis as any).__gxtRenderErrorCount = 0;
  if (_renderErrors.length > 0) {
    const err = _renderErrors.shift()!;
    _renderErrors.length = 0;
    throw err;
  }
}

/**
 * Flush all queued didInsertElement / didRender callbacks.
 * Called from the renderer after the GXT template.render() call has
 * synchronously appended all DOM into the live document.
 */
export function flushAfterInsertQueue(): void {
  while (_afterInsertQueue.length > 0) {
    const cb = _afterInsertQueue.shift()!;
    try { cb(); } catch (e) {
      // Capture lifecycle errors so they propagate to assert.throws
      captureRenderError(e);
    }
  }
}

const INTERACTIVE_ONLY_HOOKS = new Set([
  'willRender',
  'willInsertElement',
  'didInsertElement',
  'didRender',
  'willUpdate',
  'didUpdate',
  'willDestroyElement',
  'willClearRender',
  'didDestroyElement',
]);

/**
 * Check whether we are in interactive mode.
 * Reads the `-environment:main` boot option from the owner.
 * Result is cached after the first lookup.
 */
let _isInteractiveCached: boolean | undefined;
function isInteractiveMode(): boolean {
  if (_isInteractiveCached !== undefined) return _isInteractiveCached;
  try {
    const owner = (globalThis as any).owner;
    if (owner) {
      const env = owner.lookup?.('-environment:main');
      if (env && typeof env.isInteractive === 'boolean') {
        _isInteractiveCached = env.isInteractive;
        return _isInteractiveCached;
      }
    }
  } catch { /* ignore */ }
  // Default to true (interactive) if we can't determine
  return true;
}

// Reset the cache when the owner changes (e.g. between tests).
// The global owner is reassigned per-test, so we reset at each lookup if the owner changed.
let _lastOwnerForInteractive: any = undefined;
function isInteractiveModeChecked(): boolean {
  const owner = (globalThis as any).owner;
  if (owner !== _lastOwnerForInteractive) {
    _lastOwnerForInteractive = owner;
    _isInteractiveCached = undefined;
  }
  return isInteractiveMode();
}

function triggerLifecycleHook(instance: any, hookName: string): void {
  if (!instance) return;

  // In non-interactive mode, suppress interactive-only hooks
  if (INTERACTIVE_ONLY_HOOKS.has(hookName) && !isInteractiveModeChecked()) {
    return;
  }

  try {
    // Use Ember's event trigger - this is the canonical way to invoke
    // lifecycle hooks in Ember components
    if (typeof instance.trigger === 'function') {
      instance.trigger(hookName);
    }
  } catch (e) {
    // Only capture assertion/render errors — other lifecycle errors are swallowed
    if (e instanceof Error && (e.message?.includes('Assertion Failed') || e.message?.includes('Error in'))) {
      captureRenderError(e);
    }
  }
}

// =============================================================================
// Wrapper Element Building
// =============================================================================

/**
 * Parse an attribute binding string: 'propName:attrName' or just 'propName'.
 * Handles namespaced attributes like 'xlinkHref:xlink:href'.
 */
function parseAttributeBinding(binding: string): { propName: string; attrName: string } {
  const idx = binding.indexOf(':');
  if (idx === -1) return { propName: binding, attrName: binding };
  return { propName: binding.slice(0, idx), attrName: binding.slice(idx + 1) };
}

/**
 * Dasherize a camelCase string: 'fooBar' -> 'foo-bar', 'isEnabled' -> 'is-enabled'
 */
function dasherize(str: string): string {
  return str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Resolve a value from an instance by a potentially nested path like 'foo.bar.baz'.
 */
function getNestedValue(instance: any, path: string): any {
  const parts = path.split('.');
  let current = instance;
  let inAttrs = false;
  for (let i = 0; i < parts.length; i++) {
    if (current == null) return undefined;
    const part = parts[i]!;
    if (part === 'attrs') {
      inAttrs = true;
      // For attrs.X paths, prefer reading from __argGetters which provides
      // fresh reactive values from the parent context, instead of going
      // through MutableCells which may be stale after model replacement.
      const argGetters = instance?.__argGetters;
      const firstArgKey = parts[i + 1];
      if (argGetters && firstArgKey && argGetters[firstArgKey]) {
        let argValue = argGetters[firstArgKey]();
        // If there are more segments after attrs.X (e.g., attrs.batman.robin),
        // traverse the remaining path on the resolved arg value
        for (let j = i + 2; j < parts.length; j++) {
          if (argValue == null) return undefined;
          argValue = argValue[parts[j]!];
        }
        return argValue;
      }
      current = current[part];
      continue;
    }
    current = current[part];
    // attrs.X returns a MutableCell with .value — unwrap it
    if (inAttrs && current != null && typeof current === 'object' && 'value' in current) {
      current = current.value;
      inAttrs = false;
    }
  }
  return current;
}

/**
 * Resolve a single classNameBinding string to a class name (or null).
 *
 * Supported formats:
 *   ':static-class'            → always 'static-class'
 *   'prop'                     → truthy string value, or dasherize(prop) for true, or null
 *   'prop:trueClass'           → trueClass when truthy, else null
 *   'prop:trueClass:falseClass'→ trueClass when truthy, else falseClass
 *   'prop::falseClass'         → null when truthy, else falseClass
 */
function resolveClassNameBinding(instance: any, binding: string): string | null {
  // Static class: ':static-class'
  if (binding.startsWith(':')) {
    return binding.slice(1);
  }

  const parts = binding.split(':');
  const propPath = parts[0]!;
  const trueClass = parts.length > 1 ? parts[1] : undefined;
  const falseClass = parts.length > 2 ? parts[2] : undefined;

  const value = getNestedValue(instance, propPath);

  if (trueClass !== undefined) {
    // 'prop:trueClass' or 'prop:trueClass:falseClass' or 'prop::falseClass'
    if (value) {
      return trueClass || null; // trueClass could be empty string for 'prop::falseClass'
    } else {
      return falseClass || null;
    }
  }

  // Simple 'prop' binding
  if (value === true) {
    // For nested paths like 'nested.fooBarBaz', dasherize only the last segment
    const lastSegment = propPath.includes('.') ? propPath.split('.').pop()! : propPath;
    return dasherize(lastSegment);
  }
  if (value && typeof value === 'string') {
    return value;
  }
  return null;
}

/**
 * Sync wrapper element attributes and classes after property changes.
 * Called when a pooled instance is reused and args have changed.
 */
function syncWrapperElement(instance: any, wrapper: HTMLElement, componentDef: any, args: any): void {
  if (!wrapper || !(wrapper instanceof HTMLElement)) return;

  // --- Rebuild class list ---
  const classList: string[] = [];

  // Classes from invocation args (try arg getters first, then args object)
  const argGetters = instance?.__argGetters;
  let argsClass = argGetters?.class ? argGetters.class() : (typeof args?.class === 'function' ? args.class() : args?.class);
  let argsClassNames = argGetters?.classNames ? argGetters.classNames() : (typeof args?.classNames === 'function' ? args.classNames() : args?.classNames);

  if (argsClass && typeof argsClass === 'string') {
    classList.push(...argsClass.split(/\s+/).filter(Boolean));
  }
  if (argsClassNames && typeof argsClassNames === 'string') {
    classList.push(...argsClassNames.split(/\s+/).filter(Boolean));
  }

  // Static classNames from component definition
  const protoClassNames = componentDef?.prototype?.classNames;
  if (protoClassNames && Array.isArray(protoClassNames) && protoClassNames.length > 0) {
    classList.push(...protoClassNames);
  } else if (instance?.classNames && Array.isArray(instance.classNames)) {
    classList.push(...instance.classNames);
  }

  // Dynamic classNameBindings
  const classNameBindings = instance?.classNameBindings || componentDef?.prototype?.classNameBindings;
  if (classNameBindings && Array.isArray(classNameBindings)) {
    for (const binding of classNameBindings) {
      const className = resolveClassNameBinding(instance, binding);
      if (className) classList.push(className);
    }
  }

  classList.push('ember-view');
  wrapper.className = classList.join(' ');

  // --- Sync id from HTML id prop (not @id named arg) ---
  // When 'id' is passed as an HTML prop (e.g., <FooBar id={{this.customId}} />),
  // the wrapper element's id should track the prop value.
  // @id maps to elementId which is frozen after first render - that's NOT synced here.
  const htmlIdGetter = instance?.__argGetters?.__htmlId;
  if (htmlIdGetter) {
    const newId = htmlIdGetter();
    if (newId !== undefined && newId !== null) {
      wrapper.id = String(newId);
    }
  }

  // --- Sync attributeBindings ---
  const attributeBindings = instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
  if (attributeBindings && Array.isArray(attributeBindings)) {
    for (const binding of attributeBindings) {
      const { propName, attrName } = parseAttributeBinding(binding);

      // Never update id — it's frozen after first render
      if (attrName === 'id') continue;

      const value = propName.includes('.') ? getNestedValue(instance, propName) : instance?.[propName];
      // Warn for style attribute bindings with non-safe strings (once per render pass per value)
      if (attrName === 'style' && value !== null && value !== undefined && value !== false) {
        const isHTMLSafe = value && typeof value === 'object' && typeof value.toHTML === 'function';
        const shouldWarn = (globalThis as any).__gxtShouldWarnStyle;
        if (!isHTMLSafe && (!shouldWarn || shouldWarn(wrapper, String(value)))) {
          const warnFn = getDebugFunction('warn');
          if (warnFn) warnFn(constructStyleDeprecationMessage(String(value)), false, { id: 'ember-htmlbars.style-xss-warning' });
        }
      }
      // Sanitize dangerous href/src/cite/action attribute values
      if ((attrName === 'href' || attrName === 'src' || attrName === 'cite' || attrName === 'action') && typeof value === 'string') {
        const protocol = value.split(':')[0]?.toLowerCase();
        if (protocol === 'javascript' || protocol === 'vbscript') {
          wrapper.setAttribute(attrName, `unsafe:${value}`);
          continue;
        }
      }
      // For 'value' on input/textarea/select elements, set as a DOM property
      // instead of an HTML attribute. The HTML 'value' attribute only sets the
      // default value; the DOM property sets the current value. Ember's Glimmer VM
      // uses property-based setting for these, so the attribute doesn't appear in outerHTML.
      const isPropertyOnlyAttr = (attrName === 'value' && (
        wrapper.tagName === 'INPUT' || wrapper.tagName === 'TEXTAREA' || wrapper.tagName === 'SELECT'
      ));

      if (isPropertyOnlyAttr) {
        (wrapper as any)[attrName] = value != null && value !== false ? String(value) : '';
        // Remove the HTML attribute if it was previously set
        if (wrapper.hasAttribute(attrName)) {
          wrapper.removeAttribute(attrName);
        }
      } else if (value === undefined || value === null || value === false) {
        wrapper.removeAttribute(attrName);
      } else if (value === true) {
        wrapper.setAttribute(attrName, '');
      } else {
        wrapper.setAttribute(attrName, String(value));
      }
    }
  }

  // --- Sync ariaRole ---
  const ariaRole = instance?.ariaRole;
  if (ariaRole) {
    wrapper.setAttribute('role', ariaRole);
  } else {
    // Remove if it was previously set via ariaRole binding (proto, class, or arg)
    const ariaRoleInProto = componentDef?.prototype?.hasOwnProperty('ariaRole');
    const ariaRoleInClass = componentDef?.hasOwnProperty?.('ariaRole');
    const ariaRoleInArgs = instance?.__argGetters?.ariaRole;
    if (ariaRoleInProto || ariaRoleInClass || ariaRoleInArgs) {
      wrapper.removeAttribute('role');
    }
  }
}

/**
 * Register a component instance for tracked wrapper element updates.
 * After each gxtSyncDom(), all tracked instances have their wrapper
 * element's attributes and classes re-synced.
 */
function installBindingInterceptors(instance: any, wrapper: HTMLElement, componentDef: any) {
  const attrBindings = instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
  const classBindings = instance?.classNameBindings || componentDef?.prototype?.classNameBindings;
  const hasClassArg = instance?.__argGetters?.class || instance?.__argGetters?.classNames;
  const hasAriaRole = instance?.__argGetters?.ariaRole;
  const hasHtmlIdArg = instance?.__argGetters?.__htmlId;

  if ((attrBindings && attrBindings.length > 0) || (classBindings && classBindings.length > 0) || hasClassArg || hasAriaRole || hasHtmlIdArg) {
    trackedWrapperInstances.add({ instance, wrapper, componentDef });
  }
}

// Register global hook for syncing wrapper elements when properties change.
// Called from __gxtTriggerReRender in compile.ts.
// Track instances with attribute/class bindings for post-sync updates
const trackedWrapperInstances = new Set<any>();

// Track arg cells for reactive cross-component updates.
// When parent context changes, these cells are updated so GXT formulas re-evaluate.
interface TrackedArgEntry {
  cells: Record<string, { cell: any; getter: () => any; initOverridden?: boolean; lastArgValue?: any }>;
  instance?: any; // component instance for lifecycle hooks
}
const trackedArgCells = new Set<TrackedArgEntry>();

// Set of component instances that had .rerender() explicitly called.
// When non-empty, __gxtSyncAllWrappers will fire update hooks for the
// rerendered component(s) and all their ancestors (matching Ember's
// tree-revalidation behavior where parent views also get update hooks).
const _forcedRerenderInstances = new Set<any>();

/**
 * Mark a component as having been explicitly rerendered via .rerender().
 * This triggers update lifecycle hooks for the instance and its ancestor
 * chain on the next sync pass.
 */
(globalThis as any).__gxtForceRerender = function(instance: any) {
  _forcedRerenderInstances.add(instance);
};

/**
 * Check if an instance should receive forced-rerender hooks.
 * An instance qualifies if it IS one of the forced instances, or is an
 * ancestor (via parentView) of one.
 */
function _shouldForceRerender(instance: any): boolean {
  if (_forcedRerenderInstances.size === 0) return false;
  // Check if any forced instance has this instance in its ancestor chain
  for (const forced of _forcedRerenderInstances) {
    if (forced === null) return true; // null means force all (from renderer revalidate)
    let current = forced;
    while (current) {
      if (current === instance) return true;
      current = current.parentView;
    }
  }
  return false;
}

// After gxtSyncDom(), refresh arg cells and re-sync wrapper elements.
// Returns instances that had changes (for post-render lifecycle hooks).
const _updatedInstances: any[] = [];
(globalThis as any).__gxtSyncAllWrappers = function() {
  _updatedInstances.length = 0;

  const hasForced = _forcedRerenderInstances.size > 0;

  // Phase 1: Update arg cells and trigger pre-render lifecycle hooks.
  for (const entry of trackedArgCells) {
    // Skip destroyed/destroying instances to avoid "set on destroyed object" errors
    if (entry.instance && (entry.instance.isDestroyed || entry.instance.isDestroying)) continue;
    let hasChanges = false;
    for (const key of Object.keys(entry.cells)) {
      const cellEntry = entry.cells[key]!;
      const { cell, getter, extraCell, initOverridden } = cellEntry;
      try {
        const newValue = getter();

        if (initOverridden) {
          // For init-overridden properties, only update when the ARG value
          // actually changed from the parent's perspective (not just
          // when it differs from the cell value, which was set to the
          // init-overridden local value).
          const lastArg = 'lastArgValue' in cellEntry ? cellEntry.lastArgValue : undefined;
          const argChanged = lastArg !== undefined && lastArg !== newValue;
          cellEntry.lastArgValue = newValue;

          if (argChanged) {
            cell.update(newValue);
            if (entry.instance && key !== 'class' && key !== 'classNames') {
              try {
                entry.instance.__gxtDispatchingArgs = true;
                entry.instance[key] = newValue;
              } catch { /* ignore */ }
              finally { entry.instance.__gxtDispatchingArgs = false; }
            }
            hasChanges = true;
          }
          // Also update extra cell if arg changed
          if (argChanged && extraCell && extraCell.__value !== newValue) {
            extraCell.update(newValue);
          }
        } else {
          // Track last known arg value for local override detection
          const lastKnownArg = 'lastArgValue' in cellEntry ? cellEntry.lastArgValue : cell.__value;
          const argActuallyChanged = lastKnownArg !== newValue;
          cellEntry.lastArgValue = newValue;

          // Skip cell update if the key is locally overridden and the arg hasn't actually changed from parent
          const isLocallyOverridden = entry.instance?.__gxtLocalOverrides?.has(key);
          if (isLocallyOverridden && !argActuallyChanged) {
            // Local override is in effect and arg hasn't changed — skip
          } else if (cell.__value !== newValue || (argActuallyChanged && isLocallyOverridden)) {
            cell.update(newValue);
            if (entry.instance && key !== 'class' && key !== 'classNames') {
              // Set dispatching flag so the setter knows this is an arg update
              // (not an explicit set from component code) and should clear useLocal
              try {
                entry.instance.__gxtDispatchingArgs = true;
                entry.instance[key] = newValue;
              } catch { /* ignore */ }
              finally { entry.instance.__gxtDispatchingArgs = false; }
            }
            hasChanges = true;
          }
          // Also update the attrsProxy cell (used by GXT effects tracking @arg)
          if (extraCell && extraCell.__value !== newValue) {
            extraCell.update(newValue);
            hasChanges = true;
          }
        }
      } catch { /* getter may throw */ }
    }
    // Check if this instance is in the forced-rerender ancestor chain
    const forceThis = hasForced && entry.instance && _shouldForceRerender(entry.instance);
    // Pre-render lifecycle hooks (before DOM sync)
    // Order matches Ember's curly component manager: didUpdateAttrs, didReceiveAttrs, then willUpdate, willRender
    // Skip if this instance already had update hooks fired this pass (from updateInstanceWithNewArgs
    // or from a previous trackedArgCells entry for the same instance)
    if ((hasChanges || forceThis) && entry.instance && !wasInstanceUpdatedThisPass(entry.instance)) {
      if (hasChanges) {
        triggerLifecycleHook(entry.instance, 'didUpdateAttrs');
        triggerLifecycleHook(entry.instance, 'didReceiveAttrs');
      }
      triggerLifecycleHook(entry.instance, 'willUpdate');
      triggerLifecycleHook(entry.instance, 'willRender');
      markInstanceUpdated(entry.instance);
      _updatedInstances.push(entry.instance);
    }
  }
  // Clear forced set after processing
  _forcedRerenderInstances.clear();

  // Phase 2: Sync wrapper element attributes/classes
  for (const entry of trackedWrapperInstances) {
    const { instance, wrapper, componentDef } = entry;
    if (!wrapper?.isConnected) {
      trackedWrapperInstances.delete(entry);
      continue;
    }
    syncWrapperElement(instance, wrapper, componentDef, undefined);
  }
};

// Expose the count of updated instances for the iterative sync loop.
// Used by __gxtTriggerReRender to detect when no more instances are being dirtied.
(globalThis as any).__gxtGetUpdatedCount = function() {
  return _updatedInstances.length;
};

// Compute the depth of a component in the view tree.
function _viewDepth(instance: any): number {
  let depth = 0;
  let current = instance?.parentView;
  while (current) {
    depth++;
    current = current.parentView;
  }
  return depth;
}

// Post-render lifecycle hooks — called after DOM sync completes.
// Order: deepest children first; siblings at the same depth fire in insertion
// order (i.e., the order they appear in _updatedInstances). Parents fire last.
(globalThis as any).__gxtPostRenderHooks = function() {
  if (_updatedInstances.length === 0) return;

  // Stable sort: deeper components first, preserve insertion order for same depth
  const indexed = _updatedInstances.map((inst, i) => ({ inst, idx: i, depth: _viewDepth(inst) }));
  indexed.sort((a, b) => {
    if (a.depth !== b.depth) return b.depth - a.depth; // deeper first
    return a.idx - b.idx; // same depth: insertion order
  });

  for (const { inst } of indexed) {
    triggerLifecycleHook(inst, 'didUpdate');
    triggerLifecycleHook(inst, 'didRender');
  }
  _updatedInstances.length = 0;
};

// Track ALL live component instances for destroy detection.
const _allLiveInstances = new Set<any>();

// Track instances rendered in the current render pass (reset each pass).
// Used by __gxtDestroyUnclaimedPoolEntries to distinguish between
// "reused in current render" vs "stale from previous render".
const _currentPassRenderedInstances = new Set<any>();
let _currentPassRenderedPassId = -1;

// Snapshot of all live instances before force-rerender.
// Used to detect which instances were removed after the rebuild.
let _preRerenderSnapshot: Set<any> = new Set();

(globalThis as any).__gxtSnapshotLiveInstances = function() {
  _preRerenderSnapshot.clear();
  // Clear the marked-for-destruction set from the previous cycle
  const markedSet = (globalThis as any).__gxtInstancesMarkedForDestruction;
  if (markedSet) markedSet.clear();
  for (const instance of _allLiveInstances) {
    _preRerenderSnapshot.add(instance);
  }
};

// Destroy unclaimed pool entries after a force-rerender.
// Components that were in the old render but not in the new one need their
// destroy lifecycle hooks fired: willDestroyElement, willClearRender,
// didDestroyElement, willDestroy.
(globalThis as any).__gxtDestroyUnclaimedPoolEntries = function() {
  const gOwner = (globalThis as any).owner;
  let viewRegistry: any;
  try {
    viewRegistry = gOwner?.lookup?.('-view-registry:main');
  } catch { /* ignore */ }

  // Find components that were in the pre-rerender snapshot but are no longer
  // present in the re-rendered output. An instance is considered unclaimed if:
  // 1. Its element is disconnected from the DOM, AND
  // 2. It is NOT claimed in any pool (i.e., not reused in the current render)
  // The pool check is essential because morph-based re-rendering creates new
  // wrapper elements in a temp container, so the instance's element (pointing
  // to the new element) won't be connected even though the instance is alive.
  const unclaimed: any[] = [];
  const seen = new Set<any>();

  for (const instance of _preRerenderSnapshot) {
    if (!instance || seen.has(instance)) continue;
    seen.add(instance);

    try {
      // After a morph-based force-rerender, the instance's element may point
      // to the NEW wrapper (in a temp container, not connected), even though
      // the OLD element was preserved by the morph and IS connected.
      // Use getElementById as the authoritative check: if there's a live
      // element with this instance's elementId, the component is alive.
      const el = getViewElement(instance);
      let isAlive = false;

      // Primary check: is the instance's element still in the DOM?
      if (el && el.isConnected) {
        isAlive = true;
      }

      // Tagless components (tagName === '') use DocumentFragments which are
      // never "connected" after insertion. Consider them alive if they were
      // rendered in the current pass or if they are claimed in a pool.
      if (!isAlive && instance.tagName === '' && !instance.isDestroyed && !instance.isDestroying) {
        const passId = (globalThis as any).__emberRenderPassId || 0;
        if (instance.__gxtRenderedInPass === passId || _currentPassRenderedInstances.has(instance)) {
          isAlive = true;
        }
      }

      // Secondary check: is there a live DOM element with this elementId?
      // (morph may have preserved the old element while instance points to new one)
      if (!isAlive && instance.elementId) {
        const liveEl = document.getElementById(String(instance.elementId));
        if (liveEl && liveEl.isConnected) {
          // Re-point the instance to the live element
          try { setViewElement(instance, liveEl); } catch { /* ignore */ }
          try { setElementView(liveEl, instance); } catch { /* ignore */ }
          isAlive = true;
        }
      }

      // Check for instances explicitly marked for destruction during the
      // force-rerender (e.g., dynamic component switching via {{component}}).
      // These are added to __gxtInstancesMarkedForDestruction by the rendering
      // code when a new instance replaces an old one at the same position.
      if (isAlive) {
        const markedForDestruction = (globalThis as any).__gxtInstancesMarkedForDestruction;
        if (markedForDestruction && markedForDestruction.has(instance)) {
          isAlive = false;
          markedForDestruction.delete(instance);
        }
      }

      if (!isAlive) {
        unclaimed.push(instance);
        // Clean up tracked sets
        for (const entry of trackedArgCells) {
          if (entry.instance === instance) {
            trackedArgCells.delete(entry);
            break;
          }
        }
        for (const entry of trackedWrapperInstances) {
          if (entry.instance === instance) {
            trackedWrapperInstances.delete(entry);
            break;
          }
        }
      }
    } catch { /* ignore element access errors */ }
  }
  _preRerenderSnapshot.clear();

  // Also destroy custom-managed component instances whose DOM is disconnected
  // (must run before the early return since there may be no classic unclaimed instances)
  const destroyCustom = (globalThis as any).__gxtDestroyCustomManagedInstances;
  if (typeof destroyCustom === 'function') {
    destroyCustom();
  }

  if (unclaimed.length === 0) return;

  // Phase 1: willDestroyElement + willClearRender.
  // The elements have been detached from the DOM by innerHTML=''.
  // Temporarily re-attach them so tests that check
  // document.body.contains(this.element) during these hooks see true.
  const qunitFixture = document.getElementById('qunit-fixture');
  const tempContainer = qunitFixture || document.body;
  const reattached: Array<{ instance: any; element: HTMLElement }> = [];

  for (const instance of unclaimed) {
    try {
      const el = getViewElement(instance);
      if (el instanceof HTMLElement && !el.isConnected) {
        tempContainer.appendChild(el);
        reattached.push({ instance, element: el });
      }
    } catch { /* ignore */ }
  }

  for (const instance of unclaimed) {
    try {
      // Ensure instance is in inDOM state before destroy hooks.
      // Components that were rendered but never transitioned (e.g., created by
      // GXT formula re-evaluation) may still be in hasElement or preRender state.
      if (instance._transitionTo && instance._state !== 'inDOM') {
        try { instance._transitionTo('inDOM'); } catch {}
      }
      triggerLifecycleHook(instance, 'willDestroyElement');
      triggerLifecycleHook(instance, 'willClearRender');
    } catch { /* ignore */ }
  }

  // Detach re-attached elements
  for (const { element } of reattached) {
    try {
      if (element.parentNode) element.parentNode.removeChild(element);
    } catch { /* ignore */ }
  }

  // Phase 2: transition to destroying, clear element, didDestroyElement
  for (const instance of unclaimed) {
    try {
      if (instance._transitionTo) instance._transitionTo('destroying');
    } catch { /* ignore */ }
    try { setViewElement(instance, null); } catch { /* ignore */ }
    try {
      if (viewRegistry) {
        const viewId = getViewId(instance);
        if (viewId) delete viewRegistry[viewId];
      }
    } catch { /* ignore */ }
    try {
      triggerLifecycleHook(instance, 'didDestroyElement');
    } catch { /* ignore */ }
  }

  // Phase 3: destroy (fires willDestroy)
  for (const instance of unclaimed) {
    try {
      if (typeof instance.destroy === 'function' && !instance.isDestroyed && !instance.isDestroying) {
        instance.destroy();
      }
    } catch { /* ignore */ }
  }

  // Remove from tracked sets
  for (const instance of unclaimed) {
    _allLiveInstances.delete(instance);
    for (const entry of trackedArgCells) {
      if (entry.instance === instance) {
        trackedArgCells.delete(entry);
      }
    }
    for (const entry of trackedWrapperInstances) {
      if (entry.instance === instance) {
        trackedWrapperInstances.delete(entry);
      }
    }
  }

};

// Cleanup function: destroy all tracked component instances with proper lifecycle.
// Called during test teardown (beforeEach -> afterEach) to fire the full
// interactive destroy sequence:
//   Phase 1: willDestroyElement + willClearRender (top-down, element present)
//   Phase 2: didDestroyElement (top-down, element cleared, state=destroying)
//   Phase 3: willDestroy (via instance.destroy())
(globalThis as any).__gxtDestroyTrackedInstances = function() {
  const seen = new Set<any>();
  const instances: any[] = [];
  // Collect unique instances from all tracking sets
  for (const entry of trackedArgCells) {
    if (entry.instance && !seen.has(entry.instance)) {
      seen.add(entry.instance);
      instances.push(entry.instance);
    }
  }
  for (const entry of trackedWrapperInstances) {
    if (entry.instance && !seen.has(entry.instance)) {
      seen.add(entry.instance);
      instances.push(entry.instance);
    }
  }
  // Also include instances from _allLiveInstances that aren't in the above sets.
  // This ensures components without args or bindings (e.g., {{foo-bar}}) are also
  // destroyed with proper lifecycle hooks during teardown.
  for (const instance of _allLiveInstances) {
    if (instance && !seen.has(instance)) {
      seen.add(instance);
      instances.push(instance);
    }
  }

  // Phase 1: willDestroyElement + willClearRender (top-down, element still present)
  for (const instance of instances) {
    try {
      triggerLifecycleHook(instance, 'willDestroyElement');
      triggerLifecycleHook(instance, 'willClearRender');
    } catch { /* ignore */ }
  }

  // Phase 2: transition to destroying, clear element, unregister from view registry,
  // then fire didDestroyElement
  const gOwner = (globalThis as any).owner;
  let viewRegistry: any;
  try {
    viewRegistry = gOwner?.lookup?.('-view-registry:main');
  } catch {
    // Owner may already be destroyed
  }
  for (const instance of instances) {
    try {
      if (instance._transitionTo) instance._transitionTo('destroying');
    } catch { /* ignore */ }
    try { setViewElement(instance, null); } catch { /* ignore */ }
    // Unregister from view registry
    try {
      if (viewRegistry) {
        const viewId = getViewId(instance);
        if (viewId) delete viewRegistry[viewId];
      }
    } catch { /* ignore */ }
    try {
      triggerLifecycleHook(instance, 'didDestroyElement');
    } catch { /* ignore */ }
  }

  // Phase 3: destroy (fires willDestroy)
  for (const instance of instances) {
    try {
      if (typeof instance.destroy === 'function' && !instance.isDestroyed && !instance.isDestroying) {
        instance.destroy();
      }
    } catch (e) {
      // Capture destroy errors so they propagate to assert.throws
      captureRenderError(e);
    }
  }

  // Phase 4: destroy tracked helper instances (class-based helpers created in $_tag)
  const helperInstances = (globalThis as any).__gxtHelperInstances;
  if (Array.isArray(helperInstances)) {
    for (const helperInst of helperInstances) {
      try {
        if (typeof helperInst.destroy === 'function' && !helperInst.isDestroyed && !helperInst.isDestroying) {
          helperInst.destroy();
        }
      } catch (e) {
        captureRenderError(e);
      }
    }
    helperInstances.length = 0;
  }

  // Clear the tracking sets
  trackedArgCells.clear();
  trackedWrapperInstances.clear();
  _updatedInstances.length = 0;
  _afterInsertQueue.length = 0;
  _allLiveInstances.clear();
  _preRerenderSnapshot.clear();
};

/**
 * Destroy a single Ember component instance with full lifecycle hooks.
 * Used by $_dc_ember when dynamic component switching occurs.
 * Fires: willDestroyElement -> willClearRender -> didDestroyElement -> willDestroy
 */
(globalThis as any).__gxtDestroyEmberComponentInstance = function(instance: any) {
  if (!instance || instance.isDestroyed || instance.isDestroying) return;

  const gOwner = (globalThis as any).owner;
  let viewRegistry: any;
  try {
    viewRegistry = gOwner?.lookup?.('-view-registry:main');
  } catch { /* ignore */ }

  // Phase 1: willDestroyElement + willClearRender (element still available)
  // Re-attach element temporarily if disconnected so tests see it in DOM
  const el = getViewElement(instance);
  let reattached = false;
  if (el instanceof HTMLElement && !el.isConnected) {
    const tempContainer = document.getElementById('qunit-fixture') || document.body;
    tempContainer.appendChild(el);
    reattached = true;
  }

  try {
    if (instance._transitionTo && instance._state !== 'inDOM') {
      try { instance._transitionTo('inDOM'); } catch {}
    }
    triggerLifecycleHook(instance, 'willDestroyElement');
    triggerLifecycleHook(instance, 'willClearRender');
  } catch { /* ignore */ }

  // Detach re-attached element
  if (reattached && el instanceof HTMLElement && el.parentNode) {
    try { el.parentNode.removeChild(el); } catch { /* ignore */ }
  }

  // Phase 2: transition to destroying, clear element, didDestroyElement
  try { if (instance._transitionTo) instance._transitionTo('destroying'); } catch { /* ignore */ }
  try { setViewElement(instance, null); } catch { /* ignore */ }
  try {
    if (viewRegistry) {
      const viewId = getViewId(instance);
      if (viewId) delete viewRegistry[viewId];
    }
  } catch { /* ignore */ }
  try { triggerLifecycleHook(instance, 'didDestroyElement'); } catch { /* ignore */ }

  // Phase 3: destroy (fires willDestroy)
  try {
    if (typeof instance.destroy === 'function' && !instance.isDestroyed && !instance.isDestroying) {
      instance.destroy();
    }
  } catch { /* ignore */ }

  // Cleanup tracking
  _allLiveInstances.delete(instance);
  for (const entry of trackedArgCells) {
    if (entry.instance === instance) { trackedArgCells.delete(entry); break; }
  }
  for (const entry of trackedWrapperInstances) {
    if (entry.instance === instance) { trackedWrapperInstances.delete(entry); break; }
  }
};

/**
 * Destroy component instances whose wrapper element is in the given DOM nodes.
 */
(globalThis as any).__gxtDestroyInstancesInNodes = function(removedNodeList: Node[]) {
  if (!removedNodeList || removedNodeList.length === 0) return;

  const removedEls = new Set<Element>();
  for (let i = 0; i < removedNodeList.length; i++) {
    const rn = removedNodeList[i]!;
    if (rn.nodeType === 1) {
      removedEls.add(rn as Element);
      const desc = (rn as Element).querySelectorAll('*');
      for (let j = 0; j < desc.length; j++) {
        removedEls.add(desc[j]!);
      }
    }
  }
  if (removedEls.size === 0) return;

  const instToDestroy: any[] = [];
  for (const liveInst of _allLiveInstances) {
    if (!liveInst || liveInst.isDestroyed || liveInst.isDestroying) continue;
    const wrapperEl = getViewElement(liveInst);
    if (wrapperEl && removedEls.has(wrapperEl as Element)) {
      instToDestroy.push(liveInst);
    }
  }
  if (instToDestroy.length === 0) return;

  let gOwner: any = null;
  let viewReg: any = null;
  try { gOwner = (globalThis as any).owner; } catch { /* */ }
  try { viewReg = gOwner?.lookup?.('-view-registry:main'); } catch { /* */ }

  // Re-attach elements temporarily so willDestroyElement sees them connected
  const tempCont = document.getElementById('qunit-fixture') || document.body;
  const reattachedList: Array<{ i: any; e: HTMLElement }> = [];
  for (const inst of instToDestroy) {
    try {
      const e = getViewElement(inst);
      if (e instanceof HTMLElement && !e.isConnected) {
        tempCont.appendChild(e);
        reattachedList.push({ i: inst, e });
      }
    } catch { /* */ }
  }

  for (const inst of instToDestroy) {
    try {
      if (inst._transitionTo && inst._state !== 'inDOM') {
        try { inst._transitionTo('inDOM'); } catch { /* */ }
      }
      triggerLifecycleHook(inst, 'willDestroyElement');
      triggerLifecycleHook(inst, 'willClearRender');
    } catch { /* */ }
  }

  for (const r of reattachedList) {
    try { if (r.e.parentNode) r.e.parentNode.removeChild(r.e); } catch { /* */ }
  }

  for (const inst of instToDestroy) {
    try { if (inst._transitionTo) inst._transitionTo('destroying'); } catch { /* */ }
    try { setViewElement(inst, null); } catch { /* */ }
    try { if (viewReg) { const vid = getViewId(inst); if (vid) delete viewReg[vid]; } } catch { /* */ }
    try { triggerLifecycleHook(inst, 'didDestroyElement'); } catch { /* */ }
  }

  for (const inst of instToDestroy) {
    try {
      if (typeof inst.destroy === 'function' && !inst.isDestroyed && !inst.isDestroying) inst.destroy();
    } catch { /* */ }
  }

  for (const inst of instToDestroy) {
    _allLiveInstances.delete(inst);
    for (const entry of trackedArgCells) { if (entry.instance === inst) { trackedArgCells.delete(entry); break; } }
    for (const entry of trackedWrapperInstances) { if (entry.instance === inst) { trackedWrapperInstances.delete(entry); break; } }
  }
};

(globalThis as any).__gxtSyncWrapper = function(obj: any, keyName: string) {
  const wrapper = getViewElement(obj);
  if (!(wrapper instanceof HTMLElement)) return;
  const attrBindings = obj?.attributeBindings;
  const classBindings = obj?.classNameBindings;
  if (!attrBindings && !classBindings) return;

  // Check if keyName is relevant to any binding
  let relevant = false;
  if (attrBindings && Array.isArray(attrBindings)) {
    for (const b of attrBindings) {
      const propName = b.split(':')[0];
      if (propName === keyName || keyName.startsWith(propName + '.')) {
        relevant = true;
        break;
      }
    }
  }
  if (!relevant && classBindings && Array.isArray(classBindings)) {
    for (const b of classBindings) {
      if (b.startsWith(':')) continue; // static class, never changes
      const propName = b.split(':')[0];
      if (propName === keyName || keyName.startsWith(propName + '.')) {
        relevant = true;
        break;
      }
    }
  }
  if (relevant) {
    syncWrapperElement(obj, wrapper, obj?.constructor, undefined);
  }
};

/**
 * Build a wrapper element for a classic curly component.
 *
 * Classic components need a wrapper div with:
 * - id: from elementId or auto-generated
 * - class: 'ember-view' + component classNames + invocation classes
 */
function buildWrapperElement(
  instance: any,
  args: any,
  componentDef: any
): HTMLElement {
  const instanceTagName = instance?.tagName;
  const tagName = instanceTagName === '' ? null : (instanceTagName || 'div');

  if (!tagName) {
    // Validate tagless component constraints
    const cnBindings = instance?.classNameBindings || componentDef?.prototype?.classNameBindings;
    assert(
      'You cannot use `classNameBindings` on a tag-less component',
      !cnBindings || !Array.isArray(cnBindings) || cnBindings.length === 0
    );
    const atBindings = instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
    assert(
      'You cannot use `attributeBindings` on a tag-less component',
      !atBindings || !Array.isArray(atBindings) || atBindings.length === 0
    );
    // Only error on explicit `elementId` usage — `id` is allowed on tagless components.
    // Check: (a) elementId arg passed directly, or (b) elementId on instance that
    //   wasn't mapped from `id` arg.
    const argElementId = args && 'elementId' in args && args.elementId !== undefined;
    const instanceElementId = instance?.elementId && !instance.__elementIdFromId;
    assert(
      'You cannot use `elementId` on a tag-less component',
      !argElementId && !instanceElementId
    );
    // Tagless component - return a fragment marker
    return document.createDocumentFragment() as any;
  }

  const wrapper = document.createElement(tagName);

  // Build class list
  const classList: string[] = [];

  // Add classes from invocation
  const argsClass = typeof args?.class === 'function' ? args.class() : args?.class;
  const argsClassNames = typeof args?.classNames === 'function' ? args.classNames() : args?.classNames;

  if (argsClass && typeof argsClass === 'string') {
    classList.push(...argsClass.split(/\s+/).filter(Boolean));
  }
  if (argsClassNames && typeof argsClassNames === 'string') {
    classList.push(...argsClassNames.split(/\s+/).filter(Boolean));
  }

  // Add classNames from component definition (prototype or instance)
  const protoClassNames = componentDef?.prototype?.classNames;
  if (protoClassNames && Array.isArray(protoClassNames) && protoClassNames.length > 0) {
    classList.push(...protoClassNames);
  } else if (instance?.classNames && Array.isArray(instance.classNames)) {
    classList.push(...instance.classNames);
  }

  // Process classNameBindings
  const classNameBindings = instance?.classNameBindings || componentDef?.prototype?.classNameBindings;
  if (classNameBindings && Array.isArray(classNameBindings)) {
    for (const binding of classNameBindings) {
      assert(
        'classNameBindings must be non-empty strings',
        typeof binding === 'string' && binding.length > 0
      );
      assert(
        'classNameBindings must not have spaces in them. Multiple class name bindings can be provided as elements of an array, e.g. `classNameBindings: [\'foo\', \':bar\']`',
        typeof binding === 'string' && !binding.includes(' ')
      );
      const className = resolveClassNameBinding(instance, binding);
      if (className) classList.push(className);
    }
  }

  // 'ember-view' always comes last
  classList.push('ember-view');
  wrapper.className = classList.join(' ');

  // Set ID - check attributeBindings for id mapping first, then use frozen elementId or auto-generate.
  // Once elementId is frozen after first render, always use the frozen value.
  let customIdFromBinding: string | undefined;
  if (!instance?._elementIdFrozen) {
    const attrBindingsForId = instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
    if (attrBindingsForId && Array.isArray(attrBindingsForId)) {
      for (const binding of attrBindingsForId) {
        const { propName, attrName } = parseAttributeBinding(binding);
        if (attrName === 'id') {
          const val = propName.includes('.') ? getNestedValue(instance, propName) : instance?.[propName];
          if (val !== undefined && val !== null && val !== false) {
            customIdFromBinding = String(val);
          }
          break;
        }
      }
    }
  }
  wrapper.id = customIdFromBinding || instance?.elementId || `ember${++emberViewIdCounter}`;

  // Freeze elementId on first render
  if (instance && !instance._elementIdFrozen) {
    const frozenElementId = wrapper.id;
    instance.elementId = frozenElementId;
    instance._elementIdFrozen = true;

    // Install a protective setter that throws when elementId is changed after creation.
    // This mirrors the behavior in @ember/-internals/views/lib/views/states.ts IN_DOM.enter()
    // which may not execute in GXT mode due to renderer.register() failures.
    try {
      Object.defineProperty(instance, 'elementId', {
        configurable: true,
        enumerable: true,
        get() {
          return frozenElementId;
        },
        set(value: any) {
          if (value !== frozenElementId) {
            throw new Error("Changing a view's elementId after creation is not allowed");
          }
        },
      });
    } catch { /* ignore if defineProperty fails */ }
  }

  // Set ariaRole -> role attribute
  // ariaRole should only be bound if:
  // 1. It was passed as an arg at invocation time, OR
  // 2. It was part of the component's class definition (prototype)
  // Setting ariaRole via instance.set() after render should NOT cause binding
  const ariaRoleInArgs = args && ('ariaRole' in args);
  const ariaRoleInProto = componentDef?.prototype?.hasOwnProperty('ariaRole');
  const ariaRoleInClass = componentDef?.hasOwnProperty?.('ariaRole');

  if (ariaRoleInArgs || ariaRoleInProto || ariaRoleInClass) {
    const ariaRole = instance?.ariaRole;
    if (ariaRole) {
      wrapper.setAttribute('role', ariaRole);
    }
  }

  // Apply attributeBindings from the component
  // attributeBindings maps component properties to DOM attributes
  const attributeBindings = instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
  if (attributeBindings && Array.isArray(attributeBindings)) {
    for (const binding of attributeBindings) {
      const { propName, attrName } = parseAttributeBinding(binding);

      // Skip id binding after first render — id is frozen
      if (attrName === 'id' && instance?._elementIdFrozen) continue;

      // Validate: 'class' cannot be used as an attributeBinding
      assert(
        'You cannot use class as an attributeBinding, use classNameBindings instead.',
        attrName !== 'class'
      );

      // Validate: non-microsyntax bindings (no colon) cannot have nested paths
      if (!binding.includes(':') && propName.includes('.')) {
        assert(
          `Illegal attributeBinding: '${propName}' is not a valid attribute name.`,
          false
        );
      }

      const value = propName.includes('.') ? getNestedValue(instance, propName) : instance?.[propName];
      // Warn for style attribute bindings with non-safe strings (once per render pass per value)
      if (attrName === 'style' && value !== null && value !== undefined && value !== false) {
        const isHTMLSafe = value && typeof value === 'object' && typeof value.toHTML === 'function';
        const shouldWarn = (globalThis as any).__gxtShouldWarnStyle;
        if (!isHTMLSafe && (!shouldWarn || shouldWarn(wrapper, String(value)))) {
          const warnFn = getDebugFunction('warn');
          if (warnFn) warnFn(constructStyleDeprecationMessage(String(value)), false, { id: 'ember-htmlbars.style-xss-warning' });
        }
      }
      // Sanitize dangerous href/src/cite/action attribute values
      if ((attrName === 'href' || attrName === 'src' || attrName === 'cite' || attrName === 'action') && typeof value === 'string') {
        const protocol = value.split(':')[0]?.toLowerCase();
        if (protocol === 'javascript' || protocol === 'vbscript') {
          wrapper.setAttribute(attrName, `unsafe:${value}`);
          continue;
        }
      }
      // For 'value' on input/textarea/select, set as DOM property (not HTML attribute)
      const isPropertyOnlyAttr = (attrName === 'value' && (
        wrapper.tagName === 'INPUT' || wrapper.tagName === 'TEXTAREA' || wrapper.tagName === 'SELECT'
      ));

      if (isPropertyOnlyAttr) {
        if (value !== undefined && value !== null && value !== false) {
          (wrapper as any)[attrName] = String(value);
        }
      } else if (value !== undefined && value !== null && value !== false) {
        wrapper.setAttribute(attrName, value === true ? '' : String(value));
      }
    }
  }

  return wrapper;
}

// =============================================================================
// Render Context
// =============================================================================

/**
 * Wrap an Ember/plain object in a tracking proxy so that property reads
 * during GXT formula evaluation create and consume cells.  This allows
 * paths like `{{this.name.last}}` to be fully reactive — when
 * `service.set('last', v)` fires `__gxtTriggerReRender(service, 'last')`,
 * the cell that the formula already consumed will be dirtied and the
 * formula will re-evaluate.
 *
 * The cache ensures each source object gets at most one wrapper so
 * identity comparisons stay stable.
 */
const _nestedTrackingProxies = new WeakMap<object, any>();

function wrapNestedObjectForTracking(obj: any): any {
  if (obj == null || typeof obj !== 'object') return obj;
  // Don't wrap DOM nodes, arrays, Dates, RegExps, Errors, promises, proxies we already created, etc.
  if (obj instanceof Node || obj instanceof Date || obj instanceof RegExp ||
      obj instanceof Error || obj instanceof Promise || Array.isArray(obj)) {
    return obj;
  }
  // Don't wrap GXT internals or plain Objects without Ember identity
  // We only want to wrap Ember objects (services, models, controllers, etc.)
  // which typically have a constructor name other than "Object" or have _super / isDestroyed
  const ctor = obj.constructor;
  if (ctor === Object || ctor === undefined) return obj;
  // Don't wrap if already a Proxy created by us
  if (_nestedTrackingProxies.has(obj)) return _nestedTrackingProxies.get(obj);

  const _cellFor = (globalThis as any).__gxtCellFor;
  if (!_cellFor) return obj;

  const proxy = new Proxy(obj, {
    get(target, prop, _receiver) {
      if (typeof prop !== 'string') return Reflect.get(target, prop, target);
      // Skip internal/framework properties
      if (prop.startsWith('_') || prop.startsWith('$') || prop === 'constructor' ||
          prop === 'isDestroyed' || prop === 'isDestroying' || prop === 'toString' ||
          prop === 'toJSON' || prop === 'valueOf' || prop === 'init' || prop === 'destroy') {
        return Reflect.get(target, prop, target);
      }
      const value = Reflect.get(target, prop, target);
      // Don't create cells for methods
      if (typeof value === 'function') return value;
      // Create/read cell so GXT formula tracks this dependency
      try {
        const cell = _cellFor(target, prop, /* skipDefine */ false);
        if (cell) return cell.value;
      } catch { /* ignore */ }
      return value;
    },
  });

  _nestedTrackingProxies.set(obj, proxy);
  return proxy;
}

/**
 * Create a render context that properly inherits from the component instance.
 *
 * Uses Object.create(instance) so that:
 * - Methods on the prototype are accessible via 'this'
 * - We can add getters for reactive arg access
 */
function createRenderContext(
  instance: any,
  args: any,
  fw: any,
  owner: any
): any {
  // Use the instance directly — don't use Object.create(instance).
  // Object.create creates a new object with instance as prototype, which breaks
  // getters: @tracked, computed properties, etc. run with `this = renderContext`
  // but their storage is keyed on `instance`. Using the instance directly ensures
  // `this` is consistent across getter calls and storage lookups.
  const renderContext = instance || {};

  // During force-rerender, cellFor may have installed own getters on the
  // instance that shadow PURE prototype getters (e.g., get full() { ... }).
  // These cellFor getters read from cells keyed to the OLD proxy (from the
  // initial render), which hold stale values. Remove them so the new proxy
  // reads from the prototype getter (which computes fresh values).
  // Only remove getters that shadow PURE getters (no setter) — tracked
  // property getters (with both get/set) should be preserved.
  if ((globalThis as any).__gxtIsForceRerender && instance) {
    try {
      const ownKeys = Object.getOwnPropertyNames(instance);
      for (const key of ownKeys) {
        const ownDesc = Object.getOwnPropertyDescriptor(instance, key);
        if (!ownDesc || !ownDesc.get || !ownDesc.configurable) continue;
        // Walk prototype chain to find a matching getter
        let p = Object.getPrototypeOf(instance);
        while (p && p !== Object.prototype) {
          const protoDesc = Object.getOwnPropertyDescriptor(p, key);
          if (protoDesc) {
            // Only remove if prototype has a PURE getter (no setter).
            // Tracked properties have both get and set — keep their cellFor getters.
            if (protoDesc.get && !protoDesc.set) {
              delete instance[key];
            }
            break;
          }
          p = Object.getPrototypeOf(p);
        }
      }
    } catch { /* ignore */ }
  }

  // Get slots from args.$slots (passed from compile.ts)
  // GXT templates use $slots.default() for {{yield}}
  const slots = args?.$slots || {};
  renderContext[$SLOTS_SYMBOL] = slots;
  Object.defineProperty(renderContext, '$slots', {
    value: slots,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  // GXT FwType is [TagProp[], TagAttr[], TagEvent[]] - all must be arrays
  // fw[0] = props (properties to set on element)
  // fw[1] = attrs (DOM attributes for ...attributes)
  // fw[2] = events (event handlers/modifiers)
  renderContext.$fw = fw || [[], [], []];

  // Add __gxtSelfString__ getter for {{this}} support
  // Ember's {{this}} calls toString() on the component instance
  if (!renderContext.hasOwnProperty('__gxtSelfString__')) {
    Object.defineProperty(renderContext, '__gxtSelfString__', {
      get() { return this.toString(); },
      enumerable: false,
      configurable: true,
    });
  }

  // Add has-block helpers to the render context
  // These check the current slots to see if blocks were provided
  renderContext.$_hasBlock = function(blockName?: string) {
    const name = blockName || 'default';
    return slots && typeof slots[name] === 'function';
  };
  renderContext.$_hasBlockParams = function(blockName?: string) {
    const name = blockName || 'default';
    if (!slots || typeof slots[name] !== 'function') {
      return false;
    }
    // Check if the slot has block params info attached
    const slotFn = slots[name];
    if (slotFn.__hasBlockParams !== undefined) {
      return slotFn.__hasBlockParams;
    }
    // Conservative default
    return false;
  };

  // Set up attrs proxy for this.attrs.argName.value / this.args.argName access
  const attrsProxy: Record<string, any> = {};
  const cellForFn = (globalThis as any).__gxtCellFor;
  // Store arg cells for reactive updates
  const argCells: Record<string, any> = {};
  // Build Ember-style attrs object separately: mut→mutCell, readonly→plain, regular→{value,update()}
  const emberAttrs: Record<string, any> = {};
  const _readonlyKeys = instance?.__gxtReadonlyKeys || new Set<string>();
  const _mutCellKeys = instance?.__gxtMutCellKeys || new Set<string>();
  const _rawArgGetters = instance?.__gxtRawArgGetters || {};
  const triggerReRenderForAttrs = (globalThis as any).__gxtTriggerReRender;
  if (args && typeof args === 'object') {
    for (const key of Object.keys(args)) {
      if (key.startsWith('Symbol') || _isGxtInternalArgKey(key)) continue;

      // Resolve the initial value, unwrapping mut/readonly cells for the args proxy
      const descriptor = Object.getOwnPropertyDescriptor(args, key);
      const getter = descriptor?.get;
      const rawProp = args[key];
      // Don't unwrap fn helper results, mut cells, curried helpers/components —
      // they are real functions, not GXT reactive getters.
      let rawVal = getter ? getter() : (typeof rawProp === 'function' && !rawProp.__isFnHelper && !rawProp.__isMutCell && !rawProp.__isEmberCurriedHelper && !rawProp.__isCurriedComponent && !rawProp.prototype ? rawProp() : rawProp);
      // Unwrap mut cells for args proxy (template rendering needs plain values)
      let initialVal = rawVal;
      if (rawVal && rawVal.__isMutCell) {
        initialVal = rawVal.value;
      } else if (rawVal && rawVal.__isReadonly) {
        initialVal = rawVal.__readonlyValue;
      }

      // Build an unwrapping getter for the args proxy
      const unwrappingGetter = getter ? () => {
        const v = getter();
        if (v && v.__isMutCell) return v.value;
        if (v && v.__isReadonly) return v.__readonlyValue;
        return v;
      } : undefined;

      if (cellForFn && getter) {
        // Create a cell for this arg so GXT's formula tracking picks up the dependency.
        // When the parent context changes, we update this cell which triggers re-evaluation.
        const cell = cellForFn(attrsProxy, key, /* skipDefine */ false);
        cell.update(initialVal);
        argCells[key] = { cell, getter: unwrappingGetter || getter };
      } else {
        Object.defineProperty(attrsProxy, key, {
          get() {
            const val = args[key];
            // Don't unwrap fn helper results, mut cells, curried helpers
            let resolved = (typeof val === 'function' && !val.__isFnHelper && !val.__isMutCell && !val.__isEmberCurriedHelper && !val.__isCurriedComponent && !val.prototype) ? val() : val;
            if (resolved && resolved.__isMutCell) return resolved.value;
            if (resolved && resolved.__isReadonly) return resolved.__readonlyValue;
            return resolved;
          },
          enumerable: true,
          configurable: true,
        });
      }

      // Build Ember-style attrs entry
      if (_mutCellKeys.has(key)) {
        // For mut cells: attrs[key] IS the mutCell (has .value and .update())
        // Use a getter so we always get the current mut cell
        const rawGetter = _rawArgGetters[key];
        if (rawGetter) {
          Object.defineProperty(emberAttrs, key, {
            get() {
              const v = rawGetter();
              if (v && v.__isMutCell) return v;
              return v;
            },
            enumerable: true,
            configurable: true,
          });
        } else if (rawVal && rawVal.__isMutCell) {
          emberAttrs[key] = rawVal;
        } else {
          emberAttrs[key] = initialVal;
        }
      } else if (_readonlyKeys.has(key)) {
        // For readonly: attrs[key] IS the plain value (no .update())
        // Use a getter for reactivity
        if (unwrappingGetter) {
          Object.defineProperty(emberAttrs, key, {
            get() { return unwrappingGetter(); },
            enumerable: true,
            configurable: true,
          });
        } else {
          emberAttrs[key] = initialVal;
        }
      } else {
        // For regular args: automatic mutable binding with .value and .update()
        const _getter = unwrappingGetter || getter;
        const _inst = instance;
        const _key = key;
        emberAttrs[key] = {
          get value() {
            if (_inst) {
              try { return _inst[_key]; } catch { /* ignore */ }
            }
            if (_getter) {
              try { return _getter(); } catch { /* ignore */ }
            }
            return initialVal;
          },
          update(newValue: any) {
            // Use set() which triggers PROPERTY_DID_CHANGE for upstream propagation
            if (_inst) {
              if (typeof _inst.set === 'function') {
                _inst.set(_key, newValue);
              } else {
                _inst[_key] = newValue;
                // Also propagate upstream
                if (_inst.__gxtTwoWayBindings?.[_key]) {
                  const binding = _inst.__gxtTwoWayBindings[_key];
                  if (binding.sourceCtx && binding.sourceKey) {
                    const srcInst = binding.sourceCtx.__gxtRawTarget || binding.sourceCtx;
                    if (typeof srcInst.set === 'function') {
                      srcInst.set(binding.sourceKey, newValue);
                    } else {
                      binding.sourceCtx[binding.sourceKey] = newValue;
                    }
                    if (triggerReRenderForAttrs) triggerReRenderForAttrs(srcInst, binding.sourceKey);
                  }
                }
              }
              // Always trigger re-render on the instance itself
              if (triggerReRenderForAttrs) triggerReRenderForAttrs(_inst, _key);
            }
          }
        };
      }
    }
  }
  // Don't register attrsProxy arg cells separately here — they will be merged
  // into the renderCtxArgCells entry below so both cells get updated together.
  // This prevents the renderCtxArgCells registration from deleting the attrsProxy
  // entry, which would leave the attrsProxy cells (tracked by GXT effects for @arg)
  // stale and never updated.
  // GXT's $_GET_SLOTS reads ctx['args'][$SLOTS_SYMBOL] as a fallback,
  // so the attrsProxy (which becomes renderContext.args) must carry slots.
  attrsProxy[$SLOTS_SYMBOL] = slots;

  // GXT's $_GET_FW reads ctx['args'][$PROPS_SYMBOL] as a fallback
  // when the template is called via .call(renderContext) with no args.
  // This enables ...attributes forwarding for both classic and tagless components.
  attrsProxy[$PROPS_SYMBOL] = fw || [[], [], []];

  // Use Ember-style attrs (with .value/.update() for mutable, plain for readonly)
  // for instance.attrs, but attrsProxy (unwrapped values) for args/@arg access.
  renderContext.attrs = Object.keys(emberAttrs).length > 0 ? emberAttrs : attrsProxy;
  // GXT accesses @foo as this.args.foo, so also set args
  renderContext.args = attrsProxy;
  // GXT runtime compiler uses Symbol.for('gxt-args') for this[$args].foo
  renderContext[$ARGS_KEY] = attrsProxy;

  if (instance) {
    // Always set attrs to the Ember-style object (with .value/.update() or plain values)
    instance.attrs = Object.keys(emberAttrs).length > 0 ? emberAttrs : attrsProxy;
  }
  if (instance && !instance.args) {
    instance.args = attrsProxy;
  }
  if (instance && !instance[$ARGS_KEY]) {
    instance[$ARGS_KEY] = attrsProxy;
  }

  // Set up cell-backed getters for args on render context.
  // Using cells ensures GXT's formula tracking picks up the dependency,
  // so text nodes, if-conditions, etc. re-evaluate when args change.
  //
  // IMPORTANT: Skip this for template-only components (instance === null).
  // Template-only components should only expose args via @argName (this.args.foo),
  // NOT as properties on `this` (this.foo). Installing getters on the bare
  // renderContext {} would make {{this.foo}} resolve to the arg value, which
  // violates Ember's template-only component contract.
  const cellForFn2 = (globalThis as any).__gxtCellFor;
  const renderCtxArgCells: Record<string, any> = {};
  const argGetters = instance?.__argGetters || {};

  // Collect all arg keys and their getters
  const allArgKeys = new Set<string>(Object.keys(argGetters));
  if (instance && args && typeof args === 'object') {
    for (const key of Object.keys(args)) {
      if (key === 'class' || key === 'classNames' || key.startsWith('__') || key.startsWith('Symbol')) continue;
      allArgKeys.add(key);
    }
  }

  for (const key of allArgKeys) {
    // Get the getter function for this arg
    let getter: (() => any) | undefined = argGetters[key];
    if (!getter && args) {
      const descriptor = Object.getOwnPropertyDescriptor(args, key);
      if (descriptor?.get) {
        getter = descriptor.get;
      } else {
        const argRef = args[key];
        // Only treat as getter if it's a GXT reactive getter (arrow fn with no args).
        // Don't unwrap fn helper results, mut cells, curried helpers, or class constructors.
        getter = (typeof argRef === 'function' && !argRef.prototype && !argRef.__isFnHelper && !argRef.__isMutCell && !argRef.__isEmberCurriedHelper && !argRef.__isCurriedComponent) ? argRef : undefined;
      }
    }

    if (cellForFn2 && getter) {
      // Check if the instance overrode this property in init()
      // If so, we should use the init-set value, not the arg value.
      // Also check __gxtInitOverrides which persists across re-renders.
      const argVal = getter();
      let instanceVal: any;
      try { instanceVal = instance?.[key]; } catch { instanceVal = argVal; }
      const freshOverride = instance && instanceVal !== argVal && instanceVal !== undefined;
      // Check if this was flagged as init-overridden on a previous render pass
      const savedOverride = instance?.__gxtInitOverrides?.[key];
      const overriddenInInit = freshOverride || !!savedOverride;


      // Save the init override flag on the instance for future re-renders
      if (freshOverride && instance) {
        if (!instance.__gxtInitOverrides) instance.__gxtInitOverrides = {};
        instance.__gxtInitOverrides[key] = true;
      }

      if (overriddenInInit) {
        // Instance overrode this property in init() — use a getter that
        // returns the instance value but can be updated by arg changes.
        // Create a cell FIRST, then install our custom getter that reads
        // cell.value for GXT tracking but returns the correct local/arg value.
        try {
          let localVal = instanceVal;
          let useLocal = true;
          // Create a cell with skipDefine=true to avoid cellFor installing
          // its own getter/setter (we'll install our own below).
          const cell = cellForFn2(renderContext, key, /* skipDefine */ true);
          if (cell) cell.update(localVal);
          // For init-overridden properties, track the cell but mark it as init-overridden.
          // __gxtSyncAllWrappers will skip the cell update and instead check the getter
          // to see if the arg value actually changed from the parent's perspective.
          renderCtxArgCells[key] = { cell, getter, initOverridden: true };
          Object.defineProperty(renderContext, key, {
            get() {
              // Read cell.value to register GXT formula tracking dependency
              if (cell) try { cell.value; } catch { /* ignore */ }
              return useLocal ? localVal : getter();
            },
            set(v: any) {
              // When __gxtDispatchingArgs is true, this is an arg update from parent,
              // not an explicit set from component code. Switch to arg-driven mode.
              if ((instance as any).__gxtDispatchingArgs) {
                localVal = v;
                useLocal = false;
                if (cell) cell.update(v);
              } else {
                localVal = v;
                useLocal = true;
                if (cell) cell.update(v);
              }
            },
            enumerable: true,
            configurable: true,
          });
        } catch { /* ignore */ }
      } else {
        // Install a cell on the render context for this arg.
        // GXT formulas reading renderContext.key will track this cell.
        //
        // Check if the property has a computed/native getter on the prototype chain.
        // If so, we must NOT overwrite it — use cellFor with skipDefine=false (preserves computed).
        // For plain data properties, use skipDefine=true with custom getter/setter for local override tracking.
        let hasComputedGetter = false;
        if (instance) {
          let proto = Object.getPrototypeOf(instance);
          while (proto && proto !== Object.prototype) {
            const desc = Object.getOwnPropertyDescriptor(proto, key);
            if (desc?.get) {
              hasComputedGetter = true;
              break;
            }
            proto = Object.getPrototypeOf(proto);
          }
        }

        if (hasComputedGetter) {
          // Property has a computed getter — use cellFor with skipDefine=false
          // to preserve the existing computed property behavior
          try {
            const cell = cellForFn2(renderContext, key, /* skipDefine */ false);
            const initialVal = argVal;
            cell.update(initialVal);
            renderCtxArgCells[key] = { cell, getter, lastArgValue: initialVal };
            const _regArrOwner = (globalThis as any).__gxtRegisterArrayOwner;
            if (_regArrOwner && Array.isArray(initialVal)) {
              _regArrOwner(initialVal, renderContext, key);
            }
          } catch {
            try {
              const g = getter;
              Object.defineProperty(renderContext, key, {
                get() { return g(); },
                enumerable: true,
                configurable: true,
              });
            } catch { /* ignore */ }
          }
        } else {
          // Plain data property — use skipDefine=true with custom getter/setter for local override tracking.
          try {
            const cell = cellForFn2(renderContext, key, /* skipDefine */ true);
            const initialVal = argVal;
            cell.update(initialVal);
            renderCtxArgCells[key] = { cell, getter, lastArgValue: initialVal };
            // Install custom getter/setter that reads from cell (for GXT tracking)
            // but also tracks local overrides
            let _localVal = initialVal;
            let _useLocal = false;
            Object.defineProperty(renderContext, key, {
              get() {
                // Read cell.value to register GXT formula tracking dependency
                try { cell.value; } catch { /* ignore */ }
                return _useLocal ? _localVal : (getter ? getter() : _localVal);
              },
              set(v: any) {
                if ((instance as any).__gxtDispatchingArgs) {
                  _localVal = v;
                  _useLocal = false;
                  cell.update(v);
                  // Clear local override when arg update comes from parent
                  if (instance?.__gxtLocalOverrides) instance.__gxtLocalOverrides.delete(key);
                } else {
                  _localVal = v;
                  _useLocal = true;
                  cell.update(v);
                  // Track local override
                  if (instance) {
                    if (!instance.__gxtLocalOverrides) instance.__gxtLocalOverrides = new Set();
                    instance.__gxtLocalOverrides.add(key);
                  }
                }
              },
              enumerable: true,
              configurable: true,
            });
            // Register array owner for KVO array mutation tracking (pushObject, shiftObject, etc.)
            const _regArrOwner = (globalThis as any).__gxtRegisterArrayOwner;
            if (_regArrOwner && Array.isArray(initialVal)) {
              _regArrOwner(initialVal, renderContext, key);
            }
          } catch {
            // Fallback to plain getter
            try {
              const g = getter;
              Object.defineProperty(renderContext, key, {
                get() { return g(); },
                enumerable: true,
                configurable: true,
              });
            } catch { /* ignore */ }
          }
        }
      }
    } else if (getter) {
      try {
        const g = getter;
        Object.defineProperty(renderContext, key, {
          get() { return g(); },
          enumerable: true,
          configurable: true,
        });
      } catch { /* ignore */ }
    }
  }

  // Register render context arg cells for updates in __gxtSyncAllWrappers.
  // Also include attrsProxy cells so GXT effects tracking @arg (via this[$args].key)
  // get dirtied when args change. Both cells share the same getter.
  const mergedArgCells: Record<string, any> = {};
  for (const key of Object.keys(renderCtxArgCells)) {
    const entry = renderCtxArgCells[key];
    // Initialize lastArgValue for init-overridden entries
    if (entry.initOverridden) {
      entry.lastArgValue = entry.getter();
    }
    mergedArgCells[key] = entry;
  }
  // Merge attrsProxy cells as secondary cells that also need updating
  for (const key of Object.keys(argCells)) {
    if (mergedArgCells[key]) {
      // Store the attrsProxy cell alongside the renderCtx cell.
      // Preserve initOverridden and lastArgValue flags for init-overridden properties.
      const existing = mergedArgCells[key];
      mergedArgCells[key] = {
        cell: existing.cell,
        getter: existing.getter,
        extraCell: argCells[key].cell, // attrsProxy cell for @arg tracking
        initOverridden: existing.initOverridden,
        lastArgValue: existing.lastArgValue !== undefined ? existing.lastArgValue : (existing.initOverridden ? existing.getter() : undefined),
      };
    } else {
      mergedArgCells[key] = argCells[key];
    }
  }

  if (Object.keys(mergedArgCells).length > 0) {
    for (const entry of trackedArgCells) {
      if (entry.instance === instance) {
        trackedArgCells.delete(entry);
      }
    }
    trackedArgCells.add({ cells: mergedArgCells, instance });
  }

  // Pre-install cell-backed getter/setters on the instance BEFORE creating
  // the Proxy. This is critical for GXT effect tracking: when a GXT effect
  // reads `this.foo`, Reflect.get triggers the getter on the instance, which
  // reads cell.value, and the effect tracks the cell as a dependency.
  // __gxtTriggerReRender also uses cellFor on the instance, so both reads
  // and writes use the same cell.
  const _cellFor = (globalThis as any).__gxtCellFor;
  const SKIP_CELL_PROPS = new Set([
    'constructor', 'args', 'attrs', '$slots', '$fw', 'init', 'destroy',
    '$_hasBlock', '$_hasBlockParams', $ARGS_KEY,
    'concatenatedProperties', 'mergedProperties', 'classNames',
    'classNameBindings', 'attributeBindings', 'positionalParams',
    '_states', 'renderer', 'element', 'elementId', 'tagName',
    'isView', 'isComponent', '__dispatcher', 'parentView',
    '_state', '_currentState', 'target', 'action', 'actionContext',
    'actionContextObject', 'layoutName', 'layout', '_debugContainerKey',
  ]);

  const _registerArrayOwner = (globalThis as any).__gxtRegisterArrayOwner;
  if (_cellFor && instance) {
    // Install cells for all enumerable properties on the instance and its prototype
    const seen = new Set<string>();
    let obj = instance;
    for (let depth = 0; depth < 3 && obj; depth++) {
      for (const key of Object.keys(obj)) {
        if (seen.has(key) || SKIP_CELL_PROPS.has(key) || key.startsWith('_')) continue;
        seen.add(key);
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        // Only install cells for configurable data properties (not getters or frozen props)
        if (desc && !desc.get && !desc.set && desc.configurable !== false && typeof desc.value !== 'function') {

          try {
            _cellFor(instance, key, /* skipDefine */ false);
            // Register array owner for KVO array mutation tracking
            if (_registerArrayOwner && Array.isArray(desc.value)) {
              _registerArrayOwner(desc.value, instance, key);
            }
            // Register reverse mapping: when a property on this object value changes,
            // dirty this cell so formulas reading nested paths (e.g., this.m.formattedMessage) re-evaluate.
            const _regObjOwner = (globalThis as any).__gxtRegisterObjectValueOwner;
            if (_regObjOwner && desc.value && typeof desc.value === 'object') {
              _regObjOwner(desc.value, instance, key);
            }
          } catch { /* ignore */ }
        }
      }
      obj = Object.getPrototypeOf(obj);
    }
  }

  const proxy = new Proxy(renderContext, {
    get(target, prop, _receiver) {
      // Allow raw target access for cellFor
      if (prop === '__gxtRawTarget') return target;

      // Track arg source for two-way binding detection.
      // When __gxtTrackArgSource is true, record this property as the source.
      if (typeof prop === 'string' && (globalThis as any).__gxtTrackArgSource) {
        if (!SKIP_CELL_PROPS.has(prop) && !prop.startsWith('_') && !prop.startsWith('$') &&
            prop !== 'constructor' && prop !== 'toString' && prop !== 'valueOf') {
          (globalThis as any).__gxtLastArgSourceKey = prop;
          (globalThis as any).__gxtLastArgSourceCtx = target;
        }
      }

      if (typeof prop !== 'string' || SKIP_CELL_PROPS.has(prop)) {
        return Reflect.get(target, prop, target);
      }

      // Check if the property already has a cell getter (pre-installed)
      // by checking the property descriptor chain
      let hasGetter = false;
      let obj: any = target;
      while (obj) {
        const desc = Object.getOwnPropertyDescriptor(obj, prop);
        if (desc) {
          hasGetter = !!desc.get;
          break;
        }
        obj = Object.getPrototypeOf(obj);
      }

      if (hasGetter) {
        const val = Reflect.get(target, prop, target);

        // Wrap nested Ember objects so sub-property reads are tracked
        if (val !== null && typeof val === 'object' && !(val instanceof Node)) {
          return wrapNestedObjectForTracking(val);
        }
        return val;
      }

      // Property has no getter — create a cell lazily for GXT tracking
      // This handles properties set via Ember's extend() which puts them
      // on the prototype as data properties (not caught by pre-installation)
      const value = Reflect.get(target, prop, target);
      // Return ALL function-valued properties directly without installing GXT cells.
      // Functions (both prototype methods and own arrow-function properties) should
      // not go through cell tracking — GXT's deepFnValue would call them immediately
      // instead of treating them as event handler references.
      if (typeof value === 'function') {
        return value;
      }

      if (_cellFor) {
        try {
          const cell = _cellFor(target, prop, /* skipDefine */ false);
          if (cell) {
            const cellVal = cell.value;
            // Wrap nested Ember objects so sub-property reads are tracked
            if (cellVal !== null && typeof cellVal === 'object' && !(cellVal instanceof Node)) {
              return wrapNestedObjectForTracking(cellVal);
            }
            return cellVal;
          }
        } catch { /* ignore */ }
      }

      // Wrap nested Ember objects for tracking even without cells
      if (value !== null && typeof value === 'object' && !(value instanceof Node)) {
        return wrapNestedObjectForTracking(value);
      }
      return value;
    },

    set(target, prop, value, _receiver) {
      // Pass target as receiver so setters run with this = instance
      return Reflect.set(target, prop, value, target);
    },
  });

  return proxy;
}

// =============================================================================
// Template Rendering
// =============================================================================

/**
 * Remove GXT internal artifacts from a DOM container.
 * GXT uses:
 * - Comments like <!--if-entry-placeholder--> for internal bookkeeping
 * - data-node-id attributes for debugging/tracking
 * These should be removed before test assertions.
 */
function removeGxtArtifacts(container: Element | DocumentFragment): void {
  // Remove placeholder comments
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_COMMENT,
    null
  );

  const commentsToRemove: Comment[] = [];
  let node: Comment | null;
  while ((node = walker.nextNode() as Comment | null)) {
    const text = node.textContent || '';
    // Remove GXT internal placeholder comments, EXCEPT those used by
    // IfCondition for branch switching (they need to stay in the DOM
    // so IfCondition.renderBranch can insert content relative to them).
    // IfCondition placeholders contain 'if-entry' in their text.
    if (text.includes('if-entry') || text.includes('each-entry')) {
      // Keep these — they're needed by GXT's control flow for DOM manipulation
      continue;
    }
    if (
      text.includes('placeholder') ||
      text === ''
    ) {
      commentsToRemove.push(node);
    }
  }

  for (const comment of commentsToRemove) {
    comment.parentNode?.removeChild(comment);
  }

  // Remove data-node-id attributes from all elements
  const elements = container.querySelectorAll('[data-node-id]');
  for (const element of elements) {
    element.removeAttribute('data-node-id');
  }

  // Also check the container itself if it's an Element
  if (container instanceof Element && container.hasAttribute('data-node-id')) {
    container.removeAttribute('data-node-id');
  }
}

/**
 * Render a template with parent view tracking and slots context.
 */
function renderTemplateWithParentView(
  template: any,
  renderContext: any,
  container: Element | DocumentFragment,
  instance: any
): any {
  // NOTE: We intentionally do NOT increment the render pass ID here.
  // The pass ID should only be incremented when starting a new top-level render transaction
  // (e.g., when the test harness calls render()). Component template renders within the same
  // transaction should share the same pass ID to maintain proper instance pooling.

  if (instance) {
    pushParentView(instance);
  }

  // Push slots onto the global stack for has-block checks
  const slotsStack = (globalThis as any).__slotsContextStack;
  const slots = renderContext.$slots || renderContext[$SLOTS_SYMBOL] || {};
  if (slotsStack) {
    slotsStack.push(slots);
  }

  try {
    // Debug: capture template render context state
    if ((globalThis as any).__gxtIsForceRerender && instance && typeof instance.first !== 'undefined') {
      const slotsObj = renderContext.$slots || renderContext[Symbol.for('gxt-slots')] || {};
      (globalThis as any).__gxtDebugRender = {
        instanceFirst: instance.first,
        ctxFull: renderContext.full,
        hasSlots: !!slotsObj.default,
        slotsKeys: Object.keys(slotsObj),
        type: instance.constructor?.name,
      };
    }
    const result = template.render(renderContext, container);
    // Clean up GXT placeholder comments for cleaner DOM
    removeGxtArtifacts(container);
    return result;
  } finally {
    if (slotsStack) {
      slotsStack.pop();
    }
    if (instance) {
      popParentView();
    }
  }
}

// =============================================================================
// Simple Cell/Formula (for internal manager args)
// =============================================================================

const createCell = (initialValue: any, name?: string) => {
  let value = initialValue;
  return {
    get value() { return value; },
    set value(v: any) { value = v; },
  };
};

const formula = <T>(fn: () => T, name?: string) => {
  const c = createCell(fn(), name);
  return c;
};

function argsForInternalManager(args: any, fw: any) {
  const named: Record<string, any> = {};
  Object.keys(args).forEach((arg) => {
    // Create a reactive ref that reads from the GXT args getter each time
    // and supports two-way binding via update()
    const desc = Object.getOwnPropertyDescriptor(args, arg);
    const getter = desc?.get || (() => args[arg]);
    named[arg] = {
      get value() {
        const v = getter();
        // If the getter returns a mut cell, unwrap it to get the plain value
        if (v && v.__isMutCell) return v.value;
        if (v && v.__isReadonly) return v.__readonlyValue;
        return v;
      },
      set value(v: any) {
        // Check if the getter returns a mut cell — use its update method
        const current = getter();
        if (current && current.__isMutCell) {
          current.update(v);
          return;
        }
        // Allow setting via .value = for internal use
        if (desc?.set) {
          desc.set(v);
        }
      },
      update(v: any) {
        // Check if the getter returns a mut cell — use its update method
        const current = getter();
        if (current && current.__isMutCell) {
          current.update(v);
          return;
        }
        // Support updateRef() protocol for two-way binding
        if (desc?.set) {
          desc.set(v);
        }
      },
    };
  });

  return {
    capture() {
      return {
        positional: [],
        named,
      };
    },
  };
}

// =============================================================================
// Component Resolution
// =============================================================================

/**
 * Resolve a component by name from the Ember registry.
 */
function resolveComponent(name: string, owner: any): { factory: any; template: any; manager: any } | null {
  if (!owner || owner.isDestroyed || owner.isDestroying) return null;

  // Handle namespaced components: foo::bar::baz-bing -> foo/bar/baz-bing
  const normalizedName = name.replace(/::/g, '/');

  // Try component lookup
  let factory = owner.factoryFor(`component:${normalizedName}`);

  // If not found and name is PascalCase, try kebab-case.
  // GXT's runtime compiler transforms {{foo-bar}} to <FooBar /> which becomes
  // $_c("FooBar", ...). The Ember registry uses kebab-case names.
  if (!factory && /[A-Z]/.test(normalizedName)) {
    const kebabName = normalizedName
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    factory = owner.factoryFor(`component:${kebabName}`);
  }

  // GXT fix: When both a class-based component and a template-only component are
  // registered (e.g., via registerComponent in tests), the resolver may return the
  // template-only one since it's checked first. If the factory is template-only,
  // also check the registry's direct registrations for a class-based component.
  if (factory?.class) {
    const cls = factory.class;
    const isTO = cls.constructor?.name === 'TemplateOnlyComponentDefinition' ||
      (cls as any).__templateOnly === true ||
      (cls as any).moduleName === '@glimmer/component/template-only';
    if (isTO) {
      // Check if there's a class-based component in the direct registrations.
      // In test harness's registerComponent(), both owner.register (class-based)
      // and resolver.add (template-only) are called. The resolver takes precedence
      // in Ember's registry.resolve(), hiding the class-based registration.
      // We fix this by overriding the resolve cache with the class-based class.
      const registry = (owner as any).__registry__ || (owner as any).__container__?.registry;
      const regKey = `component:${normalizedName}`;
      const directReg = registry?.registrations?.[regKey];
      if (directReg && directReg !== cls) {
        // Override the resolve cache with the class-based component
        if (registry?._resolveCache) {
          registry._resolveCache[regKey] = directReg;
        }
        // Clear the factory manager cache so factoryFor picks up the new resolve
        const container = (owner as any).__container__;
        if (container?.factoryManagerCache) {
          delete container.factoryManagerCache[regKey];
        }
        // Re-resolve with the class-based component
        factory = owner.factoryFor(regKey);
      }
    }
  }

  // Template can be:
  // 1. Set on the ComponentClass via setComponentTemplate
  // 2. Registered in the container as template:components/name
  let template = null;

  if (factory?.class) {
    // Try to get template from the component class
    template = getComponentTemplate(factory.class);
  }

  if (!template) {
    // Fallback to registry lookup
    template = owner.lookup(`template:components/${normalizedName}`);
    // Also try kebab-case for PascalCase names
    if (!template && /[A-Z]/.test(normalizedName)) {
      const kebabName = normalizedName
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
      template = owner.lookup(`template:components/${kebabName}`);
    }
  }

  if (factory || template) {
    let manager = null;
    if (factory?.class) {
      // Check internal managers ONLY on the exact class (Input, Textarea)
      manager = globalThis.INTERNAL_MANAGERS.get(factory.class);

      // If not found, walk prototype chain for COMPONENT_MANAGERS only
      // (handles subclasses of setComponentManager targets like GlimmerishComponent)
      if (!manager) {
        let pointer: any = factory.class;
        while (pointer) {
          manager = globalThis.COMPONENT_MANAGERS.get(pointer);
          if (manager) break;
          try { pointer = Object.getPrototypeOf(pointer); } catch { break; }
          if (pointer === Object.prototype || pointer === Function.prototype) break;
        }
      }
    }

    return { factory, template, manager };
  }

  return null;
}

// =============================================================================
// Helper resolution for (helper) keyword
// =============================================================================

/**
 * Resolve an Ember helper by name to a callable function.
 * Returns (positional, named) => value, or null if not found.
 */
function _resolveEmberHelper(name: string, owner: any): ((positional: any[], named: any) => any) | null {
  if (!owner || owner.isDestroyed || owner.isDestroying) return null;

  // First check built-in keyword helpers
  const BUILTIN_HELPERS = (globalThis as any).__EMBER_BUILTIN_HELPERS__;
  if (BUILTIN_HELPERS && BUILTIN_HELPERS[name]) {
    const builtinHelper = BUILTIN_HELPERS[name];
    if (typeof builtinHelper === 'function') {
      return (positional: any[]) => builtinHelper(...positional);
    }
  }

  // Try container lookup
  const factory = owner.factoryFor?.(`helper:${name}`);
  if (factory) {
    const definition = factory.class || factory;
    const internalManager = getInternalHelperManager(definition);
    if (internalManager) {
      if (typeof internalManager.getDelegateFor === 'function') {
        const delegate = internalManager.getDelegateFor(owner);
        if (delegate && typeof delegate.createHelper === 'function') {
          if (delegate.capabilities?.hasValue) {
            return (positional: any[], named: any) => {
              const args = { positional, named: named || {} };
              const bucket = delegate.createHelper(definition, args);
              return delegate.getValue(bucket);
            };
          }
        }
      }
      if (typeof internalManager.getHelper === 'function') {
        return (positional: any[], named: any) => {
          return internalManager.getHelper(definition)({ positional, named: named || {} }, owner);
        };
      }
    }

    // Direct function call
    if (typeof definition === 'function') {
      return (positional: any[], named: any) => {
        try {
          return definition(positional, named || {});
        } catch (e) {
          if (_isAssertionLike(e)) throw e;
          return undefined;
        }
      };
    }

    // Factory create (classic Helper.extend)
    return (positional: any[], named: any) => {
      try {
        const instance = factory.create();
        if (instance && typeof instance.compute === 'function') {
          return instance.compute(positional, named || {});
        }
      } catch (e) { if (_isAssertionLike(e)) throw e; /* ignore */ }
      return undefined;
    };
  }

  // Fallback: direct lookup
  const maybeHelper = owner.lookup?.(`helper:${name}`);
  if (maybeHelper != null) {
    if (typeof maybeHelper.compute === 'function') {
      return (positional: any[], named: any) => maybeHelper.compute(positional, named || {});
    }
    if (typeof maybeHelper === 'function') {
      return (positional: any[], named: any) => maybeHelper(positional, named || {});
    }
  }

  return null;
}

// =============================================================================
// $_MANAGERS Implementation
// =============================================================================

// Cache the last known owner so reactive re-evaluations (when globalThis.owner
// may be null) can still resolve components and helpers.
let _cachedManagerOwner: any = null;
function getOwnerWithFallback(): any {
  const current = (globalThis as any).owner;
  if (current && !current.isDestroyed && !current.isDestroying) {
    _cachedManagerOwner = current;
    return current;
  }
  if (_cachedManagerOwner && (_cachedManagerOwner.isDestroyed || _cachedManagerOwner.isDestroying)) {
    _cachedManagerOwner = null;
  }
  return current || _cachedManagerOwner;
}

// Expose getOwnerWithFallback on globalThis so compile.ts can use the shared
// owner cache during reactive re-evaluations when globalThis.owner is null.
(globalThis as any).__getOwnerWithFallback = getOwnerWithFallback;

const $_MANAGERS = {
  component: {
    canHandle(komp: any): boolean {
      // Handle CurriedComponent (duck-type check)
      if (komp && komp.__isCurriedComponent) {
        return true;
      }

      // Handle string component names
      if (typeof komp === 'string') {
        // EmberHtmlRaw is always handled (triple-stache)
        if (komp === 'ember-html-raw') return true;
        const owner = getOwnerWithFallback();
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          const resolved = resolveComponent(komp, owner);
          if (resolved !== null) return true;
          // Convert PascalCase to kebab-case for helper lookup
          const kebab = komp
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
            .toLowerCase();
          // Also check for helpers — inline curlies like {{my-helper "foo"}} get
          // transformed to <MyHelper @__pos0__="foo" /> which GXT compiles as $_c.
          try {
            if (owner.factoryFor(`helper:${kebab}`) || owner.lookup(`helper:${kebab}`)) {
              return true;
            }
          } catch { /* ignore destroyed owner errors */ }
        }
        return false;
      }

      // Handle wrapped component functions from $_componentHelper or $_dc_ember
      if (typeof komp === 'function' && komp.__stringComponentName) {
        return true;
      }

      // Handle empty component marker (from $_dc_ember for falsy dynamic component names)
      if (typeof komp === 'function' && (komp as any).__emptyComponent) {
        return true;
      }

      // Handle component classes/factories
      if (globalThis.INTERNAL_MANAGERS.has(komp)) {
        return true;
      }
      if (globalThis.COMPONENT_MANAGERS.has(komp)) {
        return true;
      }
      // Walk prototype chain for INTERNAL_MANAGERS (e.g., TemplateOnlyComponentDefinition
      // instances where the manager is set on the prototype via setInternalComponentManager)
      if (komp !== null && komp !== undefined && typeof komp === 'object') {
        let proto = Object.getPrototypeOf(komp);
        while (proto && proto !== Object.prototype) {
          if (globalThis.INTERNAL_MANAGERS.has(proto)) return true;
          if (globalThis.COMPONENT_MANAGERS.has(proto)) return true;
          proto = Object.getPrototypeOf(proto);
        }
      }
      // Also check for component templates set directly on the object
      if (globalThis.COMPONENT_TEMPLATES?.has(komp)) {
        return true;
      }
      if (komp?.create && typeof komp.create === 'function') {
        return true;
      }
      return false;
    },

    handle(komp: any, args: any, fw: any, ctx: any): any {
      // Prefer the curried component's captured owner (set at creation time)
      // over the cached fallback, which may be stale from a different test.
      const curriedOwner = komp && komp.__isCurriedComponent && komp.__owner;
      const validCurriedOwner = curriedOwner && !curriedOwner.isDestroyed && !curriedOwner.isDestroying
        ? curriedOwner : null;
      const owner = validCurriedOwner || getOwnerWithFallback()
        || (ctx && ctx.owner);

      // Handle CurriedComponent — merge curried args with invocation args
      if (komp && komp.__isCurriedComponent) {
        // Build merged args: curried args are defaults, invocation args override
        const mergedArgs: any = {};

        // If we have a live componentGetter (from $_dc_ember), use it to create
        // getters that read from the LATEST curried component's args.
        const dcGetter = (globalThis as any).__dcComponentGetter;

        // Copy curried named args as lazy getters.
        // Read from cArgs[key] to see in-place updates.
        // Also use dcGetter when available for $_dc-rendered components.
        const cArgs = komp.__curriedArgs || {};
        for (const key of Object.keys(cArgs)) {
          if (dcGetter) {
            // Dynamic getter: reads from the LATEST curried component via $_dc getter
            Object.defineProperty(mergedArgs, key, {
              get: () => {
                let latest: any;
                try { latest = dcGetter(); } catch { latest = null; }
                if (latest && latest.__isCurriedComponent) {
                  const latestVal = latest.__curriedArgs?.[key];
                  return (typeof latestVal === 'function' && !latestVal.__isCurriedComponent) ? latestVal() : latestVal;
                }
                // Fallback: read from cArgs[key] for in-place updates
                const value = cArgs[key];
                return (typeof value === 'function' && !(value as any).__isCurriedComponent) ? (value as any)() : value;
              },
              enumerable: true,
              configurable: true,
            });
          } else {
            Object.defineProperty(mergedArgs, key, {
              get: () => {
                const value = cArgs[key];
                return (typeof value === 'function' && !(value as any).__isCurriedComponent) ? (value as any)() : value;
              },
              enumerable: true,
              configurable: true,
            });
          }
        }

        // Store curried named arg getters for mut source lookup.
        // The original getter (cArgs[key]) may have __mutParentCtx.
        const curriedMutSources: Record<string, Function> = {};
        for (const key of Object.keys(cArgs)) {
          const val = cArgs[key];
          if (typeof val === 'function' && !val.__isCurriedComponent && (val as any).__mutParentCtx) {
            curriedMutSources[key] = val;
          }
        }
        if (Object.keys(curriedMutSources).length > 0) {
          mergedArgs.__mutArgSources = { ...(mergedArgs.__mutArgSources || {}), ...curriedMutSources };
        }

        // Copy invocation args (these override curried args)
        if (args) {
          for (const key of Object.keys(args)) {
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(mergedArgs, key, desc);
            }
          }
          // Also copy non-enumerable GXT internal properties that are needed
          // for rendering ($slots, __thunkId). Note: skip $_scope to avoid
          // creating circular references (it will be set during rendering).
          for (const internalKey of ['$slots', '__thunkId']) {
            if (internalKey in args && !(internalKey in mergedArgs)) {
              mergedArgs[internalKey] = args[internalKey];
            }
          }
        }

        // Handle curried positional params
        const cPositionals = komp.__curriedPositionals || [];
        if (cPositionals.length > 0) {
          // Set up positional params from curried values
          // Only set them if invocation doesn't already provide __posCount__
          const invocationPosCount = typeof mergedArgs.__posCount__ === 'function'
            ? mergedArgs.__posCount__()
            : mergedArgs.__posCount__;

          if (invocationPosCount === undefined || invocationPosCount === 0) {
            // No invocation positionals — use curried positionals
            // Also store raw getters for mut support
            const posSourceGetters: any[] = [];
            for (let i = 0; i < cPositionals.length; i++) {
              const val = cPositionals[i];
              const posIdx = i;
              if (dcGetter) {
                Object.defineProperty(mergedArgs, `__pos${i}__`, {
                  get: () => {
                    let latest: any;
                    try { latest = dcGetter(); } catch { latest = null; }
                    if (latest && latest.__isCurriedComponent) {
                      const latestPos = latest.__curriedPositionals;
                      if (latestPos && posIdx < latestPos.length) {
                        const lv = latestPos[posIdx];
                        return (typeof lv === 'function' && !lv.__isCurriedComponent) ? lv() : lv;
                      }
                    }
                    const pv = cPositionals[posIdx];
                    return (typeof pv === 'function' && !pv.__isCurriedComponent) ? pv() : pv;
                  },
                  enumerable: true,
                  configurable: true,
                });
              } else {
                Object.defineProperty(mergedArgs, `__pos${i}__`, {
                  get: () => {
                    const pv = cPositionals[posIdx];
                    return (typeof pv === 'function' && !pv.__isCurriedComponent) ? pv() : pv;
                  },
                  enumerable: true,
                  configurable: true,
                });
              }
              // Store the raw getter for mut to use as a setter source
              if (typeof val === 'function' && !val.__isCurriedComponent) {
                posSourceGetters[i] = val;
              }
            }
            mergedArgs.__posCount__ = cPositionals.length;
            // Store positional source getters for mut support
            if (posSourceGetters.length > 0) {
              mergedArgs.__posSourceGetters = posSourceGetters;
            }
          }
          // If invocation provides positionals, they override (already in mergedArgs)
        }
        // Resolve the underlying component
        const resolvedKomp = komp.__name;
        // Temporarily ensure globalThis.owner is set for the recursive call,
        // so dash-prefixed components (e.g., "-inner-component") can be resolved.
        // Use the curried component's captured owner if the current globalThis.owner
        // is null or destroyed — this handles reactive re-evaluations correctly.
        const prevOwner = (globalThis as any).owner;
        const resolveOwner = (prevOwner && !prevOwner.isDestroyed && !prevOwner.isDestroying)
          ? prevOwner : owner;
        if (resolveOwner && resolveOwner !== prevOwner) {
          (globalThis as any).owner = resolveOwner;
        }
        try {
          return this.handle(resolvedKomp, mergedArgs, fw, ctx);
        } finally {
          if (resolveOwner !== prevOwner) {
            (globalThis as any).owner = prevOwner;
          }
        }
      }

      // Handle empty component marker (from $_dc_ember for falsy dynamic component names)
      // Renders nothing — used when {{component this.foo}} and this.foo is undefined/null
      if (typeof komp === 'function' && (komp as any).__emptyComponent) {
        return () => document.createComment('empty dynamic component');
      }

      // Handle wrapped component functions from $_componentHelper
      if (typeof komp === 'function' && komp.__stringComponentName) {
        // Create a CurriedComponent from the wrapped function
        const wrappedArgs: Record<string, any> = {};
        // The wrapped function merges its hash into passed args when called
        // We need to extract the hash. Call it with an empty object to get the curried args.
        const tempArgs: any = {};
        komp(tempArgs);
        // Now tempArgs has the curried named args
        for (const [key, value] of Object.entries(tempArgs)) {
          wrappedArgs[key] = value;
        }
        // Merge with invocation args
        if (args) {
          for (const key of Object.keys(args)) {
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(wrappedArgs, key, desc);
            }
          }
        }
        // Temporarily ensure globalThis.owner is set for the recursive call
        const prevOwner2 = (globalThis as any).owner;
        if (!prevOwner2 && owner) {
          (globalThis as any).owner = owner;
        }
        try {
          return this.handle(komp.__stringComponentName, wrappedArgs, fw, ctx);
        } finally {
          if (!prevOwner2 && owner) {
            (globalThis as any).owner = prevOwner2;
          }
        }
      }

      // EmberHtmlRaw — triple-stache {{{expr}}} compiled as <EmberHtmlRaw @value={{expr}} />
      // Returns a getter function marked __htmlRaw for reactive innerHTML updates
      if (komp === 'ember-html-raw') {
        // Capture the raw getter from args to preserve reactivity.
        // Accessing args.value directly evaluates the getter and loses reactivity.
        const desc = args ? Object.getOwnPropertyDescriptor(args, 'value') : null;
        const rawGetter = desc?.get || (() => args?.value);

        const htmlGetter = () => {
          // Call the getter each time to get the current reactive value
          const raw = rawGetter();
          const actual = typeof raw === 'function' ? raw() : raw;
          if (actual == null) return '';
          return actual?.toHTML?.() ?? String(actual);
        };
        (htmlGetter as any).__htmlRaw = true;
        return htmlGetter;
      }

      // Handle string-based component lookup
      if (typeof komp === 'string') {
        const result = handleStringComponent(komp, args, fw, ctx, owner);
        if (result !== null) return result;

        // Helper fallback — inline curlies like {{my-helper "foo"}} get transformed
        // to <MyHelper @__pos0__="foo" /> and compiled as $_c("my-helper", ...).
        // Resolve as helper if component wasn't found.
        if (owner) {
          try {
            // Convert PascalCase to kebab-case for helper lookup
            const helperName = komp
              .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
              .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
              .toLowerCase();
            const helperFactory = owner.factoryFor(`helper:${helperName}`);
            const helperLookup = !helperFactory ? owner.lookup(`helper:${helperName}`) : null;
            if (helperFactory || helperLookup) {
              // Reconstruct positional args from @__pos*__ named args
              const positional: any[] = [];
              const named: Record<string, any> = {};
              const posCount = typeof args?.__posCount__ === 'function' ? args.__posCount__() : args?.__posCount__;
              if (posCount > 0) {
                for (let i = 0; i < posCount; i++) {
                  const val = args[`__pos${i}__`];
                  positional.push(typeof val === 'function' ? val() : val);
                }
              }
              // Collect regular named args (skip internal @__pos*__ and $-prefixed)
              if (args) {
                for (const key of Object.keys(args)) {
                  if (!key.startsWith('__') && !key.startsWith('$')) {
                    const val = args[key];
                    named[key] = typeof val === 'function' ? val() : val;
                  }
                }
              }

              // Use $_maybeHelper to invoke the helper through Ember's protocol.
              // Wrap the result in a getter function so GXT can render it as a text node.
              // The component manager's handle() must return a function (not a raw value),
              // because GXT expects component results to be renderable.
              const maybeHelper = (globalThis as any).$_maybeHelper;
              if (typeof maybeHelper === 'function') {
                // Temporarily ensure globalThis.owner is set so $_maybeHelper can resolve
                const prevOwnerH = (globalThis as any).owner;
                if (!prevOwnerH && owner) {
                  (globalThis as any).owner = owner;
                }
                let helperResult: any;
                try {
                  helperResult = maybeHelper(helperName, positional, named, ctx);
                } finally {
                  if (!prevOwnerH && owner) {
                    (globalThis as any).owner = prevOwnerH;
                  }
                }
                // Return a getter so GXT renders the value as text
                return () => {
                  const val = helperResult;
                  if (val == null) return '';
                  return String(val);
                };
              }
            }
          } catch { /* ignore errors */ }
        }

        // Custom element fallback: names containing a dash that are not registered
        // as components or helpers should render as plain HTML custom elements.
        const kebabKomp = komp
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
          .toLowerCase();
        if (kebabKomp.includes('-')) {
          return renderCustomElement(kebabKomp, args, fw, ctx);
        }

        // Throw when a component name cannot be resolved (matches Ember's behavior).
        const notFoundErr = new Error(
          `Attempted to resolve \`${komp}\`, which was expected to be a component, but nothing was found. ` +
          `Could not find component named "${komp}" (no component or template with that name was found)`
        );
        // Capture for flushRenderErrors so assert.throws() can see it
        captureRenderError(notFoundErr);
        throw notFoundErr;
      }

      // Handle component with internal/custom manager (walk prototype chain)
      let manager = globalThis.INTERNAL_MANAGERS.get(komp) || globalThis.COMPONENT_MANAGERS.get(komp);
      if (!manager && komp !== null && komp !== undefined && typeof komp === 'object') {
        let proto = Object.getPrototypeOf(komp);
        while (proto && proto !== Object.prototype) {
          manager = globalThis.INTERNAL_MANAGERS.get(proto) || globalThis.COMPONENT_MANAGERS.get(proto);
          if (manager) break;
          proto = Object.getPrototypeOf(proto);
        }
      }
      if (manager) {
        // Template-only components have an internal manager without a create() method.
        // If the component has a GXT template, render it directly instead of
        // going through handleManagedComponent (which requires manager.create).
        if (typeof manager.create !== 'function') {
          const tpl = globalThis.COMPONENT_TEMPLATES?.get(komp);
          if (tpl) {
            let resolvedTpl = tpl;
            if (typeof resolvedTpl === 'function' && !resolvedTpl.render) {
              resolvedTpl = resolvedTpl(owner);
            }
            if (resolvedTpl?.render) {
              const $SLOTS = Symbol.for('gxt-slots');
              const renderCtx: any = {};
              if (args) {
                for (const key of Object.keys(args)) {
                  if (key === 'args' || key.startsWith('$')) continue;
                  const desc = Object.getOwnPropertyDescriptor(args, key);
                  if (desc) {
                    Object.defineProperty(renderCtx, key, desc);
                  }
                }
              }
              renderCtx.args = args || {};
              renderCtx.owner = owner;
              // Pass through slots for {{yield}} support
              const slots = args?.[$SLOTS] || args?.args?.[$SLOTS];
              if (slots) {
                renderCtx.$slots = slots;
                renderCtx[Symbol.for('gxt-slots')] = slots;
              }
              const container = document.createDocumentFragment();
              renderTemplateWithParentView(resolvedTpl, renderCtx, container, null);
              return container;
            }
          }
          // No template found and no create method — return empty
          return () => document.createComment('template-only (no template)');
        }
        return handleManagedComponent(komp, args, fw, ctx, manager, owner);
      }

      // Handle classic factory-based component
      if (komp?.create && typeof komp.create === 'function') {
        return handleClassicComponent(komp, args, fw, ctx, owner);
      }

      return null;
    },
  },

  helper: {
    canHandle(helper: any): boolean {
      if (typeof helper === 'string') {
        const owner = getOwnerWithFallback();
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          // Only claim we can handle if the helper actually exists
          const factory = owner.factoryFor?.(`helper:${helper}`);
          if (factory) return true;
          // Also try direct lookup (for helpers registered via application.register)
          try {
            const lookup = owner.lookup?.(`helper:${helper}`);
            if (lookup != null) return true;
          } catch { /* ignore destroyed owner errors */ }
          // Also check built-in helpers
          const BUILTIN_HELPERS = (globalThis as any).__EMBER_BUILTIN_HELPERS__;
          if (BUILTIN_HELPERS && BUILTIN_HELPERS[helper]) return true;
        }
      }
      // Also handle our curried ember helper functions
      if (typeof helper === 'function' && helper.__isEmberCurriedHelper) {
        return true;
      }
      // Plain functions can be used as helpers via the default helper manager
      // This handles scope-provided functions like (helper foo "arg") where
      // foo is a plain arrow function from strict-mode scope values
      if (typeof helper === 'function') {
        return true;
      }
      // Handle function/class-based helpers with a registered helper manager
      // Walk the prototype chain for both functions (classes) and objects
      if (helper != null && typeof helper === 'object') {
        let pointer = helper;
        while (pointer != null && pointer !== Object.prototype && pointer !== Function.prototype) {
          if ((globalThis as any).INTERNAL_HELPER_MANAGERS?.has(pointer)) return true;
          try {
            pointer = Object.getPrototypeOf(pointer);
          } catch {
            break;
          }
        }
      }
      return false;
    },

    handle(helper: any, params: any, hash: any): any {
      // Handle curried ember helper functions (from a previous (helper "name") call)
      if (typeof helper === 'function' && helper.__isEmberCurriedHelper) {
        const unwrapVal = (v: any) => typeof v === 'function' && !v.prototype ? v() : v;
        const isGxtInternal = (k: string) => k.startsWith('$_') || k === 'hash';
        const additionalPositionals = Array.isArray(params) ? params.map(unwrapVal) : [];
        const additionalNamed = hash && typeof hash === 'object'
          ? Object.fromEntries(Object.entries(hash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
          : {};

        // Create a new curried function with merged args
        const resolvedFn = helper.__resolvedFn;
        const prevPositionals = helper.__curriedPositionals || [];
        const prevNamed = helper.__curriedNamed || {};
        const mergedPositionals = [...prevPositionals, ...additionalPositionals];
        const mergedNamed = { ...prevNamed, ...additionalNamed };

        const newCurried = function __emberCurriedHelper(extraPos?: any[], extraHash?: any) {
          const finalPos = [...mergedPositionals, ...(Array.isArray(extraPos) ? extraPos.map(unwrapVal) : [])];
          const finalNamed = { ...mergedNamed, ...(extraHash || {}) };
          return resolvedFn(finalPos, finalNamed);
        };
        (newCurried as any).__isEmberCurriedHelper = true;
        (newCurried as any).__resolvedFn = resolvedFn;
        (newCurried as any).__curriedPositionals = mergedPositionals;
        (newCurried as any).__curriedNamed = mergedNamed;
        return newCurried;
      }

      // Handle function/object helpers with registered helper managers (e.g., defineSimpleHelper)
      if (helper != null && typeof helper !== 'string') {
        const internalManager = getInternalHelperManager(helper);
        if (internalManager) {
          const owner = getOwnerWithFallback();
          const unwrapVal = (v: any) => typeof v === 'function' && !v.prototype ? v() : v;
          const isGxtInternal = (k: string) => k.startsWith('$_') || k === 'hash';

          if (typeof internalManager.getDelegateFor === 'function') {
            const delegate = internalManager.getDelegateFor(owner);
            // Validate that capabilities were created via helperCapabilities()
            if (delegate && delegate.capabilities && !FROM_CAPABILITIES.has(delegate.capabilities)) {
              throw new Error(
                `Custom helper managers must have a \`capabilities\` property ` +
                `that is the result of calling the \`capabilities('3.23')\` ` +
                `(imported via \`import { capabilities } from '@ember/helper';\`). ` +
                `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
              );
            }
            if (delegate && typeof delegate.createHelper === 'function' && delegate.capabilities?.hasValue) {
              const curriedPositionals = Array.isArray(params) ? params.map(unwrapVal) : [];
              const curriedNamed = hash && typeof hash === 'object'
                ? Object.fromEntries(Object.entries(hash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
                : {};

              // Create a reactive args object that the helper instance holds a reference to.
              // On re-render we update its positional/named in place so getValue sees fresh data.
              const reactiveArgs: { positional: any[]; named: Record<string, any> } = {
                positional: [...curriedPositionals],
                named: { ...(curriedNamed as Record<string, any>) },
              };

              // Create the helper bucket once
              const bucket = delegate.createHelper(helper, reactiveArgs);

              // If the delegate has a destroyable, register it for cleanup
              if (delegate.capabilities?.hasDestroyable && typeof delegate.getDestroyable === 'function') {
                const destroyable = delegate.getDestroyable(bucket);
                if (destroyable) {
                  // Store for potential cleanup
                  (bucket as any).__destroyable = destroyable;
                }
              }

              const curried = function __emberCurriedHelper(additionalParams?: any[], additionalHash?: any) {
                // Update the reactive args object in place
                const newPositional = [
                  ...curriedPositionals,
                  ...(Array.isArray(additionalParams) ? additionalParams.map(unwrapVal) : [])
                ];
                const newNamed = {
                  ...(curriedNamed as Record<string, any>),
                  ...(additionalHash && typeof additionalHash === 'object'
                    ? Object.fromEntries(Object.entries(additionalHash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
                    : {}),
                };
                // Update in place so the bucket's reference to args sees changes
                reactiveArgs.positional = newPositional;
                reactiveArgs.named = newNamed;
                return delegate.getValue(bucket);
              };
              (curried as any).__isEmberCurriedHelper = true;
              (curried as any).__helperBucket = bucket;
              (curried as any).__helperDelegate = delegate;
              (curried as any).__reactiveArgs = reactiveArgs;
              return curried;
            }
          }

          // Fallback: use getHelper if available
          if (typeof internalManager.getHelper === 'function') {
            const resolvedFn = (positional: any[], named: any) => {
              return internalManager.getHelper(helper)({ positional, named: named || {} }, owner);
            };

            const curriedPositionals = Array.isArray(params) ? params.map(unwrapVal) : [];
            const curriedNamed = hash && typeof hash === 'object'
              ? Object.fromEntries(Object.entries(hash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
              : {};

            const curried = function __emberCurriedHelper(additionalParams?: any[], additionalHash?: any) {
              const mergedPositional = [
                ...curriedPositionals,
                ...(Array.isArray(additionalParams) ? additionalParams.map(unwrapVal) : [])
              ];
              const mergedNamed = {
                ...curriedNamed,
                ...(additionalHash && typeof additionalHash === 'object'
                  ? Object.fromEntries(Object.entries(additionalHash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
                  : {}),
              };
              return resolvedFn(mergedPositional, mergedNamed);
            };
            (curried as any).__isEmberCurriedHelper = true;
            (curried as any).__resolvedFn = resolvedFn;
            (curried as any).__curriedPositionals = curriedPositionals;
            (curried as any).__curriedNamed = curriedNamed;
            return curried;
          }
        }
      }

      if (typeof helper === 'string') {
        const owner = getOwnerWithFallback();

        // Unwrap GXT getter args for the helper, filtering out GXT internal keys
        // IMPORTANT: don't unwrap function-based helpers (they have prototype)
        const unwrapVal = (v: any) => typeof v === 'function' && !v.prototype ? v() : v;
        const isGxtInternal = (k: string) => k.startsWith('$_') || k === 'hash';

        // For string-based helpers, check if the definition has a delegate manager.
        // If so, create the helper bucket ONCE and reuse it across re-renders,
        // updating reactive args in place. This ensures:
        // 1. Helper instances are stable (tracked property mutations trigger re-renders)
        // 2. getValue is called on the same bucket (count increments correctly)
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          const factory = owner.factoryFor?.(`helper:${helper}`);
          if (factory) {
            const definition = factory.class || factory;
            const internalManager = getInternalHelperManager(definition);
            if (internalManager && typeof internalManager.getDelegateFor === 'function') {
              const delegate = internalManager.getDelegateFor(owner);
              // Validate that capabilities were created via helperCapabilities()
              if (delegate && delegate.capabilities && !FROM_CAPABILITIES.has(delegate.capabilities)) {
                throw new Error(
                  `Custom helper managers must have a \`capabilities\` property ` +
                  `that is the result of calling the \`capabilities('3.23')\` ` +
                  `(imported via \`import { capabilities } from '@ember/helper';\`). ` +
                  `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
                );
              }
              if (delegate && typeof delegate.createHelper === 'function' && delegate.capabilities?.hasValue) {
                const curriedPositionals = Array.isArray(params) ? params.map(unwrapVal) : [];
                const curriedNamed = hash && typeof hash === 'object'
                  ? Object.fromEntries(Object.entries(hash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
                  : {};

                // Create a reactive args object that the helper instance holds a reference to.
                // On re-render we update its positional/named in place so getValue sees fresh data.
                const reactiveArgs: { positional: any[]; named: Record<string, any> } = {
                  positional: [...curriedPositionals],
                  named: { ...(curriedNamed as Record<string, any>) },
                };

                // Create the helper bucket ONCE
                const bucket = delegate.createHelper(definition, reactiveArgs);

                // If the delegate has a destroyable, register it for cleanup
                if (delegate.capabilities?.hasDestroyable && typeof delegate.getDestroyable === 'function') {
                  const destroyable = delegate.getDestroyable(bucket);
                  if (destroyable) {
                    (bucket as any).__destroyable = destroyable;
                  }
                }

                const curried = function __emberCurriedHelper(additionalParams?: any[], additionalHash?: any) {
                  // Update the reactive args object in place
                  const newPositional = [
                    ...curriedPositionals,
                    ...(Array.isArray(additionalParams) ? additionalParams.map(unwrapVal) : [])
                  ];
                  const newNamed = {
                    ...(curriedNamed as Record<string, any>),
                    ...(additionalHash && typeof additionalHash === 'object'
                      ? Object.fromEntries(Object.entries(additionalHash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
                      : {}),
                  };
                  // Update in place so the bucket's reference to args sees changes
                  reactiveArgs.positional = newPositional;
                  reactiveArgs.named = newNamed;
                  return delegate.getValue(bucket);
                };
                (curried as any).__isEmberCurriedHelper = true;
                (curried as any).__helperBucket = bucket;
                (curried as any).__helperDelegate = delegate;
                (curried as any).__reactiveArgs = reactiveArgs;
                return curried;
              }
            }
          }
        }

        // Fallback: resolve via _resolveEmberHelper for built-in helpers and
        // helpers without a delegate manager
        const resolvedFn = _resolveEmberHelper(helper, owner);
        if (resolvedFn) {
          // Unwrap curried positional args from params
          const curriedPositionals = Array.isArray(params) ? params.map(unwrapVal) : [];

          // Unwrap curried named args from hash
          const curriedNamed = hash && typeof hash === 'object'
            ? Object.fromEntries(Object.entries(hash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
            : {};

          // Return a curried helper reference. GXT's $_helperHelper expects this
          // pattern so that {{helper (helper "name") extraArgs}} works correctly.
          // When rendered in content position ({{helper "name"}}), GXT will call
          // the curried function with no additional args, producing the value.
          const curried = function __emberCurriedHelper(additionalParams?: any[], additionalHash?: any) {
            const mergedPositional = [
              ...curriedPositionals,
              ...(Array.isArray(additionalParams) ? additionalParams.map(unwrapVal) : [])
            ];
            const mergedNamed = {
              ...curriedNamed,
              ...(additionalHash && typeof additionalHash === 'object'
                ? Object.fromEntries(Object.entries(additionalHash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
                : {}),
            };
            return resolvedFn(mergedPositional, mergedNamed);
          };
          (curried as any).__isEmberCurriedHelper = true;
          (curried as any).__resolvedFn = resolvedFn;
          (curried as any).__curriedPositionals = curriedPositionals;
          (curried as any).__curriedNamed = curriedNamed;
          return curried;
        }
      }
      return null;
    },
  },

  modifier: {
    // Cache modifier instances by element+modifier-name to support update lifecycle.
    // GXT's reactive system re-calls $_maybeModifier on each arg change inside a formula.
    // The formula pattern is: call destructor() → call fn(element) again.
    // We intercept this to provide install/update/destroy lifecycle.
    _cache: new WeakMap<HTMLElement, Map<string, { instance: any; manager: any; ModifierClass: any; pendingDestroy: boolean }>>(),

    // Built-in keyword modifiers resolved lazily.
    // The 'on' modifier from @glimmer/runtime is registered via
    // setInternalModifierManager and stored here for string-based resolution.
    _builtinModifiers: {} as Record<string, any>,
    _builtinResolved: false,

    canHandle(modifier: any): boolean {
      if (typeof modifier === 'string') {
        // Flush any pending builtin modifier registrations
        if (_pendingBuiltinModifiers.length > 0) {
          _flushPendingBuiltinModifiers();
        }
        // Check built-in keyword modifiers
        if ((this as any)._builtinModifiers[modifier]) return true;

        const owner = (globalThis as any).owner;
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          const factory = owner.factoryFor?.(`modifier:${modifier}`);
          if (factory) return true;

          // If the modifier name is a registered helper, throw an error.
          // Helpers cannot be used as modifiers (element position).
          try {
            const helperFactory = owner.factoryFor?.(`helper:${modifier}`);
            const helperLookup = !helperFactory ? owner.lookup?.(`helper:${modifier}`) : null;
            if (helperFactory || helperLookup) {
              const err = new Error(
                `Attempted to resolve \`${modifier}\`, which was expected to be a modifier, but nothing was found.`
              );
              captureRenderError(err);
              return true; // Claim we can handle it to prevent GXT default behavior
            }
          } catch (e: any) {
            if (e?.message?.includes('expected to be a modifier')) {
              captureRenderError(e);
              return true;
            }
          }
        }
        return false;
      }
      // Check if modifier has a registered modifier manager (via setModifierManager)
      if (modifier !== null && modifier !== undefined) {
        let pointer = modifier;
        const visited = new Set();
        while (pointer && !visited.has(pointer)) {
          visited.add(pointer);
          if (globalThis.INTERNAL_MODIFIER_MANAGERS.has(pointer)) return true;
          try {
            pointer = Object.getPrototypeOf(pointer);
          } catch {
            break;
          }
        }
      }
      return false;
    },

    handle(modifier: any, element: HTMLElement, props: any[], hashArgs: any): any {
      // During morph re-renders the template is rendered into a throwaway
      // container.  Instead of installing modifiers on temp elements (which
      // drifts add/remove counters), find the corresponding real DOM element
      // and update its cached modifier with fresh args.
      if ((globalThis as any).__gxtMorphRenderInProgress) {
        // During morph re-renders, collect modifier invocations so they can
        // be replayed as updates on real DOM elements after morphing.
        const pending = (globalThis as any).__gxtMorphModifierInvocations;
        if (pending) {
          pending.push({ modifier, element, props, hashArgs });
        }
        return undefined;
      }

      const owner = (globalThis as any).owner;
      if (!owner) return undefined;

      const self = this as any;

      // Helper to unwrap GXT getter args
      const unwrapGxtArg = (v: any) => (typeof v === 'function' && !v.prototype) ? v() : v;

      // Build args object
      const buildArgs = () => {
        const positional = (props || []).map(unwrapGxtArg);
        const rawHash = hashArgs ? (typeof hashArgs === 'function' ? hashArgs() : hashArgs) : {};
        const named: Record<string, any> = {};
        for (const key of Object.keys(rawHash)) {
          if (key.startsWith('$_') || key === 'hash') continue;
          const val = rawHash[key];
          named[key] = (typeof val === 'function' && !(val as any).__isCurriedComponent) ? (val as any)() : val;
        }
        return { positional, named };
      };

      // Check for cached modifier instance (update path)
      // Include the first positional arg in the key to differentiate multiple
      // {{on}} modifiers on the same element with different event names.
      const baseName = typeof modifier === 'string' ? modifier : (modifier?.name || String(modifier));
      const firstArg = props && props.length > 0 ? String(typeof props[0] === 'function' && !props[0].prototype ? props[0]() : props[0]) : '';
      const modKey = firstArg ? `${baseName}:${firstArg}` : baseName;
      const elCache = self._cache.get(element);
      if (elCache) {
        const cached = elCache.get(modKey);
        // If the modifier is already active and not pending destroy, return a no-op
        // destructor. This prevents double-creation when GXT evaluates the formula
        // multiple times during initial setup.
        if (cached && !cached.pendingDestroy) {
          return () => {
            cached.pendingDestroy = true;
            // Register for synchronous flush at end of sync cycle
            let pendingDestroys = (globalThis as any).__gxtPendingModifierDestroys;
            if (!pendingDestroys) {
              pendingDestroys = [];
              (globalThis as any).__gxtPendingModifierDestroys = pendingDestroys;
            }
            const destroyable = cached.isInternal ? cached.manager.getDestroyable?.(cached.instance) : null;
            pendingDestroys.push({
              cached,
              destroyable,
              element,
              modKey,
              cache: self._cache,
              isCustom: !cached.isInternal,
            });
          };
        }
        if (cached && cached.pendingDestroy) {
          // The destructor was called (GXT formula re-eval), but we haven't
          // actually destroyed yet — this is an update, not a reinstall.
          cached.pendingDestroy = false;
          // Mark that this modifier was updated in Phase 1 (GXT native reactivity)
          // for the current render pass.  The morph (Phase 2b) checks this to
          // avoid double-updating.  Uses the render pass ID so stale flags from
          // previous sync cycles are ignored.
          cached.__gxtUpdatedInSyncCycle = (globalThis as any).__gxtSyncCycleId || 0;

          if (cached.isInternal) {
            // Internal modifier manager update path
            // Use CURRENT props/hashArgs (from this handle() call), not the
            // stale closure from install time. GXT re-calls the modifier
            // function with fresh arguments on each formula re-evaluation.
            const freshPositional = (props || []).map((v: any) => {
              return { value: v, debugLabel: '' };
            });
            const rawHash = hashArgs ? (typeof hashArgs === 'function' ? hashArgs() : hashArgs) : {};
            const freshNamed: Record<string, any> = {};
            for (const k of Object.keys(rawHash)) {
              if (k.startsWith('$_') || k === 'hash') continue;
              const val = rawHash[k];
              const resolved = (typeof val === 'function' && !(val as any).__isCurriedComponent) ? val() : val;
              freshNamed[k] = { value: resolved, debugLabel: k };
            }

            if (cached.instance.args) {
              // Update positional refs in-place
              for (let i = 0; i < freshPositional.length; i++) {
                if (cached.instance.args.positional[i]) {
                  cached.instance.args.positional[i].value = freshPositional[i].value;
                } else {
                  cached.instance.args.positional.push(freshPositional[i]);
                }
              }
              // Update named refs in-place
              for (const k of Object.keys(freshNamed)) {
                if (cached.instance.args.named[k]) {
                  cached.instance.args.named[k].value = freshNamed[k].value;
                } else {
                  cached.instance.args.named[k] = freshNamed[k];
                }
              }
            }
            if (cached.manager.update) {
              cached.manager.update(cached.instance);
            }
          } else {
            // Custom modifier manager update path
            const args = buildArgs();
            if (cached.manager.updateModifier) {
              cached.manager.updateModifier(cached.instance, args);
            }
          }

          // Return a destructor that marks pending destroy
          return () => {
            cached.pendingDestroy = true;
            // Register for synchronous flush at end of sync cycle
            let pendingDestroys = (globalThis as any).__gxtPendingModifierDestroys;
            if (!pendingDestroys) {
              pendingDestroys = [];
              (globalThis as any).__gxtPendingModifierDestroys = pendingDestroys;
            }
            const destroyable = cached.isInternal ? cached.manager.getDestroyable?.(cached.instance) : null;
            pendingDestroys.push({
              cached,
              destroyable,
              element,
              modKey,
              cache: self._cache,
              isCustom: !cached.isInternal,
            });
          };
        }
      }

      // First time: resolve modifier class and create instance

      // Resolve built-in keyword modifiers (e.g., "on" → the on modifier object)
      if (typeof modifier === 'string' && self._builtinModifiers[modifier]) {
        modifier = self._builtinModifiers[modifier];
      }

      // Handle curried modifiers (from the (modifier) keyword) — they are
      // self-contained functions that already know how to install themselves.
      if (typeof modifier === 'function' && (modifier as any).__isCurriedModifier) {
        const positional = (props || []).map(unwrapGxtArg);
        const rawHash = hashArgs ? (typeof hashArgs === 'function' ? hashArgs() : hashArgs) : {};
        const namedArgs: Record<string, any> = {};
        for (const key of Object.keys(rawHash)) {
          if (key.startsWith('$_') || key === 'hash') continue;
          const val = rawHash[key];
          namedArgs[key] = (typeof val === 'function' && !(val as any).__isCurriedComponent) ? (val as any)() : val;
        }
        return modifier(element, positional, namedArgs);
      }

      // Resolve modifier class from the owner registry if it's a string
      let ModifierClass: any;
      if (typeof modifier === 'string') {
        const factory = owner.factoryFor?.(`modifier:${modifier}`);
        if (!factory) return undefined;
        ModifierClass = factory.class;
      } else {
        ModifierClass = modifier;
      }

      // Walk the prototype chain to find the manager factory
      let managerFactory: any = null;
      let pointer = ModifierClass;
      const visited = new Set();
      while (pointer && !visited.has(pointer)) {
        visited.add(pointer);
        const mgr = globalThis.INTERNAL_MODIFIER_MANAGERS.get(pointer);
        if (mgr) {
          managerFactory = mgr;
          break;
        }
        try {
          pointer = Object.getPrototypeOf(pointer);
        } catch {
          break;
        }
      }

      if (!managerFactory) return undefined;

      // managerFactory can be either a factory function (from setModifierManager)
      // or a manager instance (from setInternalModifierManager)
      let manager: any;
      if (typeof managerFactory === 'function') {
        manager = managerFactory(owner);
      } else {
        manager = managerFactory;
      }

      if (!manager) return undefined;

      // Detect if this is an internal modifier manager (like OnModifierManager).
      // Internal managers use create/install/update/getDestroyable API.
      // Custom managers use createModifier/installModifier/updateModifier/destroyModifier.
      const isInternalManager = typeof manager.create === 'function'
        && typeof manager.install === 'function'
        && typeof manager.getDestroyable === 'function'
        && !manager.createModifier;

      if (isInternalManager) {
        // Internal modifier manager path (e.g., {{on}} modifier)
        // Build CapturedArguments-like object with refs.
        // IMPORTANT: GXT compiles modifier positional args as direct values
        // (not reactive getters), so we must NOT call them.  The old heuristic
        // `typeof v === 'function' && !v.prototype` was wrong because concise
        // methods and arrow-function callbacks also lack `.prototype`.
        // Instead, just wrap every value in a ref without unwrapping.
        const buildCapturedArgs = () => {
          // Positional args: GXT compiles modifier positionals as direct values
          // (e.g., "click", this.callback), NOT reactive getters. We must NOT
          // call them — concise methods and arrow callbacks lack .prototype and
          // would be incorrectly invoked by the old heuristic.
          const positional = (props || []).map((v: any) => {
            return { value: v, debugLabel: '' };
          });
          // Named args: GXT wraps dynamic named values in () => getters
          // (e.g., once: () => this.once), but passes literals directly
          // (e.g., once: true). Unwrap getter functions for named args only.
          const rawHash = hashArgs ? (typeof hashArgs === 'function' ? hashArgs() : hashArgs) : {};
          const named: Record<string, any> = {};
          for (const k of Object.keys(rawHash)) {
            if (k.startsWith('$_') || k === 'hash') continue;
            const val = rawHash[k];
            const resolved = (typeof val === 'function' && !(val as any).__isCurriedComponent) ? val() : val;
            named[k] = { value: resolved, debugLabel: k };
          }
          return { positional, named };
        };

        const capturedArgs = buildCapturedArgs();
        const state = manager.create(owner, element, ModifierClass, capturedArgs);
        manager.install(state);

        // Cache the state for subsequent update calls
        let cache = self._cache.get(element);
        if (!cache) {
          cache = new Map();
          self._cache.set(element, cache);
        }
        const cached = { instance: state, manager, ModifierClass, pendingDestroy: false, isInternal: true, _buildCapturedArgs: buildCapturedArgs };
        cache.set(modKey, cached);

        // Handle destroyable
        const destroyable = manager.getDestroyable(state);

        // Return a destructor.
        // The deferred approach (Promise.resolve) distinguishes formula
        // re-evaluation (destructor -> handle within one synchronous block)
        // from actual element removal (destructor with no subsequent handle).
        // But because test assertions run before microtasks, we need to
        // detect element removal synchronously.
        //
        // Strategy: mark pendingDestroy, then at end of current GXT sync
        // cycle, flush any still-pending destroys synchronously.
        return () => {
          cached.pendingDestroy = true;
          // Register for synchronous flush at end of sync cycle
          let pendingDestroys = (globalThis as any).__gxtPendingModifierDestroys;
          if (!pendingDestroys) {
            pendingDestroys = [];
            (globalThis as any).__gxtPendingModifierDestroys = pendingDestroys;
          }
          pendingDestroys.push({
            cached,
            destroyable,
            element,
            modKey,
            cache: self._cache,
          });
        };
      }

      // Custom modifier manager path
      // Validate capabilities - must be from modifierCapabilities()
      const caps = manager.capabilities;
      if (caps && !FROM_CAPABILITIES.has(caps)) {
        const err = new Error(
          "Custom modifier managers must have a `capabilities` property that is the result of calling the `capabilities('3.22')` (imported via `import { capabilities } from '@ember/modifier';`). Received: " +
          JSON.stringify(caps)
        );
        captureRenderError(err);
        throw err;
      }

      if (!caps) {
        const err = new Error(
          "Custom modifier managers must have a `capabilities` property that is the result of calling the `capabilities('3.22')` (imported via `import { capabilities } from '@ember/modifier';`). "
        );
        captureRenderError(err);
        throw err;
      }

      // Install the modifier immediately.
      const args = buildArgs();
      const instance = manager.createModifier(ModifierClass, args);
      manager.installModifier(instance, element, args);

      // Cache the instance for subsequent update calls
      let cache = self._cache.get(element);
      if (!cache) {
        cache = new Map();
        self._cache.set(element, cache);
      }
      const cached = { instance, manager, ModifierClass, pendingDestroy: false };
      cache.set(modKey, cached);

      // Return a destructor. GXT calls this before re-evaluating the formula
      // (for updates) and also during final teardown.
      return () => {
        cached.pendingDestroy = true;
        // Register for synchronous flush at end of sync cycle
        let pendingDestroys = (globalThis as any).__gxtPendingModifierDestroys;
        if (!pendingDestroys) {
          pendingDestroys = [];
          (globalThis as any).__gxtPendingModifierDestroys = pendingDestroys;
        }
        pendingDestroys.push({
          cached,
          destroyable: null,
          element,
          modKey,
          cache: self._cache,
          isCustom: true,
        });
      };
    },
  },
};

// =============================================================================
// Component Handling by Type
// =============================================================================

/**
 * Handle a string-based component name (e.g., 'foo-bar').
 */
function handleStringComponent(
  name: string,
  args: any,
  fw: any,
  ctx: any,
  owner: any
): (() => any) | null {
  const resolved = resolveComponent(name, owner);
  if (!resolved) {
    return null;
  }

  const { factory, template, manager } = resolved;

  // If this component has an internal manager (e.g., Input, Textarea),
  // delegate to handleManagedComponent which properly creates the instance
  // via the manager's create() method with CapturedArguments.
  if (manager && factory?.class) {
    // Check if this is a custom component manager (from setComponentManager)
    // These are factory functions, not internal manager objects
    if (typeof manager === 'function') {
      // Eagerly validate capabilities so the error propagates to assert.throws()
      // via the captureRenderError / flushRenderErrors mechanism.
      const eagerManager = manager(owner);
      if (eagerManager) {
        const caps = eagerManager.capabilities;
        if (caps && !FROM_CAPABILITIES.has(caps)) {
          const err = new Error(
            "Custom component managers must have a `capabilities` property " +
            "that is the result of calling the `capabilities('3.13')` " +
            "(imported via `import { capabilities } from '@ember/component';`). " +
            "Received: `" + JSON.stringify(caps) + "`"
          );
          captureRenderError(err);
          return () => null;
        }
      }
      return handleCustomManagedComponent(factory.class, args, fw, ctx, manager, owner, template, eagerManager);
    }
    // Internal manager (Input, Textarea)
    return handleManagedComponent(factory.class, args, fw, ctx, manager, owner);
  }

  // Handle positional params mapping
  // If the component has static positionalParams, map __pos0__, __pos1__, etc. to named args
  const posCount = args.__posCount__;
  if (posCount !== undefined && factory?.class) {
    const positionalParams = factory.class.positionalParams;
    const count = typeof posCount === 'function' ? posCount() : posCount;

    if (positionalParams && Array.isArray(positionalParams)) {
      // positionalParams is an array like ['name', 'age'] - map each positional arg to its name
      // Also build mut source mapping for two-way binding support
      const posSourceGetters = args.__posSourceGetters || [];
      const mutArgSources: Record<string, Function> = {};
      for (let i = 0; i < positionalParams.length && i < count; i++) {
        const paramName = positionalParams[i];
        const posKey = `__pos${i}__`;
        // Capture the getter if available (for reactivity), otherwise use the value directly
        const posDesc = Object.getOwnPropertyDescriptor(args, posKey);
        const posGetter = posDesc?.get;
        const rawValue = posGetter ? posGetter() : args[posKey];

        // Store the original source getter for mut support
        if (posSourceGetters[i]) {
          mutArgSources[paramName] = posSourceGetters[i];
        }

        // Check for conflict between positional param and hash argument
        if (paramName in args && rawValue !== undefined) {
          assert(
            `You cannot specify both a positional param (at position ${i}) and the hash argument \`${paramName}\`.`,
            false
          );
        }

        // Only set if not already defined as a named arg
        if (!(paramName in args) && rawValue !== undefined) {
          const getValue = posGetter
            ? posGetter  // Use the original getter for reactivity
            : () => {
                const v = (typeof rawValue === 'function' && !rawValue.__isCurriedComponent) ? rawValue() : rawValue;
                return v;
              };
          Object.defineProperty(args, paramName, {
            get: getValue,
            enumerable: true,
            configurable: true,
          });
        }

        // Remove the __posN__ marker
        delete args[posKey];
      }
      // Store mut arg sources on args for the component to pick up
      if (Object.keys(mutArgSources).length > 0) {
        args.__mutArgSources = mutArgSources;
      }
    } else if (typeof positionalParams === 'string') {
      // positionalParams is a string like 'names' - collect all positional args into an array
      const paramName = positionalParams;

      // Check for conflict between positional params and hash argument
      if (paramName in args && count > 0) {
        assert(
          `You cannot specify positional parameters and the hash argument \`${paramName}\`.`,
          false
        );
      }

      // Only set if not already defined as a named arg
      if (!(paramName in args)) {
        // Collect all positional values into an array
        // Store references to the getters since we'll delete __posN__ keys
        const posGetters: Function[] = [];
        for (let i = 0; i < count; i++) {
          const posKey = `__pos${i}__`;
          const rawValue = args[posKey];
          if (rawValue !== undefined) {
            const desc = Object.getOwnPropertyDescriptor(args, posKey);
            if (desc?.get) {
              posGetters.push(desc.get);
            } else {
              posGetters.push(typeof rawValue === 'function' ? rawValue : () => rawValue);
            }
          }
        }

        const getValues = () => {
          return posGetters.map(getter => getter());
        };

        Object.defineProperty(args, paramName, {
          get: getValues,
          enumerable: true,
          configurable: true,
        });
      }

      // Remove all __posN__ markers
      for (let i = 0; i < count; i++) {
        delete args[`__pos${i}__`];
      }
    }
    // Remove the __posCount__ marker
    delete args.__posCount__;
  }

  // Build mut arg sources from named args that have __mutParentCtx.
  // This handles (component "foo" val=this.model.val2) where val is a hash arg
  // with a getter that has __mutParentCtx for two-way binding support.
  if (!args.__mutArgSources) {
    const namedMutSources: Record<string, Function> = {};
    for (const key of Object.keys(args)) {
      if (key.startsWith('__') || key === '$slots') continue;
      const desc = Object.getOwnPropertyDescriptor(args, key);
      if (desc?.get && (desc.get as any).__mutParentCtx) {
        namedMutSources[key] = desc.get;
      } else if (typeof args[key] === 'function' && (args[key] as any).__mutParentCtx) {
        namedMutSources[key] = args[key];
      }
    }
    if (Object.keys(namedMutSources).length > 0) {
      args.__mutArgSources = namedMutSources;
    }
  } else {
    // Merge named args mut sources into existing ones (from positional params)
    for (const key of Object.keys(args)) {
      if (key.startsWith('__') || key === '$slots') continue;
      if (args.__mutArgSources[key]) continue; // positional already set
      const desc = Object.getOwnPropertyDescriptor(args, key);
      if (desc?.get && (desc.get as any).__mutParentCtx) {
        args.__mutArgSources[key] = desc.get;
      } else if (typeof args[key] === 'function' && (args[key] as any).__mutParentCtx) {
        args.__mutArgSources[key] = args[key];
      }
    }
  }

  // Capture parentView at closure creation time, not at invocation time.
  // GXT may re-evaluate this closure (e.g., for formula tracking) after the
  // parentView stack has been popped, so we cannot rely on getCurrentParentView()
  // inside the closure.
  const capturedParentView = getCurrentParentView();

  // Cache the rendered result. GXT may re-evaluate this closure during
  // formula tracking. When that happens, return the cached DOM result
  // instead of creating duplicate component instances.
  let _cachedResult: any = undefined;
  let _cachedRenderPassId: number = -1;

  return () => {
    // If this closure was already evaluated in this render pass, return cached result.
    // This prevents duplicate component instances when GXT re-evaluates formulas.
    const currentRenderPassId = (globalThis as any).__emberRenderPassId || 0;
    if (_cachedResult !== undefined && _cachedRenderPassId === currentRenderPassId) {
      return _cachedResult;
    }

    try {
    // Check if this is a template-only component (no backing class).
    // Template-only components have an internal manager set on them and
    // don't need an instance. Just render the template directly.
    const isTemplateOnly = factory?.class &&
      (factory.class.constructor?.name === 'TemplateOnlyComponentDefinition' ||
       factory.class.__templateOnly === true ||
       factory.class.moduleName === '@glimmer/component/template-only' ||
       (globalThis.INTERNAL_MANAGERS?.has?.(factory.class) &&
        !factory.class.prototype?.init));

    // Get or create cached instance
    const instance = (factory && !isTemplateOnly) ?
      getCachedOrCreateInstance(factory, args, factory.class, owner, capturedParentView) :
      null;


    // Resolve template
    let resolvedTemplate = template;
    if (!resolvedTemplate && instance) {
      // Check for layoutName property (looks up template by name)
      if (instance.layoutName && owner) {
        resolvedTemplate = owner.lookup(`template:${instance.layoutName}`) ||
                           owner.lookup(`template:components/${instance.layoutName}`);
      }
      // Check for layout property (directly assigned template)
      if (!resolvedTemplate && instance.layout) {
        resolvedTemplate = instance.layout;
      }
      // Fallback to template registry
      if (!resolvedTemplate) {
        resolvedTemplate = getComponentTemplate(instance) ||
                           getComponentTemplate(instance.constructor) ||
                           getComponentTemplate(factory?.class);
      }
    }

    // If template is a factory function, call it to get the actual template
    if (typeof resolvedTemplate === 'function' && !resolvedTemplate.render) {
      resolvedTemplate = resolvedTemplate(owner);
    }

    // DEBUG: log when template is missing for a component that should have one
    if (!resolvedTemplate?.render) {
      // Component without a template - create a default template that yields block content
      resolvedTemplate = {
        __gxtCompiled: true,
        render(ctx: any, container: Element) {
          // Render the block content (slots.default)
          const slots = ctx.$slots || ctx[Symbol.for('gxt-slots')] || {};
          if (typeof slots.default === 'function') {
            const result = slots.default(ctx);
            // Append results to container
            if (Array.isArray(result)) {
              for (const item of result) {
                if (item instanceof Node) {
                  container.appendChild(item);
                } else if (typeof item === 'string') {
                  container.appendChild(document.createTextNode(item));
                }
              }
            }
          }
          return { nodes: Array.from(container.childNodes) };
        }
      };
    }

    // Check if classic component needs wrapper
    const isClassic = instance && (
      typeof instance.trigger === 'function' ||
      typeof instance._transitionTo === 'function'
    );

    let result;
    if (isClassic) {
      result = renderClassicComponent(instance, resolvedTemplate, args, fw, factory?.class, owner);
    } else {
      result = renderGlimmerComponent(instance, resolvedTemplate, args, fw, owner);
    }

    // Cache the result for this render pass to prevent duplicate renders
    _cachedResult = result;
    _cachedRenderPassId = currentRenderPassId;
    return result;
    } catch (e) {
      // Capture Error instances (init throws, assertion failures, etc.) so they
      // propagate through flushRenderErrors even if GXT catches the exception
      // internally. Non-Error values (like expectAssertion's BREAK sentinel)
      // must NOT be captured — they are control flow signals that need to
      // propagate directly to their catch handler.
      if (e instanceof Error) {
        captureRenderError(e);
      }
      throw e;
    }
  };
}

// Cache for custom-managed component instances, keyed by ComponentClass -> array of pool entries
const _customManagedPool = new Map<any, { instance: any; context: any; manager: any; claimed: boolean; lastPassId: number }[]>();

// Clear custom managed pool between tests
const _origClearPools = (globalThis as any).__gxtClearInstancePools;
(globalThis as any).__gxtClearInstancePools = function() {
  if (typeof _origClearPools === 'function') _origClearPools();
  _customManagedPool.clear();
  _customManagedInstances.length = 0;
};

/**
 * Handle a component with a custom component manager (from setComponentManager).
 * The manager factory function is called with (owner) to get the actual manager,
 * which implements createComponent(Factory, args) and getContext(instance).
 */
function handleCustomManagedComponent(
  ComponentClass: any,
  args: any,
  fw: any,
  ctx: any,
  managerFactory: Function,
  owner: any,
  template: any,
  preCreatedManager?: any
): () => any {
  return () => {
    // Use pre-created manager if available (from eager validation in handleStringComponent),
    // otherwise invoke the factory.
    const actualManager = preCreatedManager || managerFactory(owner);
    if (!actualManager || typeof actualManager.createComponent !== 'function') {
      return null;
    }

    // Build named/positional args from the GXT args object
    const { namedArgs, positionalArgs, liveNamed, livePositional } = buildCustomManagedArgs(args);

    // Check for a cached instance from a previous render pass (for instance reuse on re-render)
    const currentPassId = (globalThis as any).__emberRenderPassId || 0;
    let pool = _customManagedPool.get(ComponentClass);
    if (!pool) {
      pool = [];
      _customManagedPool.set(ComponentClass, pool);
    }
    // Reset claimed flags on new pass
    if (pool.length > 0 && (pool as any).__lastPassId !== currentPassId) {
      (pool as any).__lastPassId = currentPassId;
      for (const entry of pool) entry.claimed = false;
    }

    let cachedEntry = pool.find(e => !e.claimed);
    let instance: any;
    let context: any;
    let isRerender = false;
    const asyncCaps = actualManager.capabilities;

    if (cachedEntry) {
      // Reuse existing instance — call updateComponent
      cachedEntry.claimed = true;
      instance = cachedEntry.instance;
      context = cachedEntry.context;
      isRerender = true;

      // Notify the manager of updated args
      const newCapturedArgs = { named: namedArgs, positional: positionalArgs };
      if (typeof actualManager.updateComponent === 'function') {
        actualManager.updateComponent(instance, newCapturedArgs);
      }

      // Update live named/positional on instance.args (non-enumerable to hide from user code)
      if (instance?.args) {
        Object.defineProperty(instance.args, 'named', { value: liveNamed, writable: true, enumerable: false, configurable: true });
        Object.defineProperty(instance.args, 'positional', { value: livePositional, writable: true, enumerable: false, configurable: true });
      }

      // Call didUpdateComponent if supported
      if (asyncCaps?.asyncLifecycleCallbacks && typeof actualManager.didUpdateComponent === 'function') {
        actualManager.didUpdateComponent(instance);
      }
    } else {
      // Create new instance
      const capturedArgs = { named: liveNamed, positional: livePositional };
      instance = actualManager.createComponent(ComponentClass, capturedArgs);

      // Get the rendering context (may be null for template-only custom components)
      context = typeof actualManager.getContext === 'function'
        ? actualManager.getContext(instance)
        : instance;

      // Cache for future re-renders
      pool.push({ instance, context, manager: actualManager, claimed: true, lastPassId: currentPassId });

      // Call didCreateComponent if supported
      if (asyncCaps?.asyncLifecycleCallbacks && typeof actualManager.didCreateComponent === 'function') {
        actualManager.didCreateComponent(instance);
      }
    }

    // Resolve the template
    let resolvedTemplate = template;
    if (!resolvedTemplate) {
      resolvedTemplate = getComponentTemplate(ComponentClass);
    }
    if (typeof resolvedTemplate === 'function' && !resolvedTemplate.render) {
      resolvedTemplate = resolvedTemplate(owner);
    }
    if (!resolvedTemplate?.render) {
      return null;
    }

    // Render the template with the context
    const container = document.createDocumentFragment();
    const renderContext = createRenderContext(context, args, fw, owner);

    // Augment renderContext.args with named/positional sub-objects (non-enumerable)
    if (renderContext.args) {
      Object.defineProperty(renderContext.args, 'named', { value: liveNamed, writable: true, enumerable: false, configurable: true });
      Object.defineProperty(renderContext.args, 'positional', { value: livePositional, writable: true, enumerable: false, configurable: true });
    }
    if (instance && instance !== context && instance.args) {
      Object.defineProperty(instance.args, 'named', { value: liveNamed, writable: true, enumerable: false, configurable: true });
      Object.defineProperty(instance.args, 'positional', { value: livePositional, writable: true, enumerable: false, configurable: true });
    }

    renderTemplateWithParentView(resolvedTemplate, renderContext, container, context);

    // Set up destructor on initial render only
    if (!isRerender && asyncCaps?.destructor && typeof actualManager.destroyComponent === 'function') {
      const destroyFn = () => {
        actualManager.destroyComponent(instance);
        // Remove from pool
        const idx = pool!.findIndex(e => e.instance === instance);
        if (idx >= 0) pool!.splice(idx, 1);
      };
      const firstChild = container.firstChild;
      if (firstChild) {
        _customManagedInstances.push({ node: firstChild, destroyFn, destroyed: false });
      }
    }

    return createGxtResult(container);
  };
}

/**
 * Build named/positional args from GXT args object for custom-managed components.
 */
function buildCustomManagedArgs(args: any) {
  const namedArgs: Record<string, any> = {};
  const positionalArgs: any[] = [];
  const argGetters: Record<string, () => any> = {};
  const posGetters: (() => any)[] = [];

  if (args && typeof args === 'object') {
    const keys = Object.keys(args);
    const posCount = args.__posCount__;
    const resolvedPosCount = typeof posCount === 'function' ? posCount() : (posCount || 0);
    for (let i = 0; i < resolvedPosCount; i++) {
      const posKey = `__pos${i}__`;
      const desc = Object.getOwnPropertyDescriptor(args, posKey);
      const getter = desc?.get;
      const value = getter ? getter() : args[posKey];
      positionalArgs.push(typeof value === 'function' && !value.prototype ? value() : value);
      if (getter) {
        posGetters.push(() => { const v = getter(); return typeof v === 'function' && !v.prototype ? v() : v; });
      } else {
        const argRef = args[posKey];
        posGetters.push(typeof argRef === 'function' && !argRef.prototype ? () => argRef() : () => argRef);
      }
    }

    for (const key of keys) {
      if (key.startsWith('__') || key.startsWith('$') || key === 'class') continue;
      const desc = Object.getOwnPropertyDescriptor(args, key);
      const getter = desc?.get;
      const value = getter ? getter() : args[key];
      if (typeof value === 'function' && !value.prototype && !value.__isCurriedComponent && !value.__isMutCell) {
        namedArgs[key] = value();
        argGetters[key] = value;
      } else {
        namedArgs[key] = value;
        if (getter) {
          argGetters[key] = () => { const v = getter(); return typeof v === 'function' && !v.prototype ? v() : v; };
        }
      }
    }
  }

  const liveNamed: Record<string, any> = {};
  for (const key of Object.keys(namedArgs)) {
    if (argGetters[key]) {
      Object.defineProperty(liveNamed, key, { get: argGetters[key], enumerable: true, configurable: true });
    } else {
      liveNamed[key] = namedArgs[key];
    }
  }
  const livePositional: any[] = [];
  for (let i = 0; i < positionalArgs.length; i++) {
    Object.defineProperty(livePositional, i, { get: posGetters[i], enumerable: true, configurable: true });
  }
  Object.defineProperty(livePositional, 'length', { value: positionalArgs.length, writable: true });

  return { namedArgs, positionalArgs, liveNamed, livePositional, argGetters, posGetters };
}

/**
 * Render an unknown dash-cased tag name as a plain HTML custom element.
 * Applies named args as attributes and renders block children as innerHTML.
 */
function renderCustomElement(
  tagName: string,
  args: any,
  fw: any,
  ctx: any
): () => any {
  return () => {
    const el = document.createElement(tagName);
    const gxtEffect = (globalThis as any).__gxtEffect || ((fn: Function) => fn());

    if (args) {
      for (const key of Object.keys(args)) {
        if (key.startsWith('__') || key.startsWith('$')) continue;
        const desc = Object.getOwnPropertyDescriptor(args, key);
        const getter = desc?.get || (() => args[key]);
        gxtEffect(() => {
          const val = getter();
          if (val !== undefined && val !== null && val !== false) {
            el.setAttribute(key, String(val));
          } else if (val === false) {
            el.removeAttribute(key);
          }
        });
      }
    }

    if (fw && Array.isArray(fw)) {
      const fwProps = fw[0];
      if (Array.isArray(fwProps)) {
        for (const [key, value] of fwProps) {
          const attrKey = key === '' ? 'class' : key;
          gxtEffect(() => {
            const resolved = typeof value === 'function' ? value() : value;
            if (resolved !== undefined && resolved !== null && resolved !== false) {
              el.setAttribute(attrKey, String(resolved));
            }
          });
        }
      }
      const fwAttrs = fw[1];
      if (Array.isArray(fwAttrs)) {
        for (const [key, value] of fwAttrs) {
          if (key.startsWith('@')) continue;
          gxtEffect(() => {
            const resolved = typeof value === 'function' ? value() : value;
            if (resolved !== undefined && resolved !== null && resolved !== false) {
              el.setAttribute(key, String(resolved));
            }
          });
        }
      }
      const fwEvents = fw[2];
      if (Array.isArray(fwEvents)) {
        for (const [eventName, handler] of fwEvents) {
          if (typeof handler === 'function') {
            if (eventName === '0') {
              // ON_CREATED: modifier forwarding
              _gxtEffect(() => (handler as any)(el));
            } else {
              el.addEventListener(eventName, handler);
            }
          }
        }
      }
    }

    const defaultBlock = args?.__defaultBlock__ || args?.__hasBlock__;
    if (typeof defaultBlock === 'function') {
      const blockResult = defaultBlock();
      if (blockResult instanceof Node) {
        el.appendChild(blockResult);
      } else if (typeof blockResult === 'string') {
        el.textContent = blockResult;
      } else if (Array.isArray(blockResult)) {
        for (const item of blockResult) {
          if (item instanceof Node) el.appendChild(item);
          else if (typeof item === 'string') el.appendChild(document.createTextNode(item));
        }
      }
    }

    return el;
  };
}

/**
 * Handle a component with a custom manager (Input, Textarea).
 * Instead of going through the full template render pipeline, we directly
 * create the DOM element and wire up reactive bindings via GXT effects.
 * This avoids the issues with createRenderContext overwriting instance.args.
 */

/**
 * Render a LinkTo internal component as an <a> element.
 * The instance has reactive getters for href, class, id, click, etc.
 * Renders slot content into the <a> and sets up reactive bindings
 * for attributes and block content.
 */
function renderLinkToElement(instance: any, args: any, fw: any): HTMLAnchorElement {
  const el = document.createElement('a');
  const gxtEffect = (globalThis as any).__gxtEffect || ((fn: Function) => fn());

  // id attribute
  gxtEffect(() => {
    const id = instance.id;
    if (id) el.id = id;
  });

  // class attribute (includes 'ember-view', 'active', 'disabled', etc.)
  gxtEffect(() => {
    const cls = instance.class;
    if (cls) el.className = cls;
  });

  // href attribute
  gxtEffect(() => {
    try {
      const href = instance.href;
      if (href !== undefined && href !== null) {
        el.setAttribute('href', String(href));
      }
    } catch {
      // href computation may throw if routing service is unavailable
      el.setAttribute('href', '#');
    }
  });

  // Optional attributes from the LinkTo template
  const optionalAttrs = ['role', 'title', 'rel', 'tabindex', 'target'];
  for (const attr of optionalAttrs) {
    gxtEffect(() => {
      try {
        const val = instance[attr];
        if (val !== undefined && val !== null) {
          el.setAttribute(attr, String(val));
        } else {
          el.removeAttribute(attr);
        }
      } catch { /* ignore */ }
    });
  }

  // Click handler
  if (typeof instance.click === 'function') {
    el.addEventListener('click', (e: Event) => {
      try {
        instance.click(e);
      } catch {
        // click handler may throw if routing service is unavailable
      }
    });
  }

  // Apply forwarded attributes (...attributes) from fw
  if (fw && Array.isArray(fw)) {
    if (Array.isArray(fw[0])) {
      for (const [key, value] of fw[0]) {
        const attrKey = key === '' ? 'class' : key;
        if (attrKey === 'class') {
          gxtEffect(() => {
            const resolved = typeof value === 'function' ? value() : value;
            const baseClass = instance.class || '';
            el.className = resolved ? baseClass + ' ' + resolved : baseClass;
          });
        } else {
          gxtEffect(() => {
            const resolved = typeof value === 'function' ? value() : value;
            if (resolved !== undefined && resolved !== null && resolved !== false) {
              el.setAttribute(attrKey, String(resolved));
            } else {
              el.removeAttribute(attrKey);
            }
          });
        }
      }
    }
    if (Array.isArray(fw[1])) {
      for (const [key, value] of fw[1]) {
        if (key.startsWith('@')) continue;
        gxtEffect(() => {
          const resolved = typeof value === 'function' ? value() : value;
          if (resolved !== undefined && resolved !== null && resolved !== false) {
            el.setAttribute(key, String(resolved));
          } else {
            el.removeAttribute(key);
          }
        });
      }
    }
    if (Array.isArray(fw[2])) {
      for (const [eventName, handler] of fw[2]) {
        if (typeof handler === 'function') {
          if (eventName === '0') {
            // ON_CREATED event type: this is a modifier, not a regular event listener.
            // Use GXT's effect() to wrap the modifier invocation so dependencies are
            // tracked and the modifier re-runs reactively (matching GXT's $ev behavior).
            _gxtEffect(() => (handler as any)(el));
          } else {
            el.addEventListener(eventName, handler);
          }
        }
      }
    }
  }

  // Render slot content ({{yield}} / block content) into the <a> element.
  // Use raw children (unevaluated getter functions) for reactive text updates.
  // Each getter is wrapped in a gxtEffect so GXT cell reads inside the getter
  // are tracked and the text node updates when the cell changes.
  //
  // For static text (strings), render directly without effect wrapping.
  const rawChildren = args?.__rawSlotChildren;
  if (rawChildren && rawChildren.length > 0) {
    for (const child of rawChildren) {
      if (typeof child === 'function') {
        // Reactive getter - use gxtEffect + cellFor for tracking.
        // The getter reads this.title (a controller/context property).
        // We need cellFor tracking so set(controller, 'title', ...) triggers re-render.
        const textNode = document.createTextNode('');
        const cellFor = (globalThis as any).__gxtCellFor;
        gxtEffect(() => {
          const val = child();
          textNode.textContent = val == null ? '' : String(val);
        });
        el.appendChild(textNode);
      } else if (child instanceof Node) {
        el.appendChild(child);
      } else if (child != null) {
        el.appendChild(document.createTextNode(String(child)));
      }
    }
  } else {
    // Fallback: use slot function (for block content from ember-gxt-wrappers path)
    const $SLOTS = Symbol.for('gxt-slots');
    const slots = args?.[$SLOTS] || args?.$slots || {};
    if (typeof slots.default === 'function') {
      const result = slots.default(null);
      const items = Array.isArray(result) ? result : [result];
      for (const item of items) {
        if (item instanceof Node) {
          el.appendChild(item);
        } else if (item != null) {
          el.appendChild(document.createTextNode(String(item)));
        }
      }
    }
  }

  return el;
}

function handleManagedComponent(
  komp: any,
  args: any,
  fw: any,
  ctx: any,
  manager: any,
  owner: any
): () => any {
  const instance = manager.create(
    owner,
    komp,
    argsForInternalManager(args, fw),
    {},
    {},
    formula(() => ctx, 'internalManager:caller')
  );

  return () => {
    // Determine component type from the static toString() method
    const componentType = komp?.toString?.();

    // LinkTo: render as <a> element with reactive bindings
    if (componentType === 'LinkTo') {
      return renderLinkToElement(instance, args, fw);
    }

    // Create the <input> or <textarea> element directly
    const tagName = componentType === 'Textarea' ? 'textarea' : 'input';
    const el = document.createElement(tagName);

    // Set initial attributes and set up reactive bindings
    const gxtEffect = (globalThis as any).__gxtEffect || ((fn: Function) => fn());

    // id attribute
    gxtEffect(() => {
      const id = instance.id;
      if (id) el.id = id;
    });

    // class attribute
    gxtEffect(() => {
      const cls = instance.class;
      if (cls) el.className = cls;
    });

    // type attribute (for input elements)
    if (tagName === 'input') {
      gxtEffect(() => {
        const type = instance.type;
        if (type) el.setAttribute('type', type);
      });
    }

    // checked attribute (for checkboxes)
    gxtEffect(() => {
      const checked = instance.checked;
      if (checked !== undefined) {
        (el as HTMLInputElement).checked = !!checked;
      }
    });

    // For range inputs, min/max/step must be set BEFORE value so the browser
    // does not clamp value against the default [0,100] range.
    const _rangeConstraintAttrs = ['min', 'max', 'step'];
    const _appliedRangeAttrs = new Set<string>();
    for (const rAttr of _rangeConstraintAttrs) {
      if (rAttr in args) {
        _appliedRangeAttrs.add(rAttr);
        const rDesc = Object.getOwnPropertyDescriptor(args, rAttr);
        const rGetter = rDesc?.get || (() => args[rAttr]);
        gxtEffect(() => {
          const rVal = rGetter();
          if (rVal !== undefined && rVal !== null && rVal !== false) {
            el.setAttribute(rAttr, String(rVal));
          } else {
            el.removeAttribute(rAttr);
          }
        });
      }
    }
    if (fw && Array.isArray(fw)) {
      const fwDomAttrs1 = fw[1];
      if (Array.isArray(fwDomAttrs1)) {
        for (const [key, value] of fwDomAttrs1) {
          if (_rangeConstraintAttrs.includes(key) && !_appliedRangeAttrs.has(key)) {
            _appliedRangeAttrs.add(key);
            gxtEffect(() => {
              const rVal = typeof value === 'function' ? value() : value;
              if (rVal !== undefined && rVal !== null && rVal !== false) {
                el.setAttribute(key, String(rVal));
              } else {
                el.removeAttribute(key);
              }
            });
          }
        }
      }
      const fwProps1 = fw[0];
      if (Array.isArray(fwProps1)) {
        for (const [key, value] of fwProps1) {
          if (_rangeConstraintAttrs.includes(key) && !_appliedRangeAttrs.has(key)) {
            _appliedRangeAttrs.add(key);
            gxtEffect(() => {
              const rVal = typeof value === 'function' ? value() : value;
              if (rVal !== undefined && rVal !== null && rVal !== false) {
                el.setAttribute(key, String(rVal));
              } else {
                el.removeAttribute(key);
              }
            });
          }
        }
      }
    }

    // value property - use direct DOM property setting for proper behavior
    gxtEffect(() => {
      const value = instance.value;
      if (value !== undefined && value !== null) {
        // Preserve cursor position when updating value
        const activeEl = document.activeElement;
        if (activeEl === el) {
          const start = (el as HTMLInputElement).selectionStart;
          const end = (el as HTMLInputElement).selectionEnd;
          (el as HTMLInputElement).value = String(value);
          try {
            (el as HTMLInputElement).setSelectionRange(start, end);
          } catch {
            // setSelectionRange may fail for some input types
          }
        } else {
          (el as HTMLInputElement).value = String(value);
        }
      } else if (value === undefined || value === null) {
        (el as HTMLInputElement).value = '';
      }
    });

    // Wire up event handlers
    if (typeof instance.change === 'function') {
      el.addEventListener('change', (e: Event) => instance.change(e));
    }
    if (typeof instance.input === 'function') {
      el.addEventListener('input', (e: Event) => instance.input(e));
    }
    if (typeof instance.keyUp === 'function') {
      el.addEventListener('keyup', (e: Event) => instance.keyUp(e));
    }
    if (typeof instance.valueDidChange === 'function') {
      el.addEventListener('paste', (e: Event) => instance.valueDidChange(e));
      el.addEventListener('cut', (e: Event) => instance.valueDidChange(e));
    }

    // Apply forwarded attributes (...attributes) from fw with reactive bindings
    if (fw && Array.isArray(fw)) {
      const fwAttrs = fw[0]; // DOM properties [key, value][]
      if (Array.isArray(fwAttrs)) {
        for (const [key, value] of fwAttrs) {
          const attrKey = key === '' ? 'class' : key;
          if (attrKey === 'class') {
            // Class is special - append to existing
            gxtEffect(() => {
              const resolved = typeof value === 'function' ? value() : value;
              const baseClass = instance.class || '';
              el.className = resolved ? baseClass + ' ' + resolved : baseClass;
            });
          } else {
            gxtEffect(() => {
              const resolved = typeof value === 'function' ? value() : value;
              if (resolved !== undefined && resolved !== null && resolved !== false) {
                el.setAttribute(attrKey, String(resolved));
              } else {
                el.removeAttribute(attrKey);
              }
            });
          }
        }
      }
      // Apply forwarded DOM attrs from fw[1] (attrs with key=value) reactively
      const fwDomAttrs = fw[1];
      if (Array.isArray(fwDomAttrs)) {
        for (const [key, value] of fwDomAttrs) {
          if (key.startsWith('@')) continue; // Skip named args
          gxtEffect(() => {
            const resolved = typeof value === 'function' ? value() : value;
            if (key === 'disabled') {
              // disabled is a boolean attribute
              if (resolved || resolved === '') {
                el.setAttribute(key, '');
                (el as HTMLInputElement).disabled = true;
              } else {
                el.removeAttribute(key);
                (el as HTMLInputElement).disabled = false;
              }
            } else if (resolved !== undefined && resolved !== null && resolved !== false) {
              el.setAttribute(key, String(resolved));
            } else {
              el.removeAttribute(key);
            }
          });
        }
      }
      // Apply forwarded events from fw[2]
      const fwEvents = fw[2];
      if (Array.isArray(fwEvents)) {
        for (const [eventName, handler] of fwEvents) {
          if (typeof handler === 'function') {
            if (eventName === '0') {
              // ON_CREATED: modifier forwarding
              _gxtEffect(() => (handler as any)(el));
            } else {
              el.addEventListener(eventName, handler);
            }
          }
        }
      }
    }

    // Apply DOM attributes from args that are HTML attributes (not @args)
    // These come from the splattributes pattern
    const htmlAttrs = ['disabled', 'readonly', 'placeholder', 'name', 'maxlength', 'minlength',
                       'size', 'tabindex', 'role', 'aria-label', 'aria-describedby', 'pattern',
                       'autocomplete', 'autofocus', 'form', 'multiple', 'step', 'min', 'max',
                       'accept', 'required', 'title', 'lang', 'dir', 'spellcheck', 'wrap',
                       'rows', 'cols'];
    for (const attr of htmlAttrs) {
      if (_appliedRangeAttrs.has(attr)) continue;
      if (attr in args) {
        const desc = Object.getOwnPropertyDescriptor(args, attr);
        const getter = desc?.get || (() => args[attr]);
        gxtEffect(() => {
          const val = getter();
          if (attr === 'disabled') {
            if (val || val === '') {
              el.setAttribute(attr, '');
              (el as HTMLInputElement).disabled = true;
            } else {
              el.removeAttribute(attr);
              (el as HTMLInputElement).disabled = false;
            }
          } else if (val === true) {
            el.setAttribute(attr, '');
          } else if (val === false || val === undefined || val === null) {
            el.removeAttribute(attr);
          } else {
            el.setAttribute(attr, String(val));
          }
        });
      }
    }

    return el;
  };
}

/**
 * Handle a classic factory-based component.
 */
function handleClassicComponent(
  factory: any,
  args: any,
  fw: any,
  ctx: any,
  owner: any
): () => any {
  // Capture parentView at closure creation time for the same reason as handleStringComponent
  const capturedParentView = getCurrentParentView();
  // Cache the rendered result to prevent duplicate renders on GXT formula re-evaluation
  let _cachedResult: any = undefined;
  let _cachedRenderPassId: number = -1;
  return () => {
    const currentRenderPassId = (globalThis as any).__emberRenderPassId || 0;
    if (_cachedResult !== undefined && _cachedRenderPassId === currentRenderPassId) {
      return _cachedResult;
    }
    try {
    const instance = getCachedOrCreateInstance(factory, args, factory.class, owner, capturedParentView);

    // Resolve template with layoutName/layout support
    let template;
    if (instance?.layoutName && owner) {
      template = owner.lookup(`template:${instance.layoutName}`) ||
                 owner.lookup(`template:components/${instance.layoutName}`);
    }
    if (!template && instance?.layout) {
      template = instance.layout;
    }
    if (!template) {
      template = getComponentTemplate(instance) ||
                 getComponentTemplate(instance?.constructor) ||
                 getComponentTemplate(factory.class);
    }
    // If template is a factory function, call it to get the actual template
    if (typeof template === 'function' && !template.render) {
      template = template(owner);
    }

    if (!template?.render) {
      return null;
    }

    const result = renderClassicComponent(instance, template, args, fw, factory.class, owner);
    _cachedResult = result;
    _cachedRenderPassId = currentRenderPassId;
    return result;
    } catch (e) {
      if (e instanceof Error) {
        captureRenderError(e);
      }
      throw e;
    }
  };
}

// =============================================================================
// Rendering Functions
// =============================================================================

/**
 * Render a classic Ember component with wrapper element.
 */
function renderClassicComponent(
  instance: any,
  template: any,
  args: any,
  fw: any,
  componentDef: any,
  owner: any
): any {
  // Check if this is a reused instance from the pool during force-rerender.
  // If so, skip initial lifecycle hooks (willRender, willInsertElement, etc.)
  // since the component already went through its initial render lifecycle.
  const isReused = instance && instance.__gxtReusedFromPool;
  const isForceRerender = (globalThis as any).__gxtIsForceRerender;
  if (isReused) {
    delete instance.__gxtReusedFromPool;
    delete instance.__gxtPoolHasArgChanges;
  }
  const skipInitHooks = isReused && isForceRerender;

  // Expose the current instance via side-channel so $_dc_ember can track it
  // for destroy lifecycle when dynamic component switching occurs.
  (globalThis as any).__gxtLastCreatedEmberInstance = instance;

  // Track this instance for destroy detection during force-rerender
  if (instance) {
    _allLiveInstances.add(instance);
    // Track this instance as rendered in the current pass.
    // Use a flag directly on the instance to survive any timing issues
    // with set/passId tracking.
    const passId = (globalThis as any).__emberRenderPassId || 0;
    if (_currentPassRenderedPassId !== passId) {
      _currentPassRenderedInstances.clear();
      _currentPassRenderedPassId = passId;
    }
    _currentPassRenderedInstances.add(instance);
    instance.__gxtRenderedInPass = passId;
  }

  const wrapper = buildWrapperElement(instance, args, componentDef);
  const renderContext = createRenderContext(instance, args, fw, owner);

  // Apply forwarded props and attrs (splattributes) to the wrapper element
  // fw[0] contains props (class as ["", value], id, etc.)
  // fw[1] contains attrs (data-*, title, etc.)
  if (wrapper instanceof HTMLElement && fw) {
    // Apply props (fw[0]) — class, id, etc.
    if (Array.isArray(fw[0])) {
      for (const [key, value] of fw[0]) {
        const attrValue = typeof value === 'function' ? value() : value;
        if (attrValue != null && attrValue !== false && attrValue !== undefined) {
          const attrKey = key === '' ? 'class' : key;
          if (attrKey === 'class') {
            if (wrapper.className) {
              wrapper.className = wrapper.className + ' ' + attrValue;
            } else {
              wrapper.className = String(attrValue);
            }
          } else {
            wrapper.setAttribute(attrKey, attrValue === true ? '' : String(attrValue));
          }
        }
      }
    }
    // Apply attrs (fw[1]) — data-*, title, etc.
    if (Array.isArray(fw[1])) {
      for (const [key, value] of fw[1]) {
        const attrValue = typeof value === 'function' ? value() : value;
        if (attrValue != null && attrValue !== false && attrValue !== undefined) {
          wrapper.setAttribute(key, attrValue === true ? '' : String(attrValue));
        }
      }
    }
  }

  // Apply forwarded events from fw[2] to the wrapper
  if (wrapper instanceof HTMLElement && fw && Array.isArray(fw[2])) {
    for (const [eventName, handler] of fw[2]) {
      if (typeof handler === 'function') {
        if (eventName === '0') {
          // ON_CREATED: modifier forwarding
          _gxtEffect(() => (handler as any)(wrapper));
        } else {
          wrapper.addEventListener(eventName, handler);
        }
      }
    }
  }

  // Install reactive attribute/class binding interceptors on the instance
  // so that when properties change, the wrapper element is updated in place.
  if (instance && wrapper instanceof HTMLElement) {
    installBindingInterceptors(instance, wrapper, componentDef);
  }

  if (skipInitHooks) {
    // Force-rerender: skip initial lifecycle hooks.
    // Save the old element reference — the morph-based re-render will
    // preserve the OLD element in the live DOM while the NEW wrapper is
    // in a temp container. After the morph, the instance should still
    // point to the old (live) element, not the new (discarded) one.
    const oldElement = getViewElement(instance);

    if (instance && wrapper instanceof HTMLElement) {
      setViewElement(instance, wrapper);
      setElementView(wrapper, instance);
    }
    // Mark this instance as rendering for backtracking detection (before template render)
    markTemplateRendered(instance);
    // Render template into wrapper (rebuild DOM content)
    renderTemplateWithParentView(template, renderContext, wrapper, instance);

    // Restore the old element reference if the new wrapper isn't connected
    // (which happens during morph-based force-rerender where the morph
    // preserves the old DOM nodes). This ensures instance.element points
    // to the live DOM element, not the discarded temp container element.
    if (oldElement && oldElement.isConnected && instance) {
      setViewElement(instance, oldElement);
      setElementView(oldElement, instance);
    }

    // Queue transition to inDOM after insertion (no didInsertElement/didRender)
    if (instance) {
      const inst = instance;
      _afterInsertQueue.push(() => {
        if (inst._transitionTo && isInteractiveModeChecked()) {
          try { inst._transitionTo('inDOM'); } catch {}
        }
      });
    }
  } else {
    // Normal initial render path with full lifecycle hooks
    // Lifecycle: willRender (in preRender state), then transition to hasElement, then willInsertElement
    // IMPORTANT: willRender is called while still in preRender state, with NO element
    triggerLifecycleHook(instance, 'willRender');

    // Now transition to hasElement state and register the view element
    // setViewElement must be called AFTER willRender (which expects no element)
    // but BEFORE willInsertElement (which expects the element to exist)
    if (instance && wrapper instanceof HTMLElement) {
      setViewElement(instance, wrapper);
      setElementView(wrapper, instance);
    }
    if (instance?._transitionTo) {
      try { instance._transitionTo('hasElement'); } catch {}
    }

    // willInsertElement is called in hasElement state (element now available)
    triggerLifecycleHook(instance, 'willInsertElement');

    // Mark this instance as rendering for backtracking detection.
    // This must happen BEFORE renderTemplateWithParentView so that if a child
    // component's lifecycle hook (e.g., didReceiveAttrs) modifies this instance's
    // properties, the backtracking assertion fires.
    markTemplateRendered(instance);

    // Render template into wrapper
    renderTemplateWithParentView(template, renderContext, wrapper, instance);

    // Queue didInsertElement / didRender to fire after the element is in the DOM.
    // The queue is flushed by flushAfterInsertQueue() which is called from the
    // renderer after GXT has appended all nodes to the live document.
    if (instance) {
      const inst = instance;
      _afterInsertQueue.push(() => {
        if (inst._transitionTo && isInteractiveModeChecked()) {
          try { inst._transitionTo('inDOM'); } catch {}
        }
        triggerLifecycleHook(inst, 'didInsertElement');
        triggerLifecycleHook(inst, 'didRender');
      });
    }
  }

  // For tagless classic components (wrapper is a DocumentFragment),
  // capture first/last nodes for getViewBounds support before the
  // fragment is consumed by GXT's DOM insertion.
  if (instance && !(wrapper instanceof HTMLElement) && wrapper.childNodes.length > 0) {
    const firstNode = wrapper.firstChild;
    const lastNode = wrapper.lastChild;
    // Use a deferred getter for parentElement since the nodes aren't
    // in the live DOM yet at this point.
    Object.defineProperty(instance, '__gxtBounds', {
      get() {
        return {
          parentElement: firstNode?.parentNode,
          firstNode,
          lastNode,
        };
      },
      configurable: true,
      enumerable: false,
    });
  }

  // Return GXT-compatible result
  return createGxtResult(wrapper);
}

/**
 * Render a Glimmer component (tagless).
 */
function renderGlimmerComponent(
  instance: any,
  template: any,
  args: any,
  fw: any,
  owner: any
): any {
  // Expose the current instance via side-channel for $_dc_ember tracking
  (globalThis as any).__gxtLastCreatedEmberInstance = instance;

  const container = document.createDocumentFragment();
  const renderContext = createRenderContext(instance, args, fw, owner);

  renderTemplateWithParentView(template, renderContext, container, instance);

  return createGxtResult(container);
}

/**
 * Create a GXT-compatible result object.
 */
function createGxtResult(content: Element | DocumentFragment): any {
  if (content instanceof DocumentFragment) {
    // Return fragment directly for tagless/fragment components.
    return content;
  }
  // Single element (wrapped component) - return directly
  return content;
}

// =============================================================================
// Manager API Exports
// =============================================================================

export function capabilityFlagsFrom(capabilities: Record<string, boolean>): number {
  let flags = 0;
  const capabilityNames = [
    'dynamicLayout', 'dynamicTag', 'prepareArgs', 'createArgs',
    'attributeHook', 'elementHook', 'createCaller', 'dynamicScope',
    'updateHook', 'createInstance', 'wrapped', 'willDestroy', 'hasSubOwner',
  ];
  capabilityNames.forEach((name, index) => {
    if (capabilities[name]) {
      flags |= 1 << index;
    }
  });
  return flags;
}

export function setInternalComponentManager(manager: any, handle: any) {
  globalThis.INTERNAL_MANAGERS.set(handle, manager);
  return handle;
}

export function getInternalHelperManager(helper: any, isOptional?: boolean) {
  if (helper === null || helper === undefined) {
    if (isOptional) return null;
    return undefined;
  }
  // Walk the full prototype chain
  let pointer = helper;
  while (pointer !== null && pointer !== undefined) {
    const manager = globalThis.INTERNAL_HELPER_MANAGERS.get(pointer);
    if (manager !== undefined) {
      return manager;
    }
    try {
      pointer = Object.getPrototypeOf(pointer);
    } catch {
      break;
    }
  }
  // Functions are the default helper type (simple function helpers)
  if (typeof helper === 'function') {
    return DEFAULT_HELPER_MANAGER;
  }
  if (isOptional) return null;
  return undefined;
}

export function helperCapabilities(v: string, value: any = {}) {
  if (v !== '3.23') {
    throw new Error(
      `Invalid helper manager compatibility specified`
    );
  }

  if (
    (!(value.hasValue || value.hasScheduledEffect) ||
      (value.hasValue && value.hasScheduledEffect))
  ) {
    throw new Error(
      'You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted.'
    );
  }

  if (value.hasScheduledEffect) {
    throw new Error(
      'The `hasScheduledEffect` capability has not yet been implemented for helper managers. Please pass `hasValue` instead'
    );
  }

  const capabilities = {
    hasValue: Boolean(value.hasValue),
    hasDestroyable: Boolean(value.hasDestroyable),
    hasScheduledEffect: Boolean(value.hasScheduledEffect),
  };
  FROM_CAPABILITIES.add(capabilities);
  Object.freeze(capabilities);
  return capabilities;
}

export function modifierCapabilities(_version: string, capabilities?: Record<string, boolean>) {
  const caps = capabilities || {};
  FROM_CAPABILITIES.add(caps);
  return caps;
}

export function componentCapabilities(_version: string, capabilities?: Record<string, boolean>) {
  const caps = capabilities || {};
  FROM_CAPABILITIES.add(caps);
  return caps;
}

export function setHelperManager(factory: any, helper: any) {
  return setInternalHelperManager(new CustomHelperManager(factory), helper);
}

export function getHelperManager(helper: any) {
  return getInternalHelperManager(helper);
}

export function getInternalComponentManager(handle: any) {
  if (handle === null || handle === undefined) return undefined;
  // Walk the prototype chain
  let pointer = handle;
  while (pointer !== null && pointer !== undefined) {
    const manager = globalThis.INTERNAL_MANAGERS.get(pointer);
    if (manager !== undefined) return manager;
    try {
      pointer = Object.getPrototypeOf(pointer);
    } catch {
      break;
    }
  }
  return undefined;
}

export function getComponentTemplate(comp: any): any {
  // Direct lookup first
  const direct = globalThis.COMPONENT_TEMPLATES.get(comp);
  if (direct !== undefined) return direct;
  // Walk prototype chain for inheritance support
  if (comp && typeof comp === 'function') {
    let proto = Object.getPrototypeOf(comp);
    while (proto && proto !== Function.prototype && proto !== Object.prototype) {
      const tpl = globalThis.COMPONENT_TEMPLATES.get(proto);
      if (tpl !== undefined) return tpl;
      proto = Object.getPrototypeOf(proto);
    }
  }
  return undefined;
}

export function setComponentTemplate(tpl: any, comp: any) {
  if (comp === null || comp === undefined || (typeof comp !== 'object' && typeof comp !== 'function')) {
    throw new Error(`Cannot call \`setComponentTemplate\` on \`${String(comp)}\``);
  }
  if (globalThis.COMPONENT_TEMPLATES.has(comp)) {
    const name = comp.name || comp.toString?.() || String(comp);
    throw new Error(`Cannot call \`setComponentTemplate\` multiple times on the same class (\`${name}\`)`);
  }
  globalThis.COMPONENT_TEMPLATES.set(comp, tpl);
  return comp;
}

// Store pending builtin modifier registrations for when $_MANAGERS is ready
const _pendingBuiltinModifiers: Array<{name: string, modifier: any}> = [];

export function setInternalModifierManager(manager: any, modifier: any) {
  globalThis.INTERNAL_MODIFIER_MANAGERS.set(modifier, manager);
  // Register internal modifier managers as built-in keyword modifiers
  // so that string-based resolution (e.g., {{on "click" ...}}) works.
  if (manager && typeof manager.getDebugName === 'function') {
    try {
      const name = manager.getDebugName();
      if (name) {
        if ($_MANAGERS?.modifier?._builtinModifiers) {
          $_MANAGERS.modifier._builtinModifiers[name] = modifier;
        } else {
          _pendingBuiltinModifiers.push({ name, modifier });
        }
      }
    } catch { /* ignore */ }
  }
  return modifier;
}

// Flush pending builtin modifier registrations
export function _flushPendingBuiltinModifiers() {
  if ($_MANAGERS?.modifier?._builtinModifiers && _pendingBuiltinModifiers.length > 0) {
    for (const { name, modifier } of _pendingBuiltinModifiers) {
      $_MANAGERS.modifier._builtinModifiers[name] = modifier;
    }
    _pendingBuiltinModifiers.length = 0;
  }
}

export function setComponentManager(manager: any, component: any) {
  globalThis.COMPONENT_MANAGERS.set(component, manager);
  return component;
}

export function getComponentManager(component: any) {
  return globalThis.COMPONENT_MANAGERS.get(component);
}

export function setModifierManager(factory: any, modifier: any) {
  globalThis.INTERNAL_MODIFIER_MANAGERS.set(modifier, factory);
  return modifier;
}

const CUSTOM_TAG_FOR = new WeakMap<object, (obj: object, key: string) => any>();

export function getCustomTagFor(obj: any) {
  return CUSTOM_TAG_FOR.get(obj);
}

export function setCustomTagFor(obj: any, tagFn: (obj: object, key: string) => any) {
  CUSTOM_TAG_FOR.set(obj, tagFn);
}

export function setInternalHelperManager(manager: any, helper: any) {
  globalThis.INTERNAL_HELPER_MANAGERS.set(helper, manager);
  return helper;
}

export function hasInternalHelperManager(helper: any) {
  if (helper === null || helper === undefined) return false;
  // Functions are always default helpers
  if (typeof helper === 'function') return true;
  // Walk the prototype chain
  let pointer = helper;
  while (pointer !== null && pointer !== undefined) {
    if (globalThis.INTERNAL_HELPER_MANAGERS.has(pointer)) {
      return true;
    }
    try {
      pointer = Object.getPrototypeOf(pointer);
    } catch {
      break;
    }
  }
  return false;
}

export function hasCapability(capabilities: number, capability: number): boolean {
  return (capabilities & capability) !== 0;
}

export function getInternalModifierManager(modifier: any) {
  return globalThis.INTERNAL_MODIFIER_MANAGERS.get(modifier);
}

export function managerHasCapability(manager: { capabilities: number }, capability: number): boolean {
  return hasCapability(manager.capabilities, capability);
}

export function hasInternalComponentManager(component: any): boolean {
  if (component === null || component === undefined) return false;
  // Walk the prototype chain to find managers set on prototypes or class hierarchy
  let pointer = component;
  for (let depth = 0; depth < 20; depth++) {
    if (pointer === null || pointer === undefined) break;
    if (globalThis.INTERNAL_MANAGERS.has(pointer)) return true;
    try {
      const next = Object.getPrototypeOf(pointer);
      if (next === pointer || next === null) break;
      pointer = next;
    } catch {
      break;
    }
  }
  return false;
}

export function hasValue(manager: any): boolean {
  return Boolean(manager?.capabilities?.hasValue);
}

export function hasDestroyable(manager: any): boolean {
  return Boolean(manager?.capabilities?.hasDestroyable);
}

// =============================================================================
// Custom Manager Classes
// =============================================================================

export class CustomComponentManager {
  capabilities: number;
  delegate: any;

  constructor(delegate: any) {
    this.delegate = delegate;
    this.capabilities = capabilityFlagsFrom(delegate.capabilities || {});
  }

  create(owner: any, component: any, args: any, env: any, dynamicScope: any, caller: any) {
    return this.delegate.createComponent(component, args);
  }

  getDebugName(component: any) {
    return this.delegate.getDebugName?.(component) || component.name || 'Component';
  }

  getSelf(instance: any) {
    return this.delegate.getSelf?.(instance) || instance;
  }

  getDestroyable(instance: any) {
    return this.delegate.getDestroyable?.(instance) || instance;
  }

  didCreate(instance: any) {
    this.delegate.didCreateComponent?.(instance);
  }

  didUpdate(instance: any) {
    this.delegate.didUpdateComponent?.(instance);
  }

  didRenderLayout(instance: any, bounds: any) {
    this.delegate.didRenderLayout?.(instance, bounds);
  }

  didUpdateLayout(instance: any, bounds: any) {
    this.delegate.didUpdateLayout?.(instance, bounds);
  }

  getStaticLayout(component: any) {
    return this.delegate.getStaticLayout?.(component);
  }

  getDynamicLayout(instance: any) {
    return this.delegate.getDynamicLayout?.(instance);
  }
}

export class CustomModifierManager {
  capabilities: number;
  delegate: any;

  constructor(delegate: any) {
    this.delegate = delegate;
    this.capabilities = 0;
  }

  create(owner: any, element: Element, definition: any, args: any) {
    return this.delegate.createModifier(definition, args);
  }

  getDebugName(definition: any) {
    return this.delegate.getDebugName?.(definition) || 'Modifier';
  }

  getDestroyable(instance: any) {
    return this.delegate.getDestroyable?.(instance) || instance;
  }

  install(instance: any, element: Element, args: any) {
    this.delegate.installModifier?.(instance, element, args);
  }

  update(instance: any, args: any) {
    this.delegate.updateModifier?.(instance, args);
  }

  destroy(instance: any) {
    this.delegate.destroyModifier?.(instance);
  }
}

// =============================================================================
// Export $_MANAGERS for GXT Integration
// =============================================================================

// Install our handlers onto GXT's original $_MANAGERS object (referenced by GXT's
// internal `ie` variable). Creating a new object and replacing globalThis.$_MANAGERS
// would NOT update GXT's internal closure references (e.g., in $_helperHelper).
{
  const gxtManagers = (globalThis as any).$_MANAGERS;
  if (gxtManagers) {
    // Copy our component, helper, and modifier handlers onto GXT's original managers object
    gxtManagers.component = $_MANAGERS.component;
    gxtManagers.helper = $_MANAGERS.helper;
    gxtManagers.modifier = $_MANAGERS.modifier;
  } else {
    // Fallback: set as new if no original exists
    (globalThis as any).$_MANAGERS = $_MANAGERS;
  }
}

export { $_MANAGERS };
