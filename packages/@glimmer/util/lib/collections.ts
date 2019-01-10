import { HasGuid, ensureGuid } from './guid';
import { Option } from './platform-utils';
import { Dict } from '@glimmer/interfaces';

export interface Set<T> {
  add(value: T): Set<T>;
  delete(value: T): void;
}

export function dict<T = unknown>(): Dict<T> {
  return Object.create(null);
}

export function isDict<T>(u: T): u is Dict & T {
  return typeof u === 'object' && u !== null;
}

export function isObject<T>(u: T): u is object & T {
  return typeof u === 'object' && u !== null;
}

export type SetMember = HasGuid | string;

export class DictSet<T extends SetMember> implements Set<T> {
  private dict: Dict<T>;

  constructor() {
    this.dict = dict<T>();
  }

  add(obj: T): Set<T> {
    if (typeof obj === 'string') this.dict[obj as any] = obj;
    else this.dict[ensureGuid(obj as any)] = obj;
    return this;
  }

  delete(obj: T) {
    if (typeof obj === 'string') delete this.dict[obj as any];
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

  nth(from: number): Option<T> {
    let len = this.stack.length;
    return len < from ? null : this.stack[len - from];
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }

  toArray(): T[] {
    return this.stack;
  }
}
