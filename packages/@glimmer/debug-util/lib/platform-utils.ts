import type { Maybe, Optional } from '@glimmer/interfaces';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';

export type Factory<T> = new (...args: unknown[]) => T;

export function unwrap<T>(val: Maybe<T>): T {
  if (LOCAL_DEBUG) {
    if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  }
  return val as T;
}

/**
 * This function takes an optional function and returns its result. It's
 * expected to be used with optional debug methods, in the context of an
 * existing `LOCAL_DEBUG` check.
 */
export function dev<T>(val: Optional<() => T>): T {
  if (val === null || val === undefined) {
    throw new Error(
      `Expected debug method to be present. Make sure you're calling \`dev()\` in the context of a \`LOCAL_DEBUG\` check.`
    );
  }

  return val();
}

export function expect<T>(val: Maybe<T>, message: string): T;
export function expect(val: unknown, message: string): unknown {
  if (LOCAL_DEBUG) if (val === null || val === undefined) throw new Error(message);
  return val;
}

export function unreachable(message?: string): never;
export function unreachable(message?: string): void {
  if (LOCAL_DEBUG) throw new Error(message);
}

export function exhausted(value: never): never;
export function exhausted(value: never): void {
  if (LOCAL_DEBUG) throw new Error(`Exhausted ${String(value)}`);
}
