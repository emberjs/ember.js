import { DEBUG } from '@glimmer/env';

/**
 * Performs a strict inequality comparison.
 *
 * left !== right
 */
export function neq(left: unknown, right: unknown) {
  if (DEBUG && arguments.length !== 2) {
    throw new Error(`\`neq\` expects exactly two arguments, but received ${arguments.length}.`);
  }

  return left !== right;
}
