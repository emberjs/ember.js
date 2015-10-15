import Meta from '../meta';
import { Reference, ChainableReference, NotifiableReference } from 'htmlbars-reference';
import { InternedString } from 'htmlbars-util';
import PushPullReference from './push-pull';

export interface InnerReferenceFactory {
  new (object: any, property: InternedString, outer: NotifiableReference): Reference;
}

export class PropertyReference implements Reference {
  private object: any;
  private property: InternedString;

  constructor(object: any, property: InternedString, outer: NotifiableReference) {
    this.object = object;
    this.property = property;
  }

  isDirty() { return true; }
  value() { return this.object[<string>this.property]; }
  destroy() {}

  label() {
    return '[reference Property]';
  }
}

export function ComputedReferenceBlueprint(property, dependencies) {
  return class ComputedReference extends PushPullReference implements Reference {
    private object: any;
    private property: InternedString;
    private dependencies: InternedString[][];
    private outer: NotifiableReference;
    private installed = false;

    constructor(object: any, property: InternedString, outer: NotifiableReference) {
      super();
      this.object = object;
      this.property = property;
      this.dependencies = dependencies;
      this.outer = outer;
    }

    notify() {
      this.dirty = true;
      this.outer.notify();
      super.notify();
    }

    value() {
      if (!this.installed) {
        let root = Meta.for(this.object).root();

        this.dependencies.forEach(dep => {
          let ref = root.referenceFromParts(dep);
          this._addSource(ref);
          ref.value();
        });

        this.dirty = false;
        this.installed = true;
      }

      return this.object[<string>this.property];
    }

    label() {
      return '[reference Computed]';
    }
  };
}
