/**
@module ember
@submodule ember-htmlbars
*/

import { get } from "ember-metal/property_get";
import updateScope from "ember-htmlbars/utils/update-scope";

export default function bindSelf(env, scope, self) {
  Ember.assert("BUG: scope.attrs and self.isView should not both be true", !(scope.attrs && self.isView));

  if (self.isView) {
    scope.view = self;
    updateScope(scope.locals, 'view', self, null);
    updateScope(scope, 'self', get(self, 'context'), null);
    return;
  }

  updateScope(scope, 'self', self, null);
}
