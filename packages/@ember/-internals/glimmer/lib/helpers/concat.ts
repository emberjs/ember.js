import { VMArguments } from '@glimmer/interfaces';
import { createComputeRef } from '@glimmer/reference';
import { reifyPositional } from '@glimmer/runtime';

const isEmpty = (value: any): boolean => {
  return value === null || value === undefined || typeof value.toString !== 'function';
};

const normalizeTextValue = (value: any): string => {
  if (isEmpty(value)) {
    return '';
  }
  return String(value);
};

/**
@module ember
*/

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
  @for Ember.Templates.helpers
  @since 1.13.0
*/
export default function (args: VMArguments) {
  let captured = args.positional.capture();

  return createComputeRef(
    () => reifyPositional(captured).map(normalizeTextValue).join(''),
    null,
    'concat'
  );
}
