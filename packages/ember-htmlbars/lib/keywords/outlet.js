/**
@module ember
@submodule ember-htmlbars
*/

import Ember from 'ember-metal/core';
import { keyword } from 'htmlbars-runtime/hooks';

/*
 This level of delegation handles backward-compatibility with the
 `view` parameter to {{outlet}}. When we drop support for the `view`
 parameter in 2.0, this keyword should just get replaced directly
 with @real_outlet.
*/

export default function(morph, env, scope, params, hash, template, inverse, visitor) {
  if (hash.hasOwnProperty('view') || hash.hasOwnProperty('viewClass')) {
    Ember.deprecate('Passing `view` or `viewClass` to {{outlet}} is deprecated.', false, { id: 'ember-htmlbars.pass-view-to-outlet', until: '3.0.0' });
    keyword('@customized_outlet', morph, env, scope, params, hash, template, inverse, visitor);
  } else {
    keyword('@real_outlet', morph, env, scope, params, hash, template, inverse, visitor);
  }
  return true;
}
