/**
 * GXT-compatible @ember/template-compilation implementation
 *
 * This module provides runtime template compilation using the GXT runtime compiler.
 * It implements the same interface as @ember/template-compilation but uses GXT
 * for template compilation instead of Glimmer VM.
 */

// Import the GXT runtime compiler
import {
  compileTemplate as gxtCompileTemplate,
  setupGlobalScope,
  isGlobalScopeReady,
} from '@lifeart/gxt/runtime-compiler';

import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
  $_MANAGERS,
  RENDERED_NODES_PROPERTY,
  COMPONENT_ID_PROPERTY,
  syncDom as gxtSyncDom,
  cellFor,
} from '@lifeart/gxt';

// Install shared Ember wrappers for $_maybeHelper and $_tag on globalThis
import { installEmberWrappers } from './ember-gxt-wrappers';

const $SLOTS_SYMBOL = Symbol.for('gxt-slots');

// Ensure global scope is set up
if (!isGlobalScopeReady()) {
  setupGlobalScope();
}

// Install Ember-aware wrappers for $_maybeHelper on globalThis
installEmberWrappers();

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
  try {
    const c = cellFor(obj, keyName);
    if (c) c.update((obj as any)[keyName]);
  } catch {
    // cellFor may not apply to all objects
  }
  (globalThis as any).__gxtPendingSync = true;
};

// Flush pending GXT DOM updates synchronously.
// Called after runTask() completes so test assertions see updated DOM.
(globalThis as any).__gxtSyncDomNow = function() {
  if ((globalThis as any).__gxtPendingSync) {
    (globalThis as any).__gxtPendingSync = false;
    try {
      gxtSyncDom();
    } catch {
      // Ignore sync errors
    }
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
};

// Set GXT mode flag
(globalThis as any).__GXT_MODE__ = true;

// Expose $_MANAGERS on globalThis so the $_tag wrapper can access it
// (manager.ts will configure it later, but we need the same reference)
(globalThis as any).$_MANAGERS = $_MANAGERS;

// Register built-in keyword helpers for GXT integration
// These are simplified implementations for GXT since it doesn't have Glimmer VM's reference system
(globalThis as any).__EMBER_BUILTIN_HELPERS__ = {
  // readonly: Returns the value as-is (GXT doesn't have two-way binding to protect against)
  readonly: (value: any) => {
    // Unwrap if it's a function/getter
    return typeof value === 'function' ? value() : value;
  },
  // mut: Returns the value as-is (GXT doesn't need the mutable wrapper)
  mut: (value: any) => {
    return typeof value === 'function' ? value() : value;
  },
  // unbound: Returns the value without tracking (GXT handles this differently)
  unbound: (value: any) => {
    return typeof value === 'function' ? value() : value;
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

// Override $_tag to check for Ember components before creating HTML elements
// GXT compiles PascalCase tags like <FooBar /> to $_tag('FooBar', ...) but
// these should be handled by the component manager for Ember integration
const g = globalThis as any;
if (g.$_tag && !g.$_tag.__emberWrapped) {
  const originalTag = g.$_tag;

  // GXT's $_tag signature: $_tag(tag, tagProps, ctx, children)
  g.$_tag = function $_tag_ember(
    tag: string | (() => string),
    tagProps: any,
    ctx: any,
    children: any[]
  ): any {
    const resolvedTag = typeof tag === 'function' ? tag() : tag;

    // Handle dynamic component patterns: <@foo /> and <this.foo />
    // These are invalid HTML tag names that need special handling
    if (resolvedTag && typeof resolvedTag === 'string') {
      // Handle <@foo /> - component passed as argument
      if (resolvedTag.startsWith('@')) {
        const argName = resolvedTag.slice(1); // Remove '@'
        // Get the component from the context's args
        // GXT uses plain string 'args' ($args = 'args')
        const args = ctx?.['args'] || ctx?.args || {};
        const componentValue = args[argName];
        if (componentValue) {
          // Render the dynamic component
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, {}, children, ctx);
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
          // Render the dynamic component
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, {}, children, ctx);
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
    // This component outputs raw HTML without escaping
    if (resolvedTag === 'EmberHtmlRaw') {
      // Extract the value from tagProps
      let value: any;
      if (tagProps && tagProps !== g.$_edp) {
        const attrs = tagProps[1];
        if (Array.isArray(attrs)) {
          for (const [key, val] of attrs) {
            if (key === '@value') {
              value = typeof val === 'function' ? val() : val;
              break;
            }
          }
        }
      }

      // Return a thunk that creates a span with innerHTML
      return function __htmlRawThunk() {
        const actualValue = typeof value === 'function' ? value() : value;
        if (actualValue == null) {
          return document.createTextNode('');
        }
        // Check if it's an htmlSafe string (has toHTML method)
        const htmlContent = actualValue?.toHTML?.() ?? String(actualValue);
        // Create a document fragment with the HTML content
        const template = document.createElement('template');
        template.innerHTML = htmlContent;
        // Return the fragment's children
        const fragment = document.createDocumentFragment();
        while (template.content.firstChild) {
          fragment.appendChild(template.content.firstChild);
        }
        return fragment;
      };
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
                const results: any[] = [];
                for (let i = 0; i < slotChildren.length; i++) {
                  const child = slotChildren[i];
                  if (typeof child === 'function') {
                    try {
                      const childResult = child();
                      results.push(childResult);
                    } catch (e) {
                      results.push(child);
                    }
                  } else {
                    results.push(child);
                  }
                }
                return results;
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
              // Return children results as GXT template items - NOT as DOM nodes
              // GXT's $_tag expects to receive template items (functions, strings, elements)
              // and handles the DOM conversion itself
              const results: any[] = [];
              for (const child of children) {
                if (typeof child === 'function') {
                  try {
                    // Call the child function to get its result
                    // This might return a DOM node, string, or other GXT item
                    const childResult = child();
                    // Pass through the result - let GXT handle it
                    results.push(childResult);
                  } catch (e) {
                    // Fallback for static content
                    results.push(child);
                  }
                } else {
                  // Pass through non-function children directly
                  results.push(child);
                }
              }
              return results;
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

        // Check for __hasBlock__ marker - indicates curly block invocation
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

        // Pass slots via args so manager.ts can access them
        args.$slots = slots;

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
  g.$_tag.__emberWrapped = true;
}

/**
 * Transform capitalized component names to kebab-case for runtime resolution.
 */
function transformCapitalizedComponents(code: string): string {
  let result = code;

  // List of known Ember built-in components that need transformation
  const knownComponents = ['LinkTo', 'Input', 'Textarea', 'Outlet'];

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
  // The expression inside can contain dots, this., @, etc.
  return code.replace(/\{\{\{([^}]+)\}\}\}/g, (match, expr) => {
    // Transform to a call to the htmlSafe helper wrapped in a span
    // Use PascalCase so GXT treats it as a component
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
        // Wrap value in {{}} if it's a path like this.name and not already wrapped
        let attrValue = value;
        if (value.startsWith('this.') && !value.startsWith('{{')) {
          attrValue = `{{${value}}}`;
        }
        return `${attrName}=${attrValue}`;
      });

    // Return with leading space
    return ' ' + transformed;
  };

  // Block form: {{#component "name"}}...{{/component}}
  // Need to handle nested components properly
  const blockPattern = /\{\{#component\s+["']([^"']+)["']([^}]*)\}\}([\s\S]*?)\{\{\/component\}\}/g;
  result = result.replace(blockPattern, (match, name, attrs, content) => {
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs}>${content}</${pascalName}>`;
  });

  // Inline form: {{component "name" arg=val}}
  const inlinePattern = /\{\{component\s+["']([^"']+)["']([^}]*)\}\}/g;
  result = result.replace(inlinePattern, (match, name, attrs) => {
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs} />`;
  });

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

      // Check for positional parameter: "string" or 'string' or {{expr}} or number or this.path
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
  const inlinePattern = /\{\{([a-z][a-zA-Z0-9]*-[a-zA-Z0-9-]*)([^}]*)\}\}/g;
  result = result.replace(inlinePattern, (match, name, attrs) => {
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
  transformedTemplate = transformCapitalizedComponents(transformedTemplate);
  if (/\{\{\s*outlet\s*\}\}/.test(transformedTemplate)) {
    transformedTemplate = transformOutletHelper(transformedTemplate);
  }
  // Transform triple mustaches {{{expr}}} to raw HTML component
  if (/\{\{\{/.test(transformedTemplate)) {
    transformedTemplate = transformTripleMustaches(transformedTemplate);
  }
  // Transform {{component}} helper to angle-bracket
  if (/\{\{#?component\s+["']/.test(transformedTemplate)) {
    transformedTemplate = transformComponentHelper(transformedTemplate);
  }

  // Transform curly block component syntax to angle-bracket
  // {{#foo-bar}}...{{/foo-bar}} → <FooBar>...</FooBar>
  // Also transforms inline {{foo-bar ...}} calls
  if (/\{\{#?[a-z][a-zA-Z0-9]*-[a-zA-Z0-9-]*[\s}]/.test(transformedTemplate)) {
    transformedTemplate = transformCurlyBlockComponents(transformedTemplate);
  }

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

  // Replace async $_each with synchronous $_eachSync.
  // GXT's $_each is async which breaks Ember's synchronous test expectations.
  // Only recreate the template function if we actually need to replace $_each.
  // Otherwise, keep GXT's runtime compiler's original templateFn which has
  // the correct $a alias (this['args']) and access to closure variables.
  if (compilationResult.code && compilationResult.code.includes('$_each(')) {
    const modifiedCode = compilationResult.code.replace(/\$_each\(/g, '$_eachSync(');
    compilationResult.code = modifiedCode;
    try {
      // GXT's runtime compiler uses $args = 'args' (a string, not Symbol)
      // and puts all GXT functions on globalThis via setupGlobalScope()
      const needsArgsAlias = modifiedCode.includes('$a.');
      const templateFnCode = `
        "use strict";
        return function() {
          ${needsArgsAlias ? "const $a = this['args'];" : ''}
          return ${modifiedCode};
        };
      `;
      compilationResult.templateFn = Function(templateFnCode)();
    } catch (e) {
      console.error('[gxt-compile] Failed to recreate template function with $_eachSync:', e);
    }
  }



  // Helper function to convert template results to nodes
  const itemToNode = (item: any, depth = 0): Node | null => {
    if (item instanceof Node) {
      return item;
    }
    // GXT returns getter functions for dynamic values like {{@greeting}}
    // These need to be called to get the actual value
    if (typeof item === 'function') {
      try {
        const result = item();
        return itemToNode(result, depth + 1);
      } catch (e) {
        // If the function throws, it might be a component or helper
        // Return null and let the caller handle it
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

          g.$slots = context[$SLOTS_SYMBOL] || context.$slots || {};
          g.$fw = context.$fw || [[], [], []];


          // Initialize GXT context symbols on the render context if not present
          // GXT requires these for proper parent/child tracking
          // Use the actual symbols exported from GXT

          // Create a render context that inherits from the component but has GXT symbols
          const renderContext = Object.create(context);

          // Store both context and renderContext for debugging
          (globalThis as any).__lastRenderContext = context;
          (globalThis as any).__lastRenderContextCreated = renderContext;


          // Set up the GXT context symbols using the proper exported symbols
          if (RENDERED_NODES_PROPERTY && !renderContext[RENDERED_NODES_PROPERTY as any]) {
            renderContext[RENDERED_NODES_PROPERTY as any] = [];
          }
          if (COMPONENT_ID_PROPERTY && !renderContext[COMPONENT_ID_PROPERTY as any]) {
            // Generate a unique context ID
            renderContext[COMPONENT_ID_PROPERTY as any] = g.__gxtContextId = (g.__gxtContextId || 0) + 1;
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

          // Push slots onto the global stack for nested has-block checks
          const slotsStack = (globalThis as any).__slotsContextStack;
          slotsStack.push(currentSlots);

          // Call the compiled template function with the render context
          let result;
          try {
            result = compilationResult.templateFn.call(renderContext);
          } finally {
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

          let errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg === '[object Object]' && err) {
            // Try to get more info
            errMsg = JSON.stringify(err, null, 2).substring(0, 200);
          }
          console.error('[gxt-compile] Render error:', errMsg);
          console.error('[gxt-compile] Template:', templateString.slice(0, 200));
          if (err?.stack) {
            console.error('[gxt-compile] Stack:', err.stack.substring(0, 300));
          }
          return { nodes: [], ctx: context };
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
