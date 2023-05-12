import type {
  CapturedArguments,
  CurriedComponent,
  CurriedHelper,
  CurriedModifier,
  CurriedType,
  Owner,
} from "@glimmer/interfaces";
import type { Reference } from '@glimmer/reference';

const TYPE: unique symbol = Symbol('TYPE');
const INNER: unique symbol = Symbol('INNER');
const OWNER: unique symbol = Symbol('OWNER');
const ARGS: unique symbol = Symbol('ARGS');
const RESOLVED: unique symbol = Symbol('RESOLVED');

const CURRIED_VALUES = new WeakSet();

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

interface ResolvedCurriedValue<T> {
  definition: T;
  owner: Owner;
  resolved: boolean;
  positional: Reference[] | undefined;
  named: Record<string, Reference>[] | undefined;
}

export function resolveCurriedValue(
  curriedValue: CurriedValue<CurriedComponent>
): ResolvedCurriedValue<object | string>;
export function resolveCurriedValue(
  curriedValue: CurriedValue<CurriedHelper> | CurriedValue<CurriedModifier>
): ResolvedCurriedValue<object>;
export function resolveCurriedValue(
  curriedValue: CurriedValue<CurriedType>
): ResolvedCurriedValue<object | string> {
  let currentWrapper = curriedValue;
  let positional: Reference[] | undefined;
  let named: Record<string, Reference>[] | undefined;
  let definition, owner, resolved;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let { [ARGS]: curriedArgs, [INNER]: inner } = currentWrapper;

    if (curriedArgs !== null) {
      let { named: curriedNamed, positional: curriedPositional } = curriedArgs;

      if (curriedPositional.length > 0) {
        positional =
          positional === undefined ? curriedPositional : curriedPositional.concat(positional);
      }

      if (named === undefined) {
        named = [];
      }

      named.unshift(curriedNamed);
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

  return { definition, owner, resolved, positional, named };
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
