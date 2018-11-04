import { Arguments, CapturedArguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

/**
@module ember
*/

/**
  Evaluates the given arguments with && in short-circuit

  Example:

  ```handlebars
  {{and isAdmin isIdle validData}}

  {{! be validData if `isAdmin` and `isIdle` are both truthy}}
  ```

  @public
  @method and
  @for Ember.Templates.helpers
  @since 2.7.0
*/
function and({ positional: { references } }: CapturedArguments) {
  return references.reduce((acc: any, ref) => acc && ref.value(), true);
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(and, args.capture());
}
