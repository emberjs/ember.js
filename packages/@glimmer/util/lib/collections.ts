import { HasGuid, ensureGuid } from './guid';
import { Option } from './platform-utils';

export interface Dict<T> {
  [index: string]: T;
}

export interface Set<T> {
  add(value: T): Set<T>;
  delete(value: T): void;
}

export function dict<T>(): Dict<T> {
  return Object.create(null);
}

export type SetMember = HasGuid | string;

export class DictSet<T extends SetMember> implements Set<T> {
  private dict: Dict<T>;

  constructor() {
    this.dict = dict<T>();
  }

  add(obj: T): Set<T> {
    if (typeof obj === 'string') this.dict[<any>obj] = obj;
    else this.dict[ensureGuid(<any>obj)] = obj;
    return this;
  }

  delete(obj: T) {
    if (typeof obj === 'string') delete this.dict[<any>obj];
    else if ((obj as any)._guid) delete this.dict[(obj as any)._guid];
  }
}

export class Stack<T> {
  private stack: T[] = [];
  public current: Option<T> = null;

  public get size() {
    return this.stack.length;
  }

  push(item: T) {
    this.current = item;
    this.stack.push(item);
  }

  pop(): Option<T> {
    let item = this.stack.pop();
    let len = this.stack.length;
    this.current = len === 0 ? null : this.stack[len - 1];

    return item === undefined ? null : item;
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }
}
