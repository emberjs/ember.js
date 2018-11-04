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
  let last: any = true;
  for (let i = 0; i < references.length; i++) {
    last = references[i].value();
    if (!last) {
      return last;
    }
  }
  return last;
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(and, args.capture());
}
