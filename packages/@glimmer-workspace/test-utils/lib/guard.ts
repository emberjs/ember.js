import type { Expand, Maybe, Present } from '@glimmer/interfaces';
import { isPresent } from '@glimmer/util';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NTuple<N extends number, Type, T extends any[] = []> = T['length'] extends N
  ? T
  : NTuple<N, Type, [...T, Type]>;

export function guardArray<T extends Maybe<unknown>[], K extends string>(desc: { [P in K]: T }): {
  [K in keyof T]: Present<T[K]>;
};
export function guardArray<T, K extends string, N extends number>(
  desc: { [P in K]: Iterable<T> | ArrayLike<T> },
  options: { min: N }
): Expand<NTuple<N, Present<T>>>;
export function guardArray<T, U extends T, K extends string, N extends number>(
  desc: { [P in K]: Iterable<T> | ArrayLike<T> },
  options: { min: N; condition: (value: T) => value is U }
): Expand<NTuple<N, U>>;
export function guardArray<T, K extends string, A extends ArrayLike<T>>(desc: {
  [P in K]: A;
}): Expand<NTuple<A['length'], Present<T>>>;
export function guardArray<T, K extends string>(desc: {
  [P in K]: Iterable<T> | ArrayLike<T>;
}): Present<T>[];
export function guardArray<T, K extends string, U extends T>(
  desc: {
    [P in K]: Iterable<T> | ArrayLike<T>;
  },
  options: { condition: (value: T) => value is U; min?: number }
): U[];
export function guardArray(
  desc: Record<string, Iterable<unknown> | ArrayLike<unknown>>,
  options?: {
    min?: Maybe<number>;
    condition?: (value: unknown) => boolean;
  }
): unknown[] {
  let [message, list] = Object.entries(desc)[0] as [string, unknown[]];

  let array: unknown[] = Array.from(list);
  let condition: (value: unknown) => boolean;

  if (typeof options?.min === 'number') {
    if (array.length < options.min) {
      throw Error(
        `Guard Failed: expected to have at least ${options.min} (of ${message}), but got ${array.length}`
      );
    }

    array = array.slice(0, options.min);
    condition = (value) => value !== null && value !== undefined;
    message = `${message}: ${options.min} present elements`;
  } else if (options?.condition) {
    condition = options.condition;
  } else {
    condition = isPresent;
    message = `${message}: all are present`;
  }

  let succeeds = array.every(condition);

  if (succeeds) {
    QUnit.assert.ok(succeeds, message);
  } else {
    throw Error(`Guard Failed: ${message}`);
  }

  return array;
}
