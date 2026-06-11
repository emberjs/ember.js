import type { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef } from '@glimmer/reference/lib/reference';

import { reifyPositional } from '../vm/arguments';
import { internalHelper } from './internal-helper';

const isEmpty = (value: unknown): boolean => {
  return value === null || value === undefined || typeof value.toString !== 'function';
};

const normalizeTextValue = (value: unknown): string => {
  if (isEmpty(value)) {
    return '';
  }
  return String(value);
};

/**
  Concatenates the given arguments into a string.

  Example:


  ```gjs
  import { concat } from '@ember/helper';

  <template>
  {{yield (concat firstName " " lastName)}}

  {{! would yield name="<first name value> <last name value>" to the component}}
  </template>
  ```

  or for angle bracket invocation, you actually don't need concat at all.

  ```handlebars
  <SomeComponent @name="{{firstName}} {{lastName}}" />
  ```

  @public
  @method concat
*/
export const concat = internalHelper(({ positional }: CapturedArguments) => {
  return createComputeRef(
    () => reifyPositional(positional).map(normalizeTextValue).join(''),
    null,
    'concat'
  );
});
