import { create as o_create } from "ember-metal/platform";
import keys from "ember-metal/keys";

export var propertyCaches = o_create(null);

export function normalizeProperty(element, attrName) {
  var tagName = element.tagName;
  var cache = propertyCaches[tagName];
  if (!cache) {
    cache = o_create(null);
    var properties = keys(element);
    for (var i=0, l=properties.length;i<l;i++) {
      cache[properties[i].toLowerCase()] = properties[i];
    }
    propertyCaches[tagName] = cache;
  }

  return cache[attrName.toLowerCase()];
}
