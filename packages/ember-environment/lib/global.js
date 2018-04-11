/* globals global, window, self, mainContext */

// from lodash to catch fake globals
function checkGlobal(value) {
  return value && value.Object === Object ? value : undefined;
}

// element ids can ruin global miss checks
function checkElementIdShadowing(value) {
  return value && value.nodeType === undefined ? value : undefined;
}

// export real global
export default checkGlobal(checkElementIdShadowing(typeof global === 'object' && global)) ||
checkGlobal(typeof self === 'object' && self) ||
checkGlobal(typeof window === 'object' && window) ||
mainContext || // set before strict mode in Ember loader/wrapper
  new Function('return this')(); // eval outside of strict mode
