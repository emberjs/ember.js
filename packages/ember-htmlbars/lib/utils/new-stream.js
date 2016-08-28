import ProxyStream from '../streams/proxy-stream';
import subscribe from './subscribe';

export default function newStream(scope, key, newValue, renderNode, isSelf) {
  let stream = new ProxyStream(newValue, isSelf ? '' : key);
  if (renderNode) { subscribe(renderNode, scope, stream); }
  scope[key] = stream;
}
