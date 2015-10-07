import { PropertyReference } from './references/descriptors';
import RootReference from './references/root';
import { ConstReference } from './references/const';
import { MetaOptions } from './types';
import { InternedString, installGuid, assign, intern, numberKey } from 'htmlbars-util';

import { Dict, DictSet, HasGuid, Set, dict } from 'htmlbars-util';

import {
  Reference,
  RootReferenceFactory,
  PathReferenceFactory,
  PathReference as IPathReference,
  Meta as IMeta,
  RootReference as IRootReference
} from './types';

import { InnerReferenceFactory } from './references/descriptors';

const NOOP_DESTROY = { destroy() {} };

class ConstPath implements IPathReference {
  private parent: any;
  private property: InternedString;

  constructor(parent: any, property: InternedString) {
    this.parent = parent;
  }

  chain() { return NOOP_DESTROY; }
  isDirty() { return false; }
  destroy() {}
  notify() {}

  value() {
    return this.parent[<string>this.property];
  }

  get(prop: InternedString): IPathReference {
    return new ConstPath(this.parent[<string>this.property], prop);
  }
}

class ConstRoot implements IRootReference {
  private inner: any;

  constructor(value) {
    this.inner = value;
  }

  update() {}
  chain() { return NOOP_DESTROY; }
  isDirty() { return false; }
  destroy() {}
  notify() {}

  value(): any {
    return this.inner;
  }

  referenceFromParts(parts: InternedString[]): IPathReference {
    throw new Error("Not implemented");
  }

  chainFor(prop: InternedString): IPathReference {
    throw new Error("Not implemented");
  }

  get(prop: InternedString): IPathReference {
    return new ConstPath(this.inner, prop);
  }
}

class ConstMeta implements IMeta {
  private object: any;

  constructor(object: any) {
    this.object = object;
  }

  root(): IRootReference {
    return new ConstRoot(this.object);
  }
}

class Meta implements IMeta, HasGuid {
  static for(obj: any): IMeta {
    if (obj === null || obj === undefined) return new Meta(obj, {});
    if (obj._meta) return obj._meta;
    if (!Object.isExtensible(obj)) return new ConstMeta(obj);

    let MetaToUse: typeof Meta = Meta;

    if (obj.constructor && obj.constructor._Meta) {
      let classMeta: ClassMeta = obj.constructor._Meta;
      MetaToUse = classMeta.InstanceMetaConstructor;
    }

    return (obj._meta = new MetaToUse(obj, {}));
  }

  static identity(obj: any): InternedString {
    if (typeof obj === 'string') return intern(obj);
    else if (typeof obj === 'object') return this.for(obj).identity();
  }

  static metadataForProperty(key: InternedString): any {
    return null;
  }

  private object: any;
  private RootReferenceFactory: RootReferenceFactory;
  private DefaultPathReferenceFactory: InnerReferenceFactory;
  private rootCache: IRootReference;
  private references: Dict<DictSet<IPathReference & HasGuid>> = null;
  public _guid;
  protected referenceTypes: Dict<InnerReferenceFactory> = null;
  protected propertyMetadata: Dict<any> = null;

  constructor(object: any, { RootReferenceFactory, DefaultPathReferenceFactory }: MetaOptions) {
    this.object = object;
    this.RootReferenceFactory = RootReferenceFactory || RootReference;
    this.DefaultPathReferenceFactory = DefaultPathReferenceFactory || PropertyReference;
  }

  addReference(property: InternedString, reference: IPathReference & HasGuid) {
    var refs = this.references = this.references || dict<DictSet<IPathReference & HasGuid>>();
    var set = refs[<string>property] = refs[<string>property] || new DictSet<IPathReference & HasGuid>();
    set.add(reference);
  }

  addReferenceTypeFor(property: InternedString, type: PathReferenceFactory) {
    this.referenceTypes = this.referenceTypes || dict<PathReferenceFactory>();
    this.referenceTypes[<string>property] = type;
  }

  referenceTypeFor(property: InternedString): InnerReferenceFactory {
    if (!this.referenceTypes) return PropertyReference;
    return this.referenceTypes[<string>property] || PropertyReference;
  }

  removeReference(property: InternedString, reference: IPathReference & HasGuid) {
    if (!this.references) return;
    var set = this.references[<string>property];
    set.delete(reference);
  }

  getReferenceTypes(): Dict<InnerReferenceFactory> {
    return this.referenceTypes;
  }

  referencesFor(property: InternedString): Set<IPathReference> {
    if (!this.references) return;
    return this.references[<string>property];
  }

  root(): IRootReference {
    return (this.rootCache = this.rootCache || new this.RootReferenceFactory(this.object));
  }

  identity(): InternedString {
    return numberKey(installGuid(this));
  }
}

export default Meta;

interface ClassMeta {
  InstanceMetaConstructor: typeof Meta;
}

function turbocharge(obj) {
  function Dummy() {}
  Dummy.prototype = obj;
  return obj;
}

export function metaFor(obj: any): IMeta {
  return Meta.for(obj);
}