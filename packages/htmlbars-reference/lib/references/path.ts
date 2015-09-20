import { EMPTY_CACHE, DictSet, dict } from '../utils';
import Meta from '../meta';
import ForkedReference from './forked';
import { PropertyReference } from './descriptors';
import PushPullReference from './push-pull';
import { PathReference as IPathReference, Reference, InternedString, NotifiableReference, Destroyable } from 'htmlbars-reference';
import { Dict, HasGuid, installGuid } from 'htmlbars-util';

class UnchainFromPath {
  private set: DictSet<PathReference & HasGuid>;
  private child: PathReference & HasGuid;

  constructor(set: DictSet<PathReference & HasGuid>, child: PathReference & HasGuid) {
    this.set = set;
    this.child = child;
  }
  
  destroy() {
    this.set.delete(this.child);
  }
}

export class PathReference extends PushPullReference implements IPathReference, HasGuid {
  private parent: IPathReference;
  private property: InternedString;
  protected cache: any = EMPTY_CACHE;
  private inner: Reference = null;
  private chains: Dict<PathReference> = null;
  private notifyChildren: DictSet<PathReference> = null;
  private lastParentValue: any = EMPTY_CACHE;
  public _guid = null;

  constructor(parent: IPathReference, property: InternedString) {
    super();
    this.parent = parent;
    this.property = property;
  }

  isDirty(): boolean { return this.cache === EMPTY_CACHE || this.inner.isDirty(); }

  value(): any {
    if (!this.isDirty()) return this.cache;
    let { lastParentValue, property, inner } = this;
    let parentValue = this._parentValue();

    if (parentValue === null || parentValue === undefined) {
      return (this.cache = undefined);
    }

    if (lastParentValue === parentValue) {
      inner = this.inner;
    } else {
      let ReferenceType = typeof parentValue === 'object' ? Meta.for(parentValue).referenceTypeFor(property) : PropertyReference;
      inner = this.inner = new ReferenceType(parentValue, property);
    }

    if (typeof parentValue === 'object') {
      Meta.for(parentValue).addReference(property, this);
    }

    return (this.cache = inner.value());
  }

  notify() {
    this._notify();
    super.notify();
  }

  get(prop: InternedString): IPathReference {
    let chains = this._getChains();
    if (<string>prop in chains) return chains[<string>prop];
    return (chains[<string>prop] = new PathReference(this, prop));
  }

  chain(child: PathReference): Destroyable {
    let notifySet = this._getNotifyChildren();
    notifySet.add(child);
    return new UnchainFromPath(notifySet, child);
  }

  fork(): Reference {
    return new ForkedReference(this);
  }

  label(): string {
    return '[reference Direct]';
  }

  private _notify() {
    this.cache = EMPTY_CACHE;
    let { chains, notifyChildren, lastParentValue } = this;

    if (typeof lastParentValue === 'object' && lastParentValue !== null) {
      Meta.for(lastParentValue).removeReference(this.property, this);
    }

    if (chains) {
      Object.keys(chains).forEach(function(key) { chains[key]._notify(); });
    }

    if (notifyChildren) {
      notifyChildren.forEach(function(child) { child.notify(); });
    }
  }

  private _getNotifyChildren(): DictSet<PathReference> {
    if (this.notifyChildren) return this.notifyChildren;
    return (this.notifyChildren = new DictSet<PathReference>());
  }

  private _getChains(): Dict<PathReference> {
    if (this.chains) return this.chains;
    return (this.chains = dict<PathReference>());
  }

  private _parentValue() {
    var parent = this.parent.value();
    this.lastParentValue = parent;
    return parent;
  }
}