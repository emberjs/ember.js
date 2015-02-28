import updateScope from "ember-htmlbars/utils/update-scope";

export default function bindScope(scope) {
  if (scope.attrs || scope.view) {
    updateScope(scope.locals, 'view', scope.view, null);
  }
}
