/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import BasicStream from '../streams/stream';
import { read } from '../streams/utils';

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

let VolatileStream = BasicStream.extend({
  init(source) {
    this.label = `(volatile ${source.label})`;
    this.source = source;
    this.addDependency(source);
  },

  value() {
    return read(this.source);
  },

  notify() {}
});

export default function unbound(morph, env, scope, params, hash, template, inverse, visitor) {
  assert(
    'unbound helper cannot be called with multiple params or hash params',
    params.length === 1 && Object.keys(hash).length === 0
  );
  assert(
    'unbound helper cannot be called as a block',
    !template
  );

  if (morph === null) {
    return new VolatileStream(params[0]);
  }

  let stream;
  if (morph.linkedResult) {
    stream = morph.linkedResult;
  } else {
    stream = new VolatileStream(params[0]);
    morph.linkedResult = stream;
  }
  env.hooks.range(morph, env, scope, null, stream, visitor);
  return true;
}

