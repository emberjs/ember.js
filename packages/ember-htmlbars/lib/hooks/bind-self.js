/**
@module ember
@submodule ember-htmlbars
*/

import _Ember from 'ember-metal';
import ProxyStream from 'ember-metal/streams/proxy-stream';

export default function bindSelf(env, scope, _self) {
  let self = _self;

  if (self && self.hasBoundController) {
    let { controller } = self;
    self = self.self;

    if (!!_Ember.ENV._ENABLE_LEGACY_CONTROLLER_SUPPORT) {
      scope.bindLocal('controller', newStream(controller || self));
    }
  }

  if (self && self.isView) {
    if (!!_Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
      scope.bindLocal('view', newStream(self, 'view'));
    }

    if (!!_Ember.ENV._ENABLE_LEGACY_CONTROLLER_SUPPORT) {
      scope.bindLocal('controller', newStream(self, '').getKey('controller'));
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

  if (!!_Ember.ENV._ENABLE_LEGACY_CONTROLLER_SUPPORT) {
    if (!scope.hasLocal('controller')) {
      scope.bindLocal('controller', selfStream);
    }
  }
}

function newStream(newValue, key) {
  return new ProxyStream(newValue, key);
}
