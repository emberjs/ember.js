/**
@module ember
@submodule ember-htmlbars
*/

import { readViewFactory } from "ember-views/streams/utils";
import EmberView from "ember-views/views/view";
import ComponentNode from "ember-htmlbars/system/component-node";
import objectKeys from "ember-metal/keys";

export default {
  setupState(state, env, scope, params, hash) {
    var read = env.hooks.getValue;

    return {
      componentNode: state.componentNode,
      parentView: read(scope.locals.view),
      viewClassOrInstance: getView(read(params[0]), env.container)
    };
  },

  rerender(morph, env, scope, params, hash, template, inverse, visitor) {
    // If the hash is empty, the component cannot have extracted a part
    // of a mutable param and used it in its layout, because there are
    // no params at all.
    if (objectKeys(hash).length) {
      return morph.state.componentNode.rerender(env, hash, visitor, true);
    }
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    var state = node.state;
    var parentView = state.parentView;

    var view = viewInstance(node.state.viewClassOrInstance);
    parentView.appendChild(view);

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
