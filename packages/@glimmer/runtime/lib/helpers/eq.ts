import { DEBUG } from '@glimmer/env';

export const eq = (...args: unknown[]) => {
  if (DEBUG && args.length !== 2) {
    throw new Error(`\`eq\` expects exactly two arguments, but received ${args.length}.`);
  }

  return args[0] === args[1];
};
