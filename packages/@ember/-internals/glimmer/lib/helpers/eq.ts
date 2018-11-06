import { Arguments, CapturedArguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

/**
@module ember
*/

/**
  Compares the two given values with ===

  Example:

  ```handlebars
  {{eq type "button"}}

  {{! be true if `type` is "button"}}
  ```

  @public
  @method eq
  @for Ember.Templates.helpers
  @since 3.7.0
*/
function eq({ positional: { references } }: CapturedArguments) {
  return references[0].value() === references[1].value();
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(eq, args.capture());
}
