const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
const fnToString = Function.prototype.toString;

export const checkHasSuper = (() => {
  let sourceAvailable =
    fnToString
      .call(function(this: any) {
        return this;
      })
      .indexOf('return this') > -1;

  if (sourceAvailable) {
    return function checkHasSuper(func: Function) {
      return HAS_SUPER_PATTERN.test(fnToString.call(func));
    };
  }

  return function checkHasSuper() {
    return true;
  };
})();

export const ROOT = function ROOT() {} as {
  (): void;
  __hasSuper: boolean;
};
ROOT.__hasSuper = false;

function hasSuper(func: Function & { __hasSuper?: boolean }) {
  if (func.__hasSuper === undefined) {
    func.__hasSuper = checkHasSuper(func);
  }
  return func.__hasSuper;
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
export function wrap(func: Function, superFunc: Function) {
  if (!hasSuper(func)) {
    return func;
  }
  // ensure an unwrapped super that calls _super is wrapped with a terminal _super
  if (!(superFunc as any).wrappedFunction && hasSuper(superFunc)) {
    return _wrap(func, _wrap(superFunc, ROOT));
  }
  return _wrap(func, superFunc);
}

function _wrap(func: Function, superFunc: Function): Function {
  function superWrapper(this: { _super?: Function }) {
    let orig = this._super;
    this._super = superFunc;
    let ret = func.apply(this, arguments);
    this._super = orig;
    return ret;
  }

  (superWrapper as any).wrappedFunction = func;
  (superWrapper as any).__ember_observes__ = (func as any).__ember_observes__;
  (superWrapper as any).__ember_listens__ = (func as any).__ember_listens__;

  return superWrapper;
}
