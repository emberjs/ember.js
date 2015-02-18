/**
@module ember
@submodule ember-htmlbars
*/

import SimpleStream from "ember-metal/streams/simple";

export default function bindSelf(scope, self) {
  var selfStream = new SimpleStream(self);
  scope.self = selfStream.get('context');

  if (self.isView) {
    scope.locals.view = selfStream;
  }
}
