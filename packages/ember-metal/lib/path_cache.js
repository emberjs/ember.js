import Cache from 'ember-metal/cache';

var IS_GLOBAL      = /^([A-Z$]|([0-9][A-Z$]))/;
var IS_GLOBAL_PATH = /^([A-Z$]|([0-9][A-Z$])).*[\.]/;
var HAS_THIS       = 'this.';

var isGlobalCache     = new Cache(1000, function(key) { return IS_GLOBAL.test(key);          });
var isGlobalPathCache = new Cache(1000, function(key) { return IS_GLOBAL_PATH.test(key);     });
var hasThisCache      = new Cache(1000, function(key) { return key.indexOf(HAS_THIS) !== -1; });
var isPathCache       = new Cache(1000, function(key) { return key.indexOf('.')      !== -1; });

export var caches = {
  isGlobalCache:     isGlobalCache,
  isGlobalPathCache: isGlobalPathCache,
  hasThisCache:      hasThisCache,
  isPathCache:       isPathCache
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
  return isPathCache.get(path);
}
