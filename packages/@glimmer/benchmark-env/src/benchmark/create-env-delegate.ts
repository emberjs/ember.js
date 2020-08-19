import { EnvironmentDelegate } from '@glimmer/runtime';
import { Destroyable, Destructor, RenderResult } from '@glimmer/interfaces';
import setGlobalContext from '@glimmer/global-context';

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

  setProp(obj: unknown, prop: string, value) {
    (obj as Record<string, unknown>)[prop] = value;
  },

  getPath(obj: unknown, path: string) {
    return (obj as Record<string, unknown>)[path];
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
});

export default function createEnvDelegate(isInteractive: boolean): EnvironmentDelegate {
  return {
    isInteractive,
    extra: undefined,
    onTransactionBegin() {},
    onTransactionCommit() {
      flush(scheduledDestructors);
      flush(scheduledFinalizers);
    },
  };
}
