import { StrictResolver } from '@ember/engine/lib/strict-resolver';

export let resolver;
export let modules;

export function setupResolver(options = {}) {
  modules = {};

  let plurals = options.plurals;

  resolver = new StrictResolver(modules, plurals);
}
