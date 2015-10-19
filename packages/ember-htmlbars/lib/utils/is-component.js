/**
@module ember
@submodule ember-htmlbars
*/

import {
  CONTAINS_DASH_CACHE,
  CONTAINS_DOT_CACHE
} from 'ember-htmlbars/system/lookup-helper';
import { isComponentCell } from 'ember-htmlbars/keywords/closure-component';
import { isStream } from 'ember-metal/streams/utils';

/*
 Given a path name, returns whether or not a component with that
 name was found in the container.
*/
export default function isComponent(env, scope, path) {
  var container = env.container;
  if (!container) { return false; }
  if (typeof path === 'string') {
    if (CONTAINS_DOT_CACHE.get(path)) {
      let stream = env.hooks.get(env, scope, path);
      if (isStream(stream)) {
        let cell = stream.value();
        if (isComponentCell(cell)) {
          return true;
        }
      }
    }
    if (!CONTAINS_DASH_CACHE.get(path)) { return false; }
    return container.registry.has('component:' + path) ||
           container.registry.has('template:components/' + path);
  }
}
