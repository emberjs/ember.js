declare module '@ember/-internals/utils/lib/cache' {
  export default class Cache<T, V> {
    private limit;
    private func;
    private store;
    size: number;
    misses: number;
    hits: number;
    constructor(limit: number, func: (obj: T) => V, store?: Map<T, V>);
    get(key: T): V;
    set(key: T, value: V): V;
    purge(): void;
  }
}
