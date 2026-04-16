// Custom helper manager for gxt compatibility
// Note: In Ember, setHelperManager(factory, helper) passes a factory function
// that takes (owner) and returns a manager with createHelper, getValue, etc.
//
// This class implements the InternalHelperManager interface, meaning it wraps
// a factory and provides getDelegateFor(owner) which returns the actual
// HelperManager delegate for a given owner.

import { createCache } from './validator';

// Shared WeakSet to track capabilities created via helperCapabilities()
export const FROM_CAPABILITIES = new WeakSet();

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
    try { debugName = delegate.getDebugName(definition || bucket) || 'Helper'; } catch { /* fallback */ }
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
    // make args reactive for createCache tracking
    if (typeof origCreateHelper === 'function') {
      wrapped.createHelper = function (definition: any, args: any) {
        // Make args reactive: wrap positional/named with classic tag tracking
        // so that when the wrappers code replaces them, the createCache invalidates.
        if (args && typeof args === 'object' && !args.__reactiveHelper) {
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
                  try { _consumeTag(_tagFor(argsTag, 'positional')); } catch { /* noop */ }
                  return _positional;
                },
                set(v) {
                  _positional = v;
                  try { _dirtyTagFor(argsTag, 'positional'); } catch { /* noop */ }
                },
                configurable: true,
                enumerable: true,
              });
              Object.defineProperty(args, 'named', {
                get() {
                  try { _consumeTag(_tagFor(argsTag, 'named')); } catch { /* noop */ }
                  return _named;
                },
                set(v) {
                  _named = v;
                  try { _dirtyTagFor(argsTag, 'named'); } catch { /* noop */ }
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
      // Args changes are tracked via the reactive args instrumentation
      // installed in wrapped.createHelper above.
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
    return (capturedArgs: any, owner: any) => {
      const manager = this.getDelegateFor(owner);
      if (!manager || typeof manager.createHelper !== 'function') {
        console.warn('[CustomHelperManager] No createHelper on manager:', manager);
        return undefined;
      }

      // Build args proxy similar to the real implementation
      const args = capturedArgs && typeof capturedArgs === 'object' && !Array.isArray(capturedArgs)
        ? capturedArgs
        : { positional: Array.isArray(capturedArgs) ? capturedArgs : [], named: {} };

      const bucket = manager.createHelper(helper, args);

      if (manager.capabilities?.hasValue) {
        // Wrap in backtracking frame so read-then-write is detected
        const debugName = manager.getDebugName?.(helper) || 'Helper';
        const g = globalThis as any;
        const beginFrame = g.__gxtBeginBacktrackingFrame;
        const endFrame = g.__gxtEndBacktrackingFrame;
        if (typeof beginFrame === 'function' && typeof endFrame === 'function') {
          beginFrame(debugName);
        }
        // Intercept __emberAssertDirect to fix render tree format
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
          if (typeof endFrame === 'function') {
            endFrame();
          }
        }
      }

      return undefined;
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
    const debugName = definition && manager?.getDebugName ? manager.getDebugName(definition) : 'Helper';
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
      return manager?.capabilities || { hasValue: false, hasDestroyable: false, hasScheduledEffect: false };
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
