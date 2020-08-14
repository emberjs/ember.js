import { dasherize } from '@ember/string';
import { VMArguments } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference';

export default function(args: VMArguments) {
  let positional = args.positional.capture();

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
}
