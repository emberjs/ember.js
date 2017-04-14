export const HAS_NATIVE_WEAKMAP = ((() => {
  // detect if `WeakMap` is even present
  let hasWeakMap = typeof WeakMap === 'function';
  if (!hasWeakMap) { return false; }

  let instance = new WeakMap();
  // use `Object`'s `.toString` directly to prevent us from detecting
  // polyfills as native weakmaps
  return Object.prototype.toString.call(instance) === '[object WeakMap]';
}))();

// Returns whether Type(value) is Object according to the terminology in the spec
export function isObject(value) {
  let type = typeof value;
  return (type === 'object' && value !== null) || type === 'function';
}
