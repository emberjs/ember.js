/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";

export default function getRoot(scope, key) {
  if (key === 'this') {
    return [scope.self];
  }

  if (scope.locals[key]) {
    return [scope.locals[key]];
  } else {
    return [getKey(scope, key)];
  }
}

function getKey(scope, key) {
  if (key === 'attrs' && scope.attrs) {
    return scope.attrs;
  }

  var self = scope.self;

  if (!scope.attrs) {
    return self.getKey(key);
  }

  if (key in scope.attrs) {
    Ember.deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");
    return scope.attrs[key];
  } else {
    return scope.locals.view.getKey(key);
  }
}
