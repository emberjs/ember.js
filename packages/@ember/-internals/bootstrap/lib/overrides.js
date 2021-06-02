// these are default values that are overriden in some cases by the ember-addon entry point code
// in lib/index.js (see `included` and `buildEmberBundles` methods there for more context)

export const message =
  'Usage of the Ember Global is deprecated. You should import the Ember module or the specific API instead.';

export const deprecateOnce = false;

export function setupDotAccess() {}
