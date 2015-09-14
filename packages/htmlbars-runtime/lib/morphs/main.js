export class Morph {
  static specialize() { return this; }

  constructor(parentNode, frame) {
    this._frame = frame; // internal
    this.parentNode = parentNode; // public, used by Builder
  }
}
