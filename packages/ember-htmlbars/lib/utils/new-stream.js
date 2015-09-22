import ProxyStream from 'ember-metal/streams/proxy-stream';
import subscribe from 'ember-htmlbars/utils/subscribe';

export default function newStream(scope, key, newValue, renderNode, isSelf) {
  var stream = new ProxyStream(newValue, isSelf ? '' : key);
  if (renderNode) { subscribe(renderNode, scope, stream); }
  scope[key] = stream;
}
