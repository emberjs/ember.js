import { privatize as P } from 'container';
import { ENV } from 'ember-environment';
import {
  EMBER_MODULE_UNIFICATION,
} from 'ember/features';

function lookupModuleUnificationComponentPair(componentLookup, owner, name, options) {
  let localComponent = componentLookup.componentFor(name, owner, options);
  let localLayout = componentLookup.layoutFor(name, owner, options);

  let globalComponent = componentLookup.componentFor(name, owner);
  let globalLayout = componentLookup.layoutFor(name, owner);

  let localAndUniqueComponent = !!localComponent && (!globalComponent || localComponent.class !== globalComponent.class);
  let localAndUniqueLayout = !!localLayout && (!globalLayout || localLayout.referrer.moduleName !== globalLayout.referrer.moduleName);

  if (localAndUniqueComponent && localAndUniqueLayout) {
    return { layout: localLayout, component: localComponent };
  }

  if (localAndUniqueComponent && !localAndUniqueLayout) {
    return { layout: null, component: localComponent };
  }

  let defaultComponentFactory = null;

  if (!ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
    defaultComponentFactory = owner.factoryFor(P`component:-default`);
  }

  if (!localAndUniqueComponent && localAndUniqueLayout) {
    return { layout: localLayout, component: defaultComponentFactory };
  }

  let component = globalComponent || (globalLayout && defaultComponentFactory);
  return { layout: globalLayout, component };
}

function lookupComponentPair(componentLookup, owner, name, options) {
  if (EMBER_MODULE_UNIFICATION) {
    return lookupModuleUnificationComponentPair(componentLookup, owner, name, options);
  }

  let component = componentLookup.componentFor(name, owner, options);
  let layout = componentLookup.layoutFor(name, owner, options);

  let result = { layout, component };

  if (!ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS && layout && !component) {
    result.component = owner.factoryFor(P`component:-default`);
  }

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
