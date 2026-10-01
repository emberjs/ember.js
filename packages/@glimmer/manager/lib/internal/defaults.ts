import type {
  CapturedArguments as Arguments,
  CapturedNamedArguments,
  CapturedPositionalArguments,
  Helper,
  HelperCapabilities,
  HelperManagerWithValue,
} from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/env';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';

import { CustomHelperManager } from '../public/helper';
import { namedArgsProxyFor } from '../util/args-proxy';
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
  }

  getDebugName(fn: AnyFunction): string {
    if (fn.name) {
      return `(helper function ${fn.name})`;
    }

    return '(anonymous helper function)';
  }
}

// Plain functions skip the args proxies: the function receives the values,
// so every positional argument is read on each call anyway.
export class FunctionHelperInternalManager extends CustomHelperManager {
  constructor() {
    super(() => new FunctionHelperManager());
  }

  override getHelper(fn: AnyFunction): Helper {
    return (capturedArgs) => {
      const { positional, named } = capturedArgs;
      const namedArg = hasNamedArgs(named) ? namedArgsProxyFor(named) : null;

      return createComputeRef(
        () => callFunctionHelper(fn, positional, namedArg),
        null,
        DEBUG && FunctionHelperManager.prototype.getDebugName(fn)
      );
    };
  }
}

function hasNamedArgs(named: CapturedNamedArguments): boolean {
  for (const _ in named) {
    return true;
  }

  return false;
}

function callFunctionHelper(
  fn: AnyFunction,
  positional: CapturedPositionalArguments,
  named: Record<string, unknown> | null
): unknown {
  const values: unknown[] = positional.map(valueForRef);

  if (named !== null) {
    values.push(named);
  }

  return fn(...values);
}
