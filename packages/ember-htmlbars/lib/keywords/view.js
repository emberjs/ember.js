/**
@module ember
@submodule ember-htmlbars
*/

import { readViewFactory } from "ember-views/streams/utils";
import EmberView from "ember-views/views/view";
import ComponentNode from "ember-htmlbars/system/component-node";

export default {
  setupState(state, env, scope, params, hash) {
    var read = env.hooks.getValue;

    return {
      parentView: read(scope.locals.view),
      viewClassOrInstance: getView(read(params[0]), env.container)
    };
  },

  rerender(morph, env, scope, params, hash, template, inverse, visitor) {
    return morph.state.componentNode.rerender(env, hash, visitor, true);
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    var state = node.state;
    var parentView = state.parentView;

    var view = hash.view = viewInstance(node.state.viewClassOrInstance);
    parentView.linkChild(view);

    node.emberView = view;

    var options = { component: view, layout: null };
    var componentNode = ComponentNode.create(node, env, hash, options, parentView, null, scope, template);
    state.componentNode = componentNode;

    componentNode.render(env, hash, visitor);
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
