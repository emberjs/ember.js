import { HasGuid, ensureGuid } from './guid';
import { InternedString } from './platform-utils';

export interface Dict<T> {
  [index: string]: T;
}

export interface DictWithNumberKeys<T> {
  [index: number]: T;
}

export interface Set<T> {
  add(value: T): Set<T>;
  delete(value: T);
  forEach(callback: (T) => void);
}

let proto = Object.create(null, {
  // without this, we will always still end up with (new
  // EmptyObject()).constructor === Object
  constructor: {
    value: undefined,
    enumerable: false,
    writable: true
  }
});

function EmptyObject() {}
EmptyObject.prototype = proto;

export function dict<T>(): Dict<T> {
  // let d = Object.create(null);
  // d.x = 1;
  // delete d.x;
  // return d;
  return new EmptyObject();
}

export type SetMember = HasGuid | InternedString | string;

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

  forEach(callback: (T) => void) {
    let { dict } = this;
    Object.keys(dict).forEach(key => callback(dict[key]));
  }

  toArray(): InternedString[] {
    return Object.keys(this.dict) as InternedString[];
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
