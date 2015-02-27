import SimpleStream from "ember-metal/streams/simple";
import subscribe from "ember-htmlbars/utils/subscribe";

export default function updateScope(scope, key, newValue, renderNode) {
  var existing = scope[key];

  if (existing) {
    existing.setSource(newValue);
  } else {
    var stream = new SimpleStream(newValue);
    if (renderNode) { subscribe(renderNode, scope, stream); }
    scope[key] = stream;
  }
}
