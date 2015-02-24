/**
@module ember
@submodule ember-htmlbars
*/

import { readViewFactory } from "ember-views/streams/utils";
import EmberView from "ember-views/views/view";
import ComponentNode from "ember-htmlbars/system/component-node";

export default {
  setupState: function(state, env, scope, params, hash) {
    var read = env.hooks.getValue;
    state.parentView = read(scope.locals.view);

    state.lastViewClassOrInstance = state.viewClassOrInstance;
    state.viewClassOrInstance = getView(read(params[0]), env.container);
  },

  isStable: function(state, env, scope, params, hash) {
    return state.lastViewClassOrInstance === state.viewClassOrInstance;
  },

  render: function(node, env, scope, params, hash, template, inverse, visitor) {
    var state = node.state;
    var parentView = state.parentView;

    var view = hash.view = viewInstance(node.state.viewClassOrInstance);
    parentView.linkChild(view);

    state.view = view;

    var options = { component: view, layout: null };
    var componentNode = ComponentNode.create(node, env, options, parentView, null, scope, template);

    componentNode.render(env, hash, visitor, parentView._state === 'inDOM');
  }
};

function viewInstance(viewClassOrInstance) {
  if (viewClassOrInstance instanceof EmberView) {
    return viewClassOrInstance;
  } else {
    return viewClassOrInstance.create();
  }
}

function getView(viewPath, container) {
  var viewClassOrInstance;

  if (!viewPath) {
    if (container) {
      viewClassOrInstance = container.lookupFactory('view:toplevel');
    } else {
      viewClassOrInstance = EmberView;
    }
  } else {
    viewClassOrInstance = readViewFactory(viewPath, container);
  }

  return viewClassOrInstance;
}
