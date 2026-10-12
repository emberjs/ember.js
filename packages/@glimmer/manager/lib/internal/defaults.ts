import type {
  CapturedArguments as Arguments,
  HelperCapabilities,
  HelperManagerWithValue,
} from '@glimmer/interfaces';
import { enterOwnerScope, exitOwnerScope } from '@glimmer/owner';

import { buildCapabilities } from '../util/capabilities';

type FnArgs<Args extends Arguments = Arguments> =
  | [...Args['positional'], Args['named']]
  | [...Args['positional']];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => unknown;

interface State {
  fn: AnyFunction;
  args: Arguments;
}

export class FunctionHelperManager implements HelperManagerWithValue<State> {
  capabilities = buildCapabilities({
    hasValue: true,
    hasDestroyable: false,
    hasScheduledEffect: false,
  }) as HelperCapabilities;

  constructor(private owner: object | undefined) {}

  createHelper(fn: AnyFunction, args: Arguments): State {
    return { fn, args };
  }

  getValue({ fn, args: { named, positional } }: State): unknown {
    let previous = enterOwnerScope(this.owner);

    try {
      /**
       * This is an untraditional use of for loop,
       *   but note~
       *     the immediate return within its body.
       *
       * This is done so that we don't need to allocate an array in order to
       * check that `named` has contents
       *   (and that array would be wasted
       *    for all function calls with no named args)
       */
      for (const _ in named) {
        let argsForFn: FnArgs = [...positional, named];

        return fn(...argsForFn);
      }

      return fn(...positional);
    } finally {
      exitOwnerScope(previous);
    }
  }

  getDebugName(fn: AnyFunction): string {
    if (fn.name) {
      return `(helper function ${fn.name})`;
    }

    return '(anonymous helper function)';
  }
}
