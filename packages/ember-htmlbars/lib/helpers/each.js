import { guidFor } from "ember-metal/utils";
import { get } from "ember-metal/property_get";

export default function eachHelper(params, hash, blocks) {
  var list = params[0];
  var keyPath = hash.key;

  for (var i=0, l=list.length; i<l; i++) {
    var item = list[i];
    var key = keyPath ? get(item, keyPath) : guidFor(item);

    this.yieldItem(key, [item, i]);
  }
}
