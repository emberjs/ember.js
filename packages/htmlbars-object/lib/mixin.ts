import { Meta, ComputedBlueprint, setProperty } from 'htmlbars-reference';
import { InternedString, Dict, intern, assign } from 'htmlbars-util';
import HTMLBarsObject, { HTMLBarsObjectFactory, ClassMeta } from './object';
import { ComputedGetCallback, LegacyComputedGetCallback } from './computed';

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
}

type Extension = Mixin | Object;

export function extend<T extends HTMLBarsObject>(Parent: HTMLBarsObjectFactory<T>, ...extensions: Extension[]): HTMLBarsObjectFactory<T> {
  let Super = <typeof HTMLBarsObject>Parent;

  let Class = class extends Super {};

  Class._Meta = new ClassMeta(Parent._Meta);

  let mixins = extensions.map(toMixin);

  Parent._Meta.addSubclass(Class);

  return applyMixins(Parent, Class, mixins);
}

export function toMixin(extension: Extension): Mixin {
  if (extension instanceof Mixin) return extension;
  else return new Mixin(extension);
}

export function relinkSubclasses(Parent: HTMLBarsObjectFactory<any>) {
  Parent._Meta.getSubclasses().forEach((Subclass: HTMLBarsObjectFactory<any>) => {
    Subclass._Meta.reset(Parent._Meta);
    Subclass.prototype = Object.create(Parent.prototype);
    applyMixins(Parent, Subclass, Subclass._Meta.getMixins());
    relinkSubclasses(Subclass);
  });
}

export function applyMixins(Parent: HTMLBarsObjectFactory<any>, Class: HTMLBarsObjectFactory<any>, mixins: Mixin[]): HTMLBarsObjectFactory<any> {
  mixins.forEach(mixin => mixin.apply(Class));

  Class._Meta.seal();

  return Class;
}

export function mergeProperties(superProto: Object, proto: Object, extensions: Dict<any>, classMeta: ClassMeta) {
  Object.keys(extensions).forEach(key => {
    let value = extensions[key];

    if (typeof value === "object" && DESCRIPTOR in value) {
      let extension: Descriptor = extensions[key];
      extension.define(proto, <InternedString>key, superProto);
      extension.buildMeta(classMeta, <InternedString>key);
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

export function wrapAccessor(home: Object, accessorName: InternedString, _original: ComputedGetCallback | LegacyComputedGetCallback): PropertyDescriptor {
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

function getPropertyDescriptor(subject, name) {
  var pd = Object.getOwnPropertyDescriptor(subject, name);
  var proto = Object.getPrototypeOf(subject);
  while (typeof pd === 'undefined' && proto !== null) {
    pd = Object.getOwnPropertyDescriptor(proto, name);
    proto = Object.getPrototypeOf(proto);
  }
  return pd;
}