// Custom helper manager for gxt compatibility
// Note: In Ember, setHelperManager(factory, helper) passes a factory function
// that takes (owner) and returns a manager with createHelper, getValue, etc.
//
// This class implements the InternalHelperManager interface, meaning it wraps
// a factory and provides getDelegateFor(owner) which returns the actual
// HelperManager delegate for a given owner.

import { createCache } from './validator';
import {
  createComputeRef,
  createConstRef,
  UNDEFINED_REFERENCE,
  REFERENCE,
  valueForRef,
} from './reference';
import { associateDestroyableChild } from './destroyable';

// Shared WeakSet to track capabilities created via helperCapabilities()
export const FROM_CAPABILITIES = new WeakSet();

/**
 * Detect whether a value is a Glimmer Reference object. References are tagged
 * with the canonical REFERENCE symbol by the GXT reference module
 * (see reference.ts brandRef()) so `REFERENCE in obj` is the canonical test.
 */
function isReference(v: any): boolean {
  return v != null && typeof v === 'object' && REFERENCE in v;
}

/**
 * Unwrap a Reference to its value. Pass non-references through unchanged so
 * this function is safe to call on already-unwrapped values (e.g., the args
 * shape produced by GXT-side _resolveEmberHelper which passes raw values).
 */
function unwrapValue(v: any): any {
  return isReference(v) ? valueForRef(v) : v;
}

/**
 * Wrap captured args so reads of `args.positional[i]` and `args.named[key]`
 * auto-unwrap Reference values into their current value. This matches stock
 * Glimmer's argsProxyFor() (in @glimmer/manager/lib/util/args-proxy.ts) which
 * is required by the HelperManager spec — `FunctionalHelperManager.getValue`
 * does `fn(...args.positional)` and expects values, not References.
 *
 * When called from VM_HELPER_OP via getHelper(), `capturedArgs.positional`
 * holds References. When called from GXT-side _resolveEmberHelper, the
 * positional/named entries are already unwrapped values — `unwrapValue`
 * passes those through unchanged, so the proxy is a no-op for that path.
 *
 * Only used inside getHelper() — paths that explicitly need raw References
 * (e.g., createHelper called directly via invokeHelper with SimpleArgsProxy)
 * bypass this wrapper entirely.
 */
function argsProxyForCustom(capturedArgs: any): { positional: any; named: any } {
  const positional = capturedArgs?.positional ?? [];
  const named = capturedArgs?.named ?? {};

  const positionalProxy: any = new Proxy(positional, {
    get(target: any, prop: string | symbol) {
      if (prop === 'length') return target.length;
      if (prop === Symbol.iterator) {
        return function* () {
          for (let i = 0; i < target.length; i++) {
            yield unwrapValue(target[i]);
          }
        };
      }
      if (typeof prop === 'string') {
        const num = Number(prop);
        if (Number.isInteger(num) && num >= 0 && num < target.length) {
          return unwrapValue(target[num]);
        }
      }
      // Fallback: pass through (e.g., toString, etc.)
      return target[prop as any];
    },
    has(target: any, prop: string | symbol) {
      if (prop === 'length' || prop === Symbol.iterator) return true;
      if (typeof prop === 'string') {
        const num = Number(prop);
        if (Number.isInteger(num)) return num >= 0 && num < target.length;
      }
      return prop in target;
    },
  });

  const namedProxy: any = new Proxy(named, {
    get(target: any, prop: string | symbol) {
      const v = (target as any)[prop];
      return unwrapValue(v);
    },
    has(target: any, prop: string | symbol) {
      return prop in target;
    },
    ownKeys(target: any) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target: any, prop: string | symbol) {
      if (prop in target) {
        return { enumerable: true, configurable: true };
      }
      return undefined;
    },
  });

  return { positional: positionalProxy, named: namedProxy };
}

/**
 * Call delegate.getValue(bucket) inside a backtracking frame with proper
 * debug name and assertion message formatting.
 */
function _callGetValueWithBacktracking(
  delegate: any,
  origGetValue: Function,
  bucket: any,
  self: CustomHelperManager
): any {
  const g = globalThis as any;
  const beginFrame = g.__gxtBeginBacktrackingFrame;
  const endFrame = g.__gxtEndBacktrackingFrame;
  let debugName = 'Helper';
  if (typeof delegate.getDebugName === 'function') {
    const definition = self._getDefinitionForBucket(bucket);
    try {
      debugName = delegate.getDebugName(definition || bucket) || 'Helper';
    } catch {
      /* fallback */
    }
  }
  if (typeof beginFrame === 'function' && typeof endFrame === 'function') {
    beginFrame(debugName);
  }
  // Intercept __emberAssertDirect to fix render tree format
  // (validator.ts uses "  - top-level" but Ember tests expect "  -top-level")
  const origAssert = g.__emberAssertDirect;
  if (typeof origAssert === 'function') {
    g.__emberAssertDirect = function (msg: string, test: any) {
      if (typeof msg === 'string') {
        msg = msg.replace(/  - top-level\n/g, '  -top-level\n');
      }
      return origAssert(msg, test);
    };
  }
  try {
    return origGetValue.call(delegate, bucket);
  } finally {
    g.__emberAssertDirect = origAssert;
    if (typeof endFrame === 'function') {
      endFrame();
    }
  }
}

export class CustomHelperManager {
  factory: any;
  private helperManagerDelegates: WeakMap<any, any> = new WeakMap();
  private undefinedDelegate: any = null;

  constructor(factory: any) {
    // factory is a function that takes owner and returns a manager
    this.factory = factory;
  }

  private getDelegateForOwner(owner: any): any {
    let delegate = this.helperManagerDelegates.get(owner);
    if (delegate === undefined) {
      delegate = this.factory(owner);
      this.helperManagerDelegates.set(owner, delegate);
    }
    return delegate;
  }

  /**
   * Get the delegate manager for a given owner.
   * This is the key method called by invokeHelper from @glimmer/runtime.
   * Returns a proxy that wraps getValue() in a backtracking frame for
   * debug assertions (backtracking detection with helper debug name).
   */
  getDelegateFor(owner: any): any {
    let delegate: any;
    if (owner === undefined || owner === null) {
      let { undefinedDelegate } = this;
      if (undefinedDelegate === null) {
        this.undefinedDelegate = undefinedDelegate = this.factory(undefined);
      }
      delegate = undefinedDelegate;
    } else {
      delegate = this.getDelegateForOwner(owner);
    }
    // Validate capabilities — must be from helperCapabilities()
    // Throw if missing or if not created via the proper capability builder.
    if (delegate && typeof delegate === 'object') {
      const caps = delegate.capabilities;
      if (!caps || !FROM_CAPABILITIES.has(caps)) {
        const err = new Error(
          'Custom helper managers must have a `capabilities` property ' +
            "that is the result of calling the `capabilities('3.23')` " +
            "(imported via `import { capabilities } from '@ember/helper';`). " +
            'Received: `' +
            (caps ? JSON.stringify(caps) : String(caps)) +
            '`'
        );
        // Capture for flushRenderErrors so assert.throws() can see it
        // even if GXT swallows synchronous render-time exceptions.
        const captureFn = (globalThis as any).__captureRenderError;
        if (typeof captureFn === 'function') {
          captureFn(err);
        }
        throw err;
      }
    }
    // Wrap delegate so getValue() runs inside a backtracking frame
    return this.wrapDelegate(delegate);
  }

  private wrappedDelegates = new WeakMap<any, any>();

  // Map from bucket (helper instance) to definition (helper class) for debug name resolution
  private bucketToDefinition = new WeakMap<any, any>();
  // Cache per bucket for getValue results
  private bucketCacheInfo = new WeakMap<any, any>();

  /** @internal - used by _callGetValueWithBacktracking */
  _getDefinitionForBucket(bucket: any): any {
    return this.bucketToDefinition.get(bucket);
  }

  private wrapDelegate(delegate: any): any {
    if (!delegate) return delegate;
    let wrapped = this.wrappedDelegates.get(delegate);
    if (wrapped) return wrapped;

    const origGetValue = delegate.getValue;
    const origCreateHelper = delegate.createHelper;
    if (typeof origGetValue !== 'function') return delegate;

    const self = this;
    wrapped = Object.create(delegate);

    // Intercept createHelper to record bucket→definition mapping and
    // make args reactive for createCache tracking (template path only).
    // Skip reactive wrapping for frozen args (SimpleArgsProxy from invokeHelper).
    if (typeof origCreateHelper === 'function') {
      wrapped.createHelper = function (definition: any, args: any) {
        if (args && typeof args === 'object' && !args.__reactiveHelper && !Object.isFrozen(args)) {
          const g = globalThis as any;
          const _consumeTag = g.__classicConsumeTag;
          const _tagFor = g.__classicTagFor;
          const _dirtyTagFor = g.__classicDirtyTagFor;
          if (_consumeTag && _tagFor && _dirtyTagFor) {
            const argsTag = {};
            let _positional = args.positional;
            let _named = args.named;
            try {
              Object.defineProperty(args, 'positional', {
                get() {
                  try {
                    _consumeTag(_tagFor(argsTag, 'positional'));
                  } catch {
                    /* noop */
                  }
                  return _positional;
                },
                set(v) {
                  _positional = v;
                  try {
                    _dirtyTagFor(argsTag, 'positional');
                  } catch {
                    /* noop */
                  }
                },
                configurable: true,
                enumerable: true,
              });
              Object.defineProperty(args, 'named', {
                get() {
                  try {
                    _consumeTag(_tagFor(argsTag, 'named'));
                  } catch {
                    /* noop */
                  }
                  return _named;
                },
                set(v) {
                  _named = v;
                  try {
                    _dirtyTagFor(argsTag, 'named');
                  } catch {
                    /* noop */
                  }
                },
                configurable: true,
                enumerable: true,
              });
              args.__reactiveHelper = true;
            } catch {
              // If defineProperty fails, skip making reactive
            }
          }
        }

        const bucket = origCreateHelper.call(delegate, definition, args);
        if (bucket && typeof bucket === 'object') {
          self.bucketToDefinition.set(bucket, definition);
        }
        return bucket;
      };
    }

    wrapped.getValue = function (bucket: any) {
      // Use createCache to cache getValue results — avoids redundant calls
      // when the component re-renders but no tracked dependencies changed.
      let cache = self.bucketCacheInfo.get(bucket);
      if (!cache) {
        cache = createCache(() => {
          return _callGetValueWithBacktracking(delegate, origGetValue, bucket, self);
        });
        self.bucketCacheInfo.set(bucket, cache);
      }
      return cache.value;
    };
    this.wrappedDelegates.set(delegate, wrapped);
    return wrapped;
  }

  getHelper(helper: any) {
    // Two call conventions exist:
    //
    //   1) Stock Glimmer VM (@glimmer/program/lib/constants.ts → VM_HELPER_OP
    //      + VM_DYNAMIC_HELPER_OP): expects the returned function to return a
    //      Reference-shaped object (so valueForRef / CheckReference work).
    //
    //   2) GXT-side ember-gxt-wrappers/_resolveEmberHelper/curried-helper
    //      paths inside this same backend: treat the return value as the raw
    //      computed value.
    //
    // Return a Reference wrapper (createComputeRef) to satisfy (1). The GXT
    // callers in manager.ts that use this method unwrap via `.value` /
    // `valueForRef`, so both paths remain sound. The extra indirection is
    // cheap and the cache semantics (via createCache inside createComputeRef)
    // match what stock Glimmer's CustomHelperManager.getHelper produces.
    return (capturedArgs: any, owner: any): any => {
      const manager = this.getDelegateFor(owner);
      if (!manager || typeof manager.createHelper !== 'function') {
        console.warn('[CustomHelperManager] No createHelper on manager:', manager);
        return UNDEFINED_REFERENCE;
      }

      // Normalize args shape: ensure { positional, named } object regardless
      // of whether the caller passed an array (legacy GXT path) or a
      // CapturedArguments-shaped object (VM_HELPER_OP / glimmer path).
      const rawArgs =
        capturedArgs && typeof capturedArgs === 'object' && !Array.isArray(capturedArgs)
          ? capturedArgs
          : { positional: Array.isArray(capturedArgs) ? capturedArgs : [], named: {} };

      // Wrap args with an unwrap-on-read proxy so `args.positional[i]` and
      // `args.named[key]` yield the value of the underlying Reference rather
      // than the Reference object itself. This matches stock Glimmer's
      // argsProxyFor() (in @glimmer/manager) and is required by the
      // HelperManager spec — `FunctionalHelperManager.getValue` does
      // `fn(...args.positional)` and expects values.
      //
      // Skip wrapping when the args object is frozen — SimpleArgsProxy from
      // @glimmer/runtime's invokeHelper is frozen and already implements the
      // proxy semantics (it lazily computes args, returning values not refs).
      // Re-wrapping it would break Object.freeze semantics tests.
      const args = Object.isFrozen(rawArgs) ? rawArgs : argsProxyForCustom(rawArgs);

      const bucket = manager.createHelper(helper, args);
      const debugName =
        (typeof manager.getDebugName === 'function' && manager.getDebugName(helper)) || 'Helper';

      let ref: any;
      if (manager.capabilities?.hasValue) {
        // Wrap getValue() in a backtracking-aware compute. The compute is
        // re-run whenever Glimmer's reference system reads `.value`, so
        // tracked-data reads inside getValue() entangle correctly.
        const g = globalThis as any;
        ref = createComputeRef(
          () => {
            const beginFrame = g.__gxtBeginBacktrackingFrame;
            const endFrame = g.__gxtEndBacktrackingFrame;
            if (typeof beginFrame === 'function' && typeof endFrame === 'function') {
              beginFrame(debugName);
            }
            const origAssert = g.__emberAssertDirect;
            if (typeof origAssert === 'function') {
              g.__emberAssertDirect = function (msg: string, test: any) {
                if (typeof msg === 'string') {
                  msg = msg.replace(/  - top-level\n/g, '  -top-level\n');
                }
                return origAssert(msg, test);
              };
            }
            try {
              return manager.getValue(bucket);
            } finally {
              g.__emberAssertDirect = origAssert;
              if (typeof endFrame === 'function') endFrame();
            }
          },
          null,
          debugName
        );
      } else {
        // hasDestroyable-only / hasScheduledEffect: helper returns no value
        // but may still need destroyable association. Return a const ref
        // carrying undefined.
        ref = createConstRef(undefined, debugName);
      }

      // Brand the returned object with the REFERENCE symbol so Glimmer VM's
      // CheckReference.validate() (which asserts `REFERENCE in value`) accepts
      // it. Our createComputeRef/createConstRef wrappers don't set this by
      // default because most GXT paths consume `.value` directly without
      // going through the VM's reference checker.
      try {
        (ref as any)[REFERENCE] = true;
      } catch {
        // frozen — ignore
      }

      // Associate the helper bucket as a destroyable child of the returned
      // ref. When stock Glimmer VM's VM_DYNAMIC_HELPER_OP swaps the helper
      // definition (e.g., `{{@helper}}` where @helper transitions from
      // Helper1 to Helper2), it calls `destroy(helperRef)` on the previous
      // ref. Propagating that to the bucket lets our destructors
      // (registered in TestHelper's constructor via registerDestructor)
      // fire willDestroy on the outgoing helper instance.
      //
      // Only associate when the delegate opted into destroyable handling.
      if (manager.capabilities?.hasDestroyable && typeof manager.getDestroyable === 'function') {
        try {
          const destroyable = manager.getDestroyable(bucket);
          if (destroyable) {
            associateDestroyableChild(ref, destroyable);
          }
        } catch {
          /* association failures must not break rendering */
        }
      }
      return ref;
    };
  }

  create(owner: any, helper: any, args: any) {
    const manager = this.getDelegateFor(owner);
    if (!manager || typeof manager.createHelper !== 'function') {
      console.warn('[CustomHelperManager] No createHelper on manager for create:', manager);
      return null;
    }
    return manager.createHelper(helper, args);
  }

  createHelper(definition: any, args: any) {
    // This delegates to getDelegateFor, primarily used by invokeHelper path
    const owner = (globalThis as any).owner;
    const manager = this.getDelegateFor(owner);
    return manager.createHelper(definition, args);
  }

  getValue(bucket: any, definition?: any) {
    const owner = (globalThis as any).owner;
    const manager = this.getDelegateFor(owner);
    // Wrap in backtracking frame so read-then-write is detected with debug name
    const debugName =
      definition && manager?.getDebugName ? manager.getDebugName(definition) : 'Helper';
    const g = globalThis as any;
    const beginFrame = g.__gxtBeginBacktrackingFrame;
    const endFrame = g.__gxtEndBacktrackingFrame;
    if (typeof beginFrame === 'function' && typeof endFrame === 'function') {
      beginFrame(debugName);
    }
    try {
      return manager?.getValue?.(bucket);
    } finally {
      if (typeof endFrame === 'function') {
        endFrame();
      }
    }
  }

  getDestroyable(bucket: any) {
    const owner = (globalThis as any).owner;
    const manager = this.getDelegateFor(owner);
    return manager?.getDestroyable?.(bucket) || null;
  }

  get capabilities() {
    // Return the capabilities of the delegate
    // Try to get a delegate to check capabilities
    const owner = (globalThis as any).owner;
    try {
      const manager = this.getDelegateFor(owner);
      return (
        manager?.capabilities || {
          hasValue: false,
          hasDestroyable: false,
          hasScheduledEffect: false,
        }
      );
    } catch {
      return { hasValue: false, hasDestroyable: false, hasScheduledEffect: false };
    }
  }

  getDebugName(helper: any) {
    const owner = (globalThis as any).owner;
    try {
      const manager = this.getDelegateFor(owner);
      return manager?.getDebugName?.(helper) || 'Helper';
    } catch {
      return 'Helper';
    }
  }
}

/**
 * FunctionHelperManager - handles plain function helpers.
 * This is the default manager for function-based helpers.
 */
export class FunctionHelperManager {
  capabilities: any;

  constructor() {
    // Create capabilities using the proper builder so they pass validation
    this.capabilities = {
      hasValue: true,
      hasDestroyable: false,
      hasScheduledEffect: false,
    };
    FROM_CAPABILITIES.add(this.capabilities);
  }

  createHelper(fn: any, args: any) {
    return { fn, args };
  }

  getValue({ fn, args }: { fn: any; args: any }) {
    if (args?.named && Object.keys(args.named).length > 0) {
      return fn(...(args.positional || []), args.named);
    }
    return fn(...(args?.positional || []));
  }

  getDebugName(fn: any) {
    if (fn?.name) {
      return `(helper function ${fn.name})`;
    }
    return '(anonymous helper function)';
  }
}
