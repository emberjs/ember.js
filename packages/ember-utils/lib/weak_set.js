/* globals WeakSet */
export default (typeof WeakSet === 'function'
  ? WeakSet
  : class WeakSetPolyFill {
      constructor() {
        this._map = new WeakMap();
      }

      add(val) {
        this._map.set(val, true);
        return this;
      }

      delete(val) {
        return this._map.delete(val);
      }

      has(val) {
        return this._map.has(val);
      }
    });
