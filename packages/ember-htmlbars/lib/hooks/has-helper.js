import { validateLazyHelperName } from 'ember-htmlbars/system/lookup-helper';

export default function hasHelperHook(env, scope, helperName) {
  if (env.helpers[helperName]) {
    return true;
  }

  var container = env.container;
  if (validateLazyHelperName(helperName, container, env.hooks.keywords, env.knownHelpers)) {
    var containerName = 'helper:' + helperName;
    if (container._registry.has(containerName)) {
      return true;
    }
  }

  return false;
}
