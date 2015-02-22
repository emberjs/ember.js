/**
@module ember
@submodule ember-htmlbars
*/

/*
 Given a path name, returns whether or not a component with that
 name was found in the container.
*/
export default function isComponent(env, scope, path) {
  var container = env.container;
  if (!container) { return false; }

  var componentLookup = container.lookup('component-lookup:main');
  if (!componentLookup) { return false; }

  return componentLookup.isComponent(path, container);
}
