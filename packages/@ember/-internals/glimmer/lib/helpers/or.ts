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
  return references.reduce((acc: any, ref) => acc || ref.value(), false);
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(or, args.capture());
}
