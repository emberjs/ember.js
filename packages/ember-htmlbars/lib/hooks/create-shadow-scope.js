/**
@module ember
@submodule ember-htmlbars
*/

export default function createShadowScope(env, parentScope, options) {
  var shadowScope = env.hooks.createFreshScope();

  if (options.view) {
    shadowScope.renderNode = options.renderNode;
    shadowScope.view = options.view;
  } else if (parentScope) {
    shadowScope.view = parentScope.view;
    shadowScope.locals.view = parentScope.locals.view;
  }

  if (options.view && options.attrs) {
    shadowScope.component = options.view;
  }

  shadowScope.attrs = options.attrs;

  return shadowScope;
}
