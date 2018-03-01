import Meta from '../meta';
import { Reference, Tag, CURRENT_TAG } from '@glimmer/reference';
import { NotifiableReference } from '../types';

export interface InnerReferenceFactory<T> {
  new (object: any, property: string, outer: NotifiableReference<any>): Reference<T>;
}

export class PropertyReference<T> implements Reference<T> {
  private object: any;
  private property: string;
  public tag: Tag = CURRENT_TAG;

  constructor(object: any, property: string, _outer: NotifiableReference<T>) {
    this.object = object;
    this.property = property;
  }

  value() { return this.object[this.property]; }

  label() {
    return '[reference Property]';
  }
}

export function ComputedReferenceBlueprint<T>(_property: any, dependencies: any): InnerReferenceFactory<T> {
  return class ComputedReference<T> implements Reference<T> {
    private object: any;
    private property: string;
    private dependencies: string[][];
    private installed = false;
    public tag: Tag = CURRENT_TAG;

    constructor(object: any, property: string) {
      this.object = object;
      this.property = property;
      this.dependencies = dependencies;
    }

    value(): T {
      if (!this.installed) {
        let root = Meta.for(this.object).root();

        this.dependencies.forEach(dep => {
          let ref = root.referenceFromParts(dep);
          ref.value();
        });

        this.installed = true;
      }

      return this.object[this.property];
    }

    label() {
      return '[reference Computed]';
    }
  };
}
