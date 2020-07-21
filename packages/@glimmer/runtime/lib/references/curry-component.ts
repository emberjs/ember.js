import { Reference, createComputeRef, valueForRef } from '@glimmer/reference';
import { Option } from '@glimmer/util';
import {
  CapturedArguments,
  ComponentDefinition,
  Maybe,
  Dict,
  RuntimeResolver,
} from '@glimmer/interfaces';

import {
  CurriedComponentDefinition,
  isCurriedComponentDefinition,
} from '../component/curried-component';
import { resolveComponent } from '../component/resolve';

export default function createCurryComponentRef(
  inner: Reference,
  resolver: RuntimeResolver,
  meta: unknown,
  args: Option<CapturedArguments>
) {
  let lastValue: Maybe<Dict>, lastDefinition: Option<CurriedComponentDefinition>;

  return createComputeRef(() => {
    let value = valueForRef(inner) as Maybe<Dict>;

    if (value === lastValue) {
      return lastDefinition;
    }

    let definition: Option<CurriedComponentDefinition | ComponentDefinition> = null;

    if (isCurriedComponentDefinition(value)) {
      definition = value;
    } else if (typeof value === 'string' && value) {
      definition = resolveComponent(resolver, value, meta);
    }

    definition = curry(definition, args);

    lastValue = value;
    lastDefinition = definition;

    return definition;
  });
}

function curry(
  definition: Option<CurriedComponentDefinition | ComponentDefinition>,
  args: Option<CapturedArguments>
): Option<CurriedComponentDefinition> {
  if (!args && isCurriedComponentDefinition(definition)) {
    return definition;
  } else if (!definition) {
    return null;
  } else {
    return new CurriedComponentDefinition(definition, args);
  }
}
