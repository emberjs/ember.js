import { Opaque, Option } from '@glimmer/util';

import { ComponentDefinition, PublicComponentDefinition } from './interfaces';
import { ICapturedArguments, Arguments } from '../vm/arguments';

const CURRIED_COMPONENT_DEFINITION_BRAND = 'CURRIED COMPONENT DEFINITION [id=6f00feb9-a0ef-4547-99ea-ac328f80acea]';

export function isCurriedComponentDefinition(definition: Opaque): definition is CurriedComponentDefinition {
  return !!(definition && definition[CURRIED_COMPONENT_DEFINITION_BRAND]);
}

export function isComponentDefinition(definition: Opaque): definition is CurriedComponentDefinition {
  return definition && definition[CURRIED_COMPONENT_DEFINITION_BRAND];
}

export class CurriedComponentDefinition {
  /** @internal */
  constructor(protected inner: ComponentDefinition | CurriedComponentDefinition, protected args: Option<ICapturedArguments>) {
    this[CURRIED_COMPONENT_DEFINITION_BRAND] = true;
  }

  unwrap(args: Arguments): ComponentDefinition {
    args.realloc(this.offset);

    let definition: CurriedComponentDefinition = this;

    while (true) {
      let { args: curriedArgs, inner } = definition;

      if (curriedArgs) {
        args.positional.prepend(curriedArgs.positional);
        args.named.merge(curriedArgs.named);
      }

      if (!isCurriedComponentDefinition(inner)) {
        return inner;
      }

      definition = inner;
    }
  }

  /** @internal */
  get offset(): number {
    let { inner, args } = this;
    let length = args ? args.positional.length : 0;
    return isCurriedComponentDefinition(inner) ? length + inner.offset : length;
  }
}

export function curry(spec: PublicComponentDefinition, args: Option<ICapturedArguments> = null): CurriedComponentDefinition {
  return new CurriedComponentDefinition(spec as ComponentDefinition, args);
}
