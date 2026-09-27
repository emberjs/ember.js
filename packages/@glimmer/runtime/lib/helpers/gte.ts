import { DEBUG } from '@glimmer/env';

/**
 * Performs a greater than or equal comparison.
 *
 * left >= right
 */
export function gte<T>(left: T, right: T) {
  if (DEBUG && arguments.length !== 2) {
    throw new Error(`\`gte\` expects exactly two arguments, but received ${arguments.length}.`);
  }

  return (left as number) >= (right as number);
}
