import { guidFor } from "ember-metal/utils";

export default function eachHelper(params, hash, blocks) {
  var list = params[0];

  for (var i=0, l=list.length; i<l; i++) {
    var item = list[i];
    this.yieldItem(guidFor(item), [item, i]);
  }
}
