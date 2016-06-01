import isEnabled from 'ember-metal/features';
import { deprecate } from 'ember-metal/debug';
import { privatize as P } from 'container/registry';

const DEFAULT_LAYOUT = P`template:components/-default`;

function lookupComponentPair(componentLookup, owner, name, options) {
  let component = componentLookup.componentFor(name, owner, options);
  let layout = componentLookup.layoutFor(name, owner, options);

  if (component) {
    let templateFullName = 'template:components/' + name;
    let {
      templateForName,
      layout: layoutProp,
      layoutName: layoutNameProp,
      defaultLayout: defaultLayoutProp
    } = component.proto();

    if (defaultLayoutProp && !layoutProp) {
      // If a `defaultLayout` was specified move it to the `layout` prop.
      // `layout` is no longer a CP, so this just ensures that the `defaultLayout`
      // logic is supported with a deprecation
      deprecate(
        `Specifying \`defaultLayout\` to ${component} is deprecated. Please use \`layout\` instead.`,
        false,
        {
          id: 'ember-views.component.defaultLayout',
          until: '3.0.0',
          url: 'http://emberjs.com/deprecations/v2.x/#toc_ember-component-defaultlayout'
        }
      );

      owner.register(templateFullName, defaultLayoutProp);
      layout = owner.lookup(templateFullName, options);
    } else if (!layout) {
      if (layoutProp) {
        owner.register(templateFullName, layoutProp);
        layout = owner.lookup(templateFullName, options);
      } else if (layoutNameProp) {
        layout = templateForName(layoutNameProp, null, owner);
      } else {
        layout = owner.lookup(DEFAULT_LAYOUT);
      }
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
