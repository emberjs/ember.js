import SimpleStream from "ember-metal/streams/simple-stream";
import subscribe from "ember-htmlbars/utils/subscribe";

export default function updateScope(scope, key, newValue, renderNode, isSelf) {
  var existing = scope[key];

  if (existing) {
    existing.setSource(newValue);
  } else {
    var stream = new SimpleStream(newValue, isSelf ? null : key);
    if (renderNode) { subscribe(renderNode, scope, stream); }
    scope[key] = stream;
  }
}
