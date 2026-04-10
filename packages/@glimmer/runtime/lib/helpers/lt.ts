import { DEBUG } from '@glimmer/env';

export const lt = (...args: unknown[]) => {
  if (DEBUG && args.length !== 2) {
    throw new Error(`\`lt\` expects exactly two arguments, but received ${args.length}.`);
  }

  return (args[0] as number) < (args[1] as number);
};
