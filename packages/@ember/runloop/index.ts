/**
  SPIKE (backburner removal): the run loop is gone. What remains here is
  a dependency-free compatibility surface so the module specifier keeps
  resolving: `run`/`join`/`bind` are plain calls, queues collapse to
  microtasks, and timers are native timers. Rendering is driven by
  `@ember/scheduler`; nothing in the framework schedules through this
  module anymore.

  @module @ember/runloop
  @public
*/

type AnyFn = (...args: unknown[]) => unknown;

export interface Timeout {
  kind: 'timeout';
  id: ReturnType<typeof setTimeout>;
}

export interface Microtask {
  kind: 'microtask';
  cancelled: boolean;
}

export type Timer = Timeout | Microtask;

interface TargetAndMethod {
  target: object | null;
  method: AnyFn;
  args: unknown[];
}

function resolveInvocation(args: unknown[]): TargetAndMethod {
  let target: object | null = null;
  let method: unknown = args[0];
  let rest = args.slice(1);

  if (typeof method !== 'function' && args.length > 1) {
    target = args[0] as object;
    method = args[1];
    rest = args.slice(2);

    if (typeof method === 'string') {
      method = (target as Record<string, unknown>)[method];
    }
  }

  return { target, method: method as AnyFn, args: rest };
}

function invoke({ target, method, args }: TargetAndMethod): unknown {
  return method.apply(target, args);
}

/**
  Runs the passed function immediately. With no run loop, this is a
  plain call.

  @method run
  @for @ember/runloop
  @static
  @public
*/
export function run(...args: unknown[]): unknown {
  return invoke(resolveInvocation(args));
}

/**
  Runs the passed function immediately, joining any conceptual ongoing
  work. With no run loop, this is a plain call.

  @method join
  @for @ember/runloop
  @static
  @public
*/
export function join(...args: unknown[]): unknown {
  return invoke(resolveInvocation(args));
}

/**
  Returns a function bound to the given target and arguments. With no
  run loop there is nothing to wrap; this is `Function#bind` with
  string-method resolution.

  @method bind
  @for @ember/runloop
  @static
  @public
*/
export function bind(...curried: unknown[]): AnyFn {
  return (...invocation: unknown[]) => run(...curried, ...invocation);
}

/**
  Begins a run loop. With no run loop, this is a no-op.

  @method begin
  @for @ember/runloop
  @static
  @public
*/
export function begin(): void {}

/**
  Ends a run loop. With no run loop, this is a no-op.

  @method end
  @for @ember/runloop
  @static
  @public
*/
export function end(): void {}

function scheduleInvocation(invocation: TargetAndMethod): Microtask {
  const token: Microtask = { kind: 'microtask', cancelled: false };

  queueMicrotask(() => {
    if (!token.cancelled) {
      invoke(invocation);
    }
  });

  return token;
}

/**
  Schedules work onto a queue. Queues collapse to the microtask queue:
  work runs after the current synchronous execution, in scheduling
  order.

  @method schedule
  @for @ember/runloop
  @static
  @public
*/
export function schedule(_queue: string, ...args: unknown[]): Timer {
  return scheduleInvocation(resolveInvocation(args));
}

const ONCE_KEYS = new WeakMap<object, Set<unknown>>();
const ONCE_ANONYMOUS: object = {};

/**
  Schedules work onto a queue, coalescing repeat requests for the same
  target and method until the scheduled microtask runs.

  @method scheduleOnce
  @for @ember/runloop
  @static
  @public
*/
export function scheduleOnce(_queue: string, ...args: unknown[]): Timer {
  const invocation = resolveInvocation(args);
  const dedupeTarget = invocation.target ?? ONCE_ANONYMOUS;

  let keys = ONCE_KEYS.get(dedupeTarget);

  if (keys === undefined) {
    keys = new Set();
    ONCE_KEYS.set(dedupeTarget, keys);
  }

  const token: Microtask = { kind: 'microtask', cancelled: false };

  if (keys.has(invocation.method)) {
    return token;
  }

  keys.add(invocation.method);

  queueMicrotask(() => {
    keys.delete(invocation.method);

    if (!token.cancelled) {
      invoke(invocation);
    }
  });

  return token;
}

/**
  Schedules work to run once, coalescing repeat requests for the same
  target and method.

  @method once
  @for @ember/runloop
  @static
  @public
*/
export function once(...args: unknown[]): Timer {
  return scheduleOnce('actions', ...args);
}

/**
  Runs the passed function in the next task.

  @method next
  @for @ember/runloop
  @static
  @public
*/
export function next(...args: unknown[]): Timer {
  const invocation = resolveInvocation(args);

  return { kind: 'timeout', id: setTimeout(() => invoke(invocation), 0) };
}

/**
  Runs the passed function after the given number of milliseconds.

  @method later
  @for @ember/runloop
  @static
  @public
*/
export function later(...args: unknown[]): Timer {
  let wait = 0;

  if (typeof args[args.length - 1] === 'number') {
    wait = args.pop() as number;
  }

  const invocation = resolveInvocation(args);

  return { kind: 'timeout', id: setTimeout(() => invoke(invocation), wait) };
}

const DEBOUNCED = new WeakMap<object, Map<unknown, ReturnType<typeof setTimeout>>>();
const DEBOUNCE_ANONYMOUS: object = {};

/**
  Debounces the passed function by the given number of milliseconds.

  @method debounce
  @for @ember/runloop
  @static
  @public
*/
export function debounce(...args: unknown[]): Timer {
  let immediate = false;

  if (typeof args[args.length - 1] === 'boolean') {
    immediate = args.pop() as boolean;
  }

  let wait = 0;

  if (typeof args[args.length - 1] === 'number') {
    wait = args.pop() as number;
  }

  const invocation = resolveInvocation(args);
  const dedupeTarget = invocation.target ?? DEBOUNCE_ANONYMOUS;

  let timers = DEBOUNCED.get(dedupeTarget);

  if (timers === undefined) {
    timers = new Map();
    DEBOUNCED.set(dedupeTarget, timers);
  }

  const existing = timers.get(invocation.method);
  const isPending = existing !== undefined;

  if (existing !== undefined) {
    clearTimeout(existing);
  }

  if (immediate && !isPending) {
    invoke(invocation);
  }

  const id = setTimeout(() => {
    timers.delete(invocation.method);

    if (!immediate) {
      invoke(invocation);
    }
  }, wait);

  timers.set(invocation.method, id);

  return { kind: 'timeout', id };
}

/**
  Throttles the passed function to at most once per the given number of
  milliseconds.

  @method throttle
  @for @ember/runloop
  @static
  @public
*/
export function throttle(...args: unknown[]): Timer {
  let immediate = true;

  if (typeof args[args.length - 1] === 'boolean') {
    immediate = args.pop() as boolean;
  }

  let wait = 0;

  if (typeof args[args.length - 1] === 'number') {
    wait = args.pop() as number;
  }

  const invocation = resolveInvocation(args);
  const dedupeTarget = invocation.target ?? DEBOUNCE_ANONYMOUS;

  let timers = DEBOUNCED.get(dedupeTarget);

  if (timers === undefined) {
    timers = new Map();
    DEBOUNCED.set(dedupeTarget, timers);
  }

  if (timers.has(invocation.method)) {
    return { kind: 'microtask', cancelled: true };
  }

  if (immediate) {
    invoke(invocation);
  }

  const id = setTimeout(() => {
    timers.delete(invocation.method);

    if (!immediate) {
      invoke(invocation);
    }
  }, wait);

  timers.set(invocation.method, id);

  return { kind: 'timeout', id };
}

/**
  Cancels a timer returned from `later`, `next`, `once`, `schedule`,
  `scheduleOnce`, `debounce`, or `throttle`.

  @method cancel
  @for @ember/runloop
  @static
  @public
*/
export function cancel(timer?: Timer): boolean {
  if (timer === undefined) {
    return false;
  }

  if (timer.kind === 'timeout') {
    clearTimeout(timer.id);
    return true;
  }

  timer.cancelled = true;
  return true;
}

// With no run loop there is never a current one, scheduled timers are
// native and unobservable, and there is nothing to flush or cancel in
// bulk. These remain only so test infrastructure keeps resolving.

export function _getCurrentRunLoop(): null {
  return null;
}

export function _hasScheduledTimers(): boolean {
  return false;
}

export function _cancelTimers(): void {}

// `@ember/test-helpers` and `ember-qunit` import this to toggle debug
// mode and ask whether work is pending; the answers are always "nothing
// is pending". `getDebugInfo` is intentionally absent: callers check
// for it before use and fall back to reporting no debug info.
export const _backburner = {
  DEBUG: false,
  currentInstance: null,
  hasTimers(): boolean {
    return false;
  },
};
