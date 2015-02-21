import { hooks as htmlbarsHooks } from "htmlbars-runtime";

export default function inline(morph, env, scope, path, params, hash) {
  if (isComponent(env, scope, path)) {
    return env.hooks.component(morph, env, scope, path, hash, null);
  }

  return htmlbarsHooks.inline(morph, env, scope, path, params, hash);
}

function isComponent(env, scope, path) {
  var container = env.container;
  var componentLookup = container.lookup('component-lookup:main');

  return componentLookup.isComponent(path, container);
}
