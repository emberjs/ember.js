/**
@module ember
*/

import { assert } from '@ember/debug';
import type { CapturedArguments } from '@glimmer/interfaces';
import { createUnboundRef, valueForRef } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

/**
  The `{{unbound}}` helper disconnects the one-way binding of a property,
  essentially freezing its value at the moment of rendering. For example,
  in this example the display of the variable `name` will not change even
  if it is set with a new value:

  ```handlebars
  {{unbound this.name}}
  ```

  Like any helper, the `unbound` helper can accept a nested helper expression.
  This allows for custom helpers to be rendered unbound:

  ```handlebars
  {{unbound (some-custom-helper)}}
  {{unbound (capitalize this.name)}}
  {{! You can use any helper, including unbound, in a nested expression }}
  {{capitalize (unbound this.name)}}
  ```

  The `unbound` helper only accepts a single argument, and it return an
  unbound value.

  @method unbound
  @for Ember.Templates.helpers
  @public
*/

export default internalHelper(({ positional, named }: CapturedArguments) => {
  assert(
    'unbound helper cannot be called with multiple params or hash params',
    positional.length === 1 && Object.keys(named).length === 0
  );

  return createUnboundRef(valueForRef(positional[0]!), '(result of an `unbound` helper)');
});
