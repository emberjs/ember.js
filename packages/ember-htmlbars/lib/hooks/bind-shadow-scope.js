/**
@module ember
@submodule ember-htmlbars
*/

import ProxyStream from 'ember-metal/streams/proxy-stream';

export default function bindShadowScope(env, parentScope, shadowScope, options) {
  if (!options) { return; }

  let didOverrideController = false;

  if (parentScope && parentScope.overrideController) {
    didOverrideController = true;
    shadowScope.bindLocal('controller', parentScope.getLocal('controller'));
  }

  var view = options.view;
  if (view && !view.isComponent) {
    shadowScope.bindLocal('view', newStream(view, 'view'));

    if (!didOverrideController) {
      shadowScope.bindLocal('controller', newStream(shadowScope.getLocal('view').getKey('controller')));
    }

    if (view.isView) {
      shadowScope.bindSelf(newStream(shadowScope.getLocal('view').getKey('context'), ''));
    }
  }

  shadowScope.bindView(view);

  if (view && options.attrs) {
    shadowScope.bindComponent(view);
  }

  if ('attrs' in options) {
    shadowScope.bindAttrs(options.attrs);
  }

  return shadowScope;
}

function newStream(newValue, key) {
  return new ProxyStream(newValue, key);
}
