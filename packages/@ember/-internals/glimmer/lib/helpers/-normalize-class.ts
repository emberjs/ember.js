import { assert } from '@ember/debug';
import { dasherize } from '@ember/string';
import { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

export default internalHelper(({ positional }: CapturedArguments) => {
  return createComputeRef(() => {
    let classNameArg = positional[0];
    let valueArg = positional[1];
    assert('expected at least two positional args', classNameArg && valueArg);

    let classNameParts = (valueForRef(classNameArg) as string).split('.');
    let className = classNameParts[classNameParts.length - 1];
    assert('has className', className); // Always at least one split result
    let value = valueForRef(valueArg);

    if (value === true) {
      return dasherize(className);
    } else if (!value && value !== 0) {
      return '';
    } else {
      return String(value);
    }
  });
});
