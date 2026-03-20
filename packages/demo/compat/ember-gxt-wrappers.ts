/**
 * Shared Ember-GXT wrappers for $_maybeHelper and $_tag
 *
 * These wrappers bridge GXT's rendering primitives with Ember's component/helper
 * resolution system. They are installed on globalThis (for runtime-compiled templates)
 * and exported for ES module consumers.
 *
 * This module must be imported AFTER setupGlobalScope() has been called.
 */

// Use direct path to avoid circular alias (since @lifeart/gxt is aliased to gxt-with-runtime-hbs.ts)
// @ts-ignore - direct path import
import * as gxtModule from '../node_modules/@lifeart/gxt/dist/gxt.index.es.js';

const g = globalThis as any;

// =============================================================================
// $_maybeHelper wrapper
// =============================================================================

/**
 * Wraps GXT's $_maybeHelper to support:
 * - Function arguments (like $_blockParam from block params)
 * - Ember's built-in keyword helpers (readonly, mut, unbound)
 * - Helper lookup from Ember's container via owner
 * - Component invocation for kebab-case names ({{foo-bar}})
 */
/**
 * Unwrap GXT args: GXT may pass getters (functions) for reactive values.
 * Helpers expect resolved values in positional/named args.
 */
function unwrapArgs(args: any[]): any[] {
  if (!Array.isArray(args)) return [];
  return args.map(a => typeof a === 'function' ? a() : a);
}

// GXT internal hash keys that should not be passed to Ember helpers
const GXT_INTERNAL_KEYS = new Set(['$_hasBlock', '$_hasBlockParams', '$_scope', '$_eval', 'hash']);

function unwrapHash(hash: Record<string, any>): Record<string, any> {
  if (!hash || typeof hash !== 'object') return {};
  const result: Record<string, any> = {};
  for (const key of Object.keys(hash)) {
    if (GXT_INTERNAL_KEYS.has(key) || key.startsWith('$_')) continue;
    const val = hash[key];
    result[key] = typeof val === 'function' ? val() : val;
  }
  return result;
}

/**
 * Walk the prototype chain to find a helper manager registered via
 * setHelperManager / setInternalHelperManager.
 */
function findHelperManager(obj: any): any {
  const managers = g.INTERNAL_HELPER_MANAGERS;
  if (!managers) return null;
  let current = obj;
  const visited = new Set();
  while (current && !visited.has(current)) {
    visited.add(current);
    const mgr = managers.get(current);
    if (mgr) return mgr;
    current = Object.getPrototypeOf(current);
  }
  return null;
}

function createEmberMaybeHelper(original: Function) {
  const wrapped = function $_maybeHelper_ember(
    nameOrFn: string | Function,
    args: any[],
    hashOrCtx?: any,
    maybeCtx?: any
  ): any {
    // GXT's $_maybeHelper signature: (value, args[], hashOrCtx?, maybeCtx?)
    // Determine which param is the hash (named args) and which is the context.
    // If maybeCtx is provided, hashOrCtx is the hash and maybeCtx is context.
    // If only hashOrCtx and it looks like a context (has $_eval or GXT symbols), it's context.
    const $PROPS = Symbol.for('gxt-props');
    const isCtx = !maybeCtx && hashOrCtx && typeof hashOrCtx === 'object' &&
      (hashOrCtx.hasOwnProperty?.('$_eval') || hashOrCtx[$PROPS] !== undefined || hashOrCtx.hasOwnProperty?.($PROPS));
    const hash = maybeCtx ? hashOrCtx : (isCtx ? {} : (hashOrCtx ?? {}));

    // Function arguments (e.g., $_blockParam) - delegate to original GXT handler
    if (typeof nameOrFn === 'function') {
      // Let original GXT $_maybeHelper handle function-type helpers
      return original(nameOrFn, args, hashOrCtx, maybeCtx);
    }

    const name = nameOrFn;

    // Ember's built-in keyword helpers (readonly, mut, unbound)
    const BUILTIN_HELPERS = g.__EMBER_BUILTIN_HELPERS__;
    if (BUILTIN_HELPERS && BUILTIN_HELPERS[name]) {
      const helper = BUILTIN_HELPERS[name];
      if (Array.isArray(args) && args.length > 0) {
        const unwrappedArgs = unwrapArgs(args);
        return helper(...unwrappedArgs);
      }
      return helper();
    }

    // Try Ember container lookup
    const owner = g.owner;
    if (owner) {
      // First try factoryFor to get the registered class/factory
      const factory = owner.factoryFor(`helper:${name}`);

      if (factory) {
        const positional = unwrapArgs(args || []);
        const named = unwrapHash(hash);

        // Check for helper manager on the factory class (walks prototype chain)
        const factoryClass = factory.class;
        const manager = findHelperManager(factoryClass) || findHelperManager(factoryClass?.prototype);

        if (manager) {
          // Use the helper manager protocol
          if (typeof manager.getHelper === 'function') {
            // CustomHelperManager.getHelper returns (capturedArgs, owner) => value
            const helperFn = manager.getHelper(factoryClass);
            if (typeof helperFn === 'function') {
              const capturedArgs = { positional, named };
              const result = helperFn(capturedArgs, owner);
              return result;
            }
          }
          if (typeof manager.createHelper === 'function' && typeof manager.getValue === 'function') {
            // Direct manager protocol (SimpleClassicHelperManager, ClassicHelperManager)
            const state = manager.createHelper(factoryClass, { positional, named });
            const result = manager.getValue(state);
            return result;
          }
        }

        // No manager found - create instance and call compute directly
        try {
          const instance = factory.create();
          if (instance && typeof instance.compute === 'function') {
            const result = instance.compute(positional, named);
            return result;
          }
        } catch (e) {
          console.error(`[ember-gxt] Error invoking helper "${name}":`, e);
        }

        // Helper was found in registry but couldn't be invoked - return undefined
        // rather than falling through to GXT's native handler
        return undefined;
      }

      // Also try direct lookup (for programmatically registered helpers)
      const helper = owner.lookup(`helper:${name}`);
      if (helper && !factory) {
        const positional = unwrapArgs(args || []);
        const named = unwrapHash(hash);

        // Check for helper manager on the instance
        const manager = findHelperManager(helper) || findHelperManager(helper?.constructor);
        if (manager && typeof manager.createHelper === 'function' && typeof manager.getValue === 'function') {
          const state = manager.createHelper(helper, { positional, named });
          const result = manager.getValue(state);
          return result;
        }

        // Object with compute method (class-based helper instance)
        if (typeof helper.compute === 'function') {
          const result = helper.compute(positional, named);
          return result;
        }

        // Function helper
        if (typeof helper === 'function') {
          const result = helper(positional, named);
          return result;
        }
      }

      // For kebab-case names, try component lookup
      if (name.includes('-')) {
        const compFactory = owner.factoryFor(`component:${name}`);
        if (compFactory) {
          const $_MANAGERS = g.$_MANAGERS;
          if ($_MANAGERS?.component?.handle) {
            const componentArgs: Record<string, any> = {};
            if (hash && typeof hash === 'object') {
              for (const key of Object.keys(hash)) {
                if (!key.startsWith('$_') && key !== 'hash') {
                  componentArgs[key] = hash[key];
                }
              }
            }
            const result = $_MANAGERS.component.handle(name, componentArgs, [[], [], []], null);
            if (typeof result === 'function') {
              const nodes = result();
              if (Array.isArray(nodes)) {
                const fragment = document.createDocumentFragment();
                nodes.forEach((n: Node) => fragment.appendChild(n));
                return fragment;
              }
              return nodes;
            }
            if (result && typeof result === 'object') {
              const symbols = Object.getOwnPropertySymbols(result);
              for (const sym of symbols) {
                if (Array.isArray(result[sym])) {
                  const fragment = document.createDocumentFragment();
                  result[sym].forEach((n: Node) => {
                    if (n instanceof Node) fragment.appendChild(n);
                  });
                  return fragment;
                }
              }
            }
            return result;
          }
        }
      }
    }

    // Fall back to GXT's native maybeHelper
    return original(name, args, hashOrCtx, maybeCtx);
  };
  (wrapped as any).__emberWrapped = true;
  (wrapped as any).__emberAware = true;
  return wrapped;
}

// =============================================================================
// $_tag wrapper
// =============================================================================

/**
 * Wraps GXT's $_tag to support:
 * - PascalCase/kebab-case component resolution via Ember's registry
 * - Dynamic components (<@foo />, <this.foo />)
 * - Named blocks (<:header>, <:default>)
 * - EmberHtmlRaw (triple mustaches {{{expr}}})
 */
function createEmberTag(original: Function) {
  const $ARGS_SYMBOL = Symbol.for('gxt-args');

  // GXT's $_tag signature is: $_tag(tag, tagProps, ctx, children)
  // We receive (tag, tagProps, ctx, children) from GXT's compiled output
  return function $_tag_ember(
    tag: string | (() => string),
    tagProps: any,
    gxtCtx: any,
    gxtChildren: any[]
  ): any {
    // GXT passes (tag, tagProps, ctx, children) — use GXT's order
    const children = gxtChildren;
    const ctx = gxtCtx;
    const resolvedTag = typeof tag === 'function' ? tag() : tag;

    if (resolvedTag && typeof resolvedTag === 'string') {
      // Dynamic component: <@foo />
      if (resolvedTag.startsWith('@')) {
        const argName = resolvedTag.slice(1);
        const args = ctx?.[$ARGS_SYMBOL] || ctx?.args || {};
        const componentValue = args[argName];
        if (componentValue) {
          const managers = g.$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, {}, children, ctx);
          }
        }
        return document.createComment(`dynamic component @${argName} not found`);
      }

      // Dynamic component: <this.foo />
      if (resolvedTag.startsWith('this.')) {
        const propPath = resolvedTag.slice(5);
        let componentValue = ctx;
        for (const part of propPath.split('.')) {
          componentValue = componentValue?.[part];
        }
        if (componentValue) {
          const managers = g.$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, {}, children, ctx);
          }
        }
        return document.createComment(`dynamic component this.${propPath} not found`);
      }

      // Named blocks: <:header>, <:default>
      if (resolvedTag.startsWith(':')) {
        const slotName = resolvedTag.slice(1);
        let hasBlockParams = false;
        if (tagProps && tagProps !== gxtModule.$_edp) {
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key] of attrs) {
              if (key === '@__hasBlockParams__') {
                hasBlockParams = true;
                break;
              }
            }
          }
          const fw = tagProps[3];
          if (fw && fw.__hasBlockParams) {
            hasBlockParams = true;
          }
        }
        return {
          __isNamedBlock: true,
          __slotName: slotName,
          __children: children,
          __hasBlockParams: hasBlockParams,
        };
      }

      // EmberHtmlRaw (triple mustaches)
      if (resolvedTag === 'EmberHtmlRaw') {
        let value: any;
        if (tagProps && tagProps !== gxtModule.$_edp) {
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
        return function __htmlRawThunk() {
          const actualValue = typeof value === 'function' ? value() : value;
          if (actualValue == null) {
            return document.createTextNode('');
          }
          const htmlContent = actualValue?.toHTML?.() ?? String(actualValue);
          const template = document.createElement('template');
          template.innerHTML = htmlContent;
          const fragment = document.createDocumentFragment();
          while (template.content.firstChild) {
            fragment.appendChild(template.content.firstChild);
          }
          return fragment;
        };
      }
    }

    // Check if this looks like a component name (PascalCase or contains hyphen)
    const mightBeComponent = resolvedTag &&
      typeof resolvedTag === 'string' &&
      (resolvedTag[0] === resolvedTag[0].toUpperCase() || resolvedTag.includes('-'));

    const managers = g.$_MANAGERS;

    if (mightBeComponent && managers?.component?.canHandle) {
      // Convert PascalCase to kebab-case
      const kebabName = resolvedTag
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();

      if (managers.component.canHandle(kebabName)) {
        // Build args from tagProps - keep lazy
        let args: any = {};
        const domAttrs: [string, any][] = [];

        if (tagProps && tagProps !== gxtModule.$_edp) {
          const props = tagProps[0];
          if (Array.isArray(props)) {
            for (const [key, value] of props) {
              const attrKey = key === '' ? 'class' : key;
              domAttrs.push([attrKey, value]);
            }
          }

          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, value] of attrs) {
              if (key.startsWith('@')) {
                const argName = key.slice(1);
                Object.defineProperty(args, argName, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              } else {
                domAttrs.push([key, value]);
                Object.defineProperty(args, key, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
            }
          }
        }

        // Build slots from children
        const slots: Record<string, any> = {};
        let events: [string, any][] = [];
        if (tagProps && tagProps !== gxtModule.$_edp && Array.isArray(tagProps[2])) {
          events = tagProps[2];
        }

        const detectBlockParams = (slotChildren: any[]): boolean => {
          for (const child of slotChildren) {
            if (typeof child === 'function') {
              const fnStr = child.toString();
              if (/\$_bp\d/.test(fnStr)) return true;
            }
          }
          return false;
        };

        if (children && children.length > 0) {
          const namedBlocks: Map<string, { children: any[]; hasBlockParams: boolean }> = new Map();
          const defaultChildren: any[] = [];

          for (const child of children) {
            if (child && typeof child === 'object' && child.__isNamedBlock) {
              const slotName = child.__slotName;
              if (!namedBlocks.has(slotName)) {
                namedBlocks.set(slotName, { children: [], hasBlockParams: false });
              }
              const slot = namedBlocks.get(slotName)!;
              if (child.__children) slot.children.push(...child.__children);
              if (child.__hasBlockParams) slot.hasBlockParams = true;
            } else {
              defaultChildren.push(child);
            }
          }

          const createSlotFn = (slotChildren: any[], explicitHasBlockParams?: boolean) => {
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

              const contextParams = g.__contextBlockParams as WeakMap<object, any[]>;
              if (contextParams && slotCtx && typeof slotCtx === 'object') {
                contextParams.set(slotCtx, [...unwrappedParams]);
              }
              g.__currentSlotParams = unwrappedParams;

              const stack = g.__blockParamsStack;
              stack.push(unwrappedParams);
              try {
                const results: any[] = [];
                for (const child of slotChildren) {
                  if (typeof child === 'function') {
                    try { results.push(child()); } catch { results.push(child); }
                  } else {
                    results.push(child);
                  }
                }
                return results;
              } finally {
                stack.pop();
              }
            };
            (slotFn as any).__hasBlockParams = hasBlockParams;
            return slotFn;
          };

          for (const [slotName, slotData] of namedBlocks) {
            slots[slotName] = createSlotFn(slotData.children, slotData.hasBlockParams);
          }

          if (defaultChildren.length > 0) {
            const explicitHasBlockParams = args.__hasBlockParams__ !== undefined
              ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
              : undefined;
            slots.default = createSlotFn(defaultChildren, explicitHasBlockParams);
          }
        }

        // Build fw (forwarding) structure matching compile.ts convention:
        // fw[0] = props (empty), fw[1] = domAttrs, fw[2] = events
        // Also merge parent forwarding from tagProps[3] (from ...attributes)
        const parentFw = tagProps?.[3];
        if (parentFw && typeof parentFw === 'object') {
          // Merge parent's forwarded attrs/events into ours
          if (Array.isArray(parentFw[1])) {
            domAttrs.push(...parentFw[1]);
          }
          if (Array.isArray(parentFw[2])) {
            events.push(...parentFw[2]);
          }
        }
        const fw = [[], domAttrs, events];

        // Pass slots via args so manager.ts can access them
        args.$slots = slots;

        // Delegate to component manager
        return managers.component.handle(kebabName, args, fw, ctx);
      }
    }

    // Fall back to original $_tag for regular HTML elements (GXT order: tag, tagProps, ctx, children)
    return original(tag, tagProps, ctx, children);
  };
}

// =============================================================================
// Installation & exports
// =============================================================================

// Install on globalThis for runtime-compiled template access
export function installEmberWrappers() {
  if (g.$_maybeHelper && !g.$_maybeHelper.__emberWrapped) {
    g.$_maybeHelper = createEmberMaybeHelper(g.$_maybeHelper);
  }
  if (g.$_tag && !g.$_tag.__emberWrapped) {
    g.$_tag = createEmberTag(g.$_tag);
    g.$_tag.__emberWrapped = true;
  }
}

// Create module-level wrapped exports for ES module consumers
export const $_maybeHelper = createEmberMaybeHelper(gxtModule.$_maybeHelper);
export const $_tag = createEmberTag(gxtModule.$_tag);
