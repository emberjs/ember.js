import { privatize as P } from 'container';

function lookupComponentPair(componentLookup, owner, name, options) {
  let component = componentLookup.componentFor(name, owner, options);
  let layout = componentLookup.layoutFor(name, owner, options);

  let result = { layout, component };

  if (layout && !component) {
    result.component = owner._lookupFactory(P`component:-default`);
  }

  return result;
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
