import {
  type CapturedArguments,
  CurriedType,
  type Dict,
  type Maybe,
  type Option,
  type Owner,
  type RuntimeResolver,
} from '@glimmer/interfaces';
import { createComputeRef, type Reference, valueForRef } from '@glimmer/reference';
import { expect, isObject } from '@glimmer/util';

import { curry, isCurriedType } from '../curried-value';

export default function createCurryRef(
  type: CurriedType,
  inner: Reference,
  owner: Owner,
  args: Option<CapturedArguments>,
  resolver: RuntimeResolver,
  isStrict: boolean
) {
  let lastValue: Maybe<Dict> | string, curriedDefinition: object | string | null;

  return createComputeRef(() => {
    let value = valueForRef(inner) as Maybe<Dict> | string;

    if (value === lastValue) {
      return curriedDefinition;
    }

    if (isCurriedType(value, type)) {
      curriedDefinition = args ? curry(type, value, owner, args) : args;
    } else if (type === CurriedType.Component && typeof value === 'string' && value) {
      // Only components should enter this path, as helpers and modifiers do not
      // support string based resolution

      if (import.meta.env.DEV) {
        if (isStrict) {
          throw new Error(
            `Attempted to resolve a dynamic component with a string definition, \`${value}\` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly.`
          );
        }

        let resolvedDefinition = expect(
          resolver,
          'BUG: expected resolver for curried component definitions'
        ).lookupComponent(value, owner);

        if (!resolvedDefinition) {
          throw new Error(
            `Attempted to resolve \`${value}\`, which was expected to be a component, but nothing was found.`
          );
        }
      }

      curriedDefinition = curry(type, value, owner, args);
    } else if (isObject(value)) {
      curriedDefinition = curry(type, value, owner, args);
    } else {
      curriedDefinition = null;
    }

    lastValue = value;

    return curriedDefinition;
  });
}
