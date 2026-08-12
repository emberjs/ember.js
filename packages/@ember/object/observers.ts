import {
  addObserver as metalAddObserver,
  removeObserver as metalRemoveObserver,
} from '@ember/-internals/metal/lib/observer';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

// Deprecating wrappers: ember-source's own uses go through the metal module
// directly and stay silent.

export const addObserver = ((...args: Parameters<typeof metalAddObserver>) => {
  deprecateUntil(
    'Observers are deprecated. Derive state with `@tracked` properties and native getters, or react to changes explicitly.',
    DEPRECATIONS.DEPRECATE_OBSERVERS
  );
  return metalAddObserver(...args);
}) as typeof metalAddObserver;

export const removeObserver = ((...args: Parameters<typeof metalRemoveObserver>) => {
  deprecateUntil(
    'Observers are deprecated. Derive state with `@tracked` properties and native getters, or react to changes explicitly.',
    DEPRECATIONS.DEPRECATE_OBSERVERS
  );
  return metalRemoveObserver(...args);
}) as typeof metalRemoveObserver;
