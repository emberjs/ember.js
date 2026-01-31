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
}

// =============================================================================
// Symbols and Constants
// =============================================================================

const $PROPS_SYMBOL = Symbol.for('gxt-props');
const $SLOTS_SYMBOL = Symbol.for('gxt-slots');

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

  // Check if this is a new render frame - if so, reset claimed flags
  const currentRenderFrame = (globalThis as any).__currentRenderFrame || Symbol('default-frame');
  const lastRenderFrame = parentRenderFrames.get(parentKey);
  if (currentRenderFrame !== lastRenderFrame) {
    // New render frame - reset all claimed flags for this parent
    for (const pools of componentPools.values()) {
      for (const entry of pools) {
        entry.claimed = false;
      }
    }
    parentRenderFrames.set(parentKey, currentRenderFrame);
  }

  // Find an unclaimed instance from the pool
  const poolEntry = pool.find((e) => !e.claimed);

  if (poolEntry) {
    // Claim this instance and update with new args
    poolEntry.claimed = true;
    updateInstanceWithNewArgs(poolEntry.instance, args);
    return poolEntry.instance;
  }

  // No unclaimed instance - create a new one
  const instance = createComponentInstance(factory, args, currentParentView, owner);

  // Add to pool and mark as claimed
  pool.push({ instance, claimed: true });

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

  let hasChanges = false;
  const keys = extractArgKeys(args);

  for (const key of keys) {
    const { resolved: newValue } = getArgValue(args, key);
    const oldValue = lastArgValues[key];

    if (newValue !== oldValue) {
      hasChanges = true;

      // Update the instance property (but not elementId - it's frozen)
      if (key !== 'elementId') {
        instance[key] = newValue;
      }

      lastArgValues[key] = newValue;
    }
  }

  if (hasChanges) {
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
 */
function triggerLifecycleHook(instance: any, hookName: string): void {
  if (!instance) return;

  try {
    // Try event-based trigger first (Ember's EventTarget mixin)
    if (typeof instance.trigger === 'function') {
      instance.trigger(hookName);
    }

    // Also call direct method if it exists
    if (typeof instance[hookName] === 'function') {
      instance[hookName]();
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
  const tagName = instance?.tagName === '' ? null : (instance?.tagName || 'div');

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
  renderContext.attrs = attrsProxy;

  if (instance && !instance.attrs) {
    instance.attrs = attrsProxy;
  }

  // Set up reactive getters for args on render context
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

  return renderContext;
}

// =============================================================================
// Template Rendering
// =============================================================================

/**
 * Render a template with parent view tracking.
 */
function renderTemplateWithParentView(
  template: any,
  renderContext: any,
  container: Element | DocumentFragment,
  instance: any
): any {
  if (instance) {
    pushParentView(instance);
  }

  try {
    return template.render(renderContext, container);
  } finally {
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

  // Try component lookup
  const factory = owner.factoryFor(`component:${name}`);

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
    template = owner.lookup(`template:components/${name}`);
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
  if (!resolved) return null;

  const { factory, template } = resolved;

  return () => {
    // Mark new render frame
    (globalThis as any).__currentRenderFrame = Symbol('render-frame');

    // Get or create cached instance
    const instance = factory ?
      getCachedOrCreateInstance(factory, args, factory.class, owner) :
      null;

    // Resolve template
    let resolvedTemplate = template;
    if (!resolvedTemplate && instance) {
      resolvedTemplate = getComponentTemplate(instance) ||
                         getComponentTemplate(instance.constructor) ||
                         getComponentTemplate(factory?.class);
    }

    // If template is a factory function, call it to get the actual template
    if (typeof resolvedTemplate === 'function' && !resolvedTemplate.render) {
      resolvedTemplate = resolvedTemplate(owner);
    }

    if (!resolvedTemplate?.render) {
      return null;
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
    // Mark new render frame
    (globalThis as any).__currentRenderFrame = Symbol('render-frame');

    const instance = getCachedOrCreateInstance(factory, args, factory.class, owner);

    const template = getComponentTemplate(instance) ||
                     getComponentTemplate(instance?.constructor) ||
                     getComponentTemplate(factory.class);

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

  // Lifecycle: willRender, hasElement, willInsertElement
  if (instance?._transitionTo) {
    try { instance._transitionTo('hasElement'); } catch {}
  }
  triggerLifecycleHook(instance, 'willRender');
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
  // GXT expects a context object with rendered nodes in a symbol property
  const gxtContext: any = {};

  // Find the array property symbol and set the nodes
  const nodes = content instanceof DocumentFragment ?
    Array.from(content.childNodes) :
    [content];

  // GXT uses a symbol for the nodes array
  const RENDERED_NODES = Symbol.for('gxt-rendered-nodes');
  gxtContext[RENDERED_NODES] = nodes;

  return gxtContext;
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
