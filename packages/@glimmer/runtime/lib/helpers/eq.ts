import type { CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference';

import { internalHelper } from './internal-helper';

/**
  Use the `{{eq}}` helper to check strict equality between two values.

  ```handlebars
  {{if (eq this.status "active") "Yes" "No"}}
  ```

  Equivalent to `a === b` in JavaScript.

  @method eq
  @param {Any} a
  @param {Any} b
  @return {Boolean}
  @public
*/
export const eq = internalHelper(({ positional }: CapturedArguments): Reference<boolean> => {
  return createComputeRef(
    () => {
      let a = positional[0] ? valueForRef(positional[0]) : undefined;
      let b = positional[1] ? valueForRef(positional[1]) : undefined;
      return a === b;
    },
    null,
    'eq'
  );
});
