/**
@module ember
@submodule ember-htmlbars
*/

import { wrap } from 'ember-metal/streams/stream';
import ProxyStream from 'ember-metal/streams/proxy-stream';

export default function bindLocal(env, scope, key, value) {
  // TODO: What is the cause of these cases?
  if (scope.hasOwnLocal(key)) {
    let existing = scope.getLocal(key);
    if (existing !== value) {
      existing.setSource(value);
    }
  } else {
    let newValue = wrap(value, ProxyStream, key);
    scope.bindLocal(key, newValue);
  }
}
