import { libraries as LIBRARIES } from '@ember/-internals/metal';
import type { Library } from '../types';

export const libraries = {
  /**
   * Get the registry of all loaded Ember libraries and addons.
   * Used to display loaded libraries in the Info tab of the inspector.
   */
  getRegistry(): Library[] {
    return LIBRARIES._registry.map((lib) => ({
      name: lib.name,
      version: lib.version,
    }));
  },
};
