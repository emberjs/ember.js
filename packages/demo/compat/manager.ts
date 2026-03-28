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
import { setViewElement, setElementView, addChildView as _addChildView, getViewId } from '@ember/-internals/views/lib/system/utils';

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
  owner: any
): any {
  const cacheKey = componentClass || factory;
  const currentParentView = getCurrentParentView();
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
    poolEntry = pool.find((e) => !e.claimed && e.instance?.elementId === requestedElementId);

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
      const wrapper = poolEntry.instance.element || poolEntry.instance._element;
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

  // No matching instance - create a new one
  const instance = createComponentInstance(factory, args, currentParentView, owner);

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

  // Process args into Ember's expected format
  const keys = extractArgKeys(args);

  for (const key of keys) {
    const { raw, resolved, getter } = getArgValue(args, key);

    // Skip classNames - handled separately in wrapper building
    if (key === 'classNames') {
      if (getter) {
        argGetters[key] = getter;
      }
      lastArgValues[key] = resolved;
      continue;
    }

    props[key] = resolved;
    lastArgValues[key] = resolved;

    if (getter) {
      argGetters[key] = getter;
    }

    // Build attrs with .value pattern (MutableCell)
    attrs[key] = {
      get value() {
        return getter ? getter() : resolved;
      }
    };
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

  // Ensure arg tracking is on the instance
  if (!instance.__argGetters) instance.__argGetters = argGetters;
  if (!instance.__lastArgValues) instance.__lastArgValues = lastArgValues;
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
          } else {
            localValue = v;
            useLocal = true;
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
      // Skip propagation during attrs dispatch (prevents infinite loops)
      if ((instance as any).__gxtDispatchingArgs) return;

      // Only propagate binding logic for keys that were passed as args
      if (!argKeySet.has(key)) {
        if (origPDC) try { origPDC(key, value); } catch { /* ignore */ }
        return;
      }

      const resolvedValue = arguments.length >= 2 ? value : instance[key];

      // Try detected binding first
      const binding = twoWayBindings[key];
      if (binding) {
        const { sourceCtx, sourceKey } = binding;
        if (sourceCtx && sourceKey) {
          sourceCtx[sourceKey] = resolvedValue;
          if (triggerReRender) triggerReRender(sourceCtx, sourceKey);
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
  const keys = extractArgKeys(args);

  for (const key of keys) {
    const { resolved: newValue } = getArgValue(args, key);
    const oldValue = lastArgValues[key];

    if (newValue !== oldValue) {
      hasChanges = true;
      break; // Only need to know if there's at least one change
    }
  }

  if (hasChanges) {
    // Second pass: apply the changes (set properties first, then fire hooks)
    for (const key of keys) {
      const { resolved: newValue } = getArgValue(args, key);
      const oldValue = lastArgValues[key];

      if (newValue !== oldValue) {
        // Update the instance property (but not elementId - it's frozen)
        if (key !== 'elementId') {
          instance[key] = newValue;
        }
        lastArgValues[key] = newValue;
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
    !key.startsWith('__') &&
    key !== 'class' &&
    key !== 'classNames' &&  // Don't overwrite component's classNames property
    !key.startsWith('Symbol')
  );
}

/**
 * Get both raw and resolved value for an arg.
 */
function getArgValue(args: any, key: string): { raw: any; resolved: any; getter?: () => any } {
  // Check if the arg is defined as a getter (GXT compiles args as getters)
  const descriptor = Object.getOwnPropertyDescriptor(args, key);
  if (descriptor?.get) {
    // Arg is a getter - capture the getter function for reactive updates
    const resolved = descriptor.get();
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
  const resolved = typeof raw === 'function' ? raw() : raw;
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

export function captureRenderError(err: unknown): void {
  if (err instanceof Error) {
    _renderErrors.push(err);
  } else {
    _renderErrors.push(new Error(String(err)));
  }
}

/**
 * Flush any render errors captured during the render cycle.
 * Throws the first one (so assert.throws in tests can catch it).
 */
export function flushRenderErrors(): void {
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
    return dasherize(propPath);
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
      // Warn for style attribute bindings with non-safe strings
      if (attrName === 'style' && value !== null && value !== undefined && value !== false) {
        const isHTMLSafe = value && typeof value === 'object' && typeof value.toHTML === 'function';
        if (!isHTMLSafe) {
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
      if (value === undefined || value === null || value === false) {
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
          if (cell.__value !== newValue) {
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

// Snapshot of all live instances before force-rerender.
// Used to detect which instances were removed after the rebuild.
let _preRerenderSnapshot: Set<any> = new Set();

(globalThis as any).__gxtSnapshotLiveInstances = function() {
  _preRerenderSnapshot.clear();
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

  // Find components that were in the pre-rerender snapshot but now have
  // disconnected elements. This detects ALL removed components including
  // those not in trackedArgCells (e.g., nested-item with no args).
  const unclaimed: any[] = [];
  const seen = new Set<any>();

  for (const instance of _preRerenderSnapshot) {
    if (!instance || seen.has(instance)) continue;
    seen.add(instance);

    try {
      const el = instance.element;
      if (el && !el.isConnected) {
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
      const el = instance.element;
      if (el instanceof HTMLElement && !el.isConnected) {
        tempContainer.appendChild(el);
        reattached.push({ instance, element: el });
      }
    } catch { /* ignore */ }
  }

  for (const instance of unclaimed) {
    try {
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

(globalThis as any).__gxtSyncWrapper = function(obj: any, keyName: string) {
  const wrapper = obj?.element;
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
    instance.elementId = wrapper.id;
    instance._elementIdFrozen = true;
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
      // Warn for style attribute bindings with non-safe strings
      if (attrName === 'style' && value !== null && value !== undefined && value !== false) {
        const isHTMLSafe = value && typeof value === 'object' && typeof value.toHTML === 'function';
        if (!isHTMLSafe) {
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
      if (value !== undefined && value !== null && value !== false) {
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

  // Get slots from args.$slots (passed from compile.ts)
  // GXT templates use $slots.default() for {{yield}}
  const slots = args?.$slots || {};
  renderContext[$SLOTS_SYMBOL] = slots;
  renderContext.$slots = slots;

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

  // Set up attrs proxy for this.attrs.argName.value access
  const attrsProxy: Record<string, any> = {};
  const cellForFn = (globalThis as any).__gxtCellFor;
  // Store arg cells for reactive updates
  const argCells: Record<string, any> = {};
  if (args && typeof args === 'object') {
    for (const key of Object.keys(args)) {
      if (key.startsWith('Symbol')) continue;

      // Resolve the initial value
      const descriptor = Object.getOwnPropertyDescriptor(args, key);
      const getter = descriptor?.get;
      const initialVal = getter ? getter() : (typeof args[key] === 'function' ? args[key]() : args[key]);

      if (cellForFn && getter) {
        // Create a cell for this arg so GXT's formula tracking picks up the dependency.
        // When the parent context changes, we update this cell which triggers re-evaluation.
        const cell = cellForFn(attrsProxy, key, /* skipDefine */ false);
        cell.update(initialVal);
        argCells[key] = { cell, getter };
      } else {
        Object.defineProperty(attrsProxy, key, {
          get() {
            const val = args[key];
            return typeof val === 'function' ? val() : val;
          },
          enumerable: true,
          configurable: true,
        });
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

  renderContext.attrs = attrsProxy;
  // GXT accesses @foo as this.args.foo, so also set args
  renderContext.args = attrsProxy;
  // GXT runtime compiler uses Symbol.for('gxt-args') for this[$args].foo
  renderContext[$ARGS_KEY] = attrsProxy;

  if (instance && !instance.attrs) {
    instance.attrs = attrsProxy;
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
  const cellForFn2 = (globalThis as any).__gxtCellFor;
  const renderCtxArgCells: Record<string, any> = {};
  const argGetters = instance?.__argGetters || {};

  // Collect all arg keys and their getters
  const allArgKeys = new Set<string>(Object.keys(argGetters));
  if (args && typeof args === 'object') {
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
        getter = typeof argRef === 'function' ? argRef : undefined;
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
        try {
          const cell = cellForFn2(renderContext, key, /* skipDefine */ false);
          const initialVal = argVal;
          cell.update(initialVal);
          renderCtxArgCells[key] = { cell, getter };
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
        lastArgValue: existing.initOverridden ? existing.getter() : undefined,
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
      // Skip methods (prototype functions) but NOT data properties holding functions.
      // Data properties may change from function→non-function (e.g., set(cond, false))
      // and need cell tracking. Methods never change and don't need tracking.
      if (typeof value === 'function' && !Object.prototype.hasOwnProperty.call(target, prop)) {
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
        return getter();
      },
      set value(v: any) {
        // Allow setting via .value = for internal use
        if (desc?.set) {
          desc.set(v);
        }
      },
      update(v: any) {
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
  const factory = owner.factoryFor(`component:${normalizedName}`);

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
        } catch {
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
      } catch { /* ignore */ }
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
        const owner = (globalThis as any).owner;
        if (owner) {
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
      if (komp?.create && typeof komp.create === 'function') {
        return true;
      }
      return false;
    },

    handle(komp: any, args: any, fw: any, ctx: any): any {
      const owner = (globalThis as any).owner;

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

        // Copy invocation args (these override curried args)
        if (args) {
          for (const key of Object.keys(args)) {
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(mergedArgs, key, desc);
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
        return this.handle(resolvedKomp, mergedArgs, fw, ctx);
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
        return this.handle(komp.__stringComponentName, wrappedArgs, fw, ctx);
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

              // Use $_maybeHelper to invoke the helper through Ember's protocol
              const maybeHelper = (globalThis as any).$_maybeHelper;
              if (typeof maybeHelper === 'function') {
                return maybeHelper(helperName, positional, named, ctx);
              }
            }
          } catch { /* ignore errors */ }
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

      // Handle component with internal/custom manager
      const manager = globalThis.INTERNAL_MANAGERS.get(komp) || globalThis.COMPONENT_MANAGERS.get(komp);
      if (manager) {
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
        const owner = (globalThis as any).owner;
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          // Only claim we can handle if the helper actually exists
          const factory = owner.factoryFor?.(`helper:${helper}`);
          if (factory) return true;
          // Also check built-in helpers
          const BUILTIN_HELPERS = (globalThis as any).__EMBER_BUILTIN_HELPERS__;
          if (BUILTIN_HELPERS && BUILTIN_HELPERS[helper]) return true;
        }
      }
      // Also handle our curried ember helper functions
      if (typeof helper === 'function' && helper.__isEmberCurriedHelper) {
        return true;
      }
      // Handle function/class-based helpers with a registered helper manager
      // Walk the prototype chain for both functions (classes) and objects
      if (helper != null && (typeof helper === 'function' || typeof helper === 'object')) {
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
          const owner = (globalThis as any).owner;
          const unwrapVal = (v: any) => typeof v === 'function' && !v.prototype ? v() : v;
          const isGxtInternal = (k: string) => k.startsWith('$_') || k === 'hash';

          if (typeof internalManager.getDelegateFor === 'function') {
            const delegate = internalManager.getDelegateFor(owner);
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
        const owner = (globalThis as any).owner;

        // Unwrap GXT getter args for the helper, filtering out GXT internal keys
        // IMPORTANT: don't unwrap function-based helpers (they have prototype)
        const unwrapVal = (v: any) => typeof v === 'function' && !v.prototype ? v() : v;
        const isGxtInternal = (k: string) => k.startsWith('$_') || k === 'hash';

        // Resolve the helper to a callable function.
        const resolvedFn = _resolveEmberHelper(helper, owner);
        if (resolvedFn) {
          // Unwrap curried positional args from params
          const curriedPositionals = Array.isArray(params) ? params.map(unwrapVal) : [];

          // Unwrap curried named args from hash
          const curriedNamed = hash && typeof hash === 'object'
            ? Object.fromEntries(Object.entries(hash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
            : {};

          // Return a curried function. When GXT renders it in content position,
          // it calls the function to get the value. When passed to another helper,
          // canHandle() recognizes it and handle() merges additional args.
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

    canHandle(modifier: any): boolean {
      if (typeof modifier === 'string') {
        const owner = (globalThis as any).owner;
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          const factory = owner.factoryFor?.(`modifier:${modifier}`);
          if (factory) return true;
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
      const modKey = typeof modifier === 'string' ? modifier : (modifier?.name || String(modifier));
      const elCache = self._cache.get(element);
      if (elCache) {
        const cached = elCache.get(modKey);
        if (cached && cached.pendingDestroy) {
          // The destructor was called (GXT formula re-eval), but we haven't
          // actually destroyed yet — this is an update, not a reinstall.
          cached.pendingDestroy = false;
          const args = buildArgs();
          if (cached.manager.updateModifier) {
            cached.manager.updateModifier(cached.instance, args);
          }
          // Return a destructor that marks pending destroy
          return () => {
            cached.pendingDestroy = true;
            // Schedule actual destroy for next microtask — if handle() is called
            // again before then, we'll intercept it as an update.
            Promise.resolve().then(() => {
              if (cached.pendingDestroy) {
                // Not re-entered — actually destroy
                if (cached.manager.destroyModifier) {
                  cached.manager.destroyModifier(cached.instance);
                }
                elCache.delete(modKey);
                if (elCache.size === 0) self._cache.delete(element);
              }
            });
          };
        }
      }

      // First time: resolve modifier class and create instance

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
        // Schedule actual destroy — if handle() is called again before the
        // microtask runs, we'll intercept it as an update.
        Promise.resolve().then(() => {
          if (cached.pendingDestroy) {
            if (manager.destroyModifier) {
              manager.destroyModifier(instance);
            }
            const c = self._cache.get(element);
            if (c) {
              c.delete(modKey);
              if (c.size === 0) self._cache.delete(element);
            }
          }
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

  return () => {
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
      getCachedOrCreateInstance(factory, args, factory.class, owner) :
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

    if (isClassic) {
      return renderClassicComponent(instance, resolvedTemplate, args, fw, factory?.class, owner);
    } else {
      return renderGlimmerComponent(instance, resolvedTemplate, args, fw, owner);
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

      // Update live named/positional on instance.args
      if (instance?.args) {
        instance.args.named = liveNamed;
        instance.args.positional = livePositional;
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

    // Augment renderContext.args with named/positional sub-objects
    if (renderContext.args) {
      renderContext.args.named = liveNamed;
      renderContext.args.positional = livePositional;
    }
    if (instance && instance !== context && instance.args) {
      instance.args.named = liveNamed;
      instance.args.positional = livePositional;
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
 * Handle a component with a custom manager (Input, Textarea).
 * Instead of going through the full template render pipeline, we directly
 * create the DOM element and wire up reactive bindings via GXT effects.
 * This avoids the issues with createRenderContext overwriting instance.args.
 */
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
    // Create the <input> or <textarea> element directly
    const tagName = instance.constructor?.toString?.() === 'Textarea' ? 'textarea' : 'input';
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
            el.addEventListener(eventName, handler);
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
  return () => {
    const instance = getCachedOrCreateInstance(factory, args, factory.class, owner);

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

    return renderClassicComponent(instance, template, args, fw, factory.class, owner);
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

  // Track this instance for destroy detection during force-rerender
  if (instance) _allLiveInstances.add(instance);

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
        wrapper.addEventListener(eventName, handler);
      }
    }
  }

  // Install reactive attribute/class binding interceptors on the instance
  // so that when properties change, the wrapper element is updated in place.
  if (instance && wrapper instanceof HTMLElement) {
    installBindingInterceptors(instance, wrapper, componentDef);
  }

  if (skipInitHooks) {
    // Force-rerender: skip initial lifecycle hooks but update the element
    // reference to the new wrapper (old one was removed by innerHTML='')
    if (instance && wrapper instanceof HTMLElement) {
      setViewElement(instance, wrapper);
      setElementView(wrapper, instance);
    }
    // Render template into wrapper (rebuild DOM content)
    renderTemplateWithParentView(template, renderContext, wrapper, instance);
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

export function setInternalModifierManager(manager: any, modifier: any) {
  globalThis.INTERNAL_MODIFIER_MANAGERS.set(modifier, manager);
  return modifier;
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
