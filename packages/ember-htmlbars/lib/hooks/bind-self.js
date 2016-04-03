/**
@module ember
@submodule ember-htmlbars
*/

import _Ember from 'ember-metal';
import ProxyStream from 'ember-metal/streams/proxy-stream';

export default function bindSelf(env, scope, self) {
  if (self && self.isView) {
    if (!!_Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
      scope.bindLocal('view', newStream(self, 'view'));
    }

    let selfStream = newStream(self, '');

    if (self.isGlimmerComponent) {
      scope.bindSelf(selfStream);
    } else {
      scope.bindSelf(newStream(selfStream.getKey('context'), ''));
    }

    return;
  }

  let selfStream = newStream(self, '');
  scope.bindSelf(selfStream);
}

function newStream(newValue, key) {
  return new ProxyStream(newValue, key);
}
