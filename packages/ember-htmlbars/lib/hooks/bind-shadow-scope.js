/**
@module ember
@submodule ember-htmlbars
*/

import ProxyStream from '../streams/proxy-stream';

export default function bindShadowScope(env, parentScope, shadowScope, options) {
  if (!options) { return; }

  var view = options.view;
  if (view && !view.isComponent) {
    shadowScope.bindLocal('view', newStream(view, 'view'));

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
