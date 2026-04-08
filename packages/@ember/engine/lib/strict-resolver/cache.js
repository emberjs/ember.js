export default class Cache {
  constructor(limit, func, store) {
    this.limit = limit;
    this.func = func;
    this.store = store;
    this.size = 0;
    this.misses = 0;
    this.hits = 0;
    this.store = store || new Map();
  }
  get(key) {
    let value = this.store.get(key);
    if (this.store.has(key)) {
      this.hits++;
      return this.store.get(key);
    } else {
      this.misses++;
      value = this.set(key, this.func(key));
    }
    return value;
  }
  set(key, value) {
    if (this.limit > this.size) {
      this.size++;
      this.store.set(key, value);
    }
    return value;
  }
  purge() {
    this.store.clear();
    this.size = 0;
    this.hits = 0;
    this.misses = 0;
  }
}
