import { DEBUG } from '@glimmer/env';

/**
 * Performs a strict equality comparison.
 *
 * left === right
 */
export function eq(left: unknown, right: unknown) {
  if (DEBUG && arguments.length !== 2) {
    throw new Error(`\`eq\` expects exactly two arguments, but received ${arguments.length}.`);
  }

  return left === right;
}
