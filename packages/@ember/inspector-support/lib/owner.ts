import { getOwner } from '@ember/owner';
import type { Owner, ContainerInstance, GetContainerInstancesOptions } from '../types';

export const owner = {
  /**
   * Get the owner (dependency injection container) of an object.
   */
  getOwner(obj: object): Owner | undefined {
    return getOwner(obj) as Owner | undefined;
  },

  /**
   * Look up a registered instance by full name (e.g. "service:session").
   */
  lookup(ownerInstance: Owner, fullName: string): unknown {
    return ownerInstance.lookup(fullName);
  },

  /**
   * Get the factory for a registration without instantiating it.
   */
  factoryFor(ownerInstance: Owner, fullName: string): unknown {
    if (ownerInstance.factoryFor) {
      return ownerInstance.factoryFor(fullName);
    }
    // Fallback for older Ember versions
    return (ownerInstance as any)._lookupFactory?.(fullName);
  },

  /**
   * Resolve a registration name to its factory without instantiating.
   */
  resolveRegistration(ownerInstance: Owner, fullName: string): unknown {
    if (ownerInstance.resolveRegistration) {
      return ownerInstance.resolveRegistration(fullName);
    }
    return undefined;
  },

  /**
   * Check if a registration exists in the container.
   */
  hasRegistration(ownerInstance: Owner, fullName: string): boolean {
    return ownerInstance.hasRegistration(fullName);
  },

  /**
   * Check if the owner has been destroyed.
   */
  isDestroyed(ownerInstance: Owner): boolean {
    return ownerInstance?.isDestroyed ?? false;
  },

  /**
   * Check if the owner is in the process of being destroyed.
   */
  isDestroying(ownerInstance: Owner): boolean {
    return ownerInstance?.isDestroying ?? false;
  },

  /**
   * HIGH-LEVEL API: Get all instantiated objects grouped by type.
   *
   * Replaces direct access to owner.__container__.cache and handles all
   * version differences internally.
   *
   * @param ownerInstance - The owner instance
   * @param options - Filtering options
   * @returns Map of type names to arrays of instances
   */
  getContainerInstances(
    ownerInstance: Owner,
    options: GetContainerInstancesOptions = {}
  ): Record<string, ContainerInstance[]> {
    const { excludeTypes = [], includePrivate = false } = options;
    const instancesByType: Record<string, ContainerInstance[]> = {};

    // Access container cache via private API (this is the one place we do it)
    const container = (ownerInstance as any).__container__;
    if (!container) {
      return instancesByType;
    }

    let cache = container.cache;

    // Handle InheritingDict (Ember < 1.8)
    if (typeof cache?.dict !== 'undefined' && typeof cache?.eachLocal !== 'undefined') {
      cache = cache.dict;
    }

    for (const key in cache) {
      const type = key.split(':').shift()!;

      // Filter private types (starting with '-')
      if (!includePrivate && type[0] === '-') {
        continue;
      }

      // Filter excluded types
      if (excludeTypes.indexOf(type) !== -1) {
        continue;
      }

      if (!instancesByType[type]) {
        instancesByType[type] = [];
      }

      instancesByType[type]!.push({
        fullName: key,
        instance: cache[key],
      });
    }

    return instancesByType;
  },
};
