// Custom helper manager for gxt compatibility
// Note: In Ember, setHelperManager(factory, helper) passes a factory function
// that takes (owner) and returns a manager with createHelper, getValue, etc.
//
// This class implements the InternalHelperManager interface, meaning it wraps
// a factory and provides getDelegateFor(owner) which returns the actual
// HelperManager delegate for a given owner.

import { DEBUG } from '@glimmer/env';

// Shared WeakSet to track capabilities created via helperCapabilities()
export const FROM_CAPABILITIES = new WeakSet();

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
      this.validateDelegate(delegate);
      this.helperManagerDelegates.set(owner, delegate);
    }
    return delegate;
  }

  private validateDelegate(delegate: any): void {
    if (DEBUG) {
      if (!delegate || !delegate.capabilities) {
        throw new Error(
          'Custom helper managers must have a `capabilities` property that is the result of calling the `capabilities()` function. ' +
          'Received: `' + JSON.stringify(delegate?.capabilities) + '`.'
        );
      }
      if (!FROM_CAPABILITIES.has(delegate.capabilities)) {
        throw new Error(
          'Custom helper managers must have a `capabilities` property that is the result of calling the `capabilities()` function. ' +
          'Received: `' + JSON.stringify(delegate.capabilities) + '`.'
        );
      }
    }
  }

  /**
   * Get the delegate manager for a given owner.
   * This is the key method called by invokeHelper from @glimmer/runtime.
   */
  getDelegateFor(owner: any): any {
    if (owner === undefined || owner === null) {
      let { undefinedDelegate } = this;
      if (undefinedDelegate === null) {
        this.undefinedDelegate = undefinedDelegate = this.factory(undefined);
        this.validateDelegate(undefinedDelegate);
      }
      return undefinedDelegate;
    } else {
      return this.getDelegateForOwner(owner);
    }
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
        return manager.getValue(bucket);
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

  getValue(bucket: any) {
    const owner = (globalThis as any).owner;
    const manager = this.getDelegateFor(owner);
    return manager?.getValue?.(bucket);
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
