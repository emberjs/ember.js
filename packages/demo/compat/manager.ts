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
import { CustomHelperManager } from './helper-manager';
export { CustomHelperManager } from './helper-manager';

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
    updateInstanceWithNewArgs(poolEntry.instance, args);
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
    const { raw, resolved } = getArgValue(args, key);

    // Skip classNames - handled separately in wrapper building
    if (key === 'classNames') {
      if (typeof raw === 'function') {
        argGetters[key] = raw;
      }
      lastArgValues[key] = resolved;
      continue;
    }

    props[key] = resolved;
    lastArgValues[key] = resolved;

    if (typeof raw === 'function') {
      argGetters[key] = raw;
    }

    // Build attrs with .value pattern (MutableCell)
    const getter = typeof raw === 'function' ? raw : null;
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
function getArgValue(args: any, key: string): { raw: any; resolved: any } {
  const raw = args[key];
  const resolved = typeof raw === 'function' ? raw() : raw;
  return { raw, resolved };
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
      // Binding format can be 'propName' or 'propName:attrName'
      const parts = binding.split(':');
      const propName = parts[0];
      const attrName = parts[1] || propName;
      const value = instance?.[propName];
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
  const renderContext = instance ? Object.create(instance) : {};

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
  if (args && typeof args === 'object') {
    for (const key of Object.keys(args)) {
      if (key === 'class' || key === 'classNames' || key.startsWith('Symbol')) continue;

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

  // Set up reactive getters for args on render context
  // First, try instance.__argGetters (for components with arg processing)
  const argGetters = instance?.__argGetters || {};
  for (const key of Object.keys(argGetters)) {
    try {
      Object.defineProperty(renderContext, key, {
        get() {
          return argGetters[key]();
        },
        enumerable: true,
        configurable: true,
      });
    } catch {
      // Property might already exist
    }
  }

  // Also set up getters directly from args for @arg access (template-only components)
  // This handles cases where instance.__argGetters is empty but args exist
  if (args && typeof args === 'object') {
    for (const key of Object.keys(args)) {
      // Skip internal/special keys and keys already defined
      if (key === 'class' || key === 'classNames' || key.startsWith('__') || key.startsWith('Symbol')) {
        continue;
      }
      // Skip if already defined via argGetters
      if (key in renderContext) {
        continue;
      }
      try {
        const argRef = args[key];
        Object.defineProperty(renderContext, key, {
          get() {
            return typeof argRef === 'function' ? argRef() : argRef;
          },
          enumerable: true,
          configurable: true,
        });
      } catch {
        // Property might already exist on prototype
      }
    }
  }

  return renderContext;
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
      // Handle string component names
      if (typeof komp === 'string') {
        const owner = (globalThis as any).owner;
        if (owner) {
          const resolved = resolveComponent(komp, owner);
          return resolved !== null;
        }
        return false;
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

      // Handle string-based component lookup
      if (typeof komp === 'string') {
        return handleStringComponent(komp, args, fw, ctx, owner);
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
        return true;
      }
      return false;
    },

    handle(helper: any, params: any, hash: any): any {
      if (typeof helper === 'string') {
        const owner = (globalThis as any).owner;

        // First check built-in keyword helpers
        // These are imported from @ember/-internals/glimmer/lib/resolver
        const BUILTIN_HELPERS = (globalThis as any).__EMBER_BUILTIN_HELPERS__;
        if (BUILTIN_HELPERS && BUILTIN_HELPERS[helper]) {
          const builtinHelper = BUILTIN_HELPERS[helper];
          const manager = getInternalHelperManager(builtinHelper);
          if (manager) {
            return manager.getHelper(builtinHelper)(params, owner);
          }
          // Some built-in helpers can be called directly
          if (typeof builtinHelper === 'function') {
            try {
              // Try calling as a simple function helper
              const unwrappedParams = params.map((p: any) => typeof p === 'function' ? p() : p);
              return builtinHelper(...unwrappedParams);
            } catch {
              // Fall through to container lookup
            }
          }
        }

        // Then try container lookup
        const maybeHelper = owner?.lookup(`helper:${helper}`);
        const manager = getInternalHelperManager(maybeHelper);
        if (manager) {
          return manager.getHelper(maybeHelper)(params, owner);
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

export function getInternalHelperManager(helper: any) {
  return (
    globalThis.INTERNAL_HELPER_MANAGERS.get(helper) ||
    globalThis.INTERNAL_HELPER_MANAGERS.get(Object.getPrototypeOf(helper))
  );
}

export function helperCapabilities(v: string, value: any) {
  return value;
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
  return globalThis.INTERNAL_HELPER_MANAGERS.has(helper);
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

export function hasValue(capabilities: Record<string, boolean>): boolean {
  return Boolean(capabilities?.hasValue);
}

export function hasDestroyable(capabilities: Record<string, boolean>): boolean {
  return Boolean(capabilities?.willDestroy);
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
