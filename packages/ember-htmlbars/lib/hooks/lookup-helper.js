import lookupHelper from '../system/lookup-helper';

export default function lookupHelperHook(env, scope, helperName) {
  return lookupHelper(helperName, scope.getSelf(), env);
}
