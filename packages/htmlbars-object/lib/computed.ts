import { InternedString, intern } from 'htmlbars-util';
import { ComputedBlueprint, Meta } from 'htmlbars-reference';
import { ClassMeta } from './object';
import { Descriptor, wrapAccessor } from './mixin';

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
    Object.defineProperty(prototype, key, wrapAccessor(home, key, this.accessor));
  }

  buildMeta(classMeta: ClassMeta, key: InternedString) {
    classMeta.addReferenceTypeFor(key, ComputedBlueprint(key, this.deps));
    classMeta.addPropertyMetadata(key, this.metadata);
    classMeta.addSlotFor(key);
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
