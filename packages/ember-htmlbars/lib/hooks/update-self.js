/**
@module ember
@submodule ember-htmlbars
*/

import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';

export default function updateSelf(env, scope, _self) {
  let self = _self;

  if (self && self.hasBoundController) {
    let { controller } = self;
    self = self.self;

    scope.updateLocal('controller', controller || self);
  }

  assert('BUG: scope.attrs and self.isView should not both be true', !(scope.attrs && self.isView));

  if (self && self.isView) {
    scope.updateLocal('view', self);
    scope.updateSelf(get(self, 'context'), '');
    return;
  }

  scope.updateSelf(self);
}
