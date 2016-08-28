/**
@module ember
@submodule ember-htmlbars
*/

import isComponent from '../utils/is-component';

export default function classify(env, scope, path) {
  if (isComponent(env, scope, path)) {
    return 'component';
  }

  return null;
}
