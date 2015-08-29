import { validateLazyHelperName } from 'ember-htmlbars/system/lookup-helper';

export default function hasHelperHook(env, scope, helperName) {
  if (env.helpers[helperName]) {
    return true;
  }

  var container = env.container;
  if (validateLazyHelperName(helperName, container, env.hooks.keywords)) {
    var containerName = 'helper:' + helperName;
    if (container.registry.has(containerName)) {
      return true;
    }
  }

  return false;
}
