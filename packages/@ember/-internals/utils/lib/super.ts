const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
const fnToString = Function.prototype.toString;

export const checkHasSuper = (() => {
  let sourceAvailable =
    fnToString
      .call(function (this: any) {
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

const HAS_SUPER_MAP = new WeakMap();

export const ROOT = Object.freeze(function () {});
HAS_SUPER_MAP.set(ROOT, false);

function hasSuper(func: Function) {
  let hasSuper = HAS_SUPER_MAP.get(func);
  if (hasSuper === undefined) {
    hasSuper = checkHasSuper(func);
    HAS_SUPER_MAP.set(func, hasSuper);
  }
  return hasSuper;
}

class ObserverListenerMeta {
  listeners?: string[] = undefined;
  observers?: { paths: string[]; sync: boolean } = undefined;
}

const OBSERVERS_LISTENERS_MAP = new WeakMap<Function, ObserverListenerMeta>();

function createObserverListenerMetaFor(fn: Function) {
  let meta = OBSERVERS_LISTENERS_MAP.get(fn);

  if (meta === undefined) {
    meta = new ObserverListenerMeta();
    OBSERVERS_LISTENERS_MAP.set(fn, meta);
  }

  return meta;
}

export function observerListenerMetaFor(fn: Function): ObserverListenerMeta | undefined {
  return OBSERVERS_LISTENERS_MAP.get(fn);
}

export function setObservers(func: Function, observers: { paths: string[]; sync: boolean }): void {
  let meta = createObserverListenerMetaFor(func);
  meta.observers = observers;
}

export function setListeners(func: Function, listeners: string[]): void {
  let meta = createObserverListenerMetaFor(func);
  meta.listeners = listeners;
}

const IS_WRAPPED_FUNCTION_SET = new WeakSet();

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
export function wrap(func: Function, superFunc: Function): Function {
  if (!hasSuper(func)) {
    return func;
  }
  // ensure an unwrapped super that calls _super is wrapped with a terminal _super
  if (!IS_WRAPPED_FUNCTION_SET.has(superFunc) && hasSuper(superFunc)) {
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

  IS_WRAPPED_FUNCTION_SET.add(superWrapper);

  let meta = OBSERVERS_LISTENERS_MAP.get(func);

  if (meta !== undefined) {
    OBSERVERS_LISTENERS_MAP.set(superWrapper, meta);
  }

  return superWrapper;
}
