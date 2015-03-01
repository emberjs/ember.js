import { get } from "ember-metal/property_get";
import { forEach } from "ember-metal/enumerable_utils";

export default function eachHelper(params, hash, blocks) {
  var list = params[0];
  var keyPath = hash.key;

  // TODO: Correct falsy semantics
  if (!list) {
    if (blocks.inverse.yield) { blocks.inverse.yield(); }
    return;
  }

  forEach(list, function(item, i) {
    var key = keyPath ? get(item, keyPath) : String(i);
    blocks.template.yieldItem(key, [item, i]);
  });
}
