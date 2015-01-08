export function isAttrRemovalValue(value) {
  return value === null || value === undefined;
}

// TODO should this be an o_create kind of thing?
export var propertyCaches = {};

export function normalizeProperty(element, attrName) {
  var tagName = element.tagName;
  var key;
  var cache = propertyCaches[tagName];
  if (!cache) {
    // TODO should this be an o_create kind of thing?
    cache = {};
    for (key in element) {
      cache[key.toLowerCase()] = key;
    }
    propertyCaches[tagName] = cache;
  }

  // presumes that the attrName has been lowercased.
  return cache[attrName];
}
