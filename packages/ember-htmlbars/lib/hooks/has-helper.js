import { findHelper } from "ember-htmlbars/system/lookup-helper";

export default function hasHelperHook(env, scope, helperName) {
  return !!findHelper(helperName, scope.self, env);
}
