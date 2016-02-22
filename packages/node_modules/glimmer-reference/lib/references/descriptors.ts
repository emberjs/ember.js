import Meta from '../meta';
import { Reference, NotifiableReference } from 'glimmer-reference';
import { InternedString } from 'glimmer-util';
import PushPullReference from './push-pull';

export interface InnerReferenceFactory<T> {
  new (object: any, property: InternedString, outer: NotifiableReference<any>): Reference<T>;
}

export class PropertyReference<T> implements Reference<T> {
  private object: any;
  private property: InternedString;

  constructor(object: any, property: InternedString, outer: NotifiableReference<T>) {
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
  return class ComputedReference<T> extends PushPullReference<T> implements Reference<T> {
    private object: any;
    private property: InternedString;
    private dependencies: InternedString[][];
    private outer: NotifiableReference<T>;
    private installed = false;

    constructor(object: any, property: InternedString, outer: NotifiableReference<T>) {
      super();
      this.object = object;
      this.property = property;
      this.dependencies = dependencies;
      this.outer = outer;
    }

    notify() {
      this.dirty = true;
      // this.outer.notify();
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
