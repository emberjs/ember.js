export default class Cache<T, V> {
  public size = 0;
  public misses = 0;
  public hits = 0;

  constructor(private limit: number, private func: (obj: T) => V, private store?: any) {
    this.store = store || new Map();
  }

  get(key: T): V {
    let value;
    if (this.store.has(key)) {
      this.hits++;

      value = this.store.get(key);
    } else {
      this.misses++;
      value = this.set(key, this.func(key));
    }

    return value;
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
