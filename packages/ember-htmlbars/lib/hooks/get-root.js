/**
@module ember
@submodule ember-htmlbars
*/

//import Ember from "ember-metal/core";
import Stream from "ember-metal/streams/stream";
import { read } from "ember-metal/streams/utils";
import { get } from "ember-metal/property_get";

export default function getRoot(scope, key) {
  if (key === 'this') {
    return scope.self;
  }

  if (scope.locals[key]) {
    return scope.locals[key];
  } else {
    return getKey(scope, key);
  }
}

function getKey(scope, key) {
  if (key === 'attrs' && scope.attrs) {
    return scope.attrs;
  }

  var component = scope.component;
  var self = scope.self;

  if (!component) {
    return self.getKey(key);
  }

  var value = self[key];
  if (value !== undefined) { return value; }

  var stream = new Stream(function() {
    var view = read(scope.locals.view);
    var attrs = read(scope.attrs);

    if (key in attrs) {
      Ember.deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");
      return read(attrs[key]);
    }

    return get(view[key]);
  });

  stream.addDependency(scope.locals.view);
  stream.addDependency(scope.attrs);

  return stream;
}
