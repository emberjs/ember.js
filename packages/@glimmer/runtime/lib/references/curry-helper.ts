import { CapturedArguments, Dict, Maybe, Option, Owner } from '@glimmer/interfaces';
import { createComputeRef, Reference, valueForRef } from '@glimmer/reference';
import {
  CurriedHelperDefinition,
  curry,
  isCurriedHelperDefinition,
} from '../helpers/curried-helper';

export default function createCurryHelperRef(
  inner: Reference,
  owner: Owner,
  args: Option<CapturedArguments>
) {
  let lastValue: Maybe<Dict> | string, curriedDefinition: CurriedHelperDefinition | null;

  return createComputeRef(() => {
    let value = valueForRef(inner) as Maybe<Dict> | string;

    if (value === lastValue) {
      return curriedDefinition;
    }

    if (isCurriedHelperDefinition(value)) {
      curriedDefinition = args ? curry(value, owner, args) : args;
    } else if (typeof value === 'function' || (typeof value === 'object' && value !== null)) {
      curriedDefinition = curry(value, owner, args);
    } else {
      curriedDefinition = null;
    }

    lastValue = value;

    return curriedDefinition;
  });
}
