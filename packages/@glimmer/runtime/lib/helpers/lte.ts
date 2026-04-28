import { DEBUG } from '@glimmer/env';

/**
 * Performs a less than or equal comparison.
 *
 * left <= right
 */
export function lte(left: unknown, right: unknown) {
  if (DEBUG && arguments.length !== 2) {
    throw new Error(`\`lte\` expects exactly two arguments, but received ${arguments.length}.`);
  }

  return (left as number) <= (right as number);
}
