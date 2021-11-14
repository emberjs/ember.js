import { dasherize } from '@ember/string';
import { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

export default internalHelper(({ positional }: CapturedArguments) => {
  return createComputeRef(() => {
    let classNameParts = (valueForRef(positional[0]) as string).split('.');
    let className = classNameParts[classNameParts.length - 1];
    let value = valueForRef(positional[1]);

    if (value === true) {
      return dasherize(className);
    } else if (!value && value !== 0) {
      return '';
    } else {
      return String(value);
    }
  });
});
