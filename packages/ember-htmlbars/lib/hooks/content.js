import { hooks as htmlbarsHooks } from "htmlbars-runtime";

export default function content(morph, env, scope, path) {
  if (isComponent(env, scope, path)) {
    return env.hooks.component(morph, env, scope, path, {}, null);
  }

  return htmlbarsHooks.content(morph, env, scope, path);
}

function isComponent(env, scope, path) {
  var container = env.container;
  var componentLookup = container.lookup('component-lookup:main');

  return componentLookup.isComponent(path, container);
}
