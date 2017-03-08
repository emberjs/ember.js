import { ComputedReferenceBlueprint, Meta } from '@glimmer/object-reference';
import { EMPTY_CACHE, ClassMeta } from './object';
import { Descriptor, Blueprint } from './mixin';

export interface ComputedGetCallback {
  (): any;
}

export interface LegacyComputedGetCallback {
  (key: string): any;
}

export interface ComputedSetCallback {
  (val: any): any;
}

export interface LegacyComputedSetCallback {
  (key: string, val: any): any;
}

export interface ComputedDescriptor {
  get?: ComputedGetCallback | LegacyComputedGetCallback;
  set?: ComputedSetCallback | LegacyComputedSetCallback;
}

type ComputedArgument = ComputedGetCallback | ComputedDescriptor;

export class ComputedBlueprint extends Blueprint {
  private accessor: ComputedDescriptor;
  private deps: string[][];
  private metadata: Object = {};

  constructor(accessor: ComputedDescriptor, deps: string[][] = []) {
    super();
    this.accessor = accessor;
    this.deps = deps;
  }

  descriptor(_target: Object, key: string, classMeta: ClassMeta): Descriptor {
    classMeta.addReferenceTypeFor(key, ComputedReferenceBlueprint(key, this.deps));
    classMeta.addPropertyMetadata(key, this.metadata);
    classMeta.addSlotFor(key);
    return new Computed(this.accessor);
  }

  property(...paths: string[]) {
    this.deps = paths.map(d => d.split('.'));
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

  define(prototype: Object, key: string, home: Object) {
    Object.defineProperty(prototype, key, wrapAccessor(home, key, this.accessor));
  }
}

function wrapAccessor(home: Object, accessorName: string, _desc: ComputedDescriptor): PropertyDescriptor {
  let superDesc = getPropertyDescriptor(home, accessorName);

  let originalGet: ComputedGetCallback;
  let originalSet: ComputedSetCallback;

  let desc: PropertyDescriptor = {
    enumerable: true,
    configurable: true,
  };

  let get = _desc.get;

  if (get && get.length > 0) {
    originalGet = function(this: any) { return (get as any).call(this, accessorName); };
  } else {
    originalGet = <ComputedGetCallback>_desc.get;
  }

  let set = _desc.set;

  if (set && set.length > 1) {
    originalSet = function(this: any, value) {
      return (set as any).call(this, accessorName, value);
    };
  } else {
    originalSet = <ComputedGetCallback>_desc.set;
  }

  let cacheGet = function(this: any) {
    if (Meta.exists(this)) {
      let slot = Meta.for(this).getSlots()[accessorName];
      if (slot !== EMPTY_CACHE) return slot;
    }

    return originalGet.call(this);
  };

  let cacheSet: (value: any) => void;

  if (originalSet) {
    cacheSet = function(this: any, value: any): void {
      let meta = Meta.for(this);
      let slots = meta.getSlots();

      let ret = originalSet.call(this, value);

      if (ret !== undefined) {
        slots[accessorName] = ret;
      }
    };
  } else {
    cacheSet = function(this: any, value: any) {
      let meta = Meta.for(this);
      let slots = meta.getSlots();
      if (value !== undefined) slots[accessorName] = value;
    };
  }

  if (!superDesc || 'value' in superDesc) {
    desc.get = cacheGet;
    desc.set = cacheSet;
    return desc;
  }

  desc.get = function(this: any) {
    let lastSuper = this._super;
    this._super = function(this: any) {
      return (superDesc.get as any).call(this);
    };

    try {
      return cacheGet.call(this);
    } finally {
      this._super = lastSuper;
    }
  };

  desc.set = function(this: any, val: any) {
    let lastSuper = this._super;
    this._super = function(this: any) {
      return (superDesc as any).set.call(this, val);
    };

    try {
      return cacheSet.call(this, val);
    } finally {
      this._super = lastSuper;
    }
  };

  return desc;
}

function getPropertyDescriptor(subject: any, name: string) {
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
export function computed(...args: any[]): ComputedBlueprint;

export function computed(...args: any[]) {
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

export function observer(..._args: any[]) {

}
