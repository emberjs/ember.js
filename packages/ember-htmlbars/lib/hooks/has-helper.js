import { validateLazyHelperName } from 'ember-htmlbars/system/lookup-helper';

export default function hasHelperHook(env, scope, helperName) {
  if (env.helpers[helperName]) {
    return true;
  }

  let owner = env.owner;
  if (validateLazyHelperName(helperName, owner, env.hooks.keywords)) {
    var registrationName = 'helper:' + helperName;
    if (owner.hasRegistration(registrationName)) {
      return true;
    }
  }

  return false;
}
