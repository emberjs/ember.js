import { onErrorTarget } from '@ember/-internals/error-handling';
import {
  render as renderPhase,
  layout as layoutPhase,
  next as nextPhase,
  registerStrategy,
  _getRegisteredStrategy,
} from '@ember/scheduler';
import defaultStrategy from '@ember/scheduler/strategy';
import type { AnyFn } from '@ember/-internals/utility-types';

/**
 * The scheduler-backed runloop, active when the `use-async-scheduler`
 * optional feature (`EmberENV._USE_ASYNC_SCHEDULER`) is enabled.
 *
 * Implements the transition semantics from RFC 0957's migration roadmap:
 * `run`/`join` execute their callback directly, `schedule('render')` and
 * `schedule('afterRender')` map onto the scheduler's render and layout
 * phases, every other queue becomes a microtask, `next` maps onto the
 * scheduler's next phase, and the timer methods (`later`, `debounce`,
 * `throttle`) are backed by `setTimeout` rather than backburner's timer
 * heap.
 *
 * Backburner is not used at all on this path.
 */

export interface SchedulerTimer {
  cancelled: boolean;
  finished: boolean;
  cleanup?: () => void;
}

export function isSchedulerTimer(timer: unknown): timer is SchedulerTimer {
  return timer !== null && typeof timer === 'object' && 'cancelled' in timer && 'finished' in timer;
}

function ensureStrategy(): void {
  if (_getRegisteredStrategy() === null) {
    registerStrategy(defaultStrategy);
  }
}

type Target = object | null | undefined;
type Method = AnyFn | string;

interface ParsedArgs {
  target: Target;
  method: Method;
  args: unknown[];
}

// Mirrors backburner's argument parsing: `(method)`, `(method, ...args)`,
// `(target, method, ...args)`, where `method` may be the name of a method
// on `target`.
function parseArgs(args: unknown[]): ParsedArgs {
  if (args.length === 1) {
    return { target: null, method: args[0] as Method, args: [] };
  }

  let [first, second, ...rest] = args;
  if (
    typeof second === 'function' ||
    (typeof second === 'string' && first !== null && typeof first === 'object' && second in first)
  ) {
    return { target: first as Target, method: second as Method, args: rest };
  }

  return { target: null, method: first as Method, args: args.slice(1) };
}

function resolveMethod(target: Target, method: Method): AnyFn {
  if (typeof method === 'string') {
    return (target as Record<string, AnyFn>)[method] as AnyFn;
  }
  return method;
}

function invokeWithOnError(target: Target, method: Method, args: unknown[]): unknown {
  let fn = resolveMethod(target, method);
  let onError = onErrorTarget.onerror;
  if (onError) {
    try {
      return fn.apply(target, args);
    } catch (error) {
      onError(error);
      return;
    }
  }
  return fn.apply(target, args);
}

let pendingCount = 0;
let pendingTimerCount = 0;

const activeTimers = new Set<SchedulerTimer>();

function makeTimer(): SchedulerTimer {
  pendingCount++;
  return { cancelled: false, finished: false };
}

function finish(timer: SchedulerTimer): void {
  if (!timer.finished) {
    timer.finished = true;
    pendingCount--;
  }
}

export function run(...args: unknown[]): unknown {
  let { target, method, args: methodArgs } = parseArgs(args);
  return invokeWithOnError(target, method, methodArgs);
}

// With no runloop there is nothing to join; execute directly.
export const join = run;

// Deduplication bookkeeping for scheduleOnce: queue -> target -> method.
// The method key is the raw string or function so `scheduleOnce('render',
// obj, 'update')` and `scheduleOnce('render', obj, obj.update)` behave the
// same way they do under backburner.
const NULL_TARGET = Symbol('null-target');
interface OnceEntry {
  timer: SchedulerTimer;
  args: unknown[];
}
const onceMap = new Map<string, Map<object | symbol, Map<Method, OnceEntry>>>();

function phaseFor(queue: string): (() => Promise<void>) | null {
  if (queue === 'render') return renderPhase;
  if (queue === 'afterRender') return layoutPhase;
  return null;
}

function scheduleInvoke(queue: string, callback: () => void): void {
  ensureStrategy();
  let phase = phaseFor(queue);
  if (phase) {
    void phase().then(callback);
  } else {
    // RFC 0957: `schedule('actions', doWork)` becomes
    // `Promise.resolve().then(doWork)`.
    void Promise.resolve().then(callback);
  }
}

export function schedule(queue: string, ...rest: unknown[]): SchedulerTimer {
  let { target, method, args } = parseArgs(rest);
  let timer = makeTimer();

  scheduleInvoke(queue, () => {
    if (timer.cancelled) return;
    finish(timer);
    invokeWithOnError(target, method, args);
  });

  return timer;
}

export function scheduleOnce(queue: string, ...rest: unknown[]): SchedulerTimer {
  let { target, method, args } = parseArgs(rest);

  let targetKey = target ?? NULL_TARGET;
  let byTarget = onceMap.get(queue);
  if (byTarget === undefined) {
    byTarget = new Map();
    onceMap.set(queue, byTarget);
  }
  let byMethod = byTarget.get(targetKey);
  if (byMethod === undefined) {
    byMethod = new Map();
    byTarget.set(targetKey, byMethod);
  }

  let existing = byMethod.get(method);
  if (existing !== undefined && !existing.timer.cancelled) {
    // Same queue/target/method: new arguments replace the previous call.
    existing.args = args;
    return existing.timer;
  }

  let timer = makeTimer();
  let entry: OnceEntry = { timer, args };
  byMethod.set(method, entry);
  timer.cleanup = () => byMethod.delete(method);

  scheduleInvoke(queue, () => {
    if (timer.cancelled) return;
    finish(timer);
    byMethod.delete(method);
    invokeWithOnError(target, method, entry.args);
  });

  return timer;
}

export function next(...args: unknown[]): SchedulerTimer {
  let { target, method, args: methodArgs } = parseArgs(args);
  let timer = makeTimer();

  ensureStrategy();
  void nextPhase().then(() => {
    if (timer.cancelled) return;
    finish(timer);
    invokeWithOnError(target, method, methodArgs);
  });

  return timer;
}

function isCoercableNumber(value: unknown): value is number | string {
  return typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
}

function popWait(args: unknown[], fallback: number): number {
  if (args.length > 0 && isCoercableNumber(args[args.length - 1])) {
    return Number(args.pop());
  }
  return fallback;
}

// Arms (or re-arms) `timer` to fire `fire` after `wait` ms. `onDone` runs
// exactly once per arming, whether the timer fires or is cancelled — it is
// where dedupe-map entries get removed.
function setTimer(
  timer: SchedulerTimer,
  wait: number,
  fire: () => void,
  onDone?: () => void
): void {
  pendingTimerCount++;
  activeTimers.add(timer);

  let id = setTimeout(() => {
    pendingTimerCount--;
    activeTimers.delete(timer);
    if (timer.cancelled) return;
    finish(timer);
    onDone?.();
    fire();
  }, wait);

  timer.cleanup = () => {
    clearTimeout(id);
    pendingTimerCount--;
    activeTimers.delete(timer);
    onDone?.();
  };
}

export function later(...args: unknown[]): SchedulerTimer {
  let wait = popWait(args, 0);
  let { target, method, args: methodArgs } = parseArgs(args);
  let timer = makeTimer();

  setTimer(timer, wait, () => invokeWithOnError(target, method, methodArgs));

  return timer;
}

interface DedupedTimerEntry {
  timer: SchedulerTimer;
  args: unknown[];
}

const debounceMap = new Map<object | symbol, Map<Method, DedupedTimerEntry>>();
const throttleMap = new Map<object | symbol, Map<Method, DedupedTimerEntry>>();

function dedupeEntries(
  map: Map<object | symbol, Map<Method, DedupedTimerEntry>>,
  target: Target
): Map<Method, DedupedTimerEntry> {
  let targetKey = target ?? NULL_TARGET;
  let byMethod = map.get(targetKey);
  if (byMethod === undefined) {
    byMethod = new Map();
    map.set(targetKey, byMethod);
  }
  return byMethod;
}

export function debounce(...args: unknown[]): SchedulerTimer {
  let immediate = false;
  if (typeof args[args.length - 1] === 'boolean') {
    immediate = args.pop() as boolean;
  }
  let wait = popWait(args, 0);
  let { target, method, args: methodArgs } = parseArgs(args);

  let byMethod = dedupeEntries(debounceMap, target);
  let entry = byMethod.get(method);

  if (entry === undefined) {
    entry = { timer: makeTimer(), args: methodArgs };
    if (immediate) {
      invokeWithOnError(target, method, methodArgs);
    }
  } else {
    // Restart the wait period; latest arguments win. Disarm the previous
    // timeout (this also removes the dedupe entry, re-added below).
    entry.args = methodArgs;
    entry.timer.cleanup?.();
  }

  let current = entry;
  byMethod.set(method, current);
  setTimer(
    current.timer,
    wait,
    () => {
      if (!immediate) invokeWithOnError(target, method, current.args);
    },
    () => byMethod.delete(method)
  );

  return current.timer;
}

export function throttle(...args: unknown[]): SchedulerTimer {
  let immediate = true;
  if (typeof args[args.length - 1] === 'boolean') {
    immediate = args.pop() as boolean;
  }
  let wait = popWait(args, 0);
  let { target, method, args: methodArgs } = parseArgs(args);

  let byMethod = dedupeEntries(throttleMap, target);
  let existing = byMethod.get(method);

  if (existing !== undefined) {
    // Within the spacing period: coalesce into the existing timer.
    existing.args = methodArgs;
    return existing.timer;
  }

  if (immediate) {
    invokeWithOnError(target, method, methodArgs);
  }

  let timer = makeTimer();
  let entry: DedupedTimerEntry = { timer, args: methodArgs };
  byMethod.set(method, entry);

  setTimer(
    timer,
    wait,
    () => {
      if (!immediate) invokeWithOnError(target, method, entry.args);
    },
    () => byMethod.delete(method)
  );

  return timer;
}

export function cancel(timer?: unknown): boolean {
  if (!isSchedulerTimer(timer) || timer.cancelled || timer.finished) {
    return false;
  }
  timer.cancelled = true;
  finish(timer);
  timer.cleanup?.();
  return true;
}

export function hasTimers(): boolean {
  return pendingTimerCount > 0;
}

export function cancelTimers(): void {
  for (let timer of Array.from(activeTimers)) {
    cancel(timer);
  }
}

// Whether any work (queue items, phases, or timers) is still pending.
// The settled()/test-waiter integration described by RFC 0957 hangs off of
// this.
export function _hasPendingWork(): boolean {
  return pendingCount > 0;
}
