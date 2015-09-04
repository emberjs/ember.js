import lookupHelper from 'ember-htmlbars/system/lookup-helper';

export default function lookupHelperHook(env, scope, helperName) {
  return lookupHelper(helperName, scope.getSelf(), env);
}
