import type {
  CapturedArguments as Arguments,
  HelperCapabilities,
  HelperManagerWithValue,
} from '@glimmer/interfaces';

import { buildCapabilities } from '../util/capabilities';

type FnArgs<Args extends Arguments = Arguments> =
  | [...Args['positional'], Args['named']]
  | [...Args['positional']];

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

  getValue({ fn, args }: State): unknown {
    if (Object.keys(args.named).length > 0) {
      let argsForFn: FnArgs<Arguments> = [...args.positional, args.named];

      return fn(...argsForFn);
    }

    return fn(...args.positional);
  }

  getDebugName(fn: AnyFunction): string {
    if (fn.name) {
      return `(helper function ${fn.name})`;
    }

    return '(anonymous helper function)';
  }
}
