import { DEBUG } from '@glimmer/env';
import { toBool } from '@glimmer/global-context';

export const not = (...args: unknown[]) => {
  if (DEBUG && args.length !== 1) {
    throw new Error(`\`not\` expects exactly one argument, but received ${args.length}.`);
  }

  return !toBool(args[0]);
};
