import { Dict, Set, HasGuid, installGuid } from 'htmlbars-util';
import { InternedString } from 'htmlbars-reference';

var GUID = 0;

export function guid(): number {
  return ++GUID;
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

export function intern(str: string): InternedString {
  var obj = {};
  obj[str] = 1;
  for (var key in obj) return <InternedString>key;
}

export function EMPTY_CACHE() {}
