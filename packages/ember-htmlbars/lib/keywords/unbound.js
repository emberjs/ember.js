/**
@module ember
@submodule ember-templates
*/

/**
  The `{{unbound}}` helper disconnects the one-way binding of a property,
  essentially freezing its value at the moment of rendering. For example,
  in this example the display of the variable `name` will not change even
  if it is set with a new value:

  ```handlebars
  {{unbound name}}
  ```

  Like any helper, the `unbound` helper can accept a nested helper expression.
  This allows for custom helpers to be rendered unbound:

  ```handlebars
  {{unbound (some-custom-helper)}}
  {{unbound (capitalize name)}}
  {{! You can use any helper, including unbound, in a nested expression }}
  {{capitalize (unbound name)}}
  ```

  The `unbound` helper only accepts a single argument, and it return an
  unbound value.

  @method unbound
  @for Ember.Templates.helpers
  @public
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
    // deprecated via AST transform
    env.hooks.block(morph, env, scope, valueStream.key, params, hash, template, inverse);
  }

  return true;
}

import merge from "ember-metal/merge";
import create from "ember-metal/platform/create";
import Stream from "ember-metal/streams/stream";
import { read } from "ember-metal/streams/utils";

function VolatileStream(source) {
  this.init(`(volatile ${source.label})`);
  this.source = source;

  this.addDependency(source);
}

VolatileStream.prototype = create(Stream.prototype);

merge(VolatileStream.prototype, {
  value() {
    return read(this.source);
  },

  notify() {}
});
