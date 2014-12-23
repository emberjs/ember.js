import { create as o_create } from "ember-metal/platform";

export var propertyCaches = o_create(null);

export function normalizeProperty(element, attrName) {
  var tagName = element.tagName;
  var key;
  var cache = propertyCaches[tagName];
  if (!cache) {
    cache = o_create(null);
    for (key in element) {
      cache[key.toLowerCase()] = key;
    }
    propertyCaches[tagName] = cache;
  }

  return cache[attrName.toLowerCase()];
}
