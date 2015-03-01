import updateScope from "ember-htmlbars/utils/update-scope";

export default function bindScope(env, scope) {
  if (scope.attrs || scope.view) {
    updateScope(scope.locals, 'view', scope.view, null);
  }
}
