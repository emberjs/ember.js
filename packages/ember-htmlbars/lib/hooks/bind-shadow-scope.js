/**
@module ember
@submodule ember-htmlbars
*/

import newStream from 'ember-htmlbars/utils/new-stream';

export default function bindShadowScope(env, parentScope, shadowScope, options) {
  if (!options) { return; }

  let didOverrideController = false;

  if (parentScope && parentScope.overrideController) {
    didOverrideController = true;
    shadowScope.locals.controller = parentScope.locals.controller;
  }

  var view = options.view;
  if (view && !view.isComponent) {
    newStream(shadowScope.locals, 'view', view, null);

    if (!didOverrideController) {
      newStream(shadowScope.locals, 'controller', shadowScope.locals.view.getKey('controller'));
    }

    if (view.isView) {
      newStream(shadowScope, 'self', shadowScope.locals.view.getKey('context'), null, true);
    }
  }

  shadowScope.view = view;

  if (view && options.attrs) {
    shadowScope.component = view;
  }

  if ('attrs' in options) {
    shadowScope.attrs = options.attrs;
  }

  return shadowScope;
}
