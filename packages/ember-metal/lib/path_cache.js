import Cache from './cache';

const IS_GLOBAL_PATH = /^[A-Z$].*[\.]/;

const isGlobalPathCache  = new Cache(1000, key => IS_GLOBAL_PATH.test(key));
const firstDotIndexCache = new Cache(1000, key => key.indexOf('.'));

const firstKeyCache = new Cache(1000, (path) => {
  let index = firstDotIndexCache.get(path);
  return index === -1 ? path : path.slice(0, index);
});

const tailPathCache = new Cache(1000, (path) => {
  let index = firstDotIndexCache.get(path);
  return index === -1 ? undefined : path.slice(index + 1);
});

export const caches = {
  isGlobalPathCache,
  firstDotIndexCache,
  firstKeyCache,
  tailPathCache
};

export function isGlobalPath(path) {
  return isGlobalPathCache.get(path);
}

export function isPath(path) {
  return firstDotIndexCache.get(path) !== -1;
}

export function getFirstKey(path) {
  return firstKeyCache.get(path);
}

export function getTailPath(path) {
  return tailPathCache.get(path);
}
