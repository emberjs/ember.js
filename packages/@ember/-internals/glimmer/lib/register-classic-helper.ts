import { DEBUG } from '@glimmer/env';
import { setInternalHelperManager } from '@glimmer/manager/lib/internal/api';

import { CLASSIC_HELPER_MANAGER, isClassicHelper } from './helper';
import { registerClassicHelperHandler } from './resolver';

const CLASSIC_HELPER_MANAGER_ASSOCIATED = new WeakSet();

registerClassicHelperHandler((definition, factory) => {
  if (!isClassicHelper(definition)) return null;

  // For classic class based helpers, we need to pass the factoryFor result
  // itself rather than the raw value (`factoryFor(...).class`). This is
  // because injections are already bound in the factoryFor result, including
  // type-based injections.
  if (DEBUG) {
    // In DEBUG we need to only set the associated value once, otherwise
    // we'll trigger an assertion.
    if (!CLASSIC_HELPER_MANAGER_ASSOCIATED.has(factory)) {
      CLASSIC_HELPER_MANAGER_ASSOCIATED.add(factory);
      setInternalHelperManager(CLASSIC_HELPER_MANAGER, factory);
    }
  } else {
    setInternalHelperManager(CLASSIC_HELPER_MANAGER, factory);
  }

  return factory;
});
