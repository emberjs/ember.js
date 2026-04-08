import Resolver from '@ember/engine/lib/strict-resolver';

import { setOwner } from '@ember/owner';

export let resolver;
export let modules;

export function setupResolver(options = {}) {
  let owner = options.owner;
  delete options.owner;

  if (!options.namespace) {
    options.namespace = { modulePrefix: 'appkit' };
  }

  modules = Object.create(null);

  let ResolverClass = Resolver.withModules(modules);
  resolver = ResolverClass.create(options);

  if (owner) {
    setOwner(resolver, owner);
  }
}
