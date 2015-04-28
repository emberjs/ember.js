import ProxyStream from "ember-metal/streams/proxy-stream";
import subscribe from "ember-htmlbars/utils/subscribe";

export default function updateScope(scope, key, newValue, renderNode, isSelf) {
  var existing = scope[key];

  if (existing) {
    existing.setSource(newValue);
  } else {
    var stream = new ProxyStream(newValue, isSelf ? null : key);
    if (renderNode) { subscribe(renderNode, scope, stream); }
    scope[key] = stream;
  }
}
