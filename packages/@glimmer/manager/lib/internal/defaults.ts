import type {
  CapturedArguments as Arguments,
  HelperCapabilities,
  HelperManagerWithValue,
} from '@glimmer/interfaces';

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

  createHelper(fn: AnyFunction, args: Arguments): State {
    return { fn, args };
  }

  getValue({ fn, args: { named, positional } }: State): unknown {
    // Named args are passed as a trailing hash, but only when there are any.
    // `for..in` answers that without allocating a key array on every call.
    for (const _ in named) {
      let argsForFn: FnArgs = [...positional, named];

      return fn(...argsForFn);
    }

    return fn(...positional);
  }

  getDebugName(fn: AnyFunction): string {
    if (fn.name) {
      return `(helper function ${fn.name})`;
    }

    return '(anonymous helper function)';
  }
}
