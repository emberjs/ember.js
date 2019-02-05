import { Meta, meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { EMBER_NATIVE_DECORATOR_SUPPORT } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { unwatch, watch } from './watching';

const DECORATOR_DESCRIPTOR_MAP: WeakMap<Decorator, ComputedDescriptor | boolean> = new WeakMap();

// https://tc39.github.io/proposal-decorators/#sec-elementdescriptor-specification-type
export interface ElementDescriptor {
  descriptor: PropertyDescriptor & { initializer?: any };
  key: string;
  kind: 'method' | 'field' | 'initializer';
  placement: 'own' | 'prototype' | 'static';
  initializer?: () => any;
  finisher?: (obj: object, meta?: Meta) => any;
}

export type Decorator = (
  desc: ElementDescriptor,
  isClassicDecorator?: boolean
) => ElementDescriptor;

// ..........................................................
// DESCRIPTOR
//

/**
  Returns the CP descriptor assocaited with `obj` and `keyName`, if any.

  @method descriptorFor
  @param {Object} obj the object to check
  @param {String} keyName the key to check
  @return {Descriptor}
  @private
*/
export function descriptorForProperty(obj: object, keyName: string, _meta?: Meta | null) {
  assert('Cannot call `descriptorFor` on null', obj !== null);
  assert('Cannot call `descriptorFor` on undefined', obj !== undefined);
  assert(
    `Cannot call \`descriptorFor\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  if (meta !== null) {
    return meta.peekDescriptors(keyName);
  }
}

export function descriptorForDecorator(dec: Decorator) {
  return DECORATOR_DESCRIPTOR_MAP.get(dec);
}

/**
  Check whether a value is a decorator

  @method isComputedDecorator
  @param {any} possibleDesc the value to check
  @return {boolean}
  @private
*/
export function isComputedDecorator(dec: Decorator | null | undefined) {
  return dec !== null && dec !== undefined && DECORATOR_DESCRIPTOR_MAP.has(dec);
}

/**
  Set a value as a decorator

  @method setComputedDecorator
  @param {function} decorator the value to mark as a decorator
  @private
*/
export function setComputedDecorator(dec: Decorator, value: any = true) {
  DECORATOR_DESCRIPTOR_MAP.set(dec, value);
}

// ..........................................................
// DEPENDENT KEYS
//

export function addDependentKeys(
  desc: ComputedDescriptor,
  obj: object,
  keyName: string,
  meta: Meta
): void {
  // the descriptor has a list of dependent keys, so
  // add all of its dependent keys.
  let depKeys = desc._dependentKeys;
  if (depKeys === null || depKeys === undefined) {
    return;
  }

  for (let idx = 0; idx < depKeys.length; idx++) {
    let depKey = depKeys[idx];
    // Increment the number of times depKey depends on keyName.
    meta.writeDeps(depKey, keyName, meta.peekDeps(depKey, keyName) + 1);
    // Watch the depKey
    watch(obj, depKey, meta);
  }
}

export function removeDependentKeys(
  desc: ComputedDescriptor,
  obj: object,
  keyName: string,
  meta: Meta
): void {
  // the descriptor has a list of dependent keys, so
  // remove all of its dependent keys.
  let depKeys = desc._dependentKeys;
  if (depKeys === null || depKeys === undefined) {
    return;
  }

  for (let idx = 0; idx < depKeys.length; idx++) {
    let depKey = depKeys[idx];
    // Decrement the number of times depKey depends on keyName.
    meta.writeDeps(depKey, keyName, meta.peekDeps(depKey, keyName) - 1);
    // Unwatch the depKey
    unwatch(obj, depKey, meta);
  }
}

export function nativeDescDecorator(propertyDesc: PropertyDescriptor) {
  let decorator = function(elementDesc: ElementDescriptor) {
    elementDesc.descriptor = propertyDesc;
    return elementDesc;
  };

  setComputedDecorator(decorator);

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

  setup(_obj: object, keyName: string, _propertyDesc: PropertyDescriptor, meta: Meta): void {
    meta.writeDescriptors(keyName, this);
  }

  teardown(_obj: object, keyName: string, meta: Meta): void {
    meta.removeDescriptors(keyName);
  }

  abstract get(obj: object, keyName: string): any | null | undefined;
  abstract set(obj: object, keyName: string, value: any | null | undefined): any | null | undefined;

  willWatch?(obj: object, keyName: string, meta: Meta): void;
  didUnwatch?(obj: object, keyName: string, meta: Meta): void;

  didChange?(obj: object, keyName: string): void;
}

function DESCRIPTOR_GETTER_FUNCTION(name: string, descriptor: ComputedDescriptor): () => any {
  return function CPGETTER_FUNCTION(this: object): any {
    return descriptor.get(this, name);
  };
}

export function makeComputedDecorator(
  desc: ComputedDescriptor,
  DecoratorClass: { prototype: object }
) {
  let decorator = function COMPUTED_DECORATOR(
    elementDesc: ElementDescriptor,
    isClassicDecorator?: boolean
  ): ElementDescriptor {
    let { key, descriptor: propertyDesc } = elementDesc;

    if (DEBUG) {
      // Store the initializer for assertions
      propertyDesc.initializer = elementDesc.initializer;
    }

    assert(
      'Native decorators are not enabled without the EMBER_NATIVE_DECORATOR_SUPPORT flag',
      EMBER_NATIVE_DECORATOR_SUPPORT || isClassicDecorator
    );

    elementDesc.kind = 'method';
    elementDesc.descriptor = {
      enumerable: desc.enumerable,
      configurable: desc.configurable,
      get: DESCRIPTOR_GETTER_FUNCTION(elementDesc.key, desc),
    };

    elementDesc.finisher = function(klass: any, _meta?: Meta) {
      let obj = klass.prototype !== undefined ? klass.prototype : klass;
      let meta = arguments.length === 1 ? metaFor(obj) : _meta;

      desc.setup(obj, key, propertyDesc, meta!);
    };

    return elementDesc;
  };

  setComputedDecorator(decorator, desc);

  Object.setPrototypeOf(decorator, DecoratorClass.prototype);

  return decorator;
}
