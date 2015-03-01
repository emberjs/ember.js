import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function hasHelperHook(env, scope, helperName) {
  return !!lookupHelper(helperName, scope.self, env);
}
