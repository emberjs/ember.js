/**
@module ember
@submodule ember-htmlbars
*/

import newStream from 'ember-htmlbars/utils/new-stream';

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
