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
  if (key === 'attrs' && scope.attrsStream) {
    return scope.attrsStream;
  }

  var self = scope.self;

  if (!scope.attrsStream) {
    return self.getKey(key);
  }

  var value = self[key];
  if (value !== undefined) { return value; }

  var stream = new Stream(function() {
    var view = read(scope.locals.view);
    var attrs = read(scope.attrsStream);

    if (key in attrs) {
      Ember.deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");
      return read(attrs[key]);
    }

    if (typeof view === 'object' && view !== null) {
      return get(view, key);
    }
  });

  stream.addDependency(scope.locals.view);
  stream.addDependency(scope.attrsStream);

  return stream;
}
