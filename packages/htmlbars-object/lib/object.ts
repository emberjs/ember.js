import {
  Meta,
  setProperty,
  InnerReferenceFactory,
  PropertyReference
} from 'htmlbars-reference';
import { InternedString, Dict, dict, isArray, intern, assign } from 'htmlbars-util';
import {
  Mixin,
  Descriptor,
  extend as extendClass,
  toMixin,
  relinkSubclasses,
  wrapMethod
} from './mixin';

import { ROOT } from './utils';

export const EMPTY_CACHE = function EMPTY_CACHE() {};

export interface ObjectWithMixins {
  _Meta: ClassMeta,
  _meta: Meta
}

export interface InstanceWithMixins {
  constructor: ObjectWithMixins
}

export interface HTMLBarsObjectFactory<T> {
  new<U>(attrs?: U): T & U;
  extend(): HTMLBarsObjectFactory<Object>;
  extend<T>(extension: T): HTMLBarsObjectFactory<T>;
  extend(...extensions: Object[]): HTMLBarsObjectFactory<Object>;
  create<U>(attrs?: U): HTMLBarsObject & T & U;
  reopen<U>(extensions: U);
  reopenClass<U>(extensions: U);
  metaForProperty(property: string): Object;
  eachComputedProperty(callback: (InternedString, Object) => void);
  _Meta: InstanceMeta;
}

export function turbocharge(obj) {
  function Dummy() {}
  Dummy.prototype = obj;
  return obj;
}

abstract class SealedMeta extends Meta {
  addReferenceTypeFor(...args): InnerReferenceFactory {
    throw new Error("Cannot modify reference types on a sealed meta");
  }
}

export class ClassMeta {
  private referenceTypes = dict<InnerReferenceFactory>();
  private propertyMetadata = dict<any>();
  private concatenatedProperties = dict<any[]>();
  private hasConcatenatedProperties = false;
  private mergedProperties = dict<Object>();
  private hasMergedProperties = false;
  private mixins: Mixin[] = [];
  private appliedMixins: Mixin[] = [];
  private staticMixins: Mixin[] = [];
  private appliedStaticMixins: Mixin[] = [];
  private subclasses: HTMLBarsObjectFactory<any>[] = [];
  private slots: InternedString[] = [];
  public InstanceMetaConstructor: typeof Meta = null;

  static fromParent(parent: ClassMeta) {
    let meta = new this();
    meta.reset(parent);
    return meta;
  }

  static for(object: ObjectWithMixins | InstanceWithMixins): ClassMeta {
    if ('_Meta' in object) return (<ObjectWithMixins>object)._Meta;
    else if (object.constructor) return (<InstanceWithMixins>object).constructor._Meta || null;
    else return null;
  }

  init(object: HTMLBarsObject, attrs: Object) {
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

  static applyAllMixins(Subclass: HTMLBarsObjectFactory<any>, Parent: HTMLBarsObjectFactory<any>) {
    Subclass._Meta.getMixins().forEach(m => m.extendPrototypeOnto(Subclass, Parent));
    Subclass._Meta.getStaticMixins().forEach(m => m.extendStatic(Subclass));
    Subclass._Meta.seal();
  }

  addSubclass(constructor: HTMLBarsObjectFactory<any>) {
    this.subclasses.push(constructor);
  }

  getSubclasses(): Function[] {
    return this.subclasses;
  }

  addPropertyMetadata(property: InternedString, value: any) {
    this.propertyMetadata[<string>property] = value;
  }

  metadataForProperty(property: InternedString): Object {
    return this.propertyMetadata[<string>property];
  }

  addReferenceTypeFor(property: InternedString, type: InnerReferenceFactory) {
    this.referenceTypes[<string>property] = type;
  }

  addSlotFor(property: InternedString) {
    this.slots.push(property);
  }

  hasConcatenatedProperty(property: InternedString): boolean {
    if (!this.hasConcatenatedProperties) return false;
    return <string>property in this.concatenatedProperties;
  }

  getConcatenatedProperty(property: InternedString): any[] {
    return this.concatenatedProperties[<string>property];
  }

  getConcatenatedProperties(): InternedString[] {
    return <InternedString[]>Object.keys(this.concatenatedProperties);
  }

  addConcatenatedProperty(property: InternedString, value: any) {
    this.hasConcatenatedProperties = true;

    if (<string>property in this.concatenatedProperties) {
      let val = this.concatenatedProperties[<string>property].concat(value);
      this.concatenatedProperties[<string>property] = val;
    } else {
      this.concatenatedProperties[<string>property] = value;
    }
  }

  hasMergedProperty(property: InternedString): boolean {
    if (!this.hasMergedProperties) return false;
    return <string>property in this.mergedProperties;
  }

  getMergedProperty(property: InternedString): Object {
    return this.mergedProperties[<string>property];
  }

  getMergedProperties(): InternedString[] {
    return <InternedString[]>Object.keys(this.mergedProperties);
  }

  addMergedProperty(property: InternedString, value: Object) {
    this.hasMergedProperties = true;

    if (isArray(value)) {
      throw new Error(`You passed in \`${JSON.stringify(value)}\` as the value for \`foo\` but \`foo\` cannot be an Array`);
    }

    if (<string>property in this.mergedProperties && this.mergedProperties[<string>property] && value) {
      this.mergedProperties[<string>property] = mergeMergedProperties(value, this.mergedProperties[<string>property]);
    } else {
      value = value === null ? value : value || {};
      this.mergedProperties[<string>property] = value;
    }
  }

  getReferenceTypes(): Dict<InnerReferenceFactory> {
    return this.referenceTypes;
  }

  getPropertyMetadata(): Dict<any> {
    return this.propertyMetadata;
  }

  reset(parent: ClassMeta) {
    this.referenceTypes = dict<InnerReferenceFactory>();
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
    let fresh = new this.InstanceMetaConstructor(obj, {});
    let referenceTypes = meta.getReferenceTypes();
    let slots = meta.getSlots();

    turbocharge(assign(referenceTypes, this.referenceTypes));
    turbocharge(assign(slots, fresh.getSlots()));
  }

  seal() {
    let referenceTypes: Dict<InnerReferenceFactory> = turbocharge(assign({}, this.referenceTypes));
    turbocharge(this.concatenatedProperties);
    turbocharge(this.mergedProperties);

    if (!this.hasMergedProperties && !this.hasConcatenatedProperties) {
      this.init = function() {};
    }

    let slots = this.slots;

    class Slots {
      constructor() {
        slots.forEach(name => {
          this[<string>name] = EMPTY_CACHE;
        });
      }
    }

    this.InstanceMetaConstructor = class extends SealedMeta {
      private slots: Slots = new Slots();
      private referenceTypes: Dict<InnerReferenceFactory> = referenceTypes;

      getReferenceTypes() {
        return this.referenceTypes;
      }

      referenceTypeFor(property: InternedString): InnerReferenceFactory {
        return this.referenceTypes[<string>property] || PropertyReference;
      }

      getSlots() {
        return this.slots;
      }
    }

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
  public _Meta: ClassMeta = ClassMeta.fromParent(null);

  static fromParent(parent: InstanceMeta): InstanceMeta {
    return <InstanceMeta>super.fromParent(parent);
  }

  reset(parent: InstanceMeta) {
    super.reset(parent);
    if (parent) this._Meta.reset(parent._Meta);
  }

  seal() {
    super.seal();
    this._Meta.seal();
  }
}

export default class HTMLBarsObject {
  static _Meta: InstanceMeta = InstanceMeta.fromParent(null);
  static isClass = true;

  static extend(): typeof HTMLBarsObject;
  static extend<T>(extension: T): typeof HTMLBarsObject;
  static extend(...extensions: Object[]): typeof HTMLBarsObject;

  static extend(...extensions) {
    return extendClass(this, ...extensions);
  }

  static create(attrs?: Object): HTMLBarsObject {
    return new this(attrs);
  }

  static reopen<U>(extensions: U) {
    toMixin(extensions).extendPrototype(this);
    this._Meta.seal();

    relinkSubclasses(this);
  }

  static reopenClass(extensions: Object) {
    toMixin(extensions).extendStatic(this);
    this._Meta.seal();
  }

  static metaForProperty(property: string): Object {
    let value = this._Meta.metadataForProperty(intern(property));
    if (!value) throw new Error(`metaForProperty() could not find a computed property with key '${property}'.`);
    return value;
  }

  static eachComputedProperty(callback: (InternedString, Object) => void) {
    let metadata = this._Meta.getPropertyMetadata();
    if (!metadata) return;

    for (let prop in metadata) {
      callback(prop, metadata[prop]);
    }
  }

  _super = ROOT;
  _meta = null;

  init() {}

  constructor(attrs?: Object) {
    if (attrs) assign(this, attrs);
    (<typeof HTMLBarsObject>this.constructor)._Meta.init(this, attrs);
    this._super = ROOT;
    this.init();
  }

  get(key: string): any {
    return this[key];
  }

  set(key: string, value: any) {
    this[key] = value;
  }
}