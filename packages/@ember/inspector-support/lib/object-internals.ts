import { getCachedValueFor, get, set } from '@ember/-internals/metal';
import { guidFor } from '@ember/-internals/utils';
import { meta } from '@ember/-internals/meta';

export const objectInternals = {
  /**
   * Get the cached value of a computed property without triggering recomputation.
   * Useful for inspecting computed property values efficiently without side effects.
   */
  cacheFor(obj: object, key: string): unknown {
    return getCachedValueFor(obj, key);
  },

  /**
   * Generate a unique identifier for an object.
   * Used to track and reference objects uniquely across the inspector.
   */
  guidFor(obj: object): string {
    return guidFor(obj);
  },

  /**
   * Access object metadata including descriptors, mixins, and debug references.
   * Used to introspect object structure for the object inspector.
   */
  meta(obj: object): unknown {
    return meta(obj);
  },

  /**
   * Get a property value from an object using Ember's get semantics.
   */
  get(obj: object, key: string): unknown {
    return get(obj as any, key);
  },

  /**
   * Set a property value on an object using Ember's set semantics.
   */
  set(obj: object, key: string, value: unknown): unknown {
    return set(obj as any, key, value);
  },
};
