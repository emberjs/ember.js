import { Arguments, CapturedArguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

/**
@module ember
*/

/**
  Compares the two given values with >=

  Example:

  ```handlebars
  {{gt age 17}}

  {{! be true if `age` is > 17}}
  ```

  @public
  @method gte
  @for Ember.Templates.helpers
  @since 2.7.0
*/
function gte({ positional: { references } }: CapturedArguments) {
  let left = references[0].value();
  if (left === undefined || left === null) {
    return false;
  }
  let right = references[1].value();
  if (right === undefined || right === null) {
    return false;
  }
  return left >= right;
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(gte, args.capture());
}
