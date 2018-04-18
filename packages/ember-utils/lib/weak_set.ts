/* globals WeakSet */

export default (typeof WeakSet === 'function'
  ? WeakSet
  : class WeakSetPolyFill<T extends object> {
      private _map = new WeakMap();

      add(val: T): this {
        this._map.set(val, true);
        return this;
      }

      delete(val: T) {
        return this._map.delete(val);
      }

      has(val: T) {
        return this._map.has(val);
      }
    }) as WeakSetConstructor;
