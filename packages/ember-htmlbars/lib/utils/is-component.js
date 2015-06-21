/**
@module ember
@submodule ember-htmlbars
*/

import { CONTAINS_DASH_CACHE } from 'ember-htmlbars/system/lookup-helper';

/*
 Given a path name, returns whether or not a component with that
 name was found in the container.
*/
export default function isComponent(env, scope, path) {
  var container = env.container;
  if (!container) { return false; }
  if (!CONTAINS_DASH_CACHE.get(path)) { return false; }
  return container._registry.has('component:' + path) ||
         container._registry.has('template:components/' + path);
}
