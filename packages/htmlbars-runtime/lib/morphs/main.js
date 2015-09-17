export class Morph {
  static specialize() { return this; }

  constructor(parentNode, frame) {
    // protected, used by subclasses
    this._frame = frame;

    // public, used by Builder
    this.parentNode = parentNode; // public, used by Builder
    this.nextSibling = null;
  }
}
