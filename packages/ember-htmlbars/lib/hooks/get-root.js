/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";

export default function getRoot(scope, key) {
  if (key === 'this') {
    return scope.self;
  }

  if (scope.locals[key]) {
    return scope.locals[key];
  } else {
    return getKey(scope.self, key);
  }
}

function getKey(self, key) {
  var component = self['*component*'];

  if (!component) {
    return self.getKey(key);
  }

  var value = self[key];
  if (value !== undefined) { return value; }

  Ember.deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");

  return self.attrs.getKey(key);
}
