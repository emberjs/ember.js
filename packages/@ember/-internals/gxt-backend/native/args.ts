// gxt NATIVE layer — the argument objects handed to helper and modifier
// managers (Glimmer `argsProxyFor`, `@glimmer/manager/lib/util/args-proxy`).
//
// Under NATIVE_FLAGS.EMBER_NATIVE the gxt compiler emits every helper /
// modifier / curry argument as a primitive LITERAL or a zero-arg THUNK (gxt
// `buildNativeArg`), so unwrapping is exact: a function argument is a thunk,
// called once. The proxies read a MUTABLE source — a per-call-site helper keeps
// its proxies while each evaluation of the call site hands it the current
// thunks — and they read lazily, so whatever tracking frame is active when a
// manager reads an argument (a helper's cache, a modifier's install/update
// frame, a binding formula) subscribes to exactly the arguments it reads.
import { DEBUG } from '@glimmer/env';

/** The current arguments of one call site (literal-or-thunk values). */
export interface ArgsSource {
  positional: readonly unknown[];
  named: Readonly<Record<string, unknown>>;
}

export interface Arguments {
  positional: readonly unknown[];
  named: Record<string, unknown>;
}

/** Read one literal-or-thunk argument. */
export function unwrapArg(value: unknown): unknown {
  return typeof value === 'function' ? (value as () => unknown)() : value;
}

function convertToInt(prop: PropertyKey): number | null {
  if (typeof prop === 'symbol') return null;
  const num = Number(prop);
  if (isNaN(num)) return null;
  return num % 1 === 0 ? num : null;
}

const hasOwn = Object.prototype.hasOwnProperty;

class NamedArgsHandler implements ProxyHandler<object> {
  declare set?: (target: object, prop: PropertyKey) => boolean;
  constructor(private source: ArgsSource) {}

  get(_target: object, prop: PropertyKey): unknown {
    const named = this.source.named;
    if (typeof prop === 'string' && hasOwn.call(named, prop)) return unwrapArg(named[prop]);
    return undefined;
  }

  has(_target: object, prop: PropertyKey): boolean {
    return typeof prop === 'string' && hasOwn.call(this.source.named, prop);
  }

  ownKeys(): string[] {
    return Object.keys(this.source.named);
  }

  getOwnPropertyDescriptor(_target: object, prop: PropertyKey): PropertyDescriptor | undefined {
    if (typeof prop !== 'string' || !hasOwn.call(this.source.named, prop)) {
      if (DEBUG) {
        throw new Error(
          `args proxies do not have real property descriptors, so you should never need to call getOwnPropertyDescriptor yourself. This code exists for enumerability, such as in for-in loops and Object.keys(). Attempted to get the descriptor for \`${String(prop)}\``
        );
      }
      return undefined;
    }
    return { enumerable: true, configurable: true };
  }
}

class PositionalArgsHandler implements ProxyHandler<unknown[]> {
  declare set?: (target: unknown[], prop: PropertyKey) => boolean;
  declare ownKeys?: (target: unknown[]) => string[];
  constructor(private source: ArgsSource) {}

  get(target: unknown[], prop: PropertyKey): unknown {
    const positional = this.source.positional;
    if (prop === 'length') return positional.length;
    const index = convertToInt(prop);
    if (index !== null) {
      return index >= 0 && index < positional.length ? unwrapArg(positional[index]) : undefined;
    }
    return (target as unknown as Record<PropertyKey, unknown>)[prop];
  }

  has(_target: unknown[], prop: PropertyKey): boolean {
    const index = convertToInt(prop);
    return index !== null && index >= 0 && index < this.source.positional.length;
  }
}

function setHandler(_target: unknown, prop: PropertyKey): never {
  throw new Error(
    `You attempted to set ${String(prop)} on the arguments of a component, helper, or modifier. Arguments are immutable and cannot be updated directly; they always represent the values that are passed down. If you want to set default values, you should use a getter and local tracked state instead.`
  );
}

/** Lazy `{ positional, named }` over a (mutable) argument source. */
export function argsProxyFor(
  source: ArgsSource,
  type: 'helper' | 'modifier' | 'component'
): Arguments {
  const namedHandler = new NamedArgsHandler(source);
  const positionalHandler = new PositionalArgsHandler(source);
  if (DEBUG) {
    namedHandler.set = setHandler;
    positionalHandler.set = setHandler;
    positionalHandler.ownKeys = (): never => {
      throw new Error(
        `Object.keys() was called on the positional arguments array for a ${type}, which is not supported. This function is a low-level function that should not need to be called for positional argument arrays. You may be attempting to iterate over the array using for...in instead of for...of.`
      );
    };
  }
  return {
    named: new Proxy(Object.create(null) as object, namedHandler) as Record<string, unknown>,
    positional: new Proxy([] as unknown[], positionalHandler),
  };
}
