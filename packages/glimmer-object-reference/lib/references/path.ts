import { EMPTY_CACHE } from '../utils';
import { InternedString, DictSet, dict } from 'glimmer-util';
import Meta from '../meta';
import { PropertyReference } from './descriptors';
import { VOLATILE_TAG, PathReference as IPathReference, Reference } from 'glimmer-reference';
import { Dict, HasGuid } from 'glimmer-util';

class UnchainFromPath {
  private set: DictSet<PathReference<any> & HasGuid>;
  private child: PathReference<any> & HasGuid;

  constructor(set: DictSet<PathReference<any> & HasGuid>, child: PathReference<any> & HasGuid) {
    this.set = set;
    this.child = child;
  }

  destroy() {
    this.set.delete(this.child);
  }
}

export default class PathReference<T> implements IPathReference<T>, HasGuid {
  private parent: IPathReference<any>;
  private property: InternedString;
  protected cache: any = EMPTY_CACHE;
  private inner: Reference<T> = null;
  private chains: Dict<PathReference<any>> = null;
  private lastParentValue: any = EMPTY_CACHE;
  public _guid = null;
  public tag = VOLATILE_TAG;

  constructor(parent: IPathReference<T>, property: InternedString) {
    this.parent = parent;
    this.property = property;
  }

  value(): any {
    let { lastParentValue, property, inner } = this;
    let parentValue = this._parentValue();

    if (parentValue === null || parentValue === undefined) {
      return (this.cache = undefined);
    }

    if (lastParentValue === parentValue) {
      inner = this.inner;
    } else {
      let ReferenceType = typeof parentValue === 'object' ? Meta.for(parentValue).referenceTypeFor(property) : PropertyReference;
      inner = this.inner = new ReferenceType(parentValue, property, this);
    }

    // if (typeof parentValue === 'object') {
    //   Meta.for(parentValue).addReference(property, this);
    // }

    return (this.cache = inner.value());
  }

  get(prop: InternedString): IPathReference<any> {
    let chains = this._getChains();
    if (<string>prop in chains) return chains[<string>prop];
    return (chains[<string>prop] = new PathReference(this, prop));
  }

  label(): string {
    return '[reference Direct]';
  }

  private _getChains(): Dict<PathReference<any>> {
    if (this.chains) return this.chains;
    return (this.chains = dict<PathReference<any>>());
  }

  private _parentValue() {
    let parent = this.parent.value();
    this.lastParentValue = parent;
    return parent;
  }
}

export { PathReference };
