import { DEBUG } from '@glimmer/env';

/**
 * Performs a greater than or equal comparison.
 *
 * left >= right
 */
export function gte(left: unknown, right: unknown) {
  if (DEBUG && arguments.length !== 2) {
    throw new Error(`\`gte\` expects exactly two arguments, but received ${arguments.length}.`);
  }

  return (left as number) >= (right as number);
}
