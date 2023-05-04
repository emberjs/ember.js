import setGlobalContext from '@glimmer/global-context';
import { Destroyable, Destructor, RenderResult } from '@glimmer/interfaces';
import { EnvironmentDelegate } from '@glimmer/runtime';

type Queue = (() => void)[];

const scheduledDestructors: Queue = [];
const scheduledFinalizers: Queue = [];

function flush(queue: Queue) {
  for (const fn of queue) fn();
  queue.length = 0;
}

let result: RenderResult;
let resolveRender: () => void;

export function registerResult(_result: RenderResult, _resolveRender: () => void) {
  result = _result;
  resolveRender = _resolveRender;
}

let revalidateScheduled = false;

setGlobalContext({
  scheduleRevalidate() {
    if (!revalidateScheduled) {
      Promise.resolve().then(() => {
        const { env } = result;
        env.begin();
        result.rerender();
        revalidateScheduled = false;
        env.commit();
        // only resolve if commit didn't dirty again
        if (!revalidateScheduled && resolveRender !== undefined) {
          resolveRender();
        }
      });
    }
  },

  getProp(obj: unknown, prop: string) {
    return (obj as Record<string, unknown>)[prop];
  },

  setProp(obj: unknown, prop: string, value: unknown) {
    (obj as Record<string, unknown>)[prop] = value;
  },

  getPath(obj: unknown, path: string) {
    let parts = path.split('.');

    let current: unknown = obj;

    for (let part of parts) {
      if (typeof current === 'function' || (typeof current === 'object' && current !== null)) {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  },

  setPath(obj: unknown, path: string, value: unknown) {
    let parts = path.split('.');

    let current: unknown = obj;
    let pathToSet = parts.pop()!;

    for (let part of parts) {
      current = (current as Record<string, unknown>)[part];
    }

    (current as Record<string, unknown>)[pathToSet] = value;
  },

  toBool(value) {
    return Boolean(value);
  },

  toIterator() {
    return null;
  },

  warnIfStyleNotTrusted() {},

  scheduleDestroy<T extends Destroyable>(destroyable: T, destructor: Destructor<T>) {
    scheduledDestructors.push(() => destructor(destroyable));
  },

  scheduleDestroyed(fn: () => void) {
    scheduledFinalizers.push(fn);
  },

  assert(test: unknown, msg: string) {
    if (!test) {
      throw new Error(msg);
    }
  },

  deprecate(msg: string, test: unknown) {
    if (!test) {
      // eslint-disable-next-line no-console
      console.warn(msg);
    }
  },
});

export default function createEnvDelegate(isInteractive: boolean): EnvironmentDelegate {
  return {
    isInteractive,
    enableDebugTooling: false,
    onTransactionCommit() {
      flush(scheduledDestructors);
      flush(scheduledFinalizers);
    },
  };
}
