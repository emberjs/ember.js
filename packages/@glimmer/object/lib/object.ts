import {
  Meta,
  InnerReferenceFactory,
  PropertyReference
} from '@glimmer/object-reference';
import { Dict, dict, assign, initializeGuid } from '@glimmer/util';
import {
  Mixin,
  extend as extendClass,
  toMixin,
  relinkSubclasses,
  wrapMethod
} from './mixin';

const { isArray } = Array;

import { ROOT } from './utils';
import { Option } from "@glimmer/interfaces";

export const EMPTY_CACHE = function EMPTY_CACHE() {};

const CLASS_META = "df8be4c8-4e89-44e2-a8f9-550c8dacdca7";

export interface ObjectWithMixins {
  "df8be4c8-4e89-44e2-a8f9-550c8dacdca7": ClassMeta;
  _meta: Meta;
}

export interface InstanceWithMixins {
  constructor: ObjectWithMixins;
}

export interface GlimmerObjectFactory<T> {
  new<U>(attrs?: U): GlimmerObject & T & U;
  extend(): GlimmerObjectFactory<Object>;
  extend<T>(extension: T): GlimmerObjectFactory<T>;
  extend(...extensions: Object[]): GlimmerObjectFactory<Object>;
  create<U>(attrs?: U): GlimmerObject & T & U;
  reopen<U>(extensions: U): void;
  reopenClass<U>(extensions: U): void;
  metaForProperty(property: string): Object;
  eachComputedProperty(callback: (s: string, o: Object) => void): void;
  "df8be4c8-4e89-44e2-a8f9-550c8dacdca7": InstanceMeta;
}

export function turbocharge<T>(obj: T): T {
  // function Dummy() {}
  // Dummy.prototype = obj;
  return obj;
}

abstract class SealedMeta extends Meta {
  addReferenceTypeFor(..._args: any[]): InnerReferenceFactory<any> {
    throw new Error("Cannot modify reference types on a sealed meta");
  }
}

export class ClassMeta {
  private referenceTypes = dict<InnerReferenceFactory<any>>();
  private propertyMetadata = dict<any>();
  private concatenatedProperties = dict<any[]>();
  private hasConcatenatedProperties = false;
  private mergedProperties = dict<Object>();
  private hasMergedProperties = false;
  private mixins: Mixin[] = [];
  private appliedMixins: Mixin[] = [];
  private staticMixins: Mixin[] = [];
  private subclasses: GlimmerObjectFactory<any>[] = [];
  private slots: string[] = [];
  public InstanceMetaConstructor: Option<typeof Meta> = null;

  static fromParent(parent: Option<ClassMeta>) {
    let meta = new this();
    meta.reset(parent);
    return meta;
  }

  static for(object: ObjectWithMixins | InstanceWithMixins): Option<ClassMeta> {
    if (CLASS_META in object) return (<ObjectWithMixins>object)[CLASS_META];
    else if (object.constructor) return (<InstanceWithMixins>object).constructor[CLASS_META] || null;
    else return null;
  }

  init(object: GlimmerObject, attrs: Option<Object>) {
    if (typeof attrs !== 'object' || attrs === null) return;

    if (this.hasConcatenatedProperties) {
      let concatProps = this.concatenatedProperties;
      for (let prop in concatProps) {
        if (prop in attrs) {
          let concat = concatProps[prop].slice();
          object[prop] = concat.concat(attrs[prop]);
        }
      }
    }

    if (this.hasMergedProperties) {
      let mergedProps = this.mergedProperties;
      for (let prop in mergedProps) {
        if (prop in attrs) {
          let merged = assign({}, mergedProps[prop]);
          object[prop] = assign(merged, attrs[prop]);
        }
      }
    }
  }

  addStaticMixin(mixin: Mixin) {
    this.staticMixins.push(mixin);
  }

  addMixin(mixin: Mixin) {
    this.mixins.push(mixin);
  }

  getStaticMixins(): Mixin[] {
    return this.staticMixins;
  }

  getMixins(): Mixin[] {
    return this.mixins;
  }

  addAppliedMixin(mixin: Mixin) {
    this.appliedMixins.push(mixin);
  }

  hasAppliedMixin(mixin: Mixin): boolean {
    return this.appliedMixins.indexOf(mixin) !== -1;
  }

  getAppliedMixins(): Mixin[] {
    return this.appliedMixins;
  }

  hasStaticMixin(mixin: Mixin): boolean {
    return this.staticMixins.indexOf(mixin) !== -1;
  }

  static applyAllMixins(Subclass: GlimmerObjectFactory<any>, Parent: GlimmerObjectFactory<any>) {
    Subclass[CLASS_META].getMixins().forEach((m: Mixin) => m.extendPrototypeOnto(Subclass, Parent));
    Subclass[CLASS_META].getStaticMixins().forEach((m: Mixin) => m.extendStatic(Subclass));
    Subclass[CLASS_META].seal();
  }

  addSubclass(constructor: GlimmerObjectFactory<any>) {
    this.subclasses.push(constructor);
  }

  getSubclasses(): Function[] {
    return this.subclasses;
  }

  addPropertyMetadata(property: string, value: any) {
    this.propertyMetadata[property] = value;
  }

  metadataForProperty(property: string): Object {
    return this.propertyMetadata[property];
  }

  addReferenceTypeFor(property: string, type: InnerReferenceFactory<any>) {
    this.referenceTypes[property] = type;
  }

  addSlotFor(property: string) {
    this.slots.push(property);
  }

  hasConcatenatedProperty(property: string): boolean {
    if (!this.hasConcatenatedProperties) return false;
    return <string>property in this.concatenatedProperties;
  }

  getConcatenatedProperty(property: string): any[] {
    return this.concatenatedProperties[property];
  }

  getConcatenatedProperties(): string[] {
    return <string[]>Object.keys(this.concatenatedProperties);
  }

  addConcatenatedProperty(property: string, value: any) {
    this.hasConcatenatedProperties = true;

    if (<string>property in this.concatenatedProperties) {
      let val = this.concatenatedProperties[property].concat(value);
      this.concatenatedProperties[property] = val;
    } else {
      this.concatenatedProperties[property] = value;
    }
  }

  hasMergedProperty(property: string): boolean {
    if (!this.hasMergedProperties) return false;
    return <string>property in this.mergedProperties;
  }

  getMergedProperty(property: string): Object {
    return this.mergedProperties[property];
  }

  getMergedProperties(): string[] {
    return <string[]>Object.keys(this.mergedProperties);
  }

  addMergedProperty(property: string, value: Object) {
    this.hasMergedProperties = true;

    if (isArray(value)) {
      throw new Error(`You passed in \`${JSON.stringify(value)}\` as the value for \`foo\` but \`foo\` cannot be an Array`);
    }

    if (<string>property in this.mergedProperties && this.mergedProperties[property] && value) {
      this.mergedProperties[property] = mergeMergedProperties(value, this.mergedProperties[property]);
    } else {
      value = value === null ? value : value || {};
      this.mergedProperties[property] = value;
    }
  }

  getReferenceTypes(): Dict<InnerReferenceFactory<any>> {
    return this.referenceTypes;
  }

  getPropertyMetadata(): Dict<any> {
    return this.propertyMetadata;
  }

  reset(parent: Option<ClassMeta>) {
    this.referenceTypes = dict<InnerReferenceFactory<any>>();
    this.propertyMetadata = dict();
    this.concatenatedProperties = dict<any[]>();
    this.mergedProperties = dict<Object>();

    if (parent) {
      this.hasConcatenatedProperties = parent.hasConcatenatedProperties;
      for (let prop in parent.concatenatedProperties) {
        this.concatenatedProperties[prop] = parent.concatenatedProperties[prop].slice();
      }

      this.hasMergedProperties = parent.hasMergedProperties;
      for (let prop in parent.mergedProperties) {
        this.mergedProperties[prop] = assign({}, parent.mergedProperties[prop]);
      }

      assign(this.referenceTypes, parent.referenceTypes);
      assign(this.propertyMetadata, parent.propertyMetadata);
    }
  }

  reseal(obj: Object) {
    let meta = Meta.for(obj);
    let fresh = new this.InstanceMetaConstructor!(obj, {});
    let referenceTypes = meta.getReferenceTypes();
    let slots = meta.getSlots();

    turbocharge(assign(referenceTypes, this.referenceTypes));
    turbocharge(assign(slots, fresh.getSlots()));
  }

  seal() {
    let referenceTypes: Dict<InnerReferenceFactory<any>> = turbocharge(assign({}, this.referenceTypes));
    turbocharge(this.concatenatedProperties);
    turbocharge(this.mergedProperties);

    if (!this.hasMergedProperties && !this.hasConcatenatedProperties) {
      this.init = function() {};
    }

    let slots = this.slots;

    class Slots {
      constructor() {
        slots.forEach(name => {
          this[name] = EMPTY_CACHE;
        });
      }
    }

    this.InstanceMetaConstructor = class extends SealedMeta {
      protected slots: Slots = new Slots();
      public referenceTypes: Dict<InnerReferenceFactory<any>> = referenceTypes;

      getReferenceTypes() {
        return this.referenceTypes;
      }

      referenceTypeFor(property: string): InnerReferenceFactory<any> {
        return this.referenceTypes[property] || PropertyReference;
      }

      getSlots() {
        return this.slots;
      }
    };

    turbocharge(this);
  }
}

function mergeMergedProperties(attrs: Object, parent: Object) {
  let merged = assign({}, parent);

  for (let prop in attrs) {
    if (prop in parent && typeof parent[prop] === 'function' && typeof attrs[prop] === 'function') {
      let wrapped = wrapMethod(parent, prop, attrs[prop]);
      merged[prop] = wrapped;
    } else {
      merged[prop] = attrs[prop];
    }
  }

  return merged;
}

export class InstanceMeta extends ClassMeta {
  public "df8be4c8-4e89-44e2-a8f9-550c8dacdca7": ClassMeta = ClassMeta.fromParent(null);

  static fromParent(parent: Option<InstanceMeta>): InstanceMeta {
    return <InstanceMeta>super.fromParent(parent);
  }

  reset(parent: InstanceMeta) {
    super.reset(parent);
    if (parent) this[CLASS_META].reset(parent[CLASS_META]);
  }

  seal() {
    super.seal();
    this[CLASS_META].seal();
  }
}

export default class GlimmerObject {
  static "df8be4c8-4e89-44e2-a8f9-550c8dacdca7": InstanceMeta = InstanceMeta.fromParent(null);
  static isClass = true;

  static extend(): GlimmerObjectFactory<any> & typeof GlimmerObject;
  static extend<T>(extension: T): GlimmerObjectFactory<T> & typeof GlimmerObject;
  static extend(...extensions: Object[]): GlimmerObjectFactory<any> & typeof GlimmerObject;

  static extend(this: GlimmerObjectFactory<any>, ...extensions: any[]) {
    return extendClass(this, ...extensions);
  }

  static create(attrs?: Object | null): GlimmerObject {
    return new this(attrs);
  }

  static reopen<U>(extensions: U): void {
    toMixin(extensions).extendPrototype(this);
    this[CLASS_META].seal();

    relinkSubclasses(this);
  }

  static reopenClass<U>(extensions: U): void {
    toMixin(extensions).extendStatic(this);
    this[CLASS_META].seal();
  }

  static metaForProperty(property: string): Object {
    let value = this[CLASS_META].metadataForProperty(property);
    if (!value) throw new Error(`metaForProperty() could not find a computed property with key '${property}'.`);
    return value;
  }

  static eachComputedProperty(callback: (s: string, o: Object) => void): void {
    let metadata = this[CLASS_META].getPropertyMetadata();
    if (!metadata) return;

    for (let prop in metadata) {
      callback(prop, metadata[prop]);
    }
  }

  _super = ROOT;
  _meta = null;
  _guid: number;

  init() {}

  constructor(attrs?: Object | null) {
    if (attrs) assign(this, attrs);
    (<typeof GlimmerObject>this.constructor)[CLASS_META].init(this, attrs || null);
    this._super = ROOT;
    initializeGuid(this);
    this.init();
  }

  get(key: string): any {
    return this[key];
  }

  set(key: string, value: any) {
    this[key] = value;
  }

  setProperties(attrs: Object) {
    assign(this, attrs);
  }

  destroy() {}
}
