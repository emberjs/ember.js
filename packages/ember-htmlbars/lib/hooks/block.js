import { hooks as htmlbarsHooks } from "htmlbars-runtime";

export default function block(morph, env, scope, path, params, hash, template, inverse) {
  if (isComponent(env, scope, path)) {
    return env.hooks.component(morph, env, scope, path, hash, template, inverse);
  }

  return htmlbarsHooks.block(morph, env, scope, path, params, hash, template, inverse);
}

function isComponent(env, scope, path) {
  var container = env.container;
  var componentLookup = container.lookup('component-lookup:main');

  return componentLookup.isComponent(path, container);
}
