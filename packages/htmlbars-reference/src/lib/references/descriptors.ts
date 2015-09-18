import { metaFor } from '../meta';

export class PropertyReference {
  constructor(object, property) {
    this._object = object;
    this._property = property;
  }

  isDirty() { return true; }
  value() { return this._object[this._property]; }

  label() {
    return '[reference Property]';
  }
}

export function ComputedBlueprint(property, dependencies) {
  return class ComputedReference {
    constructor(object, property) {
      this._object = object;
      this._property = property;
      this._internedDependencies = dependencies;
      this._isDirty = true;
      this._sources = null;
    }

    value() {
      if (!this._disconnect) {
        let root = metaFor(this._object).root();
        this._disconnect = new Array(this._internedDependencies.length);

        this._internedDependencies.forEach((path, i) => {
          this._disconnect[i] = root.referenceFromInternedParts(path).chain(this);
        });
      }

      return this._object[this._property];
    }

    label() {
      return '[reference Computed]';
    }

    destroy() {
      this._disconnect.forEach(chain => chain.destroy());
    }
  };
}
