import { Opaque } from 'glimmer-util';

export abstract class Blueprint {
  constructor(protected key: PropertyKey) {}
  abstract define(home: Object);
}

const VALUE_DESCRIPTOR: PropertyDescriptor = {
  enumerable: true,
  configurable: true,
  writable: true,
  value: undefined
};

const ACCESSOR_DESCRIPTOR: PropertyDescriptor = {
  enumerable: true,
  configurable: true,
  get: undefined,
  set: undefined
};

export class ValueBlueprint extends Blueprint {
  constructor(key: PropertyKey, private value: Opaque) {
    super(key);
  }

  define(home: Object) {
    VALUE_DESCRIPTOR.value = this.value;
    Object.defineProperty(home, this.key, VALUE_DESCRIPTOR);
  }
}

export interface Accessor<T> {
  get(): T;
  set(val: T): void;
}

export abstract class GlimmerDescriptor {
  abstract blueprint(key: PropertyKey): Blueprint;
  abstract define(home: Object, key: PropertyKey);
}

export class Computed<T> extends GlimmerDescriptor {
  constructor(private dependentKeys: string[], private accessor: Accessor<T>) {
    super();
  }

  blueprint(key: PropertyKey): ComputedBlueprint {
    return new ComputedBlueprint(key, this);
  }

  define(home: Object, key: PropertyKey) {
    ACCESSOR_DESCRIPTOR.get = this.accessor.get;
    ACCESSOR_DESCRIPTOR.set = this.accessor.set;
    Object.defineProperty(home, key, ACCESSOR_DESCRIPTOR);
  }
}

export function computed<T>(dep1: string, accessor: Accessor<T>): T;
export function computed<T>(dep1: string, dep2: string, accessor: Accessor<T>): T;
export function computed<T>(dep1: string, dep2: string, dep3: string, accessor: Accessor<T>): T;
export function computed<T>(dep1: string, dep2: string, dep3: string, dep4: string, accessor: Accessor<T>): T;

export function computed(...args: any[]): Opaque {
  let depKeys: string[] = args.slice(0, -2);
  let accessor: Accessor<Opaque> = args[args.length - 1];

  return new Computed(depKeys, accessor);
}

export class ComputedBlueprint extends Blueprint {
  constructor(key: PropertyKey, private computed: Computed<Opaque>) {
    super(key);
  }

  define(home: Object) {
    this.computed.define(home, this.key);
  }
}

export class DescriptorBlueprint extends Blueprint {
  constructor(key: PropertyKey, private descriptor: PropertyDescriptor) {
    super(key);
  }

  define(home: Object) {
    Object.defineProperty(home, this.key, this.descriptor);
  }
}
