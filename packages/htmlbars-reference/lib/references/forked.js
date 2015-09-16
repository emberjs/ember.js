import { guid } from '../utils';

export default class ForkedReference {
  constructor(reference) {
    this._reference = reference;
    this._guid = guid();
    this._dirty = true;

    this._chain = reference.chain(this);
  }

  notify() {
    this._dirty = true;
  }

  isDirty() {
    return this._dirty;
  }

  value() {
    this._dirty = false;
    return this._reference.value();
  }

  destroy() {
    this._chain.destroy();
  }

  label() {
    return '[reference Leaf]';
  }
}

