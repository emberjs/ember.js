import { VMArguments } from '@glimmer/interfaces';
import { Reference, createComputeRef, valueForRef } from '@glimmer/reference';

export default function ifHelper({ positional }: VMArguments): Reference {
  let condition = positional.at(0);
  let truthyValue = positional.at(1);
  let falsyValue = positional.length > 2 ? positional.at(2) : undefined;

  return createComputeRef(() => {
    let value: unknown;
    if (valueForRef(condition)) {
      value = valueForRef(truthyValue);
    } else if (falsyValue !== undefined) {
      value = valueForRef(falsyValue);
    }
    return value;
  });
}
