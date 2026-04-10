import { DEBUG } from '@glimmer/env';

export const gt = (...args: unknown[]) => {
  if (DEBUG && args.length !== 2) {
    throw new Error(`\`gt\` expects exactly two arguments, but received ${args.length}.`);
  }

  return (args[0] as number) > (args[1] as number);
};
