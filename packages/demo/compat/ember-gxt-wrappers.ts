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
  if (!Array.isArray(args)) return Object.freeze([]) as any[];
  // Only unwrap GXT getters (arrow fns with no prototype).
  // Regular functions (like closures from (fn ...)) should be passed as-is.
  const result = args.map(a => isGxtGetter(a) ? a() : a);
  Object.freeze(result);
  return result;
}

// GXT internal hash keys that should not be passed to Ember helpers
const GXT_INTERNAL_KEYS = new Set(['$_hasBlock', '$_hasBlockParams', '$_scope', '$_eval', 'hash']);

function unwrapHash(hash: Record<string, any>): Record<string, any> {
  if (!hash || typeof hash !== 'object') return Object.freeze({}) as Record<string, any>;
  const result: Record<string, any> = {};
  for (const key of Object.keys(hash)) {
    if (GXT_INTERNAL_KEYS.has(key) || key.startsWith('$_')) continue;
    const val = hash[key];
    // Don't call CurriedComponent functions - they should be preserved as-is
    result[key] = (typeof val === 'function' && !val.__isCurriedComponent) ? val() : val;
  }
  Object.freeze(result);
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
  // Cache the last known owner so that re-evaluations during reactive updates
  // (when globalThis.owner may be null) can still resolve helpers.
  let _cachedHelperOwner: any = null;

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
          // Validate that capabilities were created via helperCapabilities()
          const _FROM_CAPS = g.FROM_CAPABILITIES;
          if (delegate && delegate.capabilities && _FROM_CAPS && !_FROM_CAPS.has(delegate.capabilities)) {
            const err = new Error(
              `Custom helper managers must have a \`capabilities\` property ` +
              `that is the result of calling the \`capabilities('3.23')\` ` +
              `(imported via \`import { capabilities } from '@ember/helper';\`). ` +
              `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
            );
            // Capture for flushRenderErrors so assert.throws() can see it
            const captureFn = g.__captureRenderError;
            if (typeof captureFn === 'function') captureFn(err);
            throw err;
          }
          if (delegate && typeof delegate.createHelper === 'function' && delegate.capabilities?.hasValue) {
            // Check cache — reuse the same bucket across re-evaluations
            let cached = managedHelperBucketCache.get(nameOrFn);
            if (!cached) {
              // Build a reactive args object so the helper can read updated values
              const reactiveArgs: { positional: any[]; named: Record<string, any> } = {
                positional: Object.freeze([...positional]) as any[],
                named: Object.freeze({ ...named }) as Record<string, any>,
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

      // No helper manager — treat as a default function helper (Ember convention).
      // Plain functions used as helpers: positional args are spread, named args
      // (if any) are passed as the last argument.
      // This handles {{(this.hello this.foo)}} and {{(this.hello "foo" foo="bar")}}.
      //
      // Use the managed helper bucket cache (keyed by function) so that:
      // 1. GXT formula re-evaluations within the same render don't double-call
      // 2. When args change, the function IS re-called with fresh values
      const positional = unwrapArgs(args || []);
      const named = unwrapHash(hash);
      const hasNamed = named && Object.keys(named).length > 0;

      let cached = managedHelperBucketCache.get(nameOrFn);
      let argsSer: string | null = null;
      try { argsSer = JSON.stringify({ p: positional, n: named }); } catch { /* skip */ }

      if (cached && cached.__plainFnHelper) {
        // Check if args actually changed
        if (argsSer !== null && argsSer === cached.lastArgsSer) {
          // Same args — return cached result (dedup within same render)
          return cached.lastResult;
        }
        // Args changed — re-invoke the function
        const result = hasNamed ? nameOrFn(...positional, named) : nameOrFn(...positional);
        cached.lastArgsSer = argsSer;
        cached.lastResult = result;
        return result;
      }

      // First invocation — call and cache
      const result = hasNamed ? nameOrFn(...positional, named) : nameOrFn(...positional);
      managedHelperBucketCache.set(nameOrFn, {
        __plainFnHelper: true,
        lastArgsSer: argsSer,
        lastResult: result,
        bucket: null, delegate: null, reactiveArgs: null as any,
      });
      return result;
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
      // For '__mutGet' helper, pass obj and key with context set
      if (name === '__mutGet' && Array.isArray(args) && args.length > 0) {
        const ctx = maybeCtx || hashOrCtx;
        const prevCtx = g.__gxtMutContext;
        g.__gxtMutContext = ctx;
        try {
          // Pass raw getters so __mutGet can re-evaluate them reactively
          return helper(args[0], args[1]);
        } finally {
          g.__gxtMutContext = prevCtx;
        }
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

    // Try Ember container lookup — prefer globalThis.owner, fall back to cached
    const currentOwner = g.owner;
    if (currentOwner && !currentOwner.isDestroyed && !currentOwner.isDestroying) {
      _cachedHelperOwner = currentOwner;
    }
    if (_cachedHelperOwner && (_cachedHelperOwner.isDestroyed || _cachedHelperOwner.isDestroying)) {
      _cachedHelperOwner = null;
    }
    const owner = currentOwner || _cachedHelperOwner;
    if (owner && !owner.isDestroyed && !owner.isDestroying) {
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
            // Validate capabilities were created via helperCapabilities()
            const _FROM_CAPS = g.FROM_CAPABILITIES;
            if (delegate && delegate.capabilities && _FROM_CAPS && !_FROM_CAPS.has(delegate.capabilities)) {
              const err = new Error(
                `Custom helper managers must have a \`capabilities\` property ` +
                `that is the result of calling the \`capabilities('3.23')\` ` +
                `(imported via \`import { capabilities } from '@ember/helper';\`). ` +
                `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
              );
              // Capture for flushRenderErrors so assert.throws() can see it
              const captureFn = g.__captureRenderError;
              if (typeof captureFn === 'function') captureFn(err);
              throw err;
            }
            if (delegate && typeof delegate.createHelper === 'function' && delegate.capabilities?.hasValue) {
              // Cache the helper bucket per name so re-renders don't create new instances.
              // We create a GXT cell to hold the result so GXT's formula system tracks
              // it and re-renders automatically when the cell is updated.
              let cached = classHelperInstanceCache.get(name) as any;
              const _cellFor = g.__gxtCellFor;
              if (!cached || cached.__managerBucket !== true) {
                const reactiveArgs = { positional: Object.freeze([...positional]), named: Object.freeze({ ...named }) };
                // Wrap createHelper in backtracking frame to detect
                // read-then-write of tracked properties in constructor.
                // Import lazily since the validator module may not be loaded yet.
                const _beginBT = g.__gxtBeginBacktrackingFrame;
                const _endBT = g.__gxtEndBacktrackingFrame;
                const debugName = typeof delegate.getDebugName === 'function'
                  ? delegate.getDebugName(factoryClass) : undefined;
                if (_beginBT) _beginBT(debugName);
                let bucket: any;
                try {
                  bucket = delegate.createHelper(factoryClass, reactiveArgs);
                } finally {
                  if (_endBT) _endBT();
                }

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

                // Wrap getValue in backtracking frame
                const _beginBT2 = g.__gxtBeginBacktrackingFrame;
                const _endBT2 = g.__gxtEndBacktrackingFrame;
                if (_beginBT2) _beginBT2(debugName);
                let result: any;
                try {
                  result = delegate.getValue(bucket);
                } finally {
                  if (_endBT2) _endBT2();
                }

                // Create a GXT cell to hold the result. Reading cell.value inside
                // a formula establishes tracking, preventing const-optimization.
                let helperCell: any = null;
                if (_cellFor) {
                  const cellHolder = { __v: result };
                  helperCell = _cellFor(cellHolder, '__v', false);
                }

                let argsSer: string | null = null;
                try { argsSer = JSON.stringify({ p: positional, n: named }); } catch { /* skip */ }

                cached = { __managerBucket: true, bucket, delegate, reactiveArgs, lastArgsSer: argsSer, lastResult: result, helperCell } as any;
                classHelperInstanceCache.set(name, cached);

                // Install PROPERTY_DID_CHANGE hook on the helper bucket so that
                // tracked property changes (e.g., instance.foo = 456) trigger
                // re-evaluation of getValue and update the GXT cell.
                if (bucket && typeof bucket === 'object' && helperCell) {
                  const PROP_CHANGE = g.PROPERTY_DID_CHANGE;
                  if (PROP_CHANGE) {
                    const _cached = cached;
                    const origPropChange = bucket[PROP_CHANGE];
                    bucket[PROP_CHANGE] = function(key: string) {
                      if (origPropChange) origPropChange.call(this, key);
                      // Re-compute getValue and update the cell
                      try {
                        const newResult = _cached.delegate.getValue(_cached.bucket);
                        if (newResult !== _cached.lastResult) {
                          _cached.lastResult = newResult;
                          if (_cached.helperCell && _cached.helperCell.update) {
                            _cached.helperCell.update(newResult);
                          }
                          // Trigger DOM sync
                          const syncDomNow = g.__gxtSyncDomNow;
                          if (typeof syncDomNow === 'function') {
                            queueMicrotask(() => syncDomNow());
                          }
                        }
                      } catch { /* ignore errors during recompute */ }
                    };
                  }
                }

                // Read from cell to establish tracking in enclosing formula
                if (helperCell) return helperCell.value;
                return result;
              } else {
                // Arg-based dedup: check if args actually changed — if not, return
                // cached result. This prevents duplicate compute calls within the
                // same render pass (GXT formula system may evaluate the getter
                // multiple times). Skip cache check if any positional arg is a
                // function (e.g., fn helper result) because functions serialize as
                // null, making stale results appear unchanged.
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
                const _beginBT3 = g.__gxtBeginBacktrackingFrame;
                const _endBT3 = g.__gxtEndBacktrackingFrame;
                const cachedDebugName = typeof cached.delegate?.getDebugName === 'function'
                  ? cached.delegate.getDebugName(factoryClass) : undefined;
                if (_beginBT3) _beginBT3(cachedDebugName);
                let result: any;
                try {
                  result = cached.delegate.getValue(cached.bucket);
                } finally {
                  if (_endBT3) _endBT3();
                }
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
                  // Preserve getters from hash so component manager can track reactivity
                  const desc = Object.getOwnPropertyDescriptor(hash, key);
                  if (desc && desc.get) {
                    Object.defineProperty(componentArgs, key, {
                      get: desc.get,
                      enumerable: true,
                      configurable: true,
                    });
                  } else {
                    componentArgs[key] = hash[key];
                  }
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

    // In Ember, bare {{name}} (without this. prefix) in a template is treated
    // as a helper/component invocation, NOT a property lookup. Since we've
    // already checked all helper/component registrations above, if we reach
    // here with no args, the name is unresolvable. Return empty string.
    // Note: names WITH args are passed to GXT's native handler for resolution.
    if (Array.isArray(args) && args.length === 0 && (!hash || Object.keys(hash).length === 0 || (Object.keys(hash).every(k => k.startsWith('$_') || k === 'hash')))) {
      return '';
    }
    // Fall back to GXT's native maybeHelper for other cases
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
                // Unwrap GXT reactive formulas (objects with fn/isConst)
                if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                  try { return param.fn(); } catch { return param; }
                }
                // Do NOT call plain functions — they may be user functions
                // yielded as block params (e.g., {{yield this.updatePerson}}).
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

  function extractArgsAndSlots(gxtArgs: any, allowPositionalParams = false): { mergedArgs: any; } {
    const mergedArgs: any = {};
    if (gxtArgs && typeof gxtArgs === 'object') {
      const keys = Object.keys(gxtArgs);
      for (const key of keys) {
        if (key.startsWith('$')) continue;
        // Allow __hasBlock__ and __hasBlockParams__ through always
        if (key === '__hasBlock__' || key === '__hasBlockParams__') { /* allowed */ }
        // Allow positional param keys through only when requested (for string components
        // where the manager needs to map positional params to named args)
        else if (allowPositionalParams && (/^__pos\d+__$/.test(key) || key === '__posCount__')) { /* allowed */ }
        // Skip all other keys starting with _
        else if (key.startsWith('_')) continue;
        const desc = Object.getOwnPropertyDescriptor(gxtArgs, key);
        if (desc) {
          // Ensure properties are configurable so the manager can delete/redefine
          // them (e.g., positional params mapping deletes __posN__ keys).
          Object.defineProperty(mergedArgs, key, { ...desc, configurable: true });
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

  function renderComponent(componentValue: any, gxtArgs: any, ctx: any, allowPositionalParams = false): any {
    const managers = g.$_MANAGERS;
    if (!managers?.component?.canHandle?.(componentValue)) return null;

    const { mergedArgs } = extractArgsAndSlots(gxtArgs, allowPositionalParams);
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

    // Handle string component name — pass positional params through since the
    // component manager needs them for positionalParams mapping (e.g.,
    // {{component this.componentName this.name this.age}} where the component
    // class has static positionalParams = ['name', 'age'])
    if (typeof componentValue === 'string') {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(componentValue)) {
        return renderComponent(componentValue, gxtArgs, ctx, /* allowPositionalParams */ true);
      }
      // String component name that can't be resolved — throw an error matching
      // Ember's behavior for {{component "non-existent"}}.
      if (componentValue.length > 0) {
        const err = new Error(
          `Attempted to resolve \`${componentValue}\`, which was expected to be a component, but nothing was found. ` +
          `Could not find component named "${componentValue}" (no component or template with that name was found)`
        );
        const captureErr = g.__captureRenderError;
        if (typeof captureErr === 'function') {
          captureErr(err);
        }
        throw err;
      }
    }

    // Handle component definitions (template-only, GlimmerishComponent, etc.)
    // that have a template in COMPONENT_TEMPLATES
    if (componentValue && (typeof componentValue === 'object' || typeof componentValue === 'function')) {
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
// $_modifierHelper wrapper
// =============================================================================

/**
 * Wrap GXT's $_modifierHelper to handle Ember's (modifier "name" ...) keyword.
 *
 * GXT's native $_modifierHelper expects the first param to already be a modifier
 * function. Ember's (modifier) keyword can receive:
 * 1. A string name — resolve from the owner's registry
 * 2. A modifier reference (from defineSimpleModifier/setModifierManager)
 * 3. A dynamic value (this.xxx) — should throw an assertion error
 *
 * The result is a "curried modifier" function that can be used in modifier position.
 */
function createEmberModifierHelper(original: Function) {
  return function $_modifierHelper_ember(params: any[], hash: Record<string, unknown>) {
    const rawFirst = params[0];
    // Unwrap GXT getter
    const resolved = (typeof rawFirst === 'function' && !rawFirst.prototype &&
      !rawFirst.__isCurriedModifier && !g.INTERNAL_MODIFIER_MANAGERS?.has(rawFirst))
      ? rawFirst() : rawFirst;
    const boundParams = params.slice(1);

    // Dynamic string detection: if the resolved value is a dynamic binding
    // (came from a this.xxx getter), throw an assertion.
    // We detect this by checking if the raw first param was a getter function
    // that resolved to a string — static strings are passed as literals.
    if (typeof resolved === 'string' && typeof rawFirst === 'function') {
      const assertFn = g.Ember?.assert || g.__emberAssert;
      const msg = 'Passing a dynamic string to the `(modifier)` keyword is disallowed.';
      if (assertFn) {
        assertFn(msg, false);
      } else {
        const capture = g.__captureRenderError;
        const err = new Error(`Assertion Failed: ${msg}`);
        if (typeof capture === 'function') {
          capture(err);
        }
        throw err;
      }
    }

    // String — resolve modifier by name from the owner registry
    if (typeof resolved === 'string') {
      const owner = g.owner;

      // Create a curried modifier function that, when invoked in modifier position
      // (by $_maybeModifier), merges the curried args with invocation args and
      // delegates to the Ember modifier manager.
      function curriedModifier(node: HTMLElement, _params: any[], _hash: Record<string, unknown>) {
        // Merge curried params with invocation params
        const allParams = [...boundParams, ..._params].map(
          (a: any) => typeof a === 'function' && !a.prototype ? a() : a
        );
        const mergedHash = { ...hash, ..._hash };

        // Look up the modifier from the registry
        const modOwner = g.owner || owner;
        if (!modOwner) return undefined;
        const factory = modOwner.factoryFor?.(`modifier:${resolved}`);
        if (!factory) return undefined;
        const ModifierClass = factory.class;

        // Find the modifier manager
        let managerFactory: any = null;
        let pointer = ModifierClass;
        const visited = new Set();
        while (pointer && !visited.has(pointer)) {
          visited.add(pointer);
          const mgr = g.INTERNAL_MODIFIER_MANAGERS?.get(pointer);
          if (mgr) { managerFactory = mgr; break; }
          try { pointer = Object.getPrototypeOf(pointer); } catch { break; }
        }
        if (!managerFactory) return undefined;

        const manager = typeof managerFactory === 'function' ? managerFactory(modOwner) : managerFactory;
        if (!manager) return undefined;

        const args = { positional: allParams, named: mergedHash };
        const instance = manager.createModifier(ModifierClass, args);
        manager.installModifier(instance, node, args);

        // Return destructor
        return () => {
          if (manager.destroyModifier) manager.destroyModifier(instance);
        };
      }

      // Mark as curried modifier so $_maybeModifier and canHandle recognize it
      (curriedModifier as any).__isCurriedModifier = true;
      (curriedModifier as any).__modifierName = resolved;

      // Register with INTERNAL_MODIFIER_MANAGERS so canHandle() finds it
      if (g.INTERNAL_MODIFIER_MANAGERS) {
        // Use a simple pass-through manager for curried modifiers
        g.INTERNAL_MODIFIER_MANAGERS.set(curriedModifier, {
          createModifier: () => ({}),
          installModifier: () => {},
          updateModifier: () => {},
          destroyModifier: () => {},
        });
      }

      return curriedModifier;
    }

    // Modifier reference (from defineSimpleModifier/setModifierManager)
    if (resolved != null && typeof resolved !== 'string') {
      // Check if it has a modifier manager
      let hasModifierManager = false;
      if (g.INTERNAL_MODIFIER_MANAGERS) {
        let ptr = resolved;
        const visited = new Set();
        while (ptr && !visited.has(ptr)) {
          visited.add(ptr);
          if (g.INTERNAL_MODIFIER_MANAGERS.has(ptr)) { hasModifierManager = true; break; }
          try { ptr = Object.getPrototypeOf(ptr); } catch { break; }
        }
      }

      if (hasModifierManager) {
        // Create a curried modifier that wraps the modifier reference with bound args
        function curriedManagedModifier(node: HTMLElement, _params: any[], _hash: Record<string, unknown>) {
          const allParams = [...boundParams, ..._params];
          const mergedHash = { ...hash, ..._hash };

          // Delegate to $_maybeModifier which knows how to handle modifier references
          return g.$_maybeModifier(resolved, node, allParams, () => mergedHash);
        }

        // Mark and register so canHandle() works
        (curriedManagedModifier as any).__isCurriedModifier = true;
        if (g.INTERNAL_MODIFIER_MANAGERS) {
          g.INTERNAL_MODIFIER_MANAGERS.set(curriedManagedModifier, {
            createModifier: () => ({}),
            installModifier: () => {},
            updateModifier: () => {},
            destroyModifier: () => {},
          });
        }

        return curriedManagedModifier;
      }

      // If it's a plain function (e.g., from EmberFunctionalModifiers), fall through to original
      return original(params, hash);
    }

    // Fall through to original GXT implementation
    return original(params, hash);
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
  if (g.$_modifierHelper && !g.$_modifierHelper.__emberWrapped) {
    g.$_modifierHelper = createEmberModifierHelper(g.$_modifierHelper);
    g.$_modifierHelper.__emberWrapped = true;
  }
}

// Create module-level wrapped exports for ES module consumers
const _wrappedMH = createEmberMaybeHelper(gxtModule.$_maybeHelper);
const _wrappedTag = createEmberTag(gxtModule.$_tag);
const _wrappedDc = createEmberDc(gxtModule.$_dc);

// Re-export with original names (using alias to avoid GXT Babel plugin duplicate)
export { _wrappedMH as $_maybeHelper, _wrappedTag as $_tag, _wrappedDc as $_dc };
