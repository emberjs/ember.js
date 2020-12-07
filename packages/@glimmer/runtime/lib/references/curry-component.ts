import { DEBUG } from '@glimmer/env';
import {
  CapturedArguments,
  Dict,
  Maybe,
  Option,
  RuntimeResolver,
  Owner,
  ResolutionTimeConstants,
} from '@glimmer/interfaces';
import { createComputeRef, Reference, valueForRef } from '@glimmer/reference';
import {
  CurriedComponentDefinition,
  curry,
  isCurriedComponentDefinition,
} from '../component/curried-component';

export default function createCurryComponentRef(
  inner: Reference,
  resolver: RuntimeResolver,
  constants: ResolutionTimeConstants,
  owner: Owner,
  args: Option<CapturedArguments>,
  isStrict: boolean
) {
  let lastValue: Maybe<Dict> | string, curriedDefinition: Option<CurriedComponentDefinition>;

  return createComputeRef(() => {
    let value = valueForRef(inner) as Maybe<Dict> | string;

    if (value === lastValue) {
      return curriedDefinition;
    }

    if (isCurriedComponentDefinition(value)) {
      curriedDefinition = args ? curry(value, args) : args;
    } else if (typeof value === 'string' && value) {
      if (DEBUG && isStrict) {
        throw new Error(
          `Attempted to resolve a dynamic component with a string definition, \`${value}\` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly.`
        );
      }

      let resolvedDefinition = resolver.lookupComponent(value, owner);

      if (DEBUG && !resolvedDefinition) {
        throw new Error(
          `Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`
        );
      }

      curriedDefinition = curry(constants.resolvedComponent(resolvedDefinition!, value), args);
    } else if (typeof value === 'object' && value !== null) {
      curriedDefinition = curry(constants.component(owner, value), args);
    } else {
      curriedDefinition = null;
    }

    lastValue = value;

    return curriedDefinition;
  });
}
