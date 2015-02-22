import { hooks as htmlbarsHooks } from "htmlbars-runtime";
import isComponent from "ember-htmlbars/utils/is-component";

export default function block(morph, env, scope, path, params, hash, template, inverse, visitor) {
  if (isComponent(env, scope, path)) {
    return env.hooks.component(morph, env, scope, path, hash, template, inverse, visitor);
  }

  return htmlbarsHooks.block(morph, env, scope, path, params, hash, template, inverse, visitor);
}
