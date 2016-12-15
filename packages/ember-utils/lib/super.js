import {
  functionMetaFor
} from './function-meta';

const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
const fnToString = Function.prototype.toString;

export const checkHasSuper = (function () {
  let sourceAvailable = fnToString.call(function() {
    return this;
  }).indexOf('return this') > -1;

  if (sourceAvailable) {
    return function checkHasSuper(func) {
      return HAS_SUPER_PATTERN.test(fnToString.call(func));
    };
  }

  return function checkHasSuper() {
    return true;
  };
}());

export const ROOT = (function() {
  function TERMINAL_SUPER_ROOT() {}

  // create meta for the terminal root
  let meta = functionMetaFor(TERMINAL_SUPER_ROOT);
  meta.writeHasSuper(false);

  return TERMINAL_SUPER_ROOT;
})();

function hasSuper(func, meta) {
  let hasSuper = meta.peekHasSuper();

  if (hasSuper === undefined) {
    hasSuper = checkHasSuper(func);
    meta.writeHasSuper(hasSuper);
  }
  return hasSuper;
}

/**
  Wraps the passed function so that `this._super` will point to the superFunc
  when the function is invoked. This is the primitive we use to implement
  calls to super.

  @private
  @method wrap
  @for Ember
  @param {Function} func The function to call
  @param {Function} superFunc The super function.
  @return {Function} wrapped function.
*/
export function wrap(func, superFunc) {
  let funcMeta = functionMetaFor(func);
  if (!hasSuper(func, funcMeta)) {
    return func;
  }

  let superFuncMeta = functionMetaFor(superFunc);
  // ensure an unwrapped super that calls _super is wrapped with a terminal _super
  if (!superFuncMeta.hasWrappedFunction() && hasSuper(superFunc, superFuncMeta)) {
    let wrappedSuperFunc = _wrap(superFunc, superFuncMeta, ROOT);
    return _wrap(func, funcMeta, wrappedSuperFunc);
  }

  return _wrap(func, funcMeta, superFunc);
}

function _wrap(func, funcMeta, superFunc) {
  function superWrapper() {
    let orig = this._super;
    this._super = superFunc;
    let ret = func.apply(this, arguments);
    this._super = orig;
    return ret;
  }

  // setup the super wrapped functions meta
  functionMetaFor(superWrapper, funcMeta);

  return superWrapper;
}
