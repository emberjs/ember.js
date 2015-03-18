/**
@module ember
@submodule ember-htmlbars
*/

import { get } from "ember-metal/property_get";
import SimpleStream from "ember-metal/streams/simple-stream";
import subscribe from "ember-htmlbars/utils/subscribe";

export default function bindSelf(env, scope, self) {
  if (self && self.isView) {
    scope.view = self;
    newStream(scope.locals, 'view', self, null);
    newStream(scope, 'self', get(self, 'context'), null, true);
    return;
  }

  newStream(scope, 'self', self, null);
}

function newStream(scope, key, newValue, renderNode, isSelf) {
  var stream = new SimpleStream(newValue, isSelf ? null : key);
  if (renderNode) { subscribe(renderNode, scope, stream); }
  scope[key] = stream;
}
