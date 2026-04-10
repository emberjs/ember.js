import { DEBUG } from '@glimmer/env';

export const neq = (...args: unknown[]) => {
  if (DEBUG && args.length !== 2) {
    throw new Error(`\`neq\` expects exactly two arguments, but received ${args.length}.`);
  }

  return args[0] !== args[1];
};
