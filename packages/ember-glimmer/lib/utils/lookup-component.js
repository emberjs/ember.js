import isEnabled from 'ember-metal/features';
import { privatize as P } from 'container/registry';

const DEFAULT_LAYOUT = P`template:components/-default`;

function lookupComponentPair(componentLookup, owner, name, options) {
  let component = componentLookup.componentFor(name, owner, options);
  let layout = componentLookup.layoutFor(name, owner, options);

  if (!layout && component) {
    let layoutProp = component.proto().layout;
    if (layoutProp) {
      let templateFullName = 'template:components/' + name;
      owner.register(templateFullName, layoutProp);
      layout = owner.lookup(templateFullName, options);
    } else {
      layout = owner.lookup(DEFAULT_LAYOUT);
    }
  }

  return {
    component,
    layout
  };
}

export default function lookupComponent(owner, name, options) {
  let componentLookup = owner.lookup('component-lookup:main');

  if (isEnabled('ember-htmlbars-local-lookup')) {
    let source = options && options.source;

    if (source) {
      let localResult = lookupComponentPair(componentLookup, owner, name, options);

      if (localResult.component || localResult.layout) {
        return localResult;
      }
    }
  }

  return lookupComponentPair(componentLookup, owner, name);
}
