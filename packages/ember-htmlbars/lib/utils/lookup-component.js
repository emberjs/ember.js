import isEnabled from 'ember-metal/features';

function lookupComponentPair(componentLookup, owner, tagName, options) {
  return {
    component: componentLookup.componentFor(tagName, owner, options),
    layout: componentLookup.layoutFor(tagName, owner, options)
  };
}

export default function lookupComponent(owner, tagName, options) {
  let componentLookup = owner.lookup('component-lookup:main');

  if (isEnabled('ember-htmlbars-local-lookup')) {
    let source = options && options.source;

    if (source) {
      let localResult = lookupComponentPair(componentLookup, owner, tagName, options);

      if (localResult.component || localResult.layout) {
        return localResult;
      }
    }
  }

  return lookupComponentPair(componentLookup, owner, tagName);
}
