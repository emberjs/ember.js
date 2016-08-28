import ProxyStream from '../streams/proxy-stream';
import subscribe from './subscribe';

export default function updateScope(scope, key, newValue, renderNode, isSelf) {
  let existing = scope[key];

  if (existing) {
    existing.setSource(newValue);
  } else {
    let stream = new ProxyStream(newValue, isSelf ? null : key);
    if (renderNode) { subscribe(renderNode, scope, stream); }
    scope[key] = stream;
  }
}
