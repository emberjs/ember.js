/**
@module ember
*/

import { assert } from 'ember-debug';
import { UnboundReference } from '../utils/references';

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

export default function(vm, args) {
  assert(
    'unbound helper cannot be called with multiple params or hash params',
    args.positional.length === 1 && args.named.length === 0,
  );

  return UnboundReference.create(args.positional.at(0).value());
}
