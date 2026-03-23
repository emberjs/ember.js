import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{neq}}` helper to check strict inequality between two values.

  ```handlebars
  {{if (neq this.status "active") "Not active" "Active"}}
  ```

  Equivalent to `a !== b` in JavaScript.

  @method neq
  @param {Any} a
  @param {Any} b
  @return {Boolean}
  @public
*/
export const neq = internalHelper(({ positional }: CapturedArguments): Reference<boolean> => {
  return createComputeRef(
    () => {
      let a = positional[0] ? valueForRef(positional[0]) : undefined;
      let b = positional[1] ? valueForRef(positional[1]) : undefined;
      return a !== b;
    },
    null,
    'neq'
  );
});
