import type {
  Arguments as HelperArguments,
  CapturedArguments as Arguments,
  HelperCapabilities,
  HelperManagerWithValue,
} from '@glimmer/interfaces';

import { buildCapabilities } from '../util/capabilities';

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

  getValue({ fn, args }: State): unknown {
    return invokeFunctionHelper(fn, args);
  }

  getDebugName(fn: AnyFunction): string {
    if (fn.name) {
      return `(helper function ${fn.name})`;
    }

    return '(anonymous helper function)';
  }
}

/**
 * Call a plain function as a helper. `thisArg` is applied at the call itself
 * (not by producing a `.bind()`ed copy of `fn`), so the original function
 * keeps its identity everywhere it is passed around as a reference.
 */
export function invokeFunctionHelper(
  fn: AnyFunction,
  args: HelperArguments,
  thisArg?: unknown
): unknown {
  if (Object.keys(args.named).length > 0) {
    return fn.apply(thisArg, [...args.positional, args.named]);
  }

  return fn.apply(thisArg, [...args.positional]);
}
