/**
@module ember
@submodule ember-htmlbars
*/

//import Ember from "ember-metal/core";
import Stream from "ember-metal/streams/stream";
import { read } from "ember-metal/streams/utils";

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

  var value = self[key];
  if (value !== undefined) { return value; }

  var viewKey = scope.locals.view.getKey(key);

  var stream = new Stream(function() {
    var attrs = scope.attrs;

    if (key in attrs) {
      Ember.deprecate("You accessed the `" + key + "` attribute directly. Please use `attrs." + key + "` instead.");
      return read(attrs[key]);
    }

    return read(viewKey);
  });

  stream.addDependency(viewKey);
  stream.addDependency(scope.attrs[key]);

  return stream;
}
