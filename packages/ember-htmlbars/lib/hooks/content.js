import { hooks as htmlbarsHooks } from "htmlbars-runtime";
import isComponent from "ember-htmlbars/utils/is-component";

export default function content(morph, env, scope, path, visitor) {
  if (isComponent(env, scope, path)) {
    return env.hooks.component(morph, env, scope, path, {}, null, null, visitor);
  }

  return htmlbarsHooks.content(morph, env, scope, path, visitor);
}
