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

import type { AnyFn } from '@ember/-internals/utility-types';

// Partial types from https://medium.com/codex/currying-in-typescript-ca5226c85b85

type PartialParams<P extends any[]> = P extends [infer First, ...infer Rest]
  ? [] | [First] | [First, ...PartialParams<Rest>]
  : // This is necessary to handle optional tuple values
    Required<P> extends [infer First, ...infer Rest]
    ? [] | [First | undefined] | [First | undefined, ...PartialParams<Partial<Rest>>]
    : [];

type RemainingParams<PartialParams extends any[], All extends any[]> = PartialParams extends [
  infer First,
  ...infer Rest,
]
  ? All extends [infer AllFirst, ...infer AllRest]
    ? First extends AllFirst
      ? RemainingParams<Rest, AllRest>
      : never
    : // This is necessary to handle optional tuple values
      Required<All> extends [infer AllFirst, ...infer AllRest]
      ? First extends AllFirst | undefined
        ? Partial<RemainingParams<Rest, AllRest>>
        : never
      : never
  : PartialParams extends []
    ? All
    : never;

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
export function run<F extends () => any>(method: F): ReturnType<F>;
export function run<F extends AnyFn>(method: F, ...args: Parameters<F>): ReturnType<F>;
export function run<T, F extends (this: T, ...args: any[]) => any>(
  target: T,
  method: F,
  ...args: Parameters<F>
): ReturnType<F>;
export function run<T, U extends keyof T>(
  target: T,
  method: U,
  ...args: T[U] extends AnyFn ? Parameters<T[U]> : []
): T[U] extends AnyFn ? ReturnType<T[U]> : unknown;
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
export function join<F extends AnyFn>(method: F, ...args: Parameters<F>): ReturnType<F> | void;
export function join<T, F extends (this: T, ...args: any[]) => any>(
  target: T,
  method: F,
  ...args: Parameters<F>
): ReturnType<F> | void;
export function join<T, U extends keyof T>(
  target: T,
  method: U,
  ...args: T[U] extends AnyFn ? Parameters<T[U]> : []
): T[U] extends AnyFn ? ReturnType<T[U]> | void : void;
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
export function bind<
  T,
  F extends (this: T, ...args: any[]) => any,
  A extends PartialParams<Parameters<F>>,
>(
  target: T,
  method: F,
  ...args: A
): (...args: RemainingParams<A, Parameters<F>>) => ReturnType<F> | void;
export function bind<F extends AnyFn, A extends PartialParams<Parameters<F>>>(
  method: F,
  ...args: A
): (...args: RemainingParams<A, Parameters<F>>) => ReturnType<F> | void;
export function bind<
  T,
  U extends keyof T,
  A extends T[U] extends AnyFn ? PartialParams<Parameters<T[U]>> : [],
>(
  target: T,
  method: U,
  ...args: A
): T[U] extends AnyFn
  ? (...args: RemainingParams<A, Parameters<T[U]>>) => ReturnType<T[U]> | void
  : never;
// This final fallback is the equivalent of the (quite unsafe!) type for `bind`
// from TS' defs for `Function.prototype.bind`. In general, it means we have a
// loss of safety if we do not
export function bind<T, M extends keyof T & PropertyKey>(
  target: T,
  methodName: M,
  ...args: any[]
): (...args: any[]) => unknown;
export function bind(...curried: unknown[]): AnyFn {
  return (...invocation: unknown[]) => invoke(resolveInvocation(curried.concat(invocation)));
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
export function schedule<F extends AnyFn>(
  queueName: string,
  method: F,
  ...args: Parameters<F>
): Timer;
export function schedule<T, F extends (this: T, ...args: any[]) => any>(
  queueName: string,
  target: T,
  method: F,
  ...args: Parameters<F>
): Timer;
export function schedule<T, U extends keyof T>(
  queueName: string,
  target: T,
  method: U,
  ...args: T[U] extends AnyFn ? Parameters<T[U]> : []
): Timer;
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
export function scheduleOnce<F extends AnyFn>(
  queueName: string,
  method: F,
  ...args: Parameters<F>
): Timer;
export function scheduleOnce<T, F extends (this: T, ...args: any[]) => any>(
  queueName: string,
  target: T,
  method: F,
  ...args: Parameters<F>
): Timer;
export function scheduleOnce<T, U extends keyof T>(
  queueName: string,
  target: T,
  method: U,
  ...args: T[U] extends AnyFn ? Parameters<T[U]> : []
): Timer;
export function scheduleOnce(_queue: string, ...args: unknown[]): Timer {
  return scheduleOnceInvocation(resolveInvocation(args));
}

function scheduleOnceInvocation(invocation: TargetAndMethod): Timer {
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
export function once<F extends AnyFn>(method: F, ...args: Parameters<F>): Timer;
export function once<T, F extends (this: T, ...args: any[]) => any>(
  target: T,
  method: F,
  ...args: Parameters<F>
): Timer;
export function once<T, U extends keyof T>(
  target: T,
  method: U,
  ...args: T[U] extends AnyFn ? Parameters<T[U]> : []
): Timer;
export function once(...args: unknown[]): Timer {
  return scheduleOnceInvocation(resolveInvocation(args));
}

/**
  Runs the passed function in the next task.

  @method next
  @for @ember/runloop
  @static
  @public
*/
export function next<F extends AnyFn>(method: F, ...args: Parameters<F>): Timer;
export function next<T, F extends (this: T, ...args: any[]) => any>(
  target: T,
  method: F,
  ...args: Parameters<F>
): Timer;
export function next<T, U extends keyof T>(
  target: T,
  method: U,
  ...args: T[U] extends AnyFn ? Parameters<T[U]> : []
): Timer;
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
export function later<T, F extends (this: T, ...args: any[]) => any>(
  target: T,
  method: F,
  ...args: [...args: Parameters<F>, wait: string | number]
): Timer;
export function later<F extends AnyFn>(
  method: F,
  ...args: [...args: Parameters<F>, wait: string | number]
): Timer;
export function later<T, U extends keyof T>(
  target: T,
  method: U,
  ...args: [...args: T[U] extends AnyFn ? Parameters<T[U]> : [], wait: string | number]
): Timer;
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
export function debounce<F extends AnyFn>(
  method: F,
  ...args: [...args: Parameters<F>, wait: string | number, immediate?: boolean]
): Timer;
export function debounce<T, F extends (this: T, ...args: any[]) => any>(
  target: T,
  method: F,
  ...args: [...args: Parameters<F>, wait: string | number, immediate?: boolean]
): Timer;
export function debounce<T, U extends keyof T>(
  target: T,
  method: U,
  ...args: [
    ...args: T[U] extends AnyFn ? Parameters<T[U]> : [],
    wait: string | number,
    immediate?: boolean,
  ]
): Timer;
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
export function throttle<F extends AnyFn>(
  method: F,
  ...args: [...args: Parameters<F>, wait?: string | number, immediate?: boolean]
): Timer;
export function throttle<T, F extends (this: T, ...args: any[]) => any>(
  target: T,
  method: F,
  ...args: [...args: Parameters<F>, wait?: string | number, immediate?: boolean]
): Timer;
export function throttle<T, U extends keyof T>(
  target: T,
  method: U,
  ...args: [
    ...args: T[U] extends AnyFn ? Parameters<T[U]> : [],
    wait?: string | number,
    immediate?: boolean,
  ]
): Timer;
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

// There is deliberately no `_backburner` export: backburner is gone,
// not stubbed. Test infrastructure that imported it to ask "is work
// pending?" should use `isRenderPending` from '@ember/renderer'.
