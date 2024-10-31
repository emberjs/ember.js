import type {
  Arguments,
  CapturedArguments,
  CapturedNamedArguments,
  CapturedPositionalArguments,
} from '@glimmer/interfaces';
import type { Tag } from '@glimmer/validator';
import { valueForRef } from '@glimmer/reference';
import { track } from '@glimmer/validator';

const CUSTOM_TAG_FOR = new WeakMap<object, (obj: object, key: string) => Tag>();

export function getCustomTagFor(obj: object): ((obj: object, key: string) => Tag) | undefined {
  return CUSTOM_TAG_FOR.get(obj);
}

export function setCustomTagFor(obj: object, customTagFn: (obj: object, key: string) => Tag) {
  CUSTOM_TAG_FOR.set(obj, customTagFn);
}

function convertToInt(prop: number | string | symbol): number | null {
  if (typeof prop === 'symbol') return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

function tagForNamedArg(namedArgs: CapturedNamedArguments, key: string): Tag {
  return track(() => {
    if (key in namedArgs) {
      valueForRef(namedArgs[key]!);
    }
  });
}

function tagForPositionalArg(positionalArgs: CapturedPositionalArguments, key: string): Tag {
  return track(() => {
    if (key === '[]') {
      // consume all of the tags in the positional array
      positionalArgs.forEach(valueForRef);
    }

    const parsed = convertToInt(key);

    if (parsed !== null && parsed < positionalArgs.length) {
      // consume the tag of the referenced index
      valueForRef(positionalArgs[parsed]!);
    }
  });
}

class NamedArgsProxy implements ProxyHandler<{}> {
  declare set?: (target: {}, prop: string | number | symbol) => boolean;

  constructor(private named: CapturedNamedArguments) {}

  get(_target: {}, prop: string | number | symbol) {
    const ref = this.named[prop as string];

    if (ref !== undefined) {
      return valueForRef(ref);
    }
  }

  has(_target: {}, prop: string | number | symbol) {
    return prop in this.named;
  }

  ownKeys() {
    return Object.keys(this.named);
  }

  isExtensible() {
    return false;
  }

  getOwnPropertyDescriptor(_target: {}, prop: string | number | symbol) {
    if (import.meta.env.DEV && !(prop in this.named)) {
      throw new Error(
        `args proxies do not have real property descriptors, so you should never need to call getOwnPropertyDescriptor yourself. This code exists for enumerability, such as in for-in loops and Object.keys(). Attempted to get the descriptor for \`${String(
          prop
        )}\``
      );
    }

    return {
      enumerable: true,
      configurable: true,
    };
  }
}

class PositionalArgsProxy implements ProxyHandler<[]> {
  declare set?: (target: [], prop: string | number | symbol) => boolean;
  declare ownKeys?: (target: []) => string[];

  constructor(private positional: CapturedPositionalArguments) {}

  get(target: [], prop: string | number | symbol) {
    let { positional } = this;

    if (prop === 'length') {
      return positional.length;
    }

    const parsed = convertToInt(prop);

    if (parsed !== null && parsed < positional.length) {
      return valueForRef(positional[parsed]!);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (target as any)[prop];
  }

  isExtensible() {
    return false;
  }

  has(_target: [], prop: string | number | symbol) {
    const parsed = convertToInt(prop);

    return parsed !== null && parsed < this.positional.length;
  }
}

export const argsProxyFor = (
  capturedArgs: CapturedArguments,
  type: 'component' | 'helper' | 'modifier'
): Arguments => {
  const { named, positional } = capturedArgs;

  let getNamedTag = (_obj: object, key: string) => tagForNamedArg(named, key);
  let getPositionalTag = (_obj: object, key: string) => tagForPositionalArg(positional, key);

  const namedHandler = new NamedArgsProxy(named);
  const positionalHandler = new PositionalArgsProxy(positional);

  const namedTarget = Object.create(null);
  const positionalTarget: unknown[] = [];

  if (import.meta.env.DEV) {
    const setHandler = function (_target: unknown, prop: symbol | string | number): never {
      throw new Error(
        `You attempted to set ${String(
          prop
        )} on the arguments of a component, helper, or modifier. Arguments are immutable and cannot be updated directly; they always represent the values that are passed down. If you want to set default values, you should use a getter and local tracked state instead.`
      );
    };

    const forInDebugHandler = (): never => {
      throw new Error(
        `Object.keys() was called on the positional arguments array for a ${type}, which is not supported. This function is a low-level function that should not need to be called for positional argument arrays. You may be attempting to iterate over the array using for...in instead of for...of.`
      );
    };

    namedHandler.set = setHandler;
    positionalHandler.set = setHandler;
    positionalHandler.ownKeys = forInDebugHandler;
  }

  const namedProxy = new Proxy(namedTarget, namedHandler);
  const positionalProxy = new Proxy(positionalTarget, positionalHandler);

  setCustomTagFor(namedProxy, getNamedTag);
  setCustomTagFor(positionalProxy, getPositionalTag);

  return {
    named: namedProxy,
    positional: positionalProxy,
  };
};
