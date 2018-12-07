export default class Cache<T, V> {
  public size = 0;
  public misses = 0;
  public hits = 0;

  constructor(private limit: number, private func: (obj: T) => V, private store?: any) {
    this.store = store || new Map();
  }

  get(key: T): V {
    if (this.store.has(key)) {
      this.hits++;

      return this.store.get(key);
    } else {
      this.misses++;
      return this.set(key, this.func(key));
    }
  }

  set(key: T, value: V) {
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
