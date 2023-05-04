import { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef } from '@glimmer/reference';

import { reifyPositional } from '../vm/arguments';
import { internalHelper } from './internal-helper';

const isEmpty = (value: unknown): boolean => {
  return value === null || value === undefined || typeof (value as object).toString !== 'function';
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

  ```handlebars
  {{some-component name=(concat firstName " " lastName)}}

  {{! would pass name="<first name value> <last name value>" to the component}}
  ```

  or for angle bracket invocation, you actually don't need concat at all.

  ```handlebars
  <SomeComponent @name="{{firstName}} {{lastName}}" />
  ```

  @public
  @method concat
*/
export default internalHelper(({ positional }: CapturedArguments) => {
  return createComputeRef(
    () => reifyPositional(positional).map(normalizeTextValue).join(''),
    null,
    'concat'
  );
});
