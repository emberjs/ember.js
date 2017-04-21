import { UNDEFINED } from './meta';

export default class Cache {
  constructor(limit, func, key, store) {
    this.size   = 0;
    this.misses = 0;
    this.hits   = 0;
    this.limit  = limit;
    this.func   = func;
    this.key    = key;
    this.store  = store || new DefaultStore();
  }

  get(obj) {
    let key = this.key === undefined ? obj : this.key(obj);
    let value = this.store.get(key);
    if (value === undefined) {
      this.misses ++;
      value = this._set(key, this.func(obj));
    } else if (value === UNDEFINED) {
      this.hits ++;
      value = undefined;
    } else {
      this.hits ++;
      // nothing to translate
    }

    return value;
  }

  set(obj, value) {
    let key = this.key === undefined ? obj : this.key(obj);
    return this._set(key, value);
  }

  _set(key, value) {
    if (this.limit > this.size) {
      this.size ++;
      if (value === undefined) {
        this.store.set(key, UNDEFINED);
      } else {
        this.store.set(key, value);
      }
    }

    return value;
  }

  purge() {
    this.store.clear();
    this.size   = 0;
    this.hits   = 0;
    this.misses = 0;
  }
}

class DefaultStore {
  constructor() {
    this.data = Object.create(null);
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
  }

  clear() {
    this.data = Object.create(null);
  }
}
