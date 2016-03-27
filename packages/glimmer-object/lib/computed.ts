import { InternedString, intern } from 'glimmer-util';
import { ComputedReferenceBlueprint, Meta } from 'glimmer-object-reference';
import { EMPTY_CACHE, ClassMeta } from './object';
import { Descriptor, Blueprint } from './mixin';

export interface ComputedGetCallback {
  (): any;
}

export interface LegacyComputedGetCallback {
  (key: string): any;
}

export interface ComputedSetCallback {
  (val: any);
}

export interface LegacyComputedSetCallback {
  (key: string, val: any);
}

export interface ComputedDescriptor {
  get?: ComputedGetCallback | LegacyComputedGetCallback;
  set?: ComputedSetCallback | LegacyComputedSetCallback;
}

type ComputedArgument = ComputedGetCallback | ComputedDescriptor;

export class ComputedBlueprint extends Blueprint {
  private accessor: ComputedDescriptor;
  private deps: InternedString[][];
  private metadata: Object = {};

  constructor(accessor: ComputedDescriptor, deps: InternedString[][] = []) {
    super();
    this.accessor = accessor;
    this.deps = deps;
  }

  descriptor(target: Object, key: InternedString, classMeta: ClassMeta): Descriptor {
    classMeta.addReferenceTypeFor(key, ComputedReferenceBlueprint(key, this.deps));
    classMeta.addPropertyMetadata(key, this.metadata);
    classMeta.addSlotFor(key);
    return new Computed(this.accessor);
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

class Computed implements Descriptor {
  enumerable: boolean;
  configurable: boolean;

  private accessor: ComputedDescriptor;
  "5d90f84f-908e-4a42-9749-3d0f523c262c" = true;

  constructor(accessor: ComputedDescriptor) {
    this.accessor = accessor;
  }

  define(prototype: Object, key: InternedString, home: Object) {
    Object.defineProperty(prototype, key, wrapAccessor(home, key, this.accessor));
  }
}

function wrapAccessor(home: Object, accessorName: InternedString, _desc: ComputedDescriptor): PropertyDescriptor {
  let superDesc = getPropertyDescriptor(home, accessorName);

  let originalGet: ComputedGetCallback;
  let originalSet: ComputedSetCallback;

  let desc: PropertyDescriptor = {
    enumerable: true,
    configurable: true,
  };

  if (_desc.get && _desc.get.length > 0) {
    originalGet = function() { return _desc.get.call(this, accessorName); };
  } else {
    originalGet = <ComputedGetCallback>_desc.get;
  }

  if (_desc.set && _desc.set.length > 1) {
    originalSet = function(value) {
      return _desc.set.call(this, accessorName, value);
    };
  } else {
    originalSet = <ComputedGetCallback>_desc.set;
  }

  let cacheGet = function() {
    if (Meta.exists(this)) {
      let slot = Meta.for(this).getSlots()[<string>accessorName];
      if (slot !== EMPTY_CACHE) return slot;
    }

    return originalGet.call(this);
  };

  let cacheSet;

  if (originalSet) {
    cacheSet = function(value) {
      let meta = Meta.for(this);
      let slots = meta.getSlots();

      let ret = originalSet.call(this, value);

      if (ret !== undefined) {
        slots[<string>accessorName] = ret;
      }
    };
  } else {
    cacheSet = function(value) {
      let meta = Meta.for(this);
      let slots = meta.getSlots();
      if (value !== undefined) slots[<string>accessorName] = value;
    };
  }

  if (!superDesc || 'value' in superDesc) {
    desc.get = cacheGet;
    desc.set = cacheSet;
    return desc;
  }

  desc.get = function() {
    let lastSuper = this._super;
    this._super = function() {
      return superDesc.get.call(this);
    };

    try {
      return cacheGet.call(this);
    } finally {
      this._super = lastSuper;
    }
  };

  desc.set = function(val) {
    let lastSuper = this._super;
    this._super = function() {
      return superDesc.set.call(this, val);
    };

    try {
      return cacheSet.call(this, val);
    } finally {
      this._super = lastSuper;
    }
  };

  return desc;
}

function getPropertyDescriptor(subject, name) {
  let pd = Object.getOwnPropertyDescriptor(subject, name);
  let proto = Object.getPrototypeOf(subject);
  while (typeof pd === 'undefined' && proto !== null) {
    pd = Object.getOwnPropertyDescriptor(proto, name);
    proto = Object.getPrototypeOf(proto);
  }
  return pd;
}

export function computed(desc: ComputedDescriptor): ComputedBlueprint;
export function computed(getter: ComputedGetCallback | LegacyComputedGetCallback): ComputedBlueprint;
export function computed(...args): ComputedBlueprint;

export function computed(...args) {
  let last: ComputedArgument = args.pop();
  let deps = args;

  if (typeof last === 'function') {
    return new ComputedBlueprint({
      get: <ComputedGetCallback | LegacyComputedGetCallback>last
    }).property(...deps);
  } else if (typeof last === 'object') {
    return new ComputedBlueprint(<ComputedDescriptor>last).property(...deps);
  } else {
    throw new TypeError("computed expects a function or an object as last argument");
  }
}

export function observer(...args) {

}
