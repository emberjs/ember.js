import { Dict } from '@glimmer/interfaces';

const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;

export const checkHasSuper = (function() {
  let sourceAvailable =
    function(this: any) {
      return this;
    }
      .toString()
      .indexOf('return this') > -1;

  if (sourceAvailable) {
    return function checkHasSuper(func: Function) {
      return HAS_SUPER_PATTERN.test(func.toString());
    };
  }

  return function checkHasSuper() {
    return true;
  };
})();

export function ROOT(..._args: any[]) {}
(ROOT as any).__hasSuper = false;

export function hasSuper(func: Function & Dict) {
  if (func['__hasSuper'] === undefined) {
    func['__hasSuper'] = checkHasSuper(func);
  }
  return func['__hasSuper'];
}
