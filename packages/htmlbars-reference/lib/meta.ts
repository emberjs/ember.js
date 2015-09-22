import { PropertyReference } from './references/descriptors';
import RootReference from './references/root';
import { ConstReference } from './references/const';
import { MetaOptions, MetaFactory } from './types';
import { InternedString } from 'htmlbars-util';

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
  referencesFor(property: InternedString): Set<PathReference>;
  referenceTypeFor(property: InternedString): InnerReferenceFactory;
  addReference(property: InternedString, reference: PathReference);
  removeReference(property: InternedString, reference: PathReference);
}

class Meta implements IMeta {
  static for(obj: any): IMeta {
    if (obj._meta) return obj._meta;
    if (!Object.isExtensible(obj)) return new ConstMeta(obj);

    let MetaToUse: MetaFactory = obj.constructor._Meta || Meta;
    return (obj._meta = new MetaToUse(obj, {}));
  }

  private object: any;
  private RootReferenceFactory: RootReferenceFactory;
  private DefaultPathReferenceFactory: InnerReferenceFactory;
  private rootCache: IRootReference;
  private references: Dict<DictSet<IPathReference & HasGuid>> = null;
  protected referenceTypes: Dict<InnerReferenceFactory> = null;

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

  referencesFor(property: InternedString): Set<IPathReference> {
    if (!this.references) return;
    return this.references[<string>property];
  }

  root(): IRootReference {
    return (this.rootCache = this.rootCache || new this.RootReferenceFactory(this.object));
  }
}

export default Meta;

class SealedMeta extends Meta {
  addReferenceTypeFor(...args): InnerReferenceFactory {
    throw new Error("Cannot modify reference types on a sealed meta");
  }
}

class BlankMeta extends SealedMeta {
  referenceTypeFor(...args): InnerReferenceFactory {
    return PropertyReference;
  }
}

export class MetaBuilder {
  private referenceTypes: Dict<InnerReferenceFactory>;

  constructor() {
    this.referenceTypes = null;
  }

  addReferenceTypeFor(property: InternedString, type: InnerReferenceFactory) {
    this.referenceTypes = this.referenceTypes || dict<InnerReferenceFactory>();
    this.referenceTypes[<string>property] = type;
  }

  seal(): MetaFactory {
    if (!this.referenceTypes) return BlankMeta;
    return buildMeta(turbocharge(this.referenceTypes));
  }
}

function buildMeta(referenceTypes: Dict<InnerReferenceFactory>): MetaFactory {
  return class extends SealedMeta {
    constructor(object, { RootReferenceFactory, DefaultPathReferenceFactory }) {
      super(object, { RootReferenceFactory, DefaultPathReferenceFactory });
      this.referenceTypes = referenceTypes;
    }

    referenceTypeFor(property) {
      return this.referenceTypes[property] || PropertyReference;
    }
  };
}

function turbocharge(obj) {
  function Dummy() {}
  Dummy.prototype = obj;
  return obj;
}

export function metaFor(obj: any): IMeta {
  return Meta.for(obj);
}