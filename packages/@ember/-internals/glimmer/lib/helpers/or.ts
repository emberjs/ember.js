import { Arguments, CapturedArguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

/**
@module ember
*/

/**
  Evaluates the given arguments with || in short-circuit

  Example:

  ```handlebars
  {{or isAdmin isAuthor}}

  {{! be validData either `isAdmin` or `isAuthor` are truthy}}
  ```

  @public
  @method or
  @for Ember.Templates.helpers
  @since 2.7.0
*/
function or({ positional: { references } }: CapturedArguments) {
  let last: any = false;
  for (let i = 0; i < references.length; i++) {
    last = references[i].value();
    if (last) {
      return last;
    }
  }
  return last;
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(or, args.capture());
}
