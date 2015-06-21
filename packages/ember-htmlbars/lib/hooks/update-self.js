/**
@module ember
@submodule ember-htmlbars
*/

import Ember from 'ember-metal/core';
import { get } from 'ember-metal/property_get';
import updateScope from 'ember-htmlbars/utils/update-scope';

export default function updateSelf(env, scope, _self) {
  let self = _self;

  if (self && self.hasBoundController) {
    let { controller } = self;
    self = self.self;

    updateScope(scope.locals, 'controller', controller || self);
  }

  Ember.assert('BUG: scope.attrs and self.isView should not both be true', !(scope.attrs && self.isView));

  if (self && self.isView) {
    scope.view = self;
    updateScope(scope.locals, 'view', self, null);
    updateScope(scope, 'self', get(self, 'context'), null, true);
    return;
  }

  updateScope(scope, 'self', self, null);
}
