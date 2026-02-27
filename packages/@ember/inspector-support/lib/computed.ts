import { descriptorForProperty, isComputed } from '@ember/-internals/metal';
import type { ComputedMetadata } from '../types';

export const computed = {
  /**
   * Check if a property is a computed property.
   */
  isComputed(obj: object, key: string): boolean {
    try {
      return isComputed(obj, key);
    } catch {
      return false;
    }
  },

  /**
   * Get the computed property descriptor for a property.
   * Returns null if the property is not computed.
   */
  getComputedPropertyDescriptor(obj: object, key: string): unknown | null {
    try {
      return descriptorForProperty(obj, key) ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Get the dependent keys for a computed property.
   * Returns an empty array if the property is not computed or has no dependent keys.
   */
  getDependentKeys(obj: object, key: string): string[] {
    try {
      const desc = descriptorForProperty(obj, key) as any;
      return desc?._dependentKeys ?? [];
    } catch {
      return [];
    }
  },

  /**
   * Get computed property metadata without accessing private properties directly.
   * Replaces direct access to desc._getter, desc._readOnly, desc._auto, etc.
   *
   * @param descriptor - The computed property descriptor
   * @returns Public metadata object, or null if descriptor is invalid
   */
  getComputedMetadata(descriptor: unknown): ComputedMetadata | null {
    if (!descriptor) {
      return null;
    }

    const desc = descriptor as any;

    const getter: Function | undefined = desc._getter ?? desc.get;
    const setter: Function | undefined = desc.set;

    return {
      getter,
      setter,
      readOnly: desc._readOnly ?? false,
      auto: desc._auto ?? false,
      dependentKeys: desc._dependentKeys ?? [],
      code: getter ? Function.prototype.toString.call(getter) : undefined,
    };
  },

  /**
   * Check if a descriptor is Ember's mandatory setter.
   * Replaces checking for "You attempted to update" string in setter code.
   *
   * @param descriptor - The property descriptor
   * @returns true if this is a mandatory setter
   */
  isMandatorySetter(descriptor: unknown): boolean {
    if (!descriptor) return false;

    const desc = descriptor as any;
    if (typeof desc.set !== 'function') return false;

    try {
      return Function.prototype.toString.call(desc.set).includes('You attempted to update');
    } catch {
      return false;
    }
  },

  /**
   * Check if a property uses the @cached decorator from @glimmer/tracking.
   * The @cached decorator memoizes getter results and invalidates when dependencies change.
   *
   * @param obj - The object
   * @param key - The property name
   * @returns true if the property uses @cached decorator
   */
  isCached(obj: object, key: string): boolean {
    try {
      // @cached replaces the getter with one that uses createCache/getValue from @glimmer/validator
      // It is NOT a ComputedProperty descriptor - it's a native getter
      if (this.isComputed(obj, key)) {
        return false;
      }

      // Check the prototype chain for a native getter
      let proto: object | null = Object.getPrototypeOf(obj);
      while (proto !== null && proto !== Object.prototype) {
        const nativeDesc = Object.getOwnPropertyDescriptor(proto, key);
        if (nativeDesc?.get) {
          // @cached wraps the getter with a WeakMap-based cache using @glimmer/validator's createCache
          // We detect it by checking if the getter's source references the cache WeakMap pattern
          // This is a best-effort heuristic
          const src = Function.prototype.toString.call(nativeDesc.get);
          if (src.includes('caches') && src.includes('getValue')) {
            return true;
          }
          break;
        }
        proto = Object.getPrototypeOf(proto);
      }

      return false;
    } catch {
      return false;
    }
  },
};
