import { get } from "ember-metal/property_get";
import { guidFor } from "ember-metal/utils";

export default function decodeEachKey(item, keyPath, index) {
  var key;

  switch (keyPath) {
  case '@index':
    key = index;
    break;
  case '@guid':
    key = guidFor(item);
    break;
  case '@item':
    key = item;
    break;
  default:
    key = keyPath ? get(item, keyPath) : index;
  }

  if (typeof key === 'number') {
    key = String(key);
  }

  return key;
}
