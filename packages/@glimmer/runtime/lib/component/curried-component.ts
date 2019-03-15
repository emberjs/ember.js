import { CapturedArguments, ComponentDefinition, Dict, Maybe } from '@glimmer/interfaces';
import { Option } from '@glimmer/util';
import { VMArgumentsImpl } from '../vm/arguments';

const CURRIED_COMPONENT_DEFINITION_BRAND =
  'CURRIED COMPONENT DEFINITION [id=6f00feb9-a0ef-4547-99ea-ac328f80acea]';

export function isCurriedComponentDefinition(
  definition: unknown
): definition is CurriedComponentDefinition {
  return !!(definition && (definition as Dict)[CURRIED_COMPONENT_DEFINITION_BRAND]);
}

export function isComponentDefinition(
  definition: Maybe<Dict>
): definition is CurriedComponentDefinition {
  return !!(definition && definition[CURRIED_COMPONENT_DEFINITION_BRAND]);
}

export class CurriedComponentDefinition {
  readonly [CURRIED_COMPONENT_DEFINITION_BRAND] = true;

  /** @internal */
  constructor(
    protected inner: ComponentDefinition | CurriedComponentDefinition,
    protected args: Option<CapturedArguments>
  ) {}

  unwrap(args: VMArgumentsImpl): ComponentDefinition {
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

export function curry(
  spec: ComponentDefinition,
  args: Option<CapturedArguments> = null
): CurriedComponentDefinition {
  return new CurriedComponentDefinition(spec as ComponentDefinition, args);
}
