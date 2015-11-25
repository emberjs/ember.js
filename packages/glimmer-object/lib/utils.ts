const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;

export const checkHasSuper = (function () {
  let sourceAvailable = (function() {
    return this;
  }).toString().indexOf('return this') > -1;

  if (sourceAvailable) {
    return function checkHasSuper(func) {
      return HAS_SUPER_PATTERN.test(func.toString());
    };
  }

  return function checkHasSuper() {
    return true;
  };
}());

export function ROOT(...args) {}
(<any>ROOT).__hasSuper = false;

export function hasSuper(func) {
  if (func.__hasSuper === undefined) {
    func.__hasSuper = checkHasSuper(func);
  }
  return func.__hasSuper;
}