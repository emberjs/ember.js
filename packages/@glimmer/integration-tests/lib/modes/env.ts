import { EnvironmentDelegate } from '@glimmer/runtime';
import { Destroyable, Destructor, Dict, Option } from '@glimmer/interfaces';
import { IteratorDelegate } from '@glimmer/reference';
import setGlobalContext from '@glimmer/global-context';
import { consumeTag, tagFor, dirtyTagFor } from '@glimmer/validator';

let scheduledDestroyables: Destroyable[] = [];
let scheduledDestructors: Destructor<any>[] = [];
let scheduledFinishDestruction: (() => void)[] = [];

setGlobalContext({
  scheduleRevalidate() {},

  scheduleDestroy<T extends Destroyable>(destroyable: T, destructor: Destructor<T>) {
    scheduledDestroyables.push(destroyable);
    scheduledDestructors.push(destructor);
  },

  scheduleDestroyed(fn: () => void) {
    scheduledFinishDestruction.push(fn);
  },

  toBool(value) {
    return Boolean(value);
  },

  toIterator(value: any): Option<IteratorDelegate> {
    if (value && value[Symbol.iterator]) {
      return NativeIteratorDelegate.from(value);
    }

    return null;
  },

  getProp(obj: unknown, key: string): unknown {
    if (typeof obj === 'object' && obj !== null) {
      consumeTag(tagFor(obj as object, key));
    }

    return (obj as Dict)[key];
  },

  setProp(obj: unknown, key: string, value: unknown): unknown {
    if (typeof obj === 'object' && obj !== null) {
      dirtyTagFor(obj as object, key);
    }

    return ((obj as Dict)[key] = value);
  },

  getPath(obj: unknown, key: string): unknown {
    if (typeof obj === 'object' && obj !== null) {
      consumeTag(tagFor(obj as object, key));
    }

    return (obj as Dict)[key];
  },

  warnIfStyleNotTrusted() {},
});

export class NativeIteratorDelegate<T = unknown> implements IteratorDelegate {
  static from<T>(iterable: Iterable<T>) {
    let iterator = iterable[Symbol.iterator]();
    let result = iterator.next();
    let { done } = result;

    if (done) {
      return null;
    } else {
      return new this(iterator, result);
    }
  }

  private position = 0;

  constructor(private iterable: Iterator<T>, private result: IteratorResult<T>) {}

  isEmpty(): false {
    return false;
  }

  next() {
    let { iterable, result } = this;

    let { value, done } = result;

    if (done === true) {
      return null;
    }

    let memo = this.position++;
    this.result = iterable.next();

    return { value, memo };
  }
}

export const BaseEnv: EnvironmentDelegate = {
  isInteractive: true,

  extra: undefined,

  onTransactionBegin() {},

  onTransactionCommit() {
    for (let i = 0; i < scheduledDestroyables.length; i++) {
      scheduledDestructors[i](scheduledDestroyables[i]);
    }

    scheduledFinishDestruction.forEach((fn) => fn());

    scheduledDestroyables = [];
    scheduledDestructors = [];
    scheduledFinishDestruction = [];
  },
};
