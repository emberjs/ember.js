import Ember from 'ember-metal/core';
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
  var key, deprecatedSpecialKey;

  switch (keyPath) {
  case '@index':
    key = index;
    break;
  case '@guid':
    deprecatedSpecialKey = '@guid';
    key = guidFor(item);
    break;
  case '@item':
    deprecatedSpecialKey = '@item';
    key = item;
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

  Ember.deprecate(`Using '${deprecatedSpecialKey}' with the {{each}} helper, is deprecated. Switch to '@identity' or remove 'key=' from your template.`, !deprecatedSpecialKey);

  return key;
}
