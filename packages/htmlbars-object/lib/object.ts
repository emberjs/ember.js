import {
  Meta,
  ComputedBlueprint,
  setProperty,
  InnerReferenceFactory,
  PropertyReference
} from 'htmlbars-reference';
import { InternedString, Dict, dict, intern, assign } from 'htmlbars-util';
import {
  Mixin,
  Descriptor,
  extend as extendClass,
  mergeProperties,
  wrapAccessor,
  toMixin,
  relinkSubclasses
} from './mixin';

export const EMPTY_CACHE = function EMPTY_CACHE() {};

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

function turbocharge(obj) {
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
  private referenceTypes: Dict<InnerReferenceFactory>;
  private propertyMetadata: Dict<any>;
  private concatenatedProperties: Dict<any[]>;
  private hasConcatenatedProperties = false;
  private mixins: Mixin[] = [];
  private staticMixins: Mixin[] = [];
  private subclasses: HTMLBarsObjectFactory<any>[] = [];
  private slots: InternedString[] = [];
  private InstanceMetaConstructor: typeof Meta = null;

  constructor(parent: ClassMeta) {
    this.reset(parent);
  }

  init(object: HTMLBarsObject, attrs: Object) {
    if (this.hasConcatenatedProperties) {
      let props = this.concatenatedProperties;
      for (let prop in props) {
        object[prop] = props[prop];
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

  hasConcatenatedProperty(property: InternedString) {
    if (!this.hasConcatenatedProperties) return false;
    return <string>property in this.concatenatedProperties;
  }

  getConcatenatedProperty(property: InternedString) {
    return this.concatenatedProperties[<string>property];
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

    if (parent) {
      this.hasConcatenatedProperties = parent.hasConcatenatedProperties;
      for (let prop in parent.concatenatedProperties) {
        this.concatenatedProperties[prop] = parent.concatenatedProperties[prop].slice();
      }

      assign(this.referenceTypes, parent.referenceTypes);
      assign(this.concatenatedProperties, parent.concatenatedProperties);
      assign(this.propertyMetadata, parent.propertyMetadata);
    }
  }

  seal() {
    let referenceTypes: Dict<InnerReferenceFactory> = turbocharge(assign({}, this.referenceTypes));
    turbocharge(this.concatenatedProperties);

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

      referenceTypeFor(property: InternedString): InnerReferenceFactory {
        return referenceTypes[<string>property] || PropertyReference;
      }

      getSlots() {
        return this.slots;
      }
    }
  }
}

export class InstanceMeta extends ClassMeta {
  public _Meta: ClassMeta = new ClassMeta(null);

  constructor(parent: InstanceMeta) {
    super(parent);
    if (parent) this._Meta.reset(parent._Meta);
  }
}

export default class HTMLBarsObject {
  static _Meta: InstanceMeta = new InstanceMeta(null);
  static isClass = true;

  static extend(): typeof HTMLBarsObject;
  static extend<T>(extension: T): typeof HTMLBarsObject;
  static extend(...extensions: Object[]): typeof HTMLBarsObject;

  static extend(...extensions) {
    return extendClass(this, ...extensions);
  }

  static create(attrs: Object): HTMLBarsObject {
    return new this(attrs);
  }

  static reopen<U>(extensions: U) {
    toMixin(extensions).apply(this);
    this._Meta.seal();

    relinkSubclasses(this);
  }

  static reopenClass(extensions: Object) {
    toMixin(extensions).applyStatic(this, Object.getPrototypeOf(this));
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

  _super = null;
  _meta = null;

  init() {}

  constructor(attrs: Object) {
    if (attrs) assign(this, attrs);
    (<typeof HTMLBarsObject>this.constructor)._Meta.init(this, attrs);
    this.init();
  }

  get(key: string): any {
    return this[key];
  }

  set(key: string, value: any) {
    this[key] = value;
  }
}