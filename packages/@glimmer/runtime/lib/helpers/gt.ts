import { DEBUG } from '@glimmer/env';

/**
 * Performs a greater than comparison.
 *
 * left > right
 */
export function gt(left: unknown, right: unknown) {
  if (DEBUG && arguments.length !== 2) {
    throw new Error(`\`gt\` expects exactly two arguments, but received ${arguments.length}.`);
  }

  return (left as number) > (right as number);
}
