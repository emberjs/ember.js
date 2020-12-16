import { CapturedArguments, CurriedType, Owner } from '@glimmer/interfaces';
import { symbol, _WeakSet } from '@glimmer/util';
import { Reference } from '@glimmer/reference';
import { VMArgumentsImpl } from './vm/arguments';

const TYPE: unique symbol = symbol('TYPE');
const INNER: unique symbol = symbol('INNER');
const OWNER: unique symbol = symbol('OWNER');
const ARGS: unique symbol = symbol('ARGS');
const RESOLVED: unique symbol = symbol('RESOLVED');

const CURRIED_VALUES = new _WeakSet();

export function isCurriedValue(value: unknown): value is CurriedValue<CurriedType> {
  return CURRIED_VALUES.has(value as object);
}

export function isCurriedType<T extends CurriedType>(
  value: unknown,
  type: T
): value is CurriedValue<T> {
  return isCurriedValue(value) && value[TYPE] === type;
}

export class CurriedValue<T extends CurriedType = CurriedType> {
  [TYPE]: T;
  [INNER]: object | string | CurriedValue<T>;
  [OWNER]: Owner;
  [ARGS]: CapturedArguments | null;
  [RESOLVED]: boolean;

  /** @internal */
  constructor(
    type: T,
    inner: object | string | CurriedValue<T>,
    owner: Owner,
    args: CapturedArguments | null,
    resolved = false
  ) {
    CURRIED_VALUES.add(this);
    this[TYPE] = type;
    this[INNER] = inner;
    this[OWNER] = owner;
    this[ARGS] = args;
    this[RESOLVED] = resolved;
  }
}

export function resolveCurriedValue(
  curriedValue: CurriedValue<CurriedType.Component>,
  args: VMArgumentsImpl
): [string | object, Owner, boolean];
export function resolveCurriedValue(
  curriedValue: CurriedValue<CurriedType.Helper> | CurriedValue<CurriedType.Modifier>,
  args: VMArgumentsImpl
): [object, Owner, boolean];
export function resolveCurriedValue(
  curriedValue: CurriedValue<CurriedType>,
  args: VMArgumentsImpl
): [string | object, Owner, boolean] {
  let currentWrapper = curriedValue;
  let prependArgs: Reference[] | undefined;
  let definition, owner, resolved;

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

    if (!isCurriedValue(inner)) {
      // Save off the owner that this helper was curried with. Later on,
      // we'll fetch the value of this register and set it as the owner on the
      // new root scope.
      definition = inner;
      owner = currentWrapper[OWNER];
      resolved = currentWrapper[RESOLVED];
      break;
    }

    currentWrapper = inner;
  }

  if (prependArgs !== undefined) {
    args.realloc(prependArgs.length);
    args.positional.prepend(prependArgs);
  }

  return [definition, owner, resolved];
}

export function curry<T extends CurriedType>(
  type: T,
  spec: object | string | CurriedValue<T>,
  owner: Owner,
  args: CapturedArguments | null,
  resolved = false
): CurriedValue<T> {
  return new CurriedValue(type, spec, owner, args, resolved);
}
