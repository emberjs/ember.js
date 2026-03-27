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
function isGxtGetter(v: any): boolean {
  return typeof v === 'function' && !v.prototype && !v.__isFnHelper && !v.__isMutCell;
}
function unwrapArgs(args: any[]): any[] {
  if (!Array.isArray(args)) return [];
  // Only unwrap GXT getters (arrow fns with no prototype).
  // Regular functions (like closures from (fn ...)) should be passed as-is.
  return args.map(a => isGxtGetter(a) ? a() : a);
}

// GXT internal hash keys that should not be passed to Ember helpers
const GXT_INTERNAL_KEYS = new Set(['$_hasBlock', '$_hasBlockParams', '$_scope', '$_eval', 'hash']);

function unwrapHash(hash: Record<string, any>): Record<string, any> {
  if (!hash || typeof hash !== 'object') return {};
  const result: Record<string, any> = {};
  for (const key of Object.keys(hash)) {
    if (GXT_INTERNAL_KEYS.has(key) || key.startsWith('$_')) continue;
    const val = hash[key];
    // Don't call CurriedComponent functions - they should be preserved as-is
    result[key] = (typeof val === 'function' && !val.__isCurriedComponent) ? val() : val;
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

// Cache for class-based helper instances created via $_maybeHelper.
// Keyed by helper name for simple per-invocation caching.
// Cleared during test teardown via __gxtClearHelperCache.
const classHelperInstanceCache = new Map<string, any>();
// Cache for simple (function-based) helper results to deduplicate calls within
// the same sync cycle. Keyed by helper name, stores last args serialization + result.
const simpleHelperResultCache = new Map<string, { argsSer: string; result: any }>();
// Cache for managed helper buckets (class-based helpers with setHelperManager).
// Keyed by the helper class/function. Stores { bucket, delegate, reactiveArgs }.
let managedHelperBucketCache = new WeakMap<any, { bucket: any; delegate: any; reactiveArgs: { positional: any[]; named: Record<string, any> } }>();
(g as any).__gxtClearHelperCache = () => { classHelperInstanceCache.clear(); simpleHelperResultCache.clear(); managedHelperBucketCache = new WeakMap(); };

// When a property changes on a component, invalidate managed helper caches
// so the next render pass picks up the changes. We DON'T re-compute values
// here to avoid double-counting (GXT's native reactivity may also trigger).
(g as any).__gxtNotifyHelperPropertyChange = function(_obj: any, _key: string) {
  for (const [, cached] of classHelperInstanceCache as Map<string, any>) {
    if (cached && cached.__managerBucket) {
      // Invalidate the args serialization so the next $_maybeHelper call
      // doesn't short-circuit with the cached result
      cached.lastArgsSer = null;
    }
  }
};

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
    const $ARGS = Symbol.for('gxt-args');
    const isCtx = !maybeCtx && hashOrCtx && typeof hashOrCtx === 'object' &&
      (hashOrCtx.hasOwnProperty?.('$_eval')
        || hashOrCtx[$PROPS] !== undefined
        || hashOrCtx.hasOwnProperty?.($PROPS)
        || hashOrCtx[$ARGS] !== undefined
        // Detect Ember component instances used as context (not as hash)
        || (hashOrCtx.isView === true && hashOrCtx.isComponent === true));
    const hash = maybeCtx ? hashOrCtx : (isCtx ? {} : (hashOrCtx ?? {}));

    // Handle CurriedComponent — when a curried component is used as {{curried ...}} or {{object.comp ...}}
    if (nameOrFn && nameOrFn.__isCurriedComponent) {
      // Merge the invocation args into the curried component
      const namedArgs: Record<string, any> = {};
      if (hash && typeof hash === 'object') {
        for (const key of Object.keys(hash)) {
          if (!key.startsWith('$_') && key !== 'hash') {
            namedArgs[key] = hash[key];
          }
        }
      }
      const positionals = Array.isArray(args) ? args : [];

      // Create a new curried component with merged args
      const createCurried = g.__createCurriedComponent;
      if (!createCurried) return nameOrFn;
      const merged = createCurried(nameOrFn, namedArgs, positionals);

      // Render it through the component manager
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(merged)) {
        const handleResult = managers.component.handle(merged, {}, null, null);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
      }
      return merged;
    }

    // Function/class arguments — check for a registered helper manager first.
    // Classes like TestHelper subclasses are typeof 'function' but have a
    // helper manager set on a parent prototype via setHelperManager().
    if (typeof nameOrFn === 'function') {
      const helperMgr = findHelperManager(nameOrFn);
      if (helperMgr) {
        // This is a class/function with a registered helper manager.
        // Use the delegate protocol to create the helper instance once
        // and call getValue on each re-render.
        const positional = unwrapArgs(args || []);
        const named = unwrapHash(hash);

        if (typeof helperMgr.getDelegateFor === 'function') {
          const delegate = helperMgr.getDelegateFor(g.owner);
          if (delegate && typeof delegate.createHelper === 'function' && delegate.capabilities?.hasValue) {
            // Check cache — reuse the same bucket across re-evaluations
            let cached = managedHelperBucketCache.get(nameOrFn);
            if (!cached) {
              // Build a reactive args object so the helper can read updated values
              const reactiveArgs: { positional: any[]; named: Record<string, any> } = {
                positional: [...positional],
                named: { ...named },
              };

              // Create the helper bucket once
              const bucket = delegate.createHelper(nameOrFn, reactiveArgs);

              // If the delegate supports destroyable, wire it up
              if (delegate.capabilities?.hasDestroyable && typeof delegate.getDestroyable === 'function') {
                const destroyable = delegate.getDestroyable(bucket);
                if (destroyable) {
                  const helperInstances = g.__gxtHelperInstances;
                  if (Array.isArray(helperInstances)) {
                    helperInstances.push(destroyable);
                  }
                }
              }

              cached = { bucket, delegate, reactiveArgs };
              managedHelperBucketCache.set(nameOrFn, cached);
            } else {
              // Update the reactive args in place
              cached.reactiveArgs.positional = positional;
              cached.reactiveArgs.named = named;
            }

            return cached.delegate.getValue(cached.bucket);
          }
        }

        // Fallback: use getHelper
        if (typeof helperMgr.getHelper === 'function') {
          const helperFn = helperMgr.getHelper(nameOrFn);
          if (typeof helperFn === 'function') {
            const capturedArgs = { positional, named };
            return helperFn(capturedArgs, g.owner);
          }
        }
      }

      // No helper manager — let original GXT $_maybeHelper handle it
      return original(nameOrFn, args, hashOrCtx, maybeCtx);
    }

    const name = nameOrFn;

    // Ember's built-in keyword helpers (readonly, mut, unbound, hash, etc.)
    const BUILTIN_HELPERS = g.__EMBER_BUILTIN_HELPERS__;
    if (BUILTIN_HELPERS && BUILTIN_HELPERS[name]) {
      const helper = BUILTIN_HELPERS[name];
      // For 'hash' helper, pass the named args (hash) as the first argument
      if (name === 'hash') {
        const namedObj = unwrapHash(hash);
        return helper(namedObj);
      }
      // For 'mut' helper, pass the raw getter + path, and set context
      if (name === 'mut' && Array.isArray(args) && args.length > 0) {
        // args[0] = getter for the value, args[1] = path string (added by template transform)
        const rawGetter = args[0];
        const pathArg = args.length > 1 ? (typeof args[1] === 'function' ? args[1]() : args[1]) : undefined;
        // Set the mut context so the setter can find the component instance.
        // The context is either maybeCtx (4th arg) or hashOrCtx (3rd arg).
        // For mut, the 3rd arg is always the component's render context (this)
        // since GXT compiles (mut this.val) as $_maybeHelper("mut", [...], this).
        const ctx = maybeCtx || hashOrCtx;
        const prevCtx = g.__gxtMutContext;
        g.__gxtMutContext = ctx;
        try {
          // Pass the unwrapped value + path to the mut helper
          const unwrappedValue = isGxtGetter(rawGetter) ? rawGetter() : rawGetter;
          return helper(unwrappedValue, pathArg);
        } finally {
          g.__gxtMutContext = prevCtx;
        }
      }
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

        const factoryClass = factory.class;

        // FIRST: Check for a registered helper manager (setHelperManager).
        // This must come before isClassBased check because some helper manager
        // classes (e.g., TestHelper) also define compute() but should be handled
        // via the manager protocol, not via factory.create().
        const manager = findHelperManager(factoryClass) || findHelperManager(factoryClass?.prototype);

        if (manager) {
          // Use the delegate protocol for proper helper lifecycle
          if (typeof manager.getDelegateFor === 'function') {
            const delegate = manager.getDelegateFor(owner);
            if (delegate && typeof delegate.createHelper === 'function' && delegate.capabilities?.hasValue) {
              // Cache the helper bucket per name so re-renders don't create new instances.
              // We create a GXT cell to hold the result so GXT's formula system tracks
              // it and re-renders automatically when the cell is updated.
              let cached = classHelperInstanceCache.get(name) as any;
              const _cellFor = g.__gxtCellFor;
              if (!cached || cached.__managerBucket !== true) {
                const reactiveArgs = { positional: [...positional], named: { ...named } };
                const bucket = delegate.createHelper(factoryClass, reactiveArgs);

                // Wire up destroyable if supported
                if (delegate.capabilities?.hasDestroyable && typeof delegate.getDestroyable === 'function') {
                  const destroyable = delegate.getDestroyable(bucket);
                  if (destroyable) {
                    const helperInstances = g.__gxtHelperInstances;
                    if (Array.isArray(helperInstances)) {
                      helperInstances.push(destroyable);
                    }
                  }
                }

                const result = delegate.getValue(bucket);

                // Create a GXT cell to hold the result. Reading cell.value inside
                // a formula establishes tracking, preventing const-optimization.
                let helperCell: any = null;
                if (_cellFor) {
                  const cellHolder = { __v: result };
                  helperCell = _cellFor(cellHolder, '__v', false);
                }

                let argsSer: string | null = null;
                try { argsSer = JSON.stringify({ p: positional, n: named }); } catch { /* skip */ }

                cached = { __managerBucket: true, bucket, delegate, reactiveArgs, lastArgsSer: argsSer, lastResult: result, helperCell };
                classHelperInstanceCache.set(name, cached);

                // Read from cell to establish tracking in enclosing formula
                if (helperCell) return helperCell.value;
                return result;
              } else {
                // Check if args actually changed — if not, return cached result
                // Skip cache check if any positional arg is a function (e.g., fn helper result)
                // because functions serialize as null, making stale results appear unchanged.
                const hasFnArg = positional.some((a: any) => typeof a === 'function');
                let argsSer: string | null = null;
                if (!hasFnArg) {
                  try { argsSer = JSON.stringify({ p: positional, n: named }); } catch { /* skip */ }
                }
                if (argsSer !== null && argsSer === cached.lastArgsSer) {
                  // Read cell to maintain tracking
                  if (cached.helperCell) return cached.helperCell.value;
                  return cached.lastResult;
                }

                // Update args in place for the existing bucket
                cached.reactiveArgs.positional = positional;
                cached.reactiveArgs.named = named;
                const result = cached.delegate.getValue(cached.bucket);
                cached.lastArgsSer = argsSer;
                cached.lastResult = result;

                // Update the GXT cell to trigger formula re-evaluation
                if (cached.helperCell && cached.helperCell.update) {
                  cached.helperCell.update(result);
                }

                if (cached.helperCell) return cached.helperCell.value;
                return result;
              }
            }
          }

          // Fallback: use getHelper
          if (typeof manager.getHelper === 'function') {
            const helperFn = manager.getHelper(factoryClass);
            if (typeof helperFn === 'function') {
              const capturedArgs = { positional, named };
              return helperFn(capturedArgs, owner);
            }
          }

          // Fallback: use createHelper/getValue directly on the manager
          if (typeof manager.createHelper === 'function' && typeof manager.getValue === 'function') {
            const state = manager.createHelper(factoryClass, { positional, named });
            return manager.getValue(state);
          }
        }

        // Check if this is a class-based helper (with compute on prototype and a create() method)
        const isClassBased = factoryClass && factoryClass.prototype &&
          typeof factoryClass.prototype.compute === 'function' &&
          typeof factoryClass.create === 'function';

        if (isClassBased) {
          // Use a cached persistent instance for class-based helpers.
          // This enables recompute() to trigger re-evaluation of the same instance.
          let instance = classHelperInstanceCache.get(name);
          if (!instance) {
            try {
              instance = factory.create();
              classHelperInstanceCache.set(name, instance);
              // Also register for destruction
              const helperInstances = g.__gxtHelperInstances;
              if (Array.isArray(helperInstances)) {
                helperInstances.push(instance);
              }
            } catch (e) {
              console.error(`[ember-gxt] Error creating class helper "${name}":`, e);
              return undefined;
            }
          }

          if (instance && typeof instance.compute === 'function') {
            const result = instance.compute(positional, named);

            // Consume the RECOMPUTE_TAG so GXT formulas re-evaluate on recompute().
            // The tag is a custom object with a cell-backed `value` getter.
            const symKeys = Object.getOwnPropertySymbols(instance);
            for (const sym of symKeys) {
              if (sym.toString().includes('RECOMPUTE_TAG')) {
                const tag = instance[sym];
                if (tag && typeof tag === 'object' && 'value' in tag) {
                  // Read the cell to establish tracking in the enclosing formula
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  tag.value;
                }
                break;
              }
            }

            return result;
          }
        }

        // No manager found - create instance and call compute directly
        try {
          if (typeof factoryClass?.create === 'function') {
            const instance = factory.create();
            if (instance && typeof instance.compute === 'function') {
              const result = instance.compute(positional, named);
              return result;
            }
          }
        } catch (e) {
          console.error(`[ember-gxt] Error invoking helper "${name}":`, e);
        }

        // Helper was found in registry but couldn't be invoked
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

      // Try component lookup (both kebab-case and single-word names)
      {
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
            // Extract named args and block content from tagProps
            const invokeArgs: any = {};
            const slots: Record<string, any> = {};

            if (tagProps && tagProps !== gxtModule.$_edp) {
              // Extract named args from attrs (position 1)
              const attrs = tagProps[1];
              if (Array.isArray(attrs)) {
                for (const [key, value] of attrs) {
                  if (key.startsWith('@')) {
                    const argKey = key.slice(1);
                    Object.defineProperty(invokeArgs, argKey, {
                      get: () => typeof value === 'function' ? value() : value,
                      enumerable: true,
                      configurable: true,
                    });
                  }
                }
              }

              // Extract text children from events position (position 2)
              // GXT puts text children as [["1", textContent]] in the events array
              const textChildren = tagProps[2];
              if (Array.isArray(textChildren) && textChildren.length > 0) {
                const blockContent: any[] = [];
                for (const entry of textChildren) {
                  if (Array.isArray(entry) && entry.length === 2) {
                    blockContent.push(entry[1]);
                  }
                }
                if (blockContent.length > 0) {
                  slots.default = (slotCtx: any) => [...blockContent];
                }
              }
            }

            // Also check 4th arg (children) for block content
            if (children && children.length > 0 && !slots.default) {
              slots.default = (slotCtx: any) => [...children];
            }

            invokeArgs.$slots = slots;
            return managers.component.handle(componentValue, invokeArgs, null, ctx);
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
      // Returns a getter function marked __htmlRaw for reactive innerHTML updates.
      // The getter must call the @value getter lazily (not eagerly) so that
      // reads inside gxtEffect are tracked and re-evaluated when the backing
      // property changes via set().
      if (resolvedTag === 'EmberHtmlRaw') {
        let valueGetter: any;
        if (tagProps && tagProps !== gxtModule.$_edp) {
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, val] of attrs) {
              if (key === '@value') {
                // Keep the getter function — do NOT evaluate it eagerly.
                // Evaluating here would capture the current value and lose
                // the reactive link to the backing cell.
                valueGetter = val;
                break;
              }
            }
          }
        }
        const htmlGetter = () => {
          // Call the getter each time so that cell reads are tracked
          // by any enclosing gxtEffect.
          const raw = typeof valueGetter === 'function' ? valueGetter() : valueGetter;
          const actual = typeof raw === 'function' ? raw() : raw;
          if (actual == null) return '';
          return actual?.toHTML?.() ?? String(actual);
        };
        (htmlGetter as any).__htmlRaw = true;
        return htmlGetter;
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
                // Return raw children as-is. GXT's rendering pipeline
              // (renderElement → resolveRenderable) handles functions
              // by wrapping them in formulas that track cell dependencies.
              // Previously we called child() eagerly which destroyed reactivity.
              return [...slotChildren];
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

    // Before falling back to HTML element, check if this is a helper
    // (e.g., {{hello-world}} → <HelloWorld /> but registered as helper:hello-world)
    if (resolvedTag && typeof resolvedTag === 'string') {
      const kebab = resolvedTag
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
      if (kebab.includes('-')) {
        const owner = g.owner;
        if (owner) {
          const helperFactory = owner.factoryFor(`helper:${kebab}`);
          if (helperFactory) {
            const maybeHelper = g.$_maybeHelper;
            if (maybeHelper) {
              return maybeHelper(kebab, children || [], {}, ctx);
            }
          }
        }
      }
    }

    // Fall back to original $_tag for regular HTML elements (GXT order: tag, tagProps, ctx, children)
    return original(tag, tagProps, ctx, children);
  };
}

// =============================================================================
// $_dc wrapper (dynamic component)
// =============================================================================

/**
 * Wraps GXT's $_dc to support Ember's CurriedComponent.
 * $_dc is called when GXT encounters a dynamic component invocation like
 * {{#thing.ctxCmp}}content{{/thing.ctxCmp}} or <this.$_bp0 />.
 * GXT compiles these as $_dc(componentGetter, args, ctx).
 *
 * When the componentGetter returns a CurriedComponent, we render it through
 * Ember's component manager instead of GXT's native component system.
 */
function createEmberDc(original: Function) {
  const $SLOTS_SYM = Symbol.for('gxt-slots');

  function extractArgsAndSlots(gxtArgs: any): { mergedArgs: any; } {
    const mergedArgs: any = {};
    if (gxtArgs && typeof gxtArgs === 'object') {
      const keys = Object.keys(gxtArgs);
      for (const key of keys) {
        if (key.startsWith('$')) continue;
        // Allow __hasBlock__ and __hasBlockParams__ through
        if (key.startsWith('_') && key !== '__hasBlock__' && key !== '__hasBlockParams__') continue;
        const desc = Object.getOwnPropertyDescriptor(gxtArgs, key);
        if (desc) {
          Object.defineProperty(mergedArgs, key, desc);
        }
      }
    }

    // Extract slots from GXT args
    const gxtSlots = gxtArgs?.[$SLOTS_SYM];
    const slots: Record<string, any> = {};
    if (gxtSlots) {
      for (const slotName of Object.keys(gxtSlots)) {
        if (slotName.endsWith('_')) continue;
        const slotFn = gxtSlots[slotName];
        if (typeof slotFn === 'function') {
          const wrappedSlot = (slotCtx: any, ...params: any[]) => {
            try {
              const result = slotFn(slotCtx, ...params);
              return Array.isArray(result) ? result : [result];
            } catch {
              return [];
            }
          };
          const hasBlockKey = slotName + '_';
          (wrappedSlot as any).__hasBlockParams = gxtSlots[hasBlockKey] === true;
          slots[slotName] = wrappedSlot;
        }
      }
    }

    // Check for __hasBlock__ marker in args
    const hasBlockValue = gxtArgs?.__hasBlock__ ?? mergedArgs.__hasBlock__;
    if (hasBlockValue) {
      if (!slots.default) {
        slots.default = () => [];
      }
    }

    mergedArgs.$slots = slots;
    return { mergedArgs };
  }

  function renderComponent(componentValue: any, gxtArgs: any, ctx: any): any {
    const managers = g.$_MANAGERS;
    if (!managers?.component?.canHandle?.(componentValue)) return null;

    const { mergedArgs } = extractArgsAndSlots(gxtArgs);
    const handleResult = managers.component.handle(componentValue, mergedArgs, null, ctx);
    if (typeof handleResult === 'function') {
      return handleResult();
    }
    return handleResult;
  }

  return function $_dc_ember(
    componentGetter: () => any,
    gxtArgs: any,
    ctx: any
  ): any {
    // Try to evaluate the component getter to check if it's a curried component.
    // If it fails (e.g., block params not set yet), delegate to original $_dc.
    let componentValue: any;
    try {
      componentValue = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
    } catch {
      // Getter failed — likely block params not set yet.
      // Return a lazy thunk that evaluates when GXT processes the children.
      // This happens after the parent component's slot function sets up block params.
      const lazyThunk = () => {
        try {
          const val = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
          if (val && val.__isCurriedComponent) {
            return renderComponent(val, gxtArgs, ctx);
          }
          if (typeof val === 'string') {
            const mgrs = g.$_MANAGERS;
            if (mgrs?.component?.canHandle?.(val)) {
              return renderComponent(val, gxtArgs, ctx);
            }
          }
          return val;
        } catch {
          return undefined;
        }
      };
      (lazyThunk as any).__isComponentThunk = true;
      return lazyThunk;
    }

    // If getter returned undefined/null, the block param may not be set yet.
    // Return a lazy thunk.
    if (componentValue == null) {
      const lazyThunk = () => {
        try {
          const val = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
          if (val && val.__isCurriedComponent) {
            return renderComponent(val, gxtArgs, ctx);
          }
          if (typeof val === 'string') {
            const mgrs = g.$_MANAGERS;
            if (mgrs?.component?.canHandle?.(val)) {
              return renderComponent(val, gxtArgs, ctx);
            }
          }
          return val;
        } catch {
          return undefined;
        }
      };
      (lazyThunk as any).__isComponentThunk = true;
      return lazyThunk;
    }

    // Handle CurriedComponent — pass componentGetter as a "live source"
    // so the component's arg cells can re-read from the LATEST curried
    // component's args when $_componentHelper re-evaluates with new values.
    if (componentValue && componentValue.__isCurriedComponent) {
      const prev = g.__dcComponentGetter;
      g.__dcComponentGetter = componentGetter;
      try {
        const result = renderComponent(componentValue, gxtArgs, ctx);
        return result;
      } finally {
        g.__dcComponentGetter = prev;
      }
    }

    // Handle string component name
    if (typeof componentValue === 'string') {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(componentValue)) {
        return renderComponent(componentValue, gxtArgs, ctx);
      }
    }

    // Fall back to original GXT $_dc for native GXT components
    return original(componentGetter, gxtArgs, ctx);
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
  if (g.$_dc && !g.$_dc.__emberWrapped) {
    g.$_dc = createEmberDc(g.$_dc);
    g.$_dc.__emberWrapped = true;
  }
}

// Create module-level wrapped exports for ES module consumers
const _wrappedMH = createEmberMaybeHelper(gxtModule.$_maybeHelper);
const _wrappedTag = createEmberTag(gxtModule.$_tag);
const _wrappedDc = createEmberDc(gxtModule.$_dc);

// Re-export with original names (using alias to avoid GXT Babel plugin duplicate)
export { _wrappedMH as $_maybeHelper, _wrappedTag as $_tag, _wrappedDc as $_dc };
