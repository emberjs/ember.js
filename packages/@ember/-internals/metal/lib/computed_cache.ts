const COMPUTED_PROPERTY_CACHED_VALUES = new WeakMap<object, Map<string, any | null | undefined>>();
const COMPUTED_PROPERTY_LAST_REVISION = new WeakMap<object, Map<string, number>>();

export function getCacheFor(obj: object): Map<string, any> {
  let cache = COMPUTED_PROPERTY_CACHED_VALUES.get(obj);
  if (cache === undefined) {
    cache = new Map<string, any>();

    COMPUTED_PROPERTY_CACHED_VALUES.set(obj, cache);
  }
  return cache;
}

/**
  Returns the cached value for a property, if one exists.
  This can be useful for peeking at the value of a computed
  property that is generated lazily, without accidentally causing
  it to be created.

  @method cacheFor
  @static
  @for @ember/object/internals
  @param {Object} obj the object whose property you want to check
  @param {String} key the name of the property whose cached value you want
    to return
  @return {Object} the cached value
  @public
*/
export function getCachedValueFor(obj: object, key: string): any {
  let cache = COMPUTED_PROPERTY_CACHED_VALUES.get(obj);
  if (cache !== undefined) {
    return cache.get(key);
  }
}

export function setLastRevisionFor(obj: object, key: string, revision: number): void {
  let cache = COMPUTED_PROPERTY_LAST_REVISION!.get(obj);

  if (cache === undefined) {
    cache = new Map<string, any>();
    COMPUTED_PROPERTY_LAST_REVISION!.set(obj, cache);
  }

  cache!.set(key, revision);
}

export function getLastRevisionFor(obj: object, key: string): number {
  let cache = COMPUTED_PROPERTY_LAST_REVISION!.get(obj);
  if (cache === undefined) {
    return 0;
  } else {
    let revision = cache.get(key);
    return revision === undefined ? 0 : revision;
  }
}

export function peekCacheFor(obj: object): any {
  return COMPUTED_PROPERTY_CACHED_VALUES.get(obj);
}
