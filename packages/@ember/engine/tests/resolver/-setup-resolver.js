import Resolver, { ModuleRegistry } from 'ember-resolver';

import { setOwner } from '@ember/owner';

export let resolver;
export let loader;

export function setupResolver(options = {}) {
  let owner = options.owner;
  delete options.owner;

  if (!options.namespace) {
    options.namespace = { modulePrefix: 'appkit' };
  }
  loader = {
    entries: Object.create(null),
    define(id, deps, callback) {
      if (deps.length > 0) {
        throw new Error('Test Module loader does not support dependencies');
      }
      this.entries[id] = callback;
    },
  };
  options._moduleRegistry = new ModuleRegistry(loader.entries);
  options._moduleRegistry.get = function (moduleName) {
    return loader.entries[moduleName]();
  };

  resolver = Resolver.create(options);

  if (owner) {
    setOwner(resolver, owner);
  }
}
