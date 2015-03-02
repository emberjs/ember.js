/**
@module ember
@submodule ember-htmlbars
*/

export default function bindShadowScope(env, parentScope, shadowScope, options) {
  if (!options) { return; }

  if (options.view) {
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
