import {
  Meta,
  ComputedBlueprint,
  setProperty,
  InnerReferenceFactory
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

export interface HTMLBarsObjectFactory<T> {
  new<U>(attrs?: U): T & U;
  extend(): HTMLBarsObjectFactory<Object>;
  extend<T>(extension: T): HTMLBarsObjectFactory<T>;
  extend(...extensions: Object[]): HTMLBarsObjectFactory<Object>;
  create<U>(attrs?: U): HTMLBarsObject & T & U;
  reopen<U>(extensions: U);
  metaForProperty(property: string): Object;
  eachComputedProperty(callback: (InternedString, Object) => void);
  _Meta: ClassMeta;
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
  private referenceTypes = dict<InnerReferenceFactory>();
  private propertyMetadata = dict();
  private mixins: Mixin[] = [];
  private subclasses: HTMLBarsObjectFactory<any>[] = [];
  private InstanceMetaConstructor: typeof Meta = null;

  constructor(parent: ClassMeta) {
    this.reset(parent);
  }

  addMixin(mixin: Mixin) {
    this.mixins = this.mixins || [];
    this.mixins.push(mixin);
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

  getReferenceTypes(): Dict<InnerReferenceFactory> {
    return this.referenceTypes;
  }

  getPropertyMetadata(): Dict<any> {
    return this.propertyMetadata;
  }

  reset(parent: ClassMeta) {
    this.referenceTypes = dict<InnerReferenceFactory>();
    if (parent) assign(this.referenceTypes, parent.referenceTypes);
    return this;
  }

  seal() {
    let referenceTypes: Dict<InnerReferenceFactory> = turbocharge(assign({}, this.referenceTypes));

    this.InstanceMetaConstructor = class extends SealedMeta {
      referenceTypeFor(property: InternedString): InnerReferenceFactory {
        return referenceTypes[<string>property];
      }
    }
  }
}

export default class HTMLBarsObject {
  static _Meta: ClassMeta = new ClassMeta(null);

  static extend(): HTMLBarsObjectFactory<Object>;
  static extend<T>(extension: T): HTMLBarsObjectFactory<T>;
  static extend(...extensions: Object[]): HTMLBarsObjectFactory<Object>;

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

  static metaForProperty(property: string): Object {
    return this._Meta.metadataForProperty(intern(property));
  }

  static eachComputedProperty(callback: (InternedString, Object) => void) {
    let metadata = this._Meta.getPropertyMetadata();
    if (!metadata) return;

    for (let prop in metadata) {
      callback(prop, metadata[prop]);
    }
  }

  _super = null;

  init() {}

  constructor(attrs: Object) {
    if (attrs) assign(this, attrs);
    this.init();
  }

  get(key: string): any {
    return this[key];
  }

  set(key: string, value: any) {
    this[key] = value;
  }
}