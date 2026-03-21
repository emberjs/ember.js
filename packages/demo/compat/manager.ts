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

import { assert } from '@ember/debug';
import { CustomHelperManager, FunctionHelperManager, FROM_CAPABILITIES } from './helper-manager';
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

  // Create a callable function so GXT can invoke it like a component/helper
  const curried = function curriedComponentFn(...runtimeArgs: any[]) {
    // When called by GXT (e.g., from let block resolution), render the component
    const managers = (globalThis as any).$_MANAGERS;
    if (managers?.component?.canHandle?.(curried)) {
      const handleResult = managers.component.handle(curried, {}, null, null);
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

  if (!parent.childViews) {
    parent.childViews = [];
  }

  if (!parent.childViews.includes(child)) {
    parent.childViews.push(child);
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

// Sentinel object for root-level components (no parent view)
const ROOT_PARENT_SENTINEL = {};

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

  props.attrs = attrs;
  props.parentView = parentView;
  props.__argGetters = argGetters;
  props.__lastArgValues = lastArgValues;

  // Map 'id' arg to 'elementId' for Ember component initialization
  if ('id' in props && props.id !== undefined) {
    props.elementId = props.id;
  }
  // Also handle direct elementId arg
  if ('elementId' in props && props.elementId !== undefined && !('id' in props)) {
    // elementId is already set, just ensure it's preserved
  }

  // Create the instance
  const instance = factory.create(props);

  // Ensure arg tracking is on the instance
  if (!instance.__argGetters) instance.__argGetters = argGetters;
  if (!instance.__lastArgValues) instance.__lastArgValues = lastArgValues;

  // Install reactive getters for args that have closures.
  // This ensures instance.foo always returns the current arg value,
  // even when GXT doesn't re-invoke the component function on re-render.
  for (const key of Object.keys(argGetters)) {
    if (key === 'classNames' || key === 'class' || key === 'id' || key === 'elementId') continue;
    const getter = argGetters[key]!;
    try {
      let localValue = instance[key]; // current value (from factory.create)
      let useLocal = false; // track if value was set locally (e.g. by component code)
      Object.defineProperty(instance, key, {
        get() {
          if (useLocal) return localValue;
          try { return getter(); } catch { return localValue; }
        },
        set(v: any) {
          localValue = v;
          useLocal = true;
          // Reset useLocal on next microtask so arg updates take precedence again
          queueMicrotask(() => { useLocal = false; });
        },
        configurable: true,
        enumerable: true,
      });
    } catch { /* some properties may not be configurable */ }
  }

  // Register with parent's childViews
  if (parentView) {
    addChildView(parentView, instance);
  }

  // Trigger initial didReceiveAttrs
  triggerLifecycleHook(instance, 'didReceiveAttrs');

  return instance;
}

/**
 * Update a cached instance when arg values have changed.
 */
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
    // willUpdate is called before the component updates
    triggerLifecycleHook(instance, 'willUpdate');

    // Second pass: apply the changes
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

    // didUpdateAttrs is called when attrs change (update only, not initial render)
    triggerLifecycleHook(instance, 'didUpdateAttrs');
    // didReceiveAttrs is called both on initial render and updates
    triggerLifecycleHook(instance, 'didReceiveAttrs');
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
function triggerLifecycleHook(instance: any, hookName: string): void {
  if (!instance) return;

  try {
    // Use Ember's event trigger - this is the canonical way to invoke
    // lifecycle hooks in Ember components
    if (typeof instance.trigger === 'function') {
      instance.trigger(hookName);
    }
  } catch (e) {
    // Lifecycle hooks shouldn't break rendering
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

  // Classes from invocation args
  const argsClass = typeof args?.class === 'function' ? args.class() : args?.class;
  const argsClassNames = typeof args?.classNames === 'function' ? args.classNames() : args?.classNames;

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

  // --- Sync attributeBindings ---
  const attributeBindings = instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
  if (attributeBindings && Array.isArray(attributeBindings)) {
    for (const binding of attributeBindings) {
      const { propName, attrName } = parseAttributeBinding(binding);

      // Never update id — it's frozen after first render
      if (attrName === 'id') continue;

      const value = propName.includes('.') ? getNestedValue(instance, propName) : instance?.[propName];
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
    // Only remove if it was previously set via ariaRole binding
    const ariaRoleInProto = componentDef?.prototype?.hasOwnProperty('ariaRole');
    const ariaRoleInClass = componentDef?.hasOwnProperty?.('ariaRole');
    if (ariaRoleInProto || ariaRoleInClass) {
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

  if ((attrBindings && attrBindings.length > 0) || (classBindings && classBindings.length > 0)) {
    trackedWrapperInstances.add({ instance, wrapper, componentDef });
  }
}

// Register global hook for syncing wrapper elements when properties change.
// Called from __gxtTriggerReRender in compile.ts.
// Track instances with attribute/class bindings for post-sync updates
const trackedWrapperInstances = new Set<any>();

// Track arg cells for reactive cross-component updates.
// When parent context changes, these cells are updated so GXT formulas re-evaluate.
const trackedArgCells = new Set<Record<string, { cell: any; getter: () => any }>>();

// After gxtSyncDom(), refresh arg cells and re-sync wrapper elements.
(globalThis as any).__gxtSyncAllWrappers = function() {
  // Phase 1: Update arg cells from their getters.
  // This propagates parent context changes into GXT's cell system,
  // causing dependent formulas (text nodes, if conditions, etc.) to re-evaluate.
  for (const argCells of trackedArgCells) {
    for (const key of Object.keys(argCells)) {
      const { cell, getter } = argCells[key]!;
      try {
        const newValue = getter();
        if (cell.__value !== newValue) {
          cell.update(newValue);
        }
      } catch { /* getter may throw */ }
    }
  }

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

  // Set ID - use frozen elementId or auto-generate
  wrapper.id = instance?.elementId || `ember${++emberViewIdCounter}`;

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
      const value = propName.includes('.') ? getNestedValue(instance, propName) : instance?.[propName];
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
      if (key === 'class' || key === 'classNames' || key.startsWith('Symbol')) continue;

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
  // Register arg cells for reactive updates in __gxtSyncAllWrappers
  if (Object.keys(argCells).length > 0) {
    trackedArgCells.add(argCells);
  }
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
      // Install a cell on the render context for this arg.
      // GXT formulas reading renderContext.key will track this cell.
      try {
        const cell = cellForFn2(renderContext, key, /* skipDefine */ false);
        const initialVal = getter();
        cell.update(initialVal);
        renderCtxArgCells[key] = { cell, getter };
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

  // Register render context arg cells for updates in __gxtSyncAllWrappers
  if (Object.keys(renderCtxArgCells).length > 0) {
    trackedArgCells.add(renderCtxArgCells);
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
          } catch { /* ignore */ }
        }
      }
      obj = Object.getPrototypeOf(obj);
    }
  }

  const proxy = new Proxy(renderContext, {
    get(target, prop, _receiver) {
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
        if (prop === 'cond1') console.log('[PROXY-GET] cond1 hasGetter=true');
        return Reflect.get(target, prop, target);
      }
      if (prop === 'cond1') console.log('[PROXY-GET] cond1 hasGetter=false, reaching lazy');

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
          if (prop === 'cond1') console.log('[LAZY-CELL] creating for cond1 on', target?.constructor?.name);
          const cell = _cellFor(target, prop, /* skipDefine */ false);
          if (cell) {
            return cell.value;
          }
        } catch { /* ignore */ }
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
    // Remove GXT internal placeholder comments
    if (
      text.includes('placeholder') ||
      text.includes('if-entry') ||
      text.includes('each-entry') ||
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
    named[arg] = formula(() => args[arg], 'argsForInternalManager');
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
  if (!owner) return null;

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
    const manager = factory ?
      (globalThis.INTERNAL_MANAGERS.get(factory.class) ||
       globalThis.COMPONENT_MANAGERS.get(factory.class)) :
      null;

    return { factory, template, manager };
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
          // Also check for helpers — inline curlies like {{my-helper "foo"}} get
          // transformed to <MyHelper @__pos0__="foo" /> which GXT compiles as $_c.
          try {
            if (owner.factoryFor(`helper:${komp}`) || owner.lookup(`helper:${komp}`)) {
              return true;
            }
          } catch { /* ignore destroyed owner errors */ }
        }
        return false;
      }

      // Handle wrapped component functions from $_componentHelper
      if (typeof komp === 'function' && komp.__stringComponentName) {
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

        // Copy curried named args as lazy getters
        const cArgs = komp.__curriedArgs || {};
        for (const [key, value] of Object.entries(cArgs)) {
          Object.defineProperty(mergedArgs, key, {
            get: () => typeof value === 'function' ? value() : value,
            enumerable: true,
            configurable: true,
          });
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
            for (let i = 0; i < cPositionals.length; i++) {
              const val = cPositionals[i];
              Object.defineProperty(mergedArgs, `__pos${i}__`, {
                get: () => typeof val === 'function' ? val() : val,
                enumerable: true,
                configurable: true,
              });
            }
            mergedArgs.__posCount__ = cPositionals.length;
          }
          // If invocation provides positionals, they override (already in mergedArgs)
        }

        // Resolve the underlying component
        const resolvedKomp = komp.__name;
        return this.handle(resolvedKomp, mergedArgs, fw, ctx);
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
            const helperFactory = owner.factoryFor(`helper:${komp}`);
            const helperLookup = !helperFactory ? owner.lookup(`helper:${komp}`) : null;
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
                return maybeHelper(komp, positional, named, ctx);
              }
            }
          } catch { /* ignore errors */ }
        }

        return null;
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
        if (owner) {
          // Only claim we can handle if the helper actually exists
          const factory = owner.factoryFor?.(`helper:${helper}`);
          if (factory) return true;
          // Also check built-in helpers
          const BUILTIN_HELPERS = (globalThis as any).__EMBER_BUILTIN_HELPERS__;
          if (BUILTIN_HELPERS && BUILTIN_HELPERS[helper]) return true;
        }
      }
      return false;
    },

    handle(helper: any, params: any, hash: any): any {
      if (typeof helper === 'string') {
        const owner = (globalThis as any).owner;

        // Unwrap GXT getter args for the helper, filtering out GXT internal keys
        const unwrapVal = (v: any) => typeof v === 'function' ? v() : v;
        const isGxtInternal = (k: string) => k.startsWith('$_') || k === 'hash';
        const unwrappedArgs = {
          positional: Array.isArray(params) ? params.map(unwrapVal) : [],
          named: hash && typeof hash === 'object'
            ? Object.fromEntries(Object.entries(hash).filter(([k]) => !isGxtInternal(k)).map(([k, v]: [string, any]) => [k, unwrapVal(v)]))
            : {},
        };

        // First check built-in keyword helpers
        const BUILTIN_HELPERS = (globalThis as any).__EMBER_BUILTIN_HELPERS__;
        if (BUILTIN_HELPERS && BUILTIN_HELPERS[helper]) {
          const builtinHelper = BUILTIN_HELPERS[helper];
          if (typeof builtinHelper === 'function') {
            return builtinHelper(...unwrappedArgs.positional);
          }
        }

        // Try container lookup using factoryFor (like the real Ember resolver)
        const factory = owner?.factoryFor?.(`helper:${helper}`);
        if (factory) {
          const definition = factory.class || factory;
          // Walk prototype chain to find helper manager
          const internalManager = getInternalHelperManager(definition);
          if (internalManager) {
            if (typeof internalManager.getDelegateFor === 'function') {
              const delegate = internalManager.getDelegateFor(owner);
              if (delegate && typeof delegate.createHelper === 'function') {
                const bucket = delegate.createHelper(definition, unwrappedArgs);
                if (delegate.capabilities?.hasValue) {
                  return delegate.getValue(bucket);
                }
              }
            }
            if (typeof internalManager.getHelper === 'function') {
              return internalManager.getHelper(definition)(unwrappedArgs, owner);
            }
          }

          // No helper manager found via prototype chain - try direct factory create
          // This handles classic Helper.extend() helpers and other factory-based helpers
          try {
            const instance = factory.create();
            if (instance && typeof instance.compute === 'function') {
              return instance.compute(unwrappedArgs.positional, unwrappedArgs.named);
            }
          } catch {
            // Fall through
          }
        }

        // Fallback: direct lookup (for helpers registered as instances)
        if (!factory) {
          const maybeHelper = owner?.lookup(`helper:${helper}`);
          if (maybeHelper != null) {
            if (typeof maybeHelper.compute === 'function') {
              return maybeHelper.compute(unwrappedArgs.positional, unwrappedArgs.named);
            }
            if (typeof maybeHelper === 'function') {
              return maybeHelper(unwrappedArgs.positional, unwrappedArgs.named);
            }
          }
        }
      }
      return null;
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

  const { factory, template } = resolved;

  // Handle positional params mapping
  // If the component has static positionalParams, map __pos0__, __pos1__, etc. to named args
  const posCount = args.__posCount__;
  if (posCount !== undefined && factory?.class) {
    const positionalParams = factory.class.positionalParams;
    const count = typeof posCount === 'function' ? posCount() : posCount;

    if (positionalParams && Array.isArray(positionalParams)) {
      // positionalParams is an array like ['name', 'age'] - map each positional arg to its name
      for (let i = 0; i < positionalParams.length && i < count; i++) {
        const paramName = positionalParams[i];
        const posKey = `__pos${i}__`;
        const rawValue = args[posKey];

        // Check for conflict between positional param and hash argument
        if (paramName in args && rawValue !== undefined) {
          assert(
            `You cannot specify both a positional param (at position ${i}) and the hash argument \`${paramName}\`.`,
            false
          );
        }

        // Only set if not already defined as a named arg
        if (!(paramName in args) && rawValue !== undefined) {
          const getValue = () => {
            const v = typeof rawValue === 'function' ? rawValue() : rawValue;
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
            posGetters.push(typeof rawValue === 'function' ? rawValue : () => rawValue);
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
    // Get or create cached instance
    const instance = factory ?
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

/**
 * Handle a component with a custom manager.
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

  const tpl = getComponentTemplate(instance) ||
              getComponentTemplate(instance?.prototype) ||
              getComponentTemplate(komp);

  return () => {
    args[$PROPS_SYMBOL] = fw || [[], [], []];
    return tpl?.bind(instance)?.(args);
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
  const wrapper = buildWrapperElement(instance, args, componentDef);
  const renderContext = createRenderContext(instance, args, fw, owner);

  // Apply forwarded DOM attributes (splattributes) to the wrapper element
  // fw[1] contains [attrName, value][] pairs from the invocation site
  if (wrapper instanceof HTMLElement && fw && Array.isArray(fw[1])) {
    for (const [key, value] of fw[1]) {
      const attrValue = typeof value === 'function' ? value() : value;
      if (attrValue != null && attrValue !== false) {
        if (key === 'class') {
          // Append to existing class
          if (wrapper.className) {
            wrapper.className = wrapper.className + ' ' + attrValue;
          } else {
            wrapper.className = String(attrValue);
          }
        } else {
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

  // Set view element on instance using Ember's setViewElement if available
  if (instance && wrapper instanceof HTMLElement) {
    // Ember components have a setViewElement method or we can use Object.defineProperty
    if (typeof instance.setViewElement === 'function') {
      instance.setViewElement(wrapper);
    } else {
      // Try to set via property descriptor
      try {
        Object.defineProperty(instance, 'element', {
          value: wrapper,
          writable: true,
          configurable: true,
        });
      } catch {
        // If that fails, try setting via __element or similar
        instance._element = wrapper;
      }
    }
  }

  // Install reactive attribute/class binding interceptors on the instance
  // so that when properties change, the wrapper element is updated in place.
  if (instance && wrapper instanceof HTMLElement) {
    installBindingInterceptors(instance, wrapper, componentDef);
  }

  // Lifecycle: willRender (in preRender state), then transition to hasElement, then willInsertElement
  // IMPORTANT: willRender is called while still in preRender state
  triggerLifecycleHook(instance, 'willRender');

  // Now transition to hasElement state
  if (instance?._transitionTo) {
    try { instance._transitionTo('hasElement'); } catch {}
  }

  // willInsertElement is called in hasElement state
  triggerLifecycleHook(instance, 'willInsertElement');

  // Render template into wrapper
  renderTemplateWithParentView(template, renderContext, wrapper, instance);

  // Lifecycle: didInsertElement, didRender (sync to ensure test assertions work)
  if (instance?._transitionTo) {
    try { instance._transitionTo('inDOM'); } catch {}
  }
  triggerLifecycleHook(instance, 'didInsertElement');
  triggerLifecycleHook(instance, 'didRender');

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
  // Return the nodes directly - GXT should be able to handle DOM nodes
  if (content instanceof DocumentFragment) {
    // For fragments, return array of child nodes
    const nodes = Array.from(content.childNodes);
    if (nodes.length === 1) {
      return nodes[0]; // Single node - return directly
    }
    return nodes; // Multiple nodes - return array
  }
  // Single element - return directly
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
  return capabilities || {};
}

export function componentCapabilities(_version: string, capabilities?: Record<string, boolean>) {
  return capabilities || {};
}

export function setHelperManager(factory: any, helper: any) {
  return setInternalHelperManager(new CustomHelperManager(factory), helper);
}

export function getHelperManager(helper: any) {
  return getInternalHelperManager(helper);
}

export function getInternalComponentManager(handle: any) {
  return globalThis.INTERNAL_MANAGERS.get(handle);
}

export function getComponentTemplate(comp: any) {
  return globalThis.COMPONENT_TEMPLATES.get(comp);
}

export function setComponentTemplate(tpl: any, comp: any) {
  globalThis.COMPONENT_TEMPLATES.set(comp, tpl);
  return comp;
}

export function setInternalModifierManager(manager: any, modifier: any) {
  globalThis.INTERNAL_MODIFIER_MANAGERS.set(modifier, manager);
  return modifier;
}

export function setComponentManager(manager: any, component: any) {
  return globalThis.COMPONENT_MANAGERS.set(component, manager);
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
  return globalThis.INTERNAL_MANAGERS.has(component);
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

// Make $_MANAGERS available globally for the GXT runtime
(globalThis as any).$_MANAGERS = $_MANAGERS;

export { $_MANAGERS };
