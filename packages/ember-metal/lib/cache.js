
export default class Cache {
  constructor(limit, func, key) {
    this.misses = 0;
    this.hits = 0;
    this.limit = limit;
    this.func = func;
    this.key = key;
    this.store = new Map();
  }

  get(obj) {
    let key = this.key === undefined ? obj : this.key(obj);
    let value = this.store.get(key);
    if (this.store.has(key)) {
      this.hits++;
      value = this.store.get(key);
    } else {
      this.misses++;
      value = this._set(key, this.func(obj));
    }
    return value;
  }

  set(obj, value) {
    let key = this.key === undefined ? obj : this.key(obj);
    return this._set(key, value);
  }

  _set(key, value) {
    if (this.limit > this.store.size) {
      this.store.set(key, value);
    }

    return value;
  }

  get size() {
    return this.store.size;
  }

  purge() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
