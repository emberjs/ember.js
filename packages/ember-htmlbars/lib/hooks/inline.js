import { hooks as htmlbarsHooks } from "htmlbars-runtime";
import isComponent from "ember-htmlbars/utils/is-component";

export default function inline(morph, env, scope, path, params, hash, visitor) {
  if (isComponent(env, scope, path)) {
    return env.hooks.component(morph, env, scope, path, hash, null, visitor);
  }

  return htmlbarsHooks.inline(morph, env, scope, path, params, hash, visitor);
}
