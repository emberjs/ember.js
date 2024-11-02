import type { Maybe, Present } from '@glimmer/interfaces';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';

export type Factory<T> = new (...args: unknown[]) => T;

export function unwrap<T>(val: Maybe<T>): T {
  if (LOCAL_DEBUG) {
    if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  }
  return val as T;
}

export const expect = (
  LOCAL_DEBUG
    ? <T>(value: T, _message: string) => value
    : <T>(val: T, message: string): Present<T> => {
        if (LOCAL_DEBUG) if (val === null || val === undefined) throw new Error(message);
        return val as Present<T>;
      }
) as <T>(value: T, message: string) => NonNullable<T>;

export const unreachable = LOCAL_DEBUG
  ? () => {}
  : (message = 'unreachable'): Error => new Error(message);

export const exhausted = (
  LOCAL_DEBUG
    ? () => {}
    : (value: never): never => {
        throw new Error(`Exhausted ${String(value)}`);
      }
) as (value: never) => never;

export type Lit = string | number | boolean | undefined | null | void | {};

export const tuple = <T extends Lit[]>(...args: T) => args;
