import type { IteratorDelegate } from '@glimmer/reference/lib/iterable';
import type { Tag } from '@glimmer/interfaces';
import { consumeTag, isTracking } from '@glimmer/validator/lib/tracking';
import { dirtyTagFor, tagFor } from '@glimmer/validator/lib/meta';
import { isHTMLSafe } from './utils/string';

/**
 * The hooks the rendering environment needs from the rest of Ember.
 *
 * The defaults here cover plain objects, native arrays, and native
 * iterables, and they schedule work on the microtask queue. The modules
 * that own richer behavior register their versions when an app imports
 * them: `@ember/-internals/metal` for `get` and `set`, `@ember/array` for
 * Ember arrays, the proxy mixin for proxies, and `@ember/runloop` for
 * backburner. An app that imports none of them ships none of them.
 */
export interface EnvironmentHooks {
  getProp(obj: object, key: string): unknown;
  setProp(obj: object, key: string, value: unknown): unknown;
  getPath(obj: object, path: string): unknown;
  setPath(obj: object, path: string, value: unknown): unknown;
  tagForProperty(obj: object, key: string): Tag;
  isEmberArray(value: unknown): boolean;
  objectAt(array: object, index: number): unknown;
  isProxy(value: unknown): boolean;
  /**
   * A chance to iterate a value the default iterator does not know, such
   * as an `EmberArray`. `undefined` means "not mine"; `null` means "not
   * iterable".
   */
  toIteratorExtension(value: unknown): IteratorDelegate | null | undefined;
}

export interface RunloopHooks {
  ensureInstance(): void;
  hasCurrentRunLoop(): boolean;
  join(fn: () => void): void;
  scheduleActions(fn: () => void): void;
  scheduleDestroy(fn: () => void): void;
  scheduleOnceRender(target: object, method: (this: any, arg: any) => void, arg: unknown): void;
  on(event: 'begin' | 'end', fn: () => void): void;
}

function defaultGetProp(obj: object, key: string): unknown {
  let value = (obj as Record<string, unknown>)[key];

  if (isTracking()) {
    consumeTag(tagFor(obj, key));

    if (Array.isArray(value)) {
      consumeTag(tagFor(value, '[]'));
    }
  }

  return value;
}

function defaultSetProp(obj: object, key: string, value: unknown): unknown {
  (obj as Record<string, unknown>)[key] = value;
  dirtyTagFor(obj, key);
  return value;
}

function defaultGetPath(obj: object, path: string): unknown {
  let current: unknown = obj;

  for (let part of path.split('.')) {
    if (current === null || current === undefined) {
      return undefined;
    }

    current = hooks.getProp(current as object, part);
  }

  return current;
}

function defaultSetPath(obj: object, path: string, value: unknown): unknown {
  let parts = path.split('.');
  let last = parts.pop() as string;
  let target = parts.length === 0 ? obj : hooks.getPath(obj, parts.join('.'));

  if (target === null || target === undefined) {
    throw new Error(`Cannot set '${path}': the object at '${parts.join('.')}' is ${target}`);
  }

  return hooks.setProp(target as object, last, value);
}

export const hooks: EnvironmentHooks = {
  getProp: defaultGetProp,
  setProp: defaultSetProp,
  getPath: defaultGetPath,
  setPath: defaultSetPath,
  tagForProperty: (obj, key) => tagFor(obj, key),
  isEmberArray: () => false,
  objectAt: (array, index) => (array as unknown[])[index],
  isProxy: () => false,
  toIteratorExtension: () => undefined,
};

export function registerEnvironmentHooks(overrides: Partial<EnvironmentHooks>): void {
  Object.assign(hooks, overrides);
}

type Queue = Array<() => void>;

interface OnceEntry {
  target: unknown;
  method: (arg: unknown) => void;
  arg: unknown;
}

/**
 * A run loop with the three queues the renderer uses, flushed on a
 * microtask. `@ember/runloop` replaces it with backburner.
 */
class MicrotaskLoop implements RunloopHooks {
  listeners: { begin: Queue; end: Queue } = { begin: [], end: [] };

  private actions: Queue = [];
  private render: OnceEntry[] = [];
  private destroy: Queue = [];
  private scheduled = false;
  private inLoop = false;

  ensureInstance(): void {
    this.schedule();
  }

  hasCurrentRunLoop(): boolean {
    return this.inLoop;
  }

  join(fn: () => void): void {
    if (this.inLoop) {
      fn();
    } else {
      this.run(fn);
    }
  }

  scheduleActions(fn: () => void): void {
    this.actions.push(fn);
    this.schedule();
  }

  scheduleDestroy(fn: () => void): void {
    this.destroy.push(fn);
    this.schedule();
  }

  scheduleOnceRender(target: object, method: (this: any, arg: any) => void, arg: unknown): void {
    let existing = this.render.find((entry) => entry.target === target && entry.method === method);

    if (existing) {
      existing.arg = arg;
    } else {
      this.render.push({ target, method, arg });
    }

    this.schedule();
  }

  on(event: 'begin' | 'end', fn: () => void): void {
    this.listeners[event].push(fn);
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      if (!this.inLoop) {
        this.run(() => {});
      }
    });
  }

  private run(fn: () => void): void {
    this.inLoop = true;

    try {
      for (let listener of this.listeners.begin) listener();
      fn();
      this.drain(this.actions);
      this.drainRender();
      this.drain(this.destroy);
    } finally {
      this.inLoop = false;
    }

    for (let listener of this.listeners.end) listener();

    if (this.actions.length || this.render.length || this.destroy.length) {
      this.schedule();
    }
  }

  private drain(queue: Queue): void {
    while (queue.length) {
      let fn = queue.shift() as () => void;
      fn();
    }
  }

  private drainRender(): void {
    while (this.render.length) {
      let { target, method, arg } = this.render.shift() as OnceEntry;
      method.call(target, arg);
    }
  }
}

const microtaskLoop = new MicrotaskLoop();

export let runloop: RunloopHooks = microtaskLoop;

/**
 * Replaces the microtask loop. Listeners already attached to the default
 * loop move to the new one, so import order between `@ember/runloop` and
 * the renderer does not matter.
 */
export function registerRunloop(impl: RunloopHooks): void {
  for (let event of ['begin', 'end'] as const) {
    for (let listener of microtaskLoop.listeners[event]) {
      impl.on(event, listener);
    }
  }

  runloop = impl;
}

export function toBool(predicate: unknown): boolean {
  if (hooks.isProxy(predicate)) {
    consumeTag(hooks.tagForProperty(predicate as object, 'content'));

    return Boolean(hooks.getPath(predicate as object, 'isTruthy'));
  } else if (Array.isArray(predicate) || hooks.isEmberArray(predicate)) {
    consumeTag(hooks.tagForProperty(predicate as object, '[]'));

    return (predicate as { length: number }).length !== 0;
  } else if (isHTMLSafe(predicate)) {
    return Boolean(predicate.toString());
  } else {
    return Boolean(predicate);
  }
}

export type { IteratorDelegate };
