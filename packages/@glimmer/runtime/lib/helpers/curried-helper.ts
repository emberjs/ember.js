import { CapturedArguments, HelperDefinitionState, Owner } from '@glimmer/interfaces';
import { symbol, _WeakSet } from '@glimmer/util';
import { Reference } from '@glimmer/reference';
import { VMArgumentsImpl } from '../vm/arguments';

const INNER: unique symbol = symbol('INNER');
const OWNER: unique symbol = symbol('OWNER');
const ARGS: unique symbol = symbol('ARGS');

const CURRIED_HELPER_DEFINITIONS = new _WeakSet();

export function isCurriedHelperDefinition(
  definition: unknown
): definition is CurriedHelperDefinition {
  return CURRIED_HELPER_DEFINITIONS.has(definition as object);
}

export class CurriedHelperDefinition {
  [INNER]: HelperDefinitionState | CurriedHelperDefinition;
  [OWNER]: Owner;
  [ARGS]: CapturedArguments | null;

  /** @internal */
  constructor(
    inner: HelperDefinitionState | CurriedHelperDefinition,
    owner: Owner,
    args: CapturedArguments | null
  ) {
    CURRIED_HELPER_DEFINITIONS.add(this);
    this[INNER] = inner;
    this[OWNER] = owner;
    this[ARGS] = args;
  }
}

export function resolveCurriedHelperDefinition(
  curriedDefinition: CurriedHelperDefinition,
  args: VMArgumentsImpl
): [HelperDefinitionState, Owner] {
  let currentWrapper = curriedDefinition;
  let prependArgs: Reference[] | undefined;
  let definition, owner;

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

    if (!isCurriedHelperDefinition(inner)) {
      // Save off the owner that this helper was curried with. Later on,
      // we'll fetch the value of this register and set it as the owner on the
      // new root scope.
      definition = inner;
      owner = currentWrapper[OWNER];
      break;
    }

    currentWrapper = inner;
  }

  if (prependArgs !== undefined) {
    args.realloc(prependArgs.length);
    args.positional.prepend(prependArgs);
  }

  return [definition, owner];
}

export function curry(
  spec: HelperDefinitionState | CurriedHelperDefinition,
  owner: Owner,
  args: CapturedArguments | null
): CurriedHelperDefinition {
  return new CurriedHelperDefinition(spec, owner, args);
}
