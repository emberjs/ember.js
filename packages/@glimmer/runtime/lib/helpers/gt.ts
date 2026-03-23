import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{gt}}` helper to check if one value is greater than another.

  ```handlebars
  {{if (gt this.count 10) "Over 10" "10 or under"}}
  ```

  Equivalent to `a > b` in JavaScript.

  @method gt
  @param {Any} a
  @param {Any} b
  @return {Boolean}
  @public
*/
export const gt = internalHelper(({ positional }: CapturedArguments): Reference<boolean> => {
  return createComputeRef(
    () => {
      let a = positional[0] ? valueForRef(positional[0]) : undefined;
      let b = positional[1] ? valueForRef(positional[1]) : undefined;
      return (a as number) > (b as number);
    },
    null,
    'gt'
  );
});
