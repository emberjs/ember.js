import { Meta, MetaBuilder, MetaFactory, BlankMeta, SealedMeta, ComputedBlueprint, setProperty } from 'htmlbars-reference';
import { InternedString, Dict, intern, assign } from 'htmlbars-util';

interface HTMLBarsObjectFactory<T> {
  new<U>(attrs?: U): T & U;
  extend<U>(extensions: U): HTMLBarsObjectFactory<T & U>;
  create<U>(attrs?: U): HTMLBarsObject & T & U;
  reopen<U>(extensions: U);
  metaForProperty(property: string): Object;
  eachComputedProperty(callback: (InternedString, Object) => void);
  _Meta: typeof SealedMeta;
}

export const DESCRIPTOR = "5d90f84f-908e-4a42-9749-3d0f523c262c";

function extend<T extends HTMLBarsObject, U>(Parent: HTMLBarsObjectFactory<T>, extensions: U): HTMLBarsObjectFactory<T & U> {
  let builder = new MetaBuilder(Parent._Meta);

  let Super = <typeof HTMLBarsObject>Parent;

  let Class = class extends Super {};

  mergeProperties(Super.prototype, Class.prototype, extensions, builder);

  Class._Meta = builder.seal();
  return Class;
}

function mergeProperties(superProto: Object, proto: Object, extensions: Dict<any>, builder: MetaBuilder) {
  Object.keys(extensions).forEach(key => {
    let value = extensions[key];

    if (typeof value === "object" && DESCRIPTOR in value) {
      let extension: Descriptor = extensions[key];
      extension.define(proto, <InternedString>key, superProto);
      extension.buildMeta(builder, <InternedString>key);
    } else {
      if (typeof value === 'function') {
        value = wrapMethod(superProto, <InternedString>key, value);
      }

      Object.defineProperty(proto, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
      });
    }
  });

}

function wrapMethod(home: Object, methodName: InternedString, original: (...args) => any) {
  if (!(<string>methodName in home)) return original;

  return function(...args) {
    let lastSuper = this._super;
    this._super = function(...args) {
      return home[<string>methodName].apply(this, args);
    }

    try {
      return original.apply(this, args);
    } finally {
      this._super = lastSuper;
    }
  }
}

function wrapAccessor(home: Object, accessorName: InternedString, _original: ComputedGetCallback | LegacyComputedGetCallback): PropertyDescriptor {
  let superDesc = getPropertyDescriptor(home, accessorName);
  let desc: PropertyDescriptor = {
    enumerable: true,
    configurable: true
  };

  let original: ComputedGetCallback;

  if (_original.length > 0) {
    original = function() {
      return _original.call(this, accessorName);
    }
  }

  original = <ComputedGetCallback>_original;

  if (!(superDesc && 'get' in superDesc)) {
    desc.get = original;
    return desc;
  }

  desc.get = function() {
    let lastSuper = this._super;
    this._super = function() {
      let getter = getPropertyDescriptor(home, accessorName);
      return getter.get.call(this);
    }

    try {
      return original.apply(this);
    } finally {
      this._super = lastSuper;
    }
  }

  return desc;
}

let extendClass = extend;

export default class HTMLBarsObject {
  static _Meta: typeof SealedMeta = BlankMeta;

  static extend<U>(extensions: U): HTMLBarsObjectFactory<U> {
    return extendClass(this, extensions);
  }

  static create(attrs: Object): HTMLBarsObject {
    return new this(attrs);
  }

  static reopen<U>(extensions: U) {
    this._Meta = this._Meta.reopen(builder => {
      mergeProperties(this.prototype, this.prototype, extensions, builder);
    });
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

interface ComputedGetCallback {
  (): any;
}

interface LegacyComputedGetCallback {
  (key: string): any;
}

interface ComputedSetCallback {
  (val: any);
}

interface LegacyComputedSetCallback {
  (key: string, val: any);
}

interface ComputedDescriptor {
  get?: ComputedGetCallback | LegacyComputedGetCallback;
  set?: ComputedSetCallback | LegacyComputedSetCallback;
}

type ComputedArgument = ComputedGetCallback | ComputedDescriptor;

interface Descriptor {
  "5d90f84f-908e-4a42-9749-3d0f523c262c": boolean;
  define(prototype: Object, key: InternedString, home: Object);
  buildMeta(builder: MetaBuilder, key: InternedString);
}

class Computed implements Descriptor {
  private accessor: ComputedDescriptor;
  private deps: InternedString[][];
  private metadata: Object = {};
  "5d90f84f-908e-4a42-9749-3d0f523c262c" = true;

  constructor(accessor: ComputedDescriptor, deps: string[]) {
    this.accessor = accessor;
    this.property(...deps);
  }

  define(prototype: Object, key: InternedString, home: Object) {
    Object.defineProperty(prototype, key, wrapAccessor(home, key, this.accessor.get));
  }

  buildMeta(builder: MetaBuilder, key: InternedString) {
    builder.addReferenceTypeFor(key, ComputedBlueprint(key, this.deps));
    builder.addPropertyMetadata(key, this.metadata);
  }

  property(...paths: string[]) {
    this.deps = paths.map(d => d.split('.').map(intern));
    return this;
  }

  meta(object: Object) {
    this.metadata = object;
    return this;
  }

  volatile() {
    return this;
  }
}

export function computed(desc: ComputedDescriptor): Computed;
export function computed(getter: ComputedGetCallback | LegacyComputedGetCallback): Computed;

export function computed(...args) {
  let last: ComputedArgument = args.pop();
  let deps = args;

  if (typeof last === 'function') {
    return new Computed({
      get: <ComputedGetCallback | LegacyComputedGetCallback>last
    }, deps);
  } else if (typeof last === 'object') {
    return new Computed(<ComputedDescriptor>last, deps);
  } else {
    throw new TypeError("computed expects a function or an object as last argument")
  }
}

export function observer(...args) {

}

export function alias(...args) {
  return computed(() => {});
}

function getPropertyDescriptor(subject, name) {
  var pd = Object.getOwnPropertyDescriptor(subject, name);
  var proto = Object.getPrototypeOf(subject);
  while (typeof pd === 'undefined' && proto !== null) {
    pd = Object.getOwnPropertyDescriptor(proto, name);
    proto = Object.getPrototypeOf(proto);
  }
  return pd;
}