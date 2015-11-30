import { HasGuid, installGuid } from './guid';

export interface Dict<T> {
  [index: string]: T;
}

export interface Set<T> {
  add(value: T): Set<T>;
  delete(value: T);
  forEach(callback: (T) => void);
}

export function dict<T>(): Dict<T> {
  let d = Object.create(null);
  d.x = 1;
  delete d.x;
  return d;
}

export class DictSet<T extends HasGuid> implements Set<T> {
  private dict: Dict<T>;

  constructor() {
    this.dict = dict<T>();
  }

  add(obj: T): Set<T> {
    this.dict[installGuid(obj)] = obj;
    return this;
  }

  delete(obj: T) {
    if (obj._guid) delete this.dict[obj._guid];
  }

  forEach(callback: (T) => void) {
    let { dict } = this;
    Object.keys(dict).forEach(key => callback(dict[key]));
  }
}

export class Stack<T> {
  private stack: T[] = [];
  public current: T = null;

  push(item: T) {
    this.current = item;
    this.stack.push(item);
  }

  pop(): T {
    let item = this.stack.pop();
    let len = this.stack.length;
    this.current = len === 0 ? null : this.stack[len - 1];

    return item;
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }
}
