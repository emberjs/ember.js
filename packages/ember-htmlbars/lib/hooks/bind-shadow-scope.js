/**
@module ember
@submodule ember-htmlbars
*/

import Component from 'ember-views/views/component';

export default function bindShadowScope(env, parentScope, shadowScope, options) {
  if (!options) { return; }

  var view = options.view;
  if (view && !(view instanceof Component)) {
    shadowScope.view = view;
    newStream(shadowScope.locals, 'view', view, null);
    newStream(shadowScope.locals, 'controller', shadowScope.locals.view.getKey('controller'));
  }

  if (view && options.attrs) {
    shadowScope.component = view;
  }

  shadowScope.attrs = options.attrs;

  return shadowScope;
}

import SimpleStream from "ember-metal/streams/simple-stream";
import subscribe from "ember-htmlbars/utils/subscribe";

function newStream(scope, key, newValue, renderNode, isSelf) {
  var stream = new SimpleStream(newValue, isSelf ? null : key);
  if (renderNode) { subscribe(renderNode, scope, stream); }
  scope[key] = stream;
}
