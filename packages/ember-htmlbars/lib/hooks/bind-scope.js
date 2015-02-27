import updateScope from "ember-htmlbars/utils/update-scope";
import { readHash } from "ember-metal/streams/utils";

export default function bindScope(scope) {
  if (scope.attrs) {
    updateScope(scope, 'attrsStream', readHash(scope.attrs), scope.renderNode);
  }

  if (scope.attrs || scope.view) {
    updateScope(scope.locals, 'view', scope.view, null);
  }
}
