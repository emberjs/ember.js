import type { Meta } from '@ember/-internals/meta';
import { meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

export type DecoratorPropertyDescriptor = (PropertyDescriptor & { initializer?: any }) | undefined;

// Same as built-in MethodDecorator but with more arguments
export type ExtendedMethodDecorator = (
  target: object,
  key: string,
  desc: DecoratorPropertyDescriptor,
  maybeMeta?: Meta,
  isClassicDecorator?: boolean
) => DecoratorPropertyDescriptor;

export type ElementDescriptor = [
  target: object,
  propertyName: string,
  descriptor?: DecoratorPropertyDescriptor
];

export function isElementDescriptor(args: unknown[]): args is ElementDescriptor {
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
    _propertyDesc: DecoratorPropertyDescriptor | undefined,
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

export let COMPUTED_GETTERS: WeakSet<() => unknown>;

if (DEBUG) {
  COMPUTED_GETTERS = new WeakSet();
}

function DESCRIPTOR_GETTER_FUNCTION(name: string, descriptor: ComputedDescriptor): () => unknown {
  function getter(this: object): unknown {
    return descriptor.get(this, name);
  }

  if (DEBUG) {
    COMPUTED_GETTERS.add(getter);
  }

  return getter;
}

function DESCRIPTOR_SETTER_FUNCTION(
  name: string,
  descriptor: ComputedDescriptor
): (value: any) => void {
  let set = function CPSETTER_FUNCTION(this: object, value: any): void {
    return descriptor.set(this, name, value);
  };

  COMPUTED_SETTERS.add(set);

  return set;
}

export const COMPUTED_SETTERS = new WeakSet();

export function makeComputedDecorator(
  desc: ComputedDescriptor,
  DecoratorClass: { prototype: object }
): ExtendedMethodDecorator {
  let decorator = function COMPUTED_DECORATOR(
    target: object,
    key: string,
    propertyDesc?: DecoratorPropertyDescriptor,
    maybeMeta?: Meta,
    isClassicDecorator?: boolean
  ): DecoratorPropertyDescriptor {
    assert(
      `Only one computed property decorator can be applied to a class field or accessor, but '${key}' was decorated twice. You may have added the decorator to both a getter and setter, which is unnecessary.`,
      isClassicDecorator ||
        !propertyDesc ||
        !propertyDesc.get ||
        !COMPUTED_GETTERS.has(propertyDesc.get)
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

const DECORATOR_DESCRIPTOR_MAP: WeakMap<ExtendedMethodDecorator, ComputedDescriptor | true> =
  new WeakMap();

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
  return DECORATOR_DESCRIPTOR_MAP.get(dec as ExtendedMethodDecorator);
}

/**
  Check whether a value is a decorator

  @method isClassicDecorator
  @param {any} possibleDesc the value to check
  @return {boolean}
  @private
*/
export function isClassicDecorator(dec: unknown): dec is ExtendedMethodDecorator {
  return typeof dec === 'function' && DECORATOR_DESCRIPTOR_MAP.has(dec as ExtendedMethodDecorator);
}

/**
  Set a value as a decorator

  @method setClassicDecorator
  @param {function} decorator the value to mark as a decorator
  @private
*/
export function setClassicDecorator(
  dec: ExtendedMethodDecorator,
  value: ComputedDescriptor | true = true
) {
  DECORATOR_DESCRIPTOR_MAP.set(dec, value);
}
