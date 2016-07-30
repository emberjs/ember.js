/**
@module ember
@submodule ember-templates
*/

import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';
import topLevelViewTemplate from 'ember-htmlbars/templates/top-level-view';
import isEnabled from 'ember-metal/features';
import VERSION from 'ember/version';

if (!isEnabled('ember-glimmer')) {
  topLevelViewTemplate.meta.revision = 'Ember@' + VERSION;
}

/**
  The `{{outlet}}` helper lets you specify where a child route will render in
  your template. An important use of the `{{outlet}}` helper is in your
  application's `application.hbs` file:

  ```handlebars
  {{! app/templates/application.hbs }}

  <!-- header content goes here, and will always display -->
  {{my-header}}

  <div class="my-dynamic-content">
    <!-- this content will change based on the current route, which depends on the current URL -->
    {{outlet}}
  </div>

  <!-- footer content goes here, and will always display -->
  {{my-footer}}
  ```

  See [templates guide](http://emberjs.com/guides/templates/the-application-template/) for
  additional information on using `{{outlet}}` in `application.hbs`.

  You may also specify a name for the `{{outlet}}`, which is useful when using more than one
  `{{outlet}}` in a template:

  ```handlebars
  {{outlet "menu"}}
  {{outlet "sidebar"}}
  {{outlet "main"}}
  ```

  Your routes can then render into a specific one of these `outlet`s by specifying the `outlet`
  attribute in your `renderTemplate` function:

  ```javascript
  // app/routes/menu.js

  export default Ember.Route.extend({
    renderTemplate() {
      this.render({ outlet: 'menu' });
    }
  });
  ```

  See the [routing guide](http://emberjs.com/guides/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.

  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

  @method outlet
  @param {String} [name]
  @for Ember.Templates.helpers
  @public
*/
export default {
  willRender(renderNode, env) {
    env.view.ownerView._outlets.push(renderNode);
  },

  setupState(state, env, scope, params, hash) {
    let outletState = env.outletState;
    let read = env.hooks.getValue;
    let outletName = read(params[0]) || 'main';
    let selectedOutletState = outletState[outletName];

    return {
      outletState: selectedOutletState,
      hasParentOutlet: env.hasParentOutlet,
      manager: state.manager
    };
  },

  childEnv(state, env) {
    let outletState = state.outletState;
    let toRender = outletState && outletState.render;
    let meta = toRender && toRender.template && toRender.template.meta;

    let childEnv = env.childWithOutletState(outletState && outletState.outlets, true, meta);

    if (isEnabled('ember-application-engines')) {
      let owner = outletState && outletState.render && outletState.render.owner;
      if (owner && owner !== childEnv.owner) {
        childEnv.originalOwner = childEnv.owner;
        childEnv.owner = owner;
      }
    }

    return childEnv;
  },

  isStable(lastState, nextState) {
    return isOutletStable(lastState.outletState, nextState.outletState);
  },

  isEmpty(state) {
    return isOutletEmpty(state.outletState);
  },

  render(renderNode, env, scope, params, hash, _template, inverse, visitor) {
    let state = renderNode.getState();
    let owner = env.owner;
    let parentView = env.view;
    let outletState = state.outletState;
    let toRender = outletState.render;


    let ViewClass = outletState.render.ViewClass;

    if (isEnabled('ember-application-engines')) {
      owner = env.originalOwner || owner;
    }

    if (!state.hasParentOutlet && !ViewClass) {
      ViewClass = owner._lookupFactory('view:toplevel');
    }

    let attrs = {};
    let options = {
      component: ViewClass,
      self: toRender.controller,
      createOptions: {
        controller: toRender.controller
      }
    };

    let template = _template || toRender.template && toRender.template.raw;

    if (state.manager) {
      state.manager.destroy();
      state.manager = null;
    }

    if (isEnabled('ember-application-engines')) {
      // detect if we are crossing into an engine
      if (env.originalOwner) {
        // when this outlet represents an engine we must ensure that a `ViewClass` is present
        // even if the engine does not contain a `view:application`. We need a `ViewClass` to
        // ensure that an `ownerView` is set on the `env` created just above
        options.component = options.component || owner._lookupFactory('view:toplevel');
      }
    }

    let nodeManager = ViewNodeManager.create(renderNode, env, attrs, options, parentView, null, null, template);
    state.manager = nodeManager;

    nodeManager.render(env, hash, visitor);
  }
};

function isOutletEmpty(outletState) {
  return !outletState || (!outletState.render.ViewClass && !outletState.render.template);
}

export function isOutletStable(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  a = a.render;
  b = b.render;
  for (let key in a) {
    if (a.hasOwnProperty(key)) {
      // Name is only here for logging & debugging. If two different
      // names result in otherwise identical states, they're still
      // identical.
      if (a[key] !== b[key] && key !== 'name') {
        return false;
      }
    }
  }
  return true;
}
