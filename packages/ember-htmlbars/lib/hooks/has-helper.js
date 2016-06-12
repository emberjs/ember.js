import { validateLazyHelperName } from 'ember-htmlbars/system/lookup-helper';

export default function hasHelperHook(env, scope, helperName) {
  if (env.helpers[helperName]) {
    return true;
  }

  let owner = env.owner;
  if (validateLazyHelperName(helperName, owner, env.hooks.keywords)) {
    let registrationName = 'helper:' + helperName;
    if (owner.hasRegistration(registrationName)) {
      return true;
    }

    let options = {};
    let moduleName = env.meta && env.meta.moduleName;
    if (moduleName) {
      options.source = `template:${moduleName}`;
    }

    if (owner.hasRegistration(registrationName, options)) {
      return true;
    }
  }

  return false;
}
