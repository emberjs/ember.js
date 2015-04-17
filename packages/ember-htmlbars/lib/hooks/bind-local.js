/**
@module ember
@submodule ember-htmlbars
*/

import Stream from "ember-metal/streams/stream";
import SimpleStream from "ember-metal/streams/simple-stream";

export default function bindLocal(env, scope, key, value) {
  var isExisting = scope.locals.hasOwnProperty(key);

  if (isExisting) {
    var existing = scope.locals[key];

    if (existing !== value) {
      existing.setSource(value);
    }

    existing.notify();
  } else {
    var newValue = Stream.wrap(value, SimpleStream, key);
    scope.locals[key] = newValue;
  }
}
