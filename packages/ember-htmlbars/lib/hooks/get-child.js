/**
@module ember
@submodule ember-htmlbars
*/

import { isStream } from 'ember-metal/streams/utils';

export default function getChild(parent, key) {
  if (isStream(parent)) {
    return parent.getKey(key);
  }

  // This should only happen when we are looking at an `attrs` hash
  // That might change if it is possible to pass object literals
  // through the templating system.
  return parent[key];
}
