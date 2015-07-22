/**
@module ember
@submodule ember-htmlbars
*/

import ProxyStream from 'ember-metal/streams/proxy-stream';
import subscribe from 'ember-htmlbars/utils/subscribe';

export default function bindSelf(env, scope, _self) {
  let self = _self;

  if (self && self.hasBoundController) {
    let { controller } = self;
    self = self.self;

    newStream(scope.locals, 'controller', controller || self);
  }

  if (self && self.isView) {
    newStream(scope.locals, 'view', self, null);
    newStream(scope.locals, 'controller', scope.locals.view.getKey('controller'));

    if (self.isGlimmerComponent) {
      newStream(scope, 'self', self, null, true);
    } else {
      newStream(scope, 'self', scope.locals.view.getKey('context'), null, true);
    }

    return;
  }

  newStream(scope, 'self', self, null, true);

  if (!scope.locals.controller) {
    scope.locals.controller = scope.self;
  }
}

function newStream(scope, key, newValue, renderNode, isSelf) {
  var stream = new ProxyStream(newValue, isSelf ? '' : key);
  if (renderNode) { subscribe(renderNode, scope, stream); }
  scope[key] = stream;
}
