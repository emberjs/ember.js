export const HAS_NATIVE_SYMBOL = (function() {
  if (typeof Symbol !== 'function') {
    return false;
  }

  return typeof Symbol() === 'symbol';
})();
