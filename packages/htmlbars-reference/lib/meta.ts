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

export interface MetaFactory {
  new (object: any, options: MetaOptions): Meta;
  metadataForProperty(property: InternedString): any;
  reopen(callback: (builder: MetaBuilder) => void): MetaFactory;
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
    if (obj.constructor) MetaToUse = obj.constructor._Meta || Meta;

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

export abstract class SealedMeta extends Meta {
  addReferenceTypeFor(...args): InnerReferenceFactory {
    throw new Error("Cannot modify reference types on a sealed meta");
  }

  static getReferenceTypes(): Dict<InnerReferenceFactory> {
    throw new Error("Must implement static getReferenceTypes() on subclasses of SealedMeta");
  }

  static getPropertyMetadata(): Dict<Object> {
    throw new Error("Must implement static getReferenceTypes() on subclasses of SealedMeta");
  }

  static reopen(callback: (builder: MetaBuilder) => void): typeof SealedMeta {
    throw new Error("Must implement static reopen() on subclasses of SealedMeta");
  }
}

export class BlankMeta extends SealedMeta {
  static reopen(callback: (builder: MetaBuilder) => void): typeof SealedMeta {
    let builder = new MetaBuilder(BlankMeta);
    callback(builder);
    return builder.seal();
  }

  static getReferenceTypes() {
    return null;
  }

  static getPropertyMetadata() {
    return null;
  }

  referenceTypeFor(...args): InnerReferenceFactory {
    return PropertyReference;
  }
}

export class MetaBuilder {
  public referenceTypes: Dict<InnerReferenceFactory> = null;
  public propertyMetadata: Dict<any> = null;
  private parent: typeof SealedMeta;

  constructor(parent: typeof SealedMeta) {
    this.parent = parent;
  }

  addPropertyMetadata(property: InternedString, value: any) {
    this.propertyMetadata = this.propertyMetadata || dict<any>();
    this.propertyMetadata[<string>property] = value;
  }

  addReferenceTypeFor(property: InternedString, type: InnerReferenceFactory) {
    this.referenceTypes = this.referenceTypes || dict<InnerReferenceFactory>();
    this.referenceTypes[<string>property] = type;
  }

  clone(): MetaBuilder {
    let builder = new MetaBuilder(this.parent);
    builder.referenceTypes = this.referenceTypes && assign(dict(), this.referenceTypes);
    builder.propertyMetadata = this.propertyMetadata && assign(dict(), this.propertyMetadata);
    return builder;
  }

  seal(): typeof SealedMeta {
    if (!this.propertyMetadata && this.parent instanceof BlankMeta) return BlankMeta;
    return buildMeta(this, this.parent);
  }
}

const EMPTY_OBJECT = {};

function buildMeta(metaBuilder: MetaBuilder, parent: typeof SealedMeta): typeof SealedMeta {
  let propertyMetadata = assign(dict(), parent.getPropertyMetadata() || EMPTY_OBJECT);
  turbocharge(assign(propertyMetadata, metaBuilder.propertyMetadata || EMPTY_OBJECT));

  let builderReferenceTypes = assign(dict<InnerReferenceFactory>(), parent.getReferenceTypes() || EMPTY_OBJECT);
  turbocharge(assign(dict(), metaBuilder.referenceTypes || EMPTY_OBJECT));

  return class extends SealedMeta {
    static metadataForProperty(property: InternedString) {
      if (<string>property in propertyMetadata) {
        return propertyMetadata[<string>property];
      } else {
        throw new Error(`metaForProperty() could not find a computed property with key '${property}'.`);
      }
    }

    static reopen(callback: (builder: MetaBuilder) => void): typeof SealedMeta {
      let newBuilder = metaBuilder.clone()
      callback(newBuilder);
      return buildMeta(newBuilder, parent);
    }

    static getReferenceTypes(): Dict<InnerReferenceFactory> {
      return builderReferenceTypes;
    }

    static getPropertyMetadata(): Dict<Object> {
      return propertyMetadata;
    }

    referenceTypeFor(property: InternedString): InnerReferenceFactory {
      return builderReferenceTypes[<string>property] || PropertyReference;
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