import { CapturedArguments, ComponentDefinition, Option } from '@glimmer/interfaces';
import { assert, symbol, _WeakSet } from '@glimmer/util';
import { capabilityFlagsFrom } from '../capabilities';
import { ComponentInstance } from '../compiled/opcodes/component';
import { VMArgumentsImpl } from '../vm/arguments';

const INNER: unique symbol = symbol('INNER');
const ARGS: unique symbol = symbol('ARGS');

const CURRIED_COMPONENT_DEFINITIONS = new _WeakSet();

export function isCurriedComponentDefinition(
  definition: unknown
): definition is CurriedComponentDefinition {
  return CURRIED_COMPONENT_DEFINITIONS.has(definition as object);
}

export class CurriedComponentDefinition {
  [INNER]: ComponentDefinition | CurriedComponentDefinition;
  [ARGS]: Option<CapturedArguments>;

  /** @internal */
  constructor(
    inner: ComponentDefinition | CurriedComponentDefinition,
    args: Option<CapturedArguments>
  ) {
    CURRIED_COMPONENT_DEFINITIONS.add(this);
    this[INNER] = inner;
    this[ARGS] = args;
  }
}

function offset(definition: CurriedComponentDefinition): number {
  let inner = definition[INNER];
  let args = definition[ARGS];
  let length = args ? args.positional.length : 0;
  return isCurriedComponentDefinition(inner) ? length + offset(inner) : length;
}

function unwrapCurriedComponentDefinition(
  _definition: CurriedComponentDefinition,
  args: VMArgumentsImpl
) {
  let definition = _definition;

  args.realloc(offset(definition));

  while (true) {
    let { [ARGS]: curriedArgs, [INNER]: inner } = definition;

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

export function resolveCurriedComponentDefinition(
  instance: ComponentInstance,
  definition: CurriedComponentDefinition,
  args: VMArgumentsImpl
): ComponentDefinition {
  let unwrappedDefinition = (instance.definition = unwrapCurriedComponentDefinition(
    definition,
    args
  ));
  let { manager, state } = unwrappedDefinition;

  assert(instance.manager === null, 'component instance manager should not be populated yet');
  assert(instance.capabilities === null, 'component instance manager should not be populated yet');

  instance.manager = manager;
  instance.capabilities = capabilityFlagsFrom(manager.getCapabilities(state));

  return unwrappedDefinition;
}

export function curry(
  spec: ComponentDefinition,
  args: Option<CapturedArguments> = null
): CurriedComponentDefinition {
  return new CurriedComponentDefinition(spec as ComponentDefinition, args);
}
