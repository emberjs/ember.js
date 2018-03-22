export const HAS_NATIVE_SYMBOL = (function() {
  if (typeof Symbol !== 'function') {
    return false;
  }

  // use `Object`'s `.toString` directly to prevent us from detecting
  // polyfills as native
  return Object.prototype.toString.call(Symbol()) === '[object Symbol]';
})();
