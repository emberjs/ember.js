import { EMBER_MODULE_UNIFICATION } from 'ember/features';

function lookupModuleUnificationComponentPair(componentLookup, owner, name, options) {
  let localComponent = componentLookup.componentFor(name, owner, options);
  let localLayout = componentLookup.layoutFor(name, owner, options);

  let globalComponent = componentLookup.componentFor(name, owner);
  let globalLayout = componentLookup.layoutFor(name, owner);

  // TODO: we shouldn't have to recheck fallback, we should have a lookup that doesn't fallback
  if (
    localComponent !== undefined &&
    globalComponent !== undefined &&
    globalComponent.class === localComponent.class
  ) {
    localComponent = undefined;
  }
  if (
    localLayout !== undefined &&
    globalLayout !== undefined &&
    localLayout.referrer.moduleName === globalLayout.referrer.moduleName
  ) {
    localLayout = undefined;
  }

  if (localLayout !== undefined || localComponent !== undefined) {
    return { layout: localLayout, component: localComponent };
  }

  return { layout: globalLayout, component: globalComponent };
}

function lookupComponentPair(componentLookup, owner, name, options) {
  if (EMBER_MODULE_UNIFICATION) {
    return lookupModuleUnificationComponentPair(componentLookup, owner, name, options);
  }

  let component = componentLookup.componentFor(name, owner, options);
  let layout = componentLookup.layoutFor(name, owner, options);

  let result = { layout, component };

  return result;
}

export default function lookupComponent(owner, name, options) {
  let componentLookup = owner.lookup('component-lookup:main');

  if (options && (options.source || options.namespace)) {
    let localResult = lookupComponentPair(componentLookup, owner, name, options);

    if (localResult.component || localResult.layout) {
      return localResult;
    }
  }

  return lookupComponentPair(componentLookup, owner, name);
}
