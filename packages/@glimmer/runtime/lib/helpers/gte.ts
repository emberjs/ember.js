import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{gte}}` helper to check if one value is greater than or equal to another.

  ```handlebars
  {{if (gte this.count 10) "10 or more" "Under 10"}}
  ```

  Equivalent to `a >= b` in JavaScript.

  @method gte
  @param {Any} a
  @param {Any} b
  @return {Boolean}
  @public
*/
export const gte = internalHelper(({ positional }: CapturedArguments): Reference<boolean> => {
  return createComputeRef(
    () => {
      let a = positional[0] ? valueForRef(positional[0]) : undefined;
      let b = positional[1] ? valueForRef(positional[1]) : undefined;
      return (a as number) >= (b as number);
    },
    null,
    'gte'
  );
});
