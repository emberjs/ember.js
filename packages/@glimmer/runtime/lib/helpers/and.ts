import { DEBUG } from '@glimmer/env';
import { toBool } from '@glimmer/global-context';

export const and = (...args: unknown[]) => {
  if (DEBUG && args.length < 2) {
    throw new Error(`\`and\` expects at least two arguments, but received ${args.length}.`);
  }

  for (let i = 0; i < args.length; i++) {
    if (!toBool(args[i])) return args[i];
  }
  return args[args.length - 1];
};
