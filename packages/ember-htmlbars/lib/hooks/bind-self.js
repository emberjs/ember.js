/**
@module ember
@submodule ember-htmlbars
*/
import ProxyStream from '../streams/proxy-stream';

export default function bindSelf(env, scope, self) {
  let selfStream = newStream(self, '');
  scope.bindSelf(selfStream);
}

function newStream(newValue, key) {
  return new ProxyStream(newValue, key);
}
