/**
@module ember
@submodule ember-htmlbars
*/

export default function unbound(morph, env, scope, originalParams, hash, template, inverse) {
  // Since we already got the params as a set of streams, we need to extract the key from
  // the first param instead of (incorrectly) trying to read from it. If this was a call
  // to `{{unbound foo.bar}}`, then we pass along the original stream to `hooks.range`.
  var params = originalParams.slice();
  var valueStream = params.shift();

  // If `morph` is `null` the keyword is being invoked as a subexpression.
  if (morph === null) {
    if (originalParams.length > 1) {
      valueStream = env.hooks.subexpr(env, scope, valueStream.key, params, hash);
    }

    return new VolatileStream(valueStream);
  }

  if (params.length === 0) {
    env.hooks.range(morph, env, scope, null, valueStream);
  } else if (template === null) {
    env.hooks.inline(morph, env, scope, valueStream.key, params, hash);
  } else {
    env.hooks.block(morph, env, scope, valueStream.key, params, hash, template, inverse);
  }

  return true;
}

import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import { read } from "ember-metal/streams/utils";

function VolatileStream(source) {
  this.init(`(volatile ${source.label})`);
  this.source = source;

  this.addDependency(source);
}

VolatileStream.prototype = Object.create(Stream.prototype);

merge(VolatileStream.prototype, {
  value() {
    return read(this.source);
  },

  notify() {}
});
