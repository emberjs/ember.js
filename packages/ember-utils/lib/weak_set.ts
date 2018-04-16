/* globals WeakSet */

export interface WeakSetLike<T extends object> {
  add(val: T): this;
  delete(val: T): boolean;
  has(val: T): boolean;
}

export type WeakSetLikeConstructor = {
  new (): WeakSetLike<object>;
  new <T extends object>(): WeakSetLike<T>;
  prototype: WeakSetLike<object>;
};

const WeakSetLike: WeakSetLikeConstructor =
  typeof WeakSet === 'function'
    ? WeakSet
    : class WeakSetPolyFill<T extends object> implements WeakSetLike<T> {
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
      };

export default WeakSetLike;
