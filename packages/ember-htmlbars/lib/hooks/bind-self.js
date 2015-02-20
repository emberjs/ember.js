/**
@module ember
@submodule ember-htmlbars
*/

import SimpleStream from "ember-metal/streams/simple";

export default function bindSelf(scope, self) {
  var selfStream = scope.self = new SimpleStream(self);

  if (self.isView) {
    scope.locals.view = selfStream;
    scope.self = selfStream.get('context');
  }
}
