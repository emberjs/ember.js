/**
  @module ember
  @submodule ember-templates
  @public
*/
import assign from 'ember-metal/assign';
import lookupComponent from 'ember-htmlbars/utils/lookup-component';
import { assert } from 'ember-metal/debug';
import { internal } from 'htmlbars-runtime';
import isEnabled from 'ember-metal/features';

/**
  The `{{component}}` helper lets you add instances of `Ember.Component` to a
  template. See [Ember.Component](/api/classes/Ember.Component.html) for
  additional information on how a `Component` functions.
  `{{component}}`'s primary use is for cases where you want to dynamically
  change which type of component is rendered as the state of your application
  changes. The provided block will be applied as the template for the component.

  You should not use this helper when you are consistently rendering the same
  component. In that case, use standard component syntax, for example:

  ```handlebars
  {{! application.hbs }}
  {{live-updating-chart}}
  ```

  Given an empty `<body>` with the following template:

  ```handlebars
  {{! application.hbs }}
  {{component infographicComponentName}}
  ```

  And the following application code:

  ```javascript
  export default Ember.Controller.extend({
    infographicComponentName: computed('isMarketOpen', {
      get() {
        if (this.get('isMarketOpen')) {
          return 'live-updating-chart';
        } else {
          return 'market-close-summary';
        }
      }
    })
  });
  ```

  The `live-updating-chart` component will be appended when `isMarketOpen` is
  `true`, and the `market-close-summary` component will be appended when
  `isMarketOpen` is `false`. If the value changes while the app is running,
  the component will be automatically swapped out accordingly.

  You can also use the `{{component}}` with an `{{else}}` block if you want
  to provide a fallback in case the dynamic component can not be found.

  ```handlebars
  {{! application.hbs }}
  {{#component myChart}}
    {{! this block yields in the component if it is found}}
  {{else}}
    Component {{myChart}} not found.
  {{/component}}
  ```

  ```javascript
  export default Ember.Controller.extend({
    myChart: computed('chart.type', {
      get() {
        return `chart-${chart.type}`;
      }
    })
  });
  ```

  When the name of the component is `null` or `undefined`, nothing is rendered.
  Otherwise, if the component can not be resolved and no `{{else}}` block
  has been provided, an error wil be thrown.

  @method component
  @since 1.11.0
  @for Ember.Templates.helpers
  @public
*/
export default {
  setupState(lastState, env, scope, params, hash) {
    const componentPath = env.hooks.getValue(params[0]);
    return assign({}, lastState, { componentPath, isComponentHelper: true });
  },

  render(morph, ...rest) {
    if (morph.state.manager) {
      morph.state.manager.destroy();
    }

    // Force the component hook to treat this as a first-time render,
    // because normal components (`<foo-bar>`) cannot change at runtime,
    // but the `{{component}}` helper can.
    morph.state.manager = null;

    render(morph, ...rest);
  },

  rerender: render
};

function render(morph, env, scope, params, hash, template, inverse, visitor) {
  const componentPath = morph.state.componentPath;

  // If the value passed to the {{component}} helper is undefined or null,
  // don't create a new ComponentNode.
  if (componentPath === undefined || componentPath === null) {
    return;
  }
  const { component, layout } = lookupComponent(env.container, componentPath);
  const found = !!(component || layout);
  if (!isEnabled('ember-htmlbars-component-else')) {
    env.hooks.component(morph, env, scope, componentPath, params, hash, { default: template, inverse }, visitor);
    return;
  }
  assert(`HTMLBars error: Could not find component named "${componentPath}" (no component or template with that name was found) and no {{else}} block was provided`, found || inverse);
  if (!found && inverse) {
    internal.hostBlock(morph, env, scope, inverse, null, null, visitor, function(options) {
      options.templates.template.yield();
    });
  } else {
    env.hooks.component(morph, env, scope, componentPath, params, hash, { default: template, inverse }, visitor);
  }
}
