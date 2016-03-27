import Meta from '../meta';
import { Reference, VOLATILE_TAG } from 'glimmer-reference';
import { NotifiableReference } from '../types';
import { InternedString } from 'glimmer-util';

export interface InnerReferenceFactory<T> {
  new (object: any, property: InternedString, outer: NotifiableReference<any>): Reference<T>;
}

export class PropertyReference<T> implements Reference<T> {
  private object: any;
  private property: InternedString;
  public tag = VOLATILE_TAG;

  constructor(object: any, property: InternedString, outer: NotifiableReference<T>) {
    this.object = object;
    this.property = property;
  }

  value() { return this.object[<string>this.property]; }

  label() {
    return '[reference Property]';
  }
}

export function ComputedReferenceBlueprint(property, dependencies) {
  return class ComputedReference<T> implements Reference<T> {
    private object: any;
    private property: InternedString;
    private dependencies: InternedString[][];
    private outer: NotifiableReference<T>;
    private installed = false;
    public tag = VOLATILE_TAG;

    constructor(object: any, property: InternedString, outer: NotifiableReference<T>) {
      this.object = object;
      this.property = property;
      this.dependencies = dependencies;
      this.outer = outer;
    }

    value() {
      if (!this.installed) {
        let root = Meta.for(this.object).root();

        this.dependencies.forEach(dep => {
          let ref = root.referenceFromParts(dep);
          ref.value();
        });

        this.installed = true;
      }

      return this.object[<string>this.property];
    }

    label() {
      return '[reference Computed]';
    }
  };
}
