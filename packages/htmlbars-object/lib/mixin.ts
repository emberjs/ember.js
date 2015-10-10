import { Meta, ComputedBlueprint, setProperty } from 'htmlbars-reference';
import { InternedString, Dict, intern, assign } from 'htmlbars-util';
import HTMLBarsObject, { HTMLBarsObjectFactory, ClassMeta, InstanceMeta, EMPTY_CACHE } from './object';
import {
  ComputedDescriptor,
  ComputedGetCallback,
  LegacyComputedGetCallback,
  ComputedSetCallback,
  LegacyComputedSetCallback
} from './computed';

export const DESCRIPTOR = "5d90f84f-908e-4a42-9749-3d0f523c262c";

export interface Descriptor {
  "5d90f84f-908e-4a42-9749-3d0f523c262c": boolean;
  define(prototype: Object, key: InternedString, home: Object);
  buildMeta(classMeta: ClassMeta, key: InternedString);
}

export class Mixin {
  private extensions: Object;
  private wasApplied = false;

  constructor(extensions: Object) {
    this.extensions = extensions;
  }

  reopen(extensions: Object) {
    assign(this.extensions, extensions);
  }

  apply(Target: HTMLBarsObjectFactory<any>) {
    let prototype = Object.create(Target.prototype);
    mergeProperties(Target.prototype, prototype, this.extensions, Target._Meta);
    prototype.constructor = Target;
    Target.prototype = prototype;
    Target._Meta.addMixin(this);
  }

  applyStatic(Target: HTMLBarsObjectFactory<any>, Parent: HTMLBarsObjectFactory<any>) {
    mergeProperties(Parent, Target, this.extensions, Target._Meta._Meta);
    Target._Meta.addStaticMixin(this);
  }
}

type Extension = Mixin | Object;

export function extend<T extends HTMLBarsObject>(Parent: HTMLBarsObjectFactory<T>, ...extensions: Extension[]): typeof HTMLBarsObject {
  let Super = <typeof HTMLBarsObject>Parent;

  let Class = class extends Super {};

  Class._Meta = new InstanceMeta(Parent._Meta);

  let mixins = extensions.map(toMixin);

  Parent._Meta.addSubclass(Class);

  applyStaticMixins(Class, Parent, Class._Meta.getStaticMixins());
  applyMixins(Class, mixins);
  Class._Meta.seal();

  return Class;
}

export function toMixin(extension: Extension): Mixin {
  if (extension instanceof Mixin) return extension;
  else return new Mixin(extension);
}

export function relinkSubclasses(Parent: HTMLBarsObjectFactory<any>) {
  Parent._Meta.getSubclasses().forEach((Subclass: HTMLBarsObjectFactory<any>) => {
    Subclass._Meta.reset(Parent._Meta);
    Subclass._Meta._Meta.reset(Parent._Meta._Meta);
    Subclass.prototype = Object.create(Parent.prototype);
    applyStaticMixins(Subclass, Parent, Subclass._Meta.getStaticMixins());
    applyMixins(Subclass, Subclass._Meta.getMixins());
    Subclass._Meta.seal();
    relinkSubclasses(Subclass);
  });
}

export function applyStaticMixins(Class: HTMLBarsObjectFactory<any>, Parent: HTMLBarsObjectFactory<any>, mixins: Mixin[]) {
  mixins.forEach(mixin => mixin.applyStatic(Class, Parent));
}

export function applyMixins(Class: HTMLBarsObjectFactory<any>, mixins: Mixin[]) {
  mixins.forEach(mixin => mixin.apply(Class));
}

export function mergeProperties(superProto: Object, proto: Object, extensions: Dict<any>, classMeta: ClassMeta) {
  if ('concatenatedProperties' in extensions) {
    (<any>extensions).concatenatedProperties.forEach(prop => {
      classMeta.addConcatenatedProperty(prop, []);
    })
  }

  Object.keys(extensions).forEach(key => {
    let value = extensions[key];

    if (typeof value === "object" && DESCRIPTOR in value) {
      let extension: Descriptor = extensions[key];
      extension.define(proto, <InternedString>key, superProto);
      extension.buildMeta(classMeta, <InternedString>key);
    } else if (key === 'concatenatedProperties') {
      return;
    } else {
      if (typeof value === 'function') {
        value = wrapMethod(superProto, <InternedString>key, value);
      }

      if (classMeta.hasConcatenatedProperty(<InternedString>key)) {
        classMeta.addConcatenatedProperty(<InternedString>key, value);
        value = classMeta.getConcatenatedProperty(<InternedString>key);
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

export function wrapMethod(home: Object, methodName: InternedString, original: (...args) => any) {
  if (!(<string>methodName in home)) return original;

  return function(...args) {
    let lastSuper = this._super;
    this._super = home[<string>methodName];

    try {
      return original.apply(this, args);
    } finally {
      this._super = lastSuper;
    }
  }
}

export function wrapAccessor(home: Object, accessorName: InternedString, _desc: ComputedDescriptor): PropertyDescriptor {
  let superDesc = getPropertyDescriptor(home, accessorName);

  let originalGet: ComputedGetCallback;
  let originalSet: ComputedSetCallback;

  let desc: PropertyDescriptor = {
    enumerable: true,
    configurable: true,
  };

  if (_desc.get && _desc.get.length > 0) {
    originalGet = function() {
      return _desc.get.call(this, accessorName);
    }
  } else {
    originalGet = <ComputedGetCallback>_desc.get;
  }

  if (_desc.set && _desc.set.length > 1) {
    originalSet = function(value) {
      return _desc.set.call(this, accessorName, value);
    }
  } else {
    originalSet = <ComputedGetCallback>_desc.set;
  }

  let cacheGet = function() {
    if (Meta.exists(this)) {
      let slot = Meta.for(this).getSlots()[<string>accessorName];
      if (slot !== EMPTY_CACHE) return slot;
    }

    return originalGet.call(this);
  }

  let cacheSet = function(value) {
    let meta = Meta.for(this);
    let slots = meta.getSlots();

    let ret = originalSet.call(this, value);

    if (ret !== undefined) {
      slots[<string>accessorName] = ret;
    }
  }

  desc.set = cacheSet;

  if (!(superDesc && 'get' in superDesc)) {
    desc.get = cacheGet;
    return desc;
  }

  desc.get = function() {
    let lastSuper = this._super;
    this._super = function() {
      let getter = getPropertyDescriptor(home, accessorName);
      return getter.get.call(this);
    }

    try {
      return cacheGet.apply(this);
    } finally {
      this._super = lastSuper;
    }
  }

  return desc;
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