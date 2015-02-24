import Cache from 'ember-metal/cache';

var IS_GLOBAL      = /^[A-Z$]/;
var IS_GLOBAL_PATH = /^[A-Z$].*[\.]/;
var HAS_THIS       = 'this.';

var isGlobalCache = new Cache(1000, (key) => {
  return IS_GLOBAL.test(key);
});

var isGlobalPathCache = new Cache(1000, (key) => {
  return IS_GLOBAL_PATH.test(key);
});

var hasThisCache = new Cache(1000, (key) => {
  return key.lastIndexOf(HAS_THIS, 0) === 0;
});

var firstDotIndexCache = new Cache(1000, (key) => {
  return key.indexOf('.');
});

var firstKeyCache = new Cache(1000, (path) => {
  var index = firstDotIndexCache.get(path);
  if (index === -1) {
    return path;
  } else {
    return path.slice(0, index);
  }
});

var tailPathCache = new Cache(1000, (path) => {
  var index = firstDotIndexCache.get(path);
  if (index !== -1) {
    return path.slice(index + 1);
  }
});

export var caches = {
  isGlobalCache:      isGlobalCache,
  isGlobalPathCache:  isGlobalPathCache,
  hasThisCache:       hasThisCache,
  firstDotIndexCache: firstDotIndexCache,
  firstKeyCache:      firstKeyCache,
  tailPathCache:      tailPathCache
};

export function isGlobal(path) {
  return isGlobalCache.get(path);
}

export function isGlobalPath(path) {
  return isGlobalPathCache.get(path);
}

export function hasThis(path) {
  return hasThisCache.get(path);
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
