export default class Cache<T, V> {
  public size = 0;
  public misses = 0;
  public hits = 0;
  private store: Map<T, V>;

  constructor(private limit: number, private func: (obj: T) => V, store?: Map<T, V>) {
    this.store = store || new Map<T, V>();
  }

  get(key: T): V {
    let value = this.store.get(key);
    if (value === undefined) {
      this.misses++;
      value = this.set(key, this.func(key));
    } else {
      this.hits++;
    }

    return value;
  }

  set(key: T, value: V): V {
    if (this.limit > this.size) {
      this.size++;
      this.store.set(key, value);
    }

    return value;
  }

  purge(): void {
    this.store.clear();
    this.size = 0;
    this.hits = 0;
    this.misses = 0;
  }
}
