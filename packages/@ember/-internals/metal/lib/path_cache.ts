import Cache from '@ember/-internals/utils/lib/cache';

const firstDotIndexCache = new Cache<string, number>(1000, (key) => key.indexOf('.'));

export function isPath(path: unknown): boolean {
  return typeof path === 'string' && firstDotIndexCache.get(path) !== -1;
}
