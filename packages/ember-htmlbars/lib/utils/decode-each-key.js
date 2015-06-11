import Ember from "ember-metal/core";
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
    if (keyPath) {
      key = get(item, keyPath);
    } else {
      Ember.warn('Using `{{each}}` without specifying a key can lead to unusual behavior.  Please specify a `key` that identifies a unique value on each item being iterated. E.g. `{{each model key="@guid" as |item|}}`.');
      key = index;
    }
  }

  if (typeof key === 'number') {
    key = String(key);
  }

  return key;
}
