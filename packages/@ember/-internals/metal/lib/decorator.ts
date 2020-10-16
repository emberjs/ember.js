import { Meta, meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { _WeakSet as WeakSet } from '@glimmer/util';

export type DecoratorPropertyDescriptor = (PropertyDescriptor & { initializer?: any }) | undefined;

export type Decorator = (
  target: object,
  key: string,
  desc?: DecoratorPropertyDescriptor,
  maybeMeta?: Meta,
  isClassicDecorator?: boolean
) => DecoratorPropertyDescriptor;

export function isElementDescriptor(
  args: any[]
): args is [object, string, DecoratorPropertyDescriptor] {
  let [maybeTarget, maybeKey, maybeDesc] = args;

  return (
    // Ensure we have the right number of args
    args.length === 3 &&
    // Make sure the target is a class or object (prototype)
    (typeof maybeTarget === 'function' ||
      (typeof maybeTarget === 'object' && maybeTarget !== null)) &&
    // Make sure the key is a string
    typeof maybeKey === 'string' &&
    // Make sure the descriptor is the right shape
    ((typeof maybeDesc === 'object' && maybeDesc !== null) || maybeDesc === undefined)
  );
}

export function nativeDescDecorator(propertyDesc: PropertyDescriptor) {
  let decorator = function () {
    return propertyDesc;
  };

  setClassicDecorator(decorator);

  return decorator;
}

/**
  Objects of this type can implement an interface to respond to requests to
  get and set. The default implementation handles simple properties.

  @class Descriptor
  @private
*/
export abstract class ComputedDescriptor {
  enumerable = true;
  configurable = true;
  _dependentKeys?: string[] = undefined;
  _meta: any = undefined;

  setup(
    _obj: object,
    keyName: string,
    _propertyDesc: DecoratorPropertyDescriptor,
    meta: Meta
  ): void {
    meta.writeDescriptors(keyName, this);
  }

  teardown(_obj: object, keyName: string, meta: Meta): void {
    meta.removeDescriptors(keyName);
  }

  abstract get(obj: object, keyName: string): any | null | undefined;
  abstract set(obj: object, keyName: string, value: any | null | undefined): any | null | undefined;
}

export let CPGETTERS: WeakSet<() => unknown>;
export let CPSETTERS: WeakSet<(value: unknown) => void>;

if (DEBUG) {
  CPGETTERS = new WeakSet();
  CPSETTERS = new WeakSet();
}

function DESCRIPTOR_GETTER_FUNCTION(name: string, descriptor: ComputedDescriptor): () => unknown {
  function getter(this: object): unknown {
    return descriptor.get(this, name);
  }

  if (DEBUG) {
    CPGETTERS.add(getter);
  }

  return getter;
}

function DESCRIPTOR_SETTER_FUNCTION(
  name: string,
  descriptor: ComputedDescriptor
): (value: unknown) => void {
  function setter(this: object, value: unknown): void {
    return descriptor.set(this, name, value);
  }

  if (DEBUG) {
    CPSETTERS.add(setter);
  }

  return setter;
}

export function makeComputedDecorator(
  desc: ComputedDescriptor,
  DecoratorClass: { prototype: object }
): Decorator {
  let decorator = function COMPUTED_DECORATOR(
    target: object,
    key: string,
    propertyDesc?: DecoratorPropertyDescriptor,
    maybeMeta?: Meta,
    isClassicDecorator?: boolean
  ): DecoratorPropertyDescriptor {
    assert(
      `Only one computed property decorator can be applied to a class field or accessor, but '${key}' was decorated twice. You may have added the decorator to both a getter and setter, which is unnecessary.`,
      isClassicDecorator || !propertyDesc || !propertyDesc.get || !CPGETTERS.has(propertyDesc.get)
    );

    let meta = arguments.length === 3 ? metaFor(target) : maybeMeta;
    desc.setup(target, key, propertyDesc, meta!);

    let computedDesc: PropertyDescriptor = {
      enumerable: desc.enumerable,
      configurable: desc.configurable,
      get: DESCRIPTOR_GETTER_FUNCTION(key, desc),
      set: DESCRIPTOR_SETTER_FUNCTION(key, desc),
    };

    return computedDesc;
  };

  setClassicDecorator(decorator, desc);

  Object.setPrototypeOf(decorator, DecoratorClass.prototype);

  return decorator;
}

/////////////

const DECORATOR_DESCRIPTOR_MAP: WeakMap<Decorator, ComputedDescriptor | true> = new WeakMap();

/**
  Returns the CP descriptor associated with `obj` and `keyName`, if any.

  @method descriptorForProperty
  @param {Object} obj the object to check
  @param {String} keyName the key to check
  @return {Descriptor}
  @private
*/
export function descriptorForProperty(obj: object, keyName: string, _meta?: Meta | null) {
  assert('Cannot call `descriptorForProperty` on null', obj !== null);
  assert('Cannot call `descriptorForProperty` on undefined', obj !== undefined);
  assert(
    `Cannot call \`descriptorForProperty\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  if (meta !== null) {
    return meta.peekDescriptors(keyName);
  }
}

export function descriptorForDecorator(dec: Function): ComputedDescriptor | true | undefined {
  return DECORATOR_DESCRIPTOR_MAP.get(dec as Decorator);
}

/**
  Check whether a value is a decorator

  @method isClassicDecorator
  @param {any} possibleDesc the value to check
  @return {boolean}
  @private
*/
export function isClassicDecorator(dec: unknown): dec is Decorator {
  return typeof dec === 'function' && DECORATOR_DESCRIPTOR_MAP.has(dec as Decorator);
}

/**
  Set a value as a decorator

  @method setClassicDecorator
  @param {function} decorator the value to mark as a decorator
  @private
*/
export function setClassicDecorator(dec: Decorator, value: ComputedDescriptor | true = true) {
  DECORATOR_DESCRIPTOR_MAP.set(dec, value);
}
