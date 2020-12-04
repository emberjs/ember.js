import {
  CapturedArguments,
  ComponentDefinition,
  ComponentInstance,
  Option,
} from '@glimmer/interfaces';
import { assert, symbol, _WeakSet } from '@glimmer/util';
import { Reference } from '@glimmer/reference';
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

export function resolveCurriedComponentDefinition(
  instance: ComponentInstance,
  curriedDefinition: CurriedComponentDefinition,
  args: VMArgumentsImpl
): ComponentDefinition {
  let currentWrapper = curriedDefinition;
  let prependArgs: Reference[] | undefined;
  let definition;

  while (true) {
    let { [ARGS]: curriedArgs, [INNER]: inner } = currentWrapper;

    if (curriedArgs !== null) {
      if (curriedArgs.positional.length > 0) {
        prependArgs =
          prependArgs === undefined
            ? curriedArgs.positional
            : curriedArgs.positional.concat(prependArgs);
      }

      args.named.merge(curriedArgs.named);
    }

    if (!isCurriedComponentDefinition(inner)) {
      definition = inner;
      break;
    }

    currentWrapper = inner;
  }

  if (prependArgs !== undefined) {
    args.realloc(prependArgs.length);
    args.positional.prepend(prependArgs);
  }

  let { manager } = definition;

  assert(instance.manager === null, 'component instance manager should not be populated yet');
  assert(instance.capabilities === null, 'component instance manager should not be populated yet');

  instance.definition = definition;
  instance.manager = manager;
  instance.capabilities = definition.capabilities;

  return definition;
}

export function curry(
  spec: ComponentDefinition | CurriedComponentDefinition,
  args: Option<CapturedArguments> = null
): CurriedComponentDefinition {
  return new CurriedComponentDefinition(spec, args);
}
