import { StrictResolver } from '@ember/engine/lib/strict-resolver';

export function setupResolver(options = {}) {
  let modules = {};
  let plurals = options.plurals;
  let resolver = new StrictResolver(modules, plurals);

  return { resolver, modules };
}
