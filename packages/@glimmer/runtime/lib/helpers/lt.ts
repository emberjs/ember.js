import { DEBUG } from '@glimmer/env';

/**
 * Performs a less than comparison.
 *
 * left < right
 */
export function lt(left: unknown, right: unknown) {
  if (DEBUG && arguments.length !== 2) {
    throw new Error(`\`lt\` expects exactly two arguments, but received ${arguments.length}.`);
  }

  return (left as number) < (right as number);
}
