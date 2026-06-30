import type { Arguments, HelperCapabilities, HelperManagerWithValue } from '@glimmer/interfaces';

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
    // A plain function read off a path is invoked with the object it was read from
    // as `this` (provided lazily via `args.context`), matching the JavaScript
    // semantics of `obj.method()`. `this` is applied at the call itself, never by
    // producing a `.bind()`ed copy, so the function keeps its identity everywhere it
    // is passed around as a reference.
    if (Object.keys(args.named).length > 0) {
      return fn.apply(args.context, [...args.positional, args.named]);
    }

    return fn.apply(args.context, [...args.positional]);
  }

  getDebugName(fn: AnyFunction): string {
    if (fn.name) {
      return `(helper function ${fn.name})`;
    }

    return '(anonymous helper function)';
  }
}
