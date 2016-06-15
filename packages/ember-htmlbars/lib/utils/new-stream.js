import ProxyStream from '../streams/proxy-stream';
import subscribe from 'ember-htmlbars/utils/subscribe';

export default function newStream(scope, key, newValue, renderNode, isSelf) {
  let stream = new ProxyStream(newValue, isSelf ? '' : key);
  if (renderNode) { subscribe(renderNode, scope, stream); }
  scope[key] = stream;
}
