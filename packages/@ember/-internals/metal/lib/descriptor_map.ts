import { Meta, peekMeta } from '@ember/-internals/meta';
import { assert } from '@ember/debug';

const DECORATOR_DESCRIPTOR_MAP: WeakMap<
  import('./decorator').Decorator,
  import('./decorator').ComputedDescriptor | boolean
> = new WeakMap();

/**
  Returns the CP descriptor assocaited with `obj` and `keyName`, if any.

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

export function descriptorForDecorator(dec: import('./decorator').Decorator) {
  return DECORATOR_DESCRIPTOR_MAP.get(dec);
}

/**
  Check whether a value is a decorator

  @method isClassicDecorator
  @param {any} possibleDesc the value to check
  @return {boolean}
  @private
*/
export function isClassicDecorator(dec: any) {
  return dec !== null && dec !== undefined && DECORATOR_DESCRIPTOR_MAP.has(dec);
}

/**
  Set a value as a decorator

  @method setClassicDecorator
  @param {function} decorator the value to mark as a decorator
  @private
*/
export function setClassicDecorator(dec: import('./decorator').Decorator, value: any = true) {
  DECORATOR_DESCRIPTOR_MAP.set(dec, value);
}
