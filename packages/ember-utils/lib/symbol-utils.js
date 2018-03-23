export const HAS_NATIVE_SYMBOL = (function() {
  let hasSymbol = typeof Symbol === 'function';
  if (hasSymbol === false) { return false; }

  let instance = Symbol('test-symbol');
  // use `Object`'s `.toString` directly to prevent us from detecting
  // polyfills as native
  return Object.prototype.toString.call(instance) === '[object Symbol]';
})();
