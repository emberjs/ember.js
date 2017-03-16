import { InternalHelperReference } from '../utils/references';
import { normalizeTextValue } from '@glimmer/runtime';

/**
@module ember
@submodule ember-glimmer
*/

/**
  Concatenates the given arguments into a string.

  Example:

  ```handlebars
  {{some-component name=(concat firstName " " lastName)}}

  {{! would pass name="<first name value> <last name value>" to the component}}
  ```

  @public
  @method concat
  @for Ember.Templates.helpers
  @since 1.13.0
*/
function concat({ positional }) {
  return positional.value().map(normalizeTextValue).join('');
}

export default function(vm, args) {
  return new InternalHelperReference(concat, args);
}
