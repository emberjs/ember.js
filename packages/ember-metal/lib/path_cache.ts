import { Cache } from 'ember-utils';

const firstDotIndexCache = new Cache<string, number>(1000, key => key.indexOf('.'));

export function isPath(path: any): boolean {
  return typeof path === 'string' && firstDotIndexCache.get(path) !== -1;
}
