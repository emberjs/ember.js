import { PropertyReference } from './references/descriptors';
import RootReference from './references/root';
import { MetaOptions } from './types';

import { Dict, DictSet, HasGuid, Set, dict } from '@glimmer/util';

import {
  RootReferenceFactory,
  PathReferenceFactory,
  Meta as IMeta,
  RootReference as IRootReference
} from './types';

import { PathReference as IPathReference, VOLATILE_TAG } from '@glimmer/reference';

import { InnerReferenceFactory } from './references/descriptors';
import { Option } from "@glimmer/interfaces";

const NOOP_DESTROY = { destroy() {} };

class ConstPath implements IPathReference<any> {
  private parent: any;
  private property: string;
  public tag = VOLATILE_TAG;

  constructor(parent: any, _property: string) {
    this.parent = parent;
  }

  chain() { return NOOP_DESTROY; }
  notify() {}

  value() {
    return this.parent[this.property];
  }

  get(prop: string): IPathReference<any> {
    return new ConstPath(this.parent[this.property], prop);
  }
}

class ConstRoot implements IRootReference<any> {
  private inner: any;
  public tag = VOLATILE_TAG;

  constructor(value: any) {
    this.inner = value;
  }

  update(inner: any) {
    this.inner = inner;
  }

  chain() { return NOOP_DESTROY; }
  notify() {}

  value(): any {
    return this.inner;
  }

  referenceFromParts(_parts: string[]): IPathReference<any> {
    throw new Error("Not implemented");
  }

  chainFor(_prop: string): IPathReference<any> {
    throw new Error("Not implemented");
  }

  get(prop: string): IPathReference<any> {
    return new ConstPath(this.inner, prop);
  }
}

class ConstMeta /*implements IMeta*/ {
  private object: any;

  constructor(object: any) {
    this.object = object;
  }

  root(): ConstRoot {
    return new ConstRoot(this.object);
  }
}

export const CLASS_META = "df8be4c8-4e89-44e2-a8f9-550c8dacdca7";

const hasOwnProperty = Object.hasOwnProperty;

class Meta implements IMeta, HasGuid {
  static for(obj: any): IMeta {
    if (obj === null || obj === undefined) return new Meta(obj, {});
    if (hasOwnProperty.call(obj, '_meta') && obj._meta) return obj._meta;
    if (!Object.isExtensible(obj)) return <any>new ConstMeta(obj);

    let MetaToUse: typeof Meta = Meta;

    if (obj.constructor && obj.constructor[CLASS_META]) {
      let classMeta: ClassMeta = obj.constructor[CLASS_META];
      MetaToUse = classMeta.InstanceMetaConstructor;
    } else if (obj[CLASS_META]) {
      MetaToUse = obj[CLASS_META].InstanceMetaConstructor;
    }

    return (obj._meta = new MetaToUse(obj, {}));
  }

  static exists(obj: any): boolean {
    return typeof obj === 'object' && obj._meta;
  }

  static metadataForProperty(_key: string): any {
    return null;
  }

  private object: any;
  private RootReferenceFactory: RootReferenceFactory<any>;
  private DefaultPathReferenceFactory: InnerReferenceFactory<any>;
  private rootCache: IRootReference<any>;
  private references: Option<Dict<DictSet<IPathReference<any> & HasGuid>>> = null;
  public _guid: number;
  protected slots: Option<Dict<any>> = null;
  protected referenceTypes: Option<Dict<InnerReferenceFactory<any>>> = null;
  protected propertyMetadata: Option<Dict<any>> = null;

  constructor(object: any, { RootReferenceFactory, DefaultPathReferenceFactory }: MetaOptions) {
    this.object = object;
    this.RootReferenceFactory = (RootReferenceFactory || RootReference) as RootReferenceFactory<any>;
    this.DefaultPathReferenceFactory = DefaultPathReferenceFactory || PropertyReference;
  }

  addReference(property: string, reference: IPathReference<any> & HasGuid) {
    let refs = this.references = this.references || dict<DictSet<IPathReference<any> & HasGuid>>();
    let set = refs[property] = refs[property] || new DictSet<IPathReference<any> & HasGuid>();
    set.add(reference);
  }

  addReferenceTypeFor(property: string, type: PathReferenceFactory<any>) {
    this.referenceTypes = this.referenceTypes || dict<PathReferenceFactory<any>>();
    this.referenceTypes[property] = type;
  }

  referenceTypeFor(property: string): InnerReferenceFactory<any> {
    if (!this.referenceTypes) return PropertyReference;
    return this.referenceTypes[property] || PropertyReference;
  }

  removeReference(property: string, reference: IPathReference<any> & HasGuid) {
    if (!this.references) return;
    let set = this.references[property];
    set.delete(reference);
  }

  getReferenceTypes(): Dict<InnerReferenceFactory<any>> {
    this.referenceTypes = this.referenceTypes || dict<PathReferenceFactory<any>>();
    return this.referenceTypes;
  }

  referencesFor(property: string): Option<Set<IPathReference<any>>> {
    if (!this.references) return null;
    return this.references[property];
  }

  getSlots() {
    return (this.slots = this.slots || dict());
  }

  root(): IRootReference<any> {
    return (this.rootCache = this.rootCache || new this.RootReferenceFactory(this.object));
  }
}

export default Meta;

interface ClassMeta {
  InstanceMetaConstructor: typeof Meta;
}

export function metaFor(obj: any): IMeta {
  return Meta.for(obj);
}
