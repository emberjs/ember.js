const HAS_WEAK_SET = typeof WeakSet === 'function';

class WeakSetPolyFill {
  constructor() {
    this._weakmap = new WeakMap();
  }

  add(val) {
    this._weakmap.set(val, true);
    return this;
  }

  delete(val) {
    return this._weakmap.delete(val);
  }

  has(val) {
    return this._weakmap.has(val);
  }
}

export default HAS_WEAK_SET ? WeakSet : WeakSetPolyFill; // eslint-disable-line
