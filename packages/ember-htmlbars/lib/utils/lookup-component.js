function lookupComponentPair(componentLookup, owner, name, options) {
  return {
    component: componentLookup.componentFor(name, owner, options),
    layout: componentLookup.layoutFor(name, owner, options)
  };
}

export default function lookupComponent(owner, name, options) {
  let componentLookup = owner.lookup('component-lookup:main');

  let source = options && options.source;

  if (source) {
    let localResult = lookupComponentPair(componentLookup, owner, name, options);

    if (localResult.component || localResult.layout) {
      return localResult;
    }
  }

  return lookupComponentPair(componentLookup, owner, name);
}
