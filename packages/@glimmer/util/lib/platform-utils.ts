import { type Maybe, type Present } from '@glimmer/interfaces';

import intern from './intern';

export type Factory<T> = new (...args: unknown[]) => T;

export const HAS_NATIVE_PROXY = typeof Proxy === 'function';

export const HAS_NATIVE_SYMBOL = (function () {
  if (typeof Symbol !== 'function') {
    return false;
  }

  // eslint-disable-next-line symbol-description
  return typeof Symbol() === 'symbol';
})();

export function keys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

export function unwrap<T>(val: Maybe<T>): T {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val as T;
}

export function expect<T>(val: T, message: string): Present<T> {
  if (val === null || val === undefined) throw new Error(message);
  return val as Present<T>;
}

export function unreachable(message = 'unreachable'): Error {
  return new Error(message);
}

export function exhausted(value: never): never {
  throw new Error(`Exhausted ${value}`);
}

export type Lit = string | number | boolean | undefined | null | void | {};

export const tuple = <T extends Lit[]>(...args: T) => args;

export function enumerableSymbol(key: string): any {
  return intern(`__${key}${Math.floor(Math.random() * Date.now())}__`);
}

export const symbol = HAS_NATIVE_SYMBOL ? Symbol : enumerableSymbol;
