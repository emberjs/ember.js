import isEnabled from 'ember-metal/features';

function lookupComponentPair(componentLookup, owner, name, options) {
  let component = componentLookup.componentFor(name, owner, options);
  let layout = componentLookup.layoutFor(name, owner, options);
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
