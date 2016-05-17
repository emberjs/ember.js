/**
@module ember
@submodule ember-htmlbars
*/
import { ENV } from 'ember-environment';
import ProxyStream from '../streams/proxy-stream';

export default function bindSelf(env, scope, self) {
  if (self && self.isView) {
    if (!!ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
      scope.bindLocal('view', newStream(self, 'view'));
    }
    let selfStream = newStream(self, '');
    scope.bindSelf(newStream(selfStream.getKey('context'), ''));
    return;
  }
  let selfStream = newStream(self, '');
  scope.bindSelf(selfStream);
}

function newStream(newValue, key) {
  return new ProxyStream(newValue, key);
}
