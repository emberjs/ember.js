import { get } from 'ember-metal/property_get';
import { guidFor } from 'ember-metal/utils';

function identity(item) {
  let key;
  let type = typeof item;

  if (type === 'string' || type === 'number') {
    key = item;
  } else {
    key = guidFor(item);
  }

  return key;
}
export default function decodeEachKey(item, keyPath, index) {
  var key;

  switch (keyPath) {
  case '@index':
    key = index;
    break;
  case '@identity':
    key = identity(item);
    break;
  default:
    if (keyPath) {
      key = get(item, keyPath);
    } else {
      key = identity(item);
    }
  }

  if (typeof key === 'number') {
    key = String(key);
  }

  return key;
}
