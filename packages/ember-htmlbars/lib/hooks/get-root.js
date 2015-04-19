/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";
import { isGlobal } from "ember-metal/path_cache";
import SimpleStream from "ember-metal/streams/simple-stream";

export default function getRoot(scope, key) {
  if (key === 'this') {
    return [scope.self];
  } else if (key === 'hasBlock') {
    return [!!scope.block];
  } else if (key === 'hasBlockParams') {
    return [!!(scope.block && scope.block.arity)];
  } else if (isGlobal(key) && Ember.lookup[key]) {
    return [getGlobal(key)];
  } else if (scope.locals[key]) {
    return [scope.locals[key]];
  } else {
    return [getKey(scope, key)];
  }
}

function getKey(scope, key) {
  if (key === 'attrs' && scope.attrs) {
    return scope.attrs;
  }

  var self = scope.self || scope.locals.view;

  if (scope.attrs && key in scope.attrs) {
    Ember.deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");
    return scope.attrs[key];
  } else if (self) {
    return self.getKey(key);
  }
}

function getGlobal(name) {
  Ember.deprecate("Global lookup of " + name + " from a Handlebars template is deprecated.");

  // This stream should be memoized, but this path is deprecated and
  // will be removed soon so it's not worth the trouble.
  return new SimpleStream(Ember.lookup[name], name);
}
