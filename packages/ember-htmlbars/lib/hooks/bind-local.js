/**
@module ember
@submodule ember-htmlbars
*/

import Stream from "ember-metal/streams/stream";
import ProxyStream from "ember-metal/streams/proxy-stream";

export default function bindLocal(env, scope, key, value) {
  var isExisting = scope.locals.hasOwnProperty(key);

  if (isExisting) {
    var existing = scope.locals[key];

    if (existing !== value) {
      existing.setSource(value);
    }

    existing.notify();
  } else {
    var newValue = Stream.wrap(value, ProxyStream, key);
    scope.locals[key] = newValue;
  }
}
