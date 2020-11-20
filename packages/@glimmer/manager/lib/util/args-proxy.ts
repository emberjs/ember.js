import { DEBUG } from '@glimmer/env';
import {
  Arguments,
  CapturedArguments,
  CapturedNamedArguments,
  CapturedPositionalArguments,
} from '@glimmer/interfaces';
import { Reference, valueForRef } from '@glimmer/reference';
import { HAS_NATIVE_PROXY, symbol } from '@glimmer/util';
import { Tag, track } from '@glimmer/validator';

export const CUSTOM_TAG_FOR = symbol('CUSTOM_TAG_FOR');

function convertToInt(prop: number | string | symbol): number | null {
  if (typeof prop === 'symbol') return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

function tagForNamedArg(namedArgs: CapturedNamedArguments, key: string): Tag {
  return track(() => {
    if (key in namedArgs) {
      valueForRef(namedArgs[key]);
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
      valueForRef(positionalArgs[parsed]);
    }
  });
}

export let argsProxyFor: (
  capturedArgs: CapturedArguments,
  type: 'component' | 'helper' | 'modifier'
) => Arguments;

if (HAS_NATIVE_PROXY) {
  argsProxyFor = (capturedArgs, type) => {
    const { named, positional } = capturedArgs;

    let getNamedTag = (key: string) => tagForNamedArg(named, key);
    let getPositionalTag = (key: string) => tagForPositionalArg(positional, key);

    const namedHandler: ProxyHandler<{}> = {
      get(_target, prop) {
        const ref = named[prop as string];

        if (ref !== undefined) {
          return valueForRef(ref);
        } else if (prop === CUSTOM_TAG_FOR) {
          return getNamedTag;
        }
      },

      has(_target, prop) {
        return prop in named;
      },

      ownKeys(_target) {
        return Object.keys(named);
      },

      isExtensible() {
        return false;
      },

      getOwnPropertyDescriptor(_target, prop) {
        if (DEBUG && !(prop in named)) {
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
      },
    };

    const positionalHandler: ProxyHandler<[]> = {
      get(target, prop) {
        if (prop === 'length') {
          return positional.length;
        }

        const parsed = convertToInt(prop);

        if (parsed !== null && parsed < positional.length) {
          return valueForRef(positional[parsed]);
        }

        if (prop === CUSTOM_TAG_FOR) {
          return getPositionalTag;
        }

        return (target as any)[prop];
      },

      isExtensible() {
        return false;
      },

      has(_target, prop) {
        const parsed = convertToInt(prop);

        return parsed !== null && parsed < positional.length;
      },
    };

    const namedTarget = Object.create(null);
    const positionalTarget: unknown[] = [];

    if (DEBUG) {
      const setHandler = function (_target: unknown, prop: symbol | string | number): never {
        throw new Error(
          `You attempted to set ${String(
            prop
          )} on the arguments of a component, helper, or modifier. Arguments are immutable and cannot be updated directly, they always represent the values that is passed down. If you want to set default values, you should use a getter and local tracked state instead.`
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

    return {
      named: new Proxy(namedTarget, namedHandler),
      positional: new Proxy(positionalTarget, positionalHandler),
    };
  };
} else {
  argsProxyFor = (capturedArgs, _type) => {
    const { named, positional } = capturedArgs;

    let getNamedTag = (key: string) => tagForNamedArg(named, key);
    let getPositionalTag = (key: string) => tagForPositionalArg(positional, key);

    let namedProxy = {};

    Object.defineProperty(namedProxy, CUSTOM_TAG_FOR, {
      configurable: false,
      enumerable: false,
      value: getNamedTag,
    });

    Object.keys(named).forEach((name) => {
      Object.defineProperty(namedProxy, name, {
        enumerable: true,
        configurable: true,
        get() {
          return valueForRef(named[name]);
        },
      });
    });

    let positionalProxy: unknown[] = [];

    Object.defineProperty(positionalProxy, CUSTOM_TAG_FOR, {
      configurable: false,
      enumerable: false,
      value: getPositionalTag,
    });

    positional.forEach((ref: Reference, index: number) => {
      Object.defineProperty(positionalProxy, index, {
        enumerable: true,
        configurable: true,
        get() {
          return valueForRef(ref);
        },
      });
    });

    if (DEBUG) {
      // Prevent mutations in development mode. This will not prevent the
      // proxy from updating, but will prevent assigning new values or pushing
      // for instance.
      Object.freeze(namedProxy);
      Object.freeze(positionalProxy);
    }

    return {
      named: namedProxy,
      positional: positionalProxy,
    };
  };
}
