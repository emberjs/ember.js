/**
@module ember
@submodule ember-htmlbars
*/

import Stream from "ember-metal/streams/stream";
import SimpleStream from "ember-metal/streams/simple-stream";

export default function bindLocal(env, scope, key, value) {
  var existing = scope.locals[key];

  if (existing) {
    existing.setSource(value);
    existing.notify();
  } else {
    var newValue = Stream.wrap(value, SimpleStream);
    scope.locals[key] = newValue;
  }
}
