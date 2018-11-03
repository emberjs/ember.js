import { Arguments, CapturedArguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

/**
@module ember
*/

/**
  Compares the two given values with ===

  Example:

  ```handlebars
  {{not disabled}}

  {{! be true if `disabled` is false}}
  ```

  @public
  @method not
  @for Ember.Templates.helpers
  @since 2.7.0
*/
function not({ positional: { references } }: CapturedArguments) {
  return !references[0].value();
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(not, args.capture());
}
