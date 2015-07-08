/**
@module ember
@submodule ember-htmlbars
*/

import { readViewFactory } from "ember-views/streams/utils";
import CollectionView from "ember-views/views/collection_view";
import ViewNodeManager from "ember-htmlbars/node-managers/view-node-manager";
import objectKeys from "ember-metal/keys";
import { assign } from "ember-metal/merge";

export default {
  setupState(state, env, scope, params, hash) {
    var read = env.hooks.getValue;

    return assign({}, state, {
      parentView: env.view,
      viewClassOrInstance: getView(read(params[0]), env.container)
    });
  },

  rerender(morph, env, scope, params, hash, template, inverse, visitor) {
    // If the hash is empty, the component cannot have extracted a part
    // of a mutable param and used it in its layout, because there are
    // no params at all.
    if (objectKeys(hash).length) {
      return morph.state.manager.rerender(env, hash, visitor, true);
    }
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    var state = node.state;
    var parentView = state.parentView;

    var options = { component: node.state.viewClassOrInstance, layout: null };
    if (template) {
      options.createOptions = {
        _itemViewTemplate: template && { raw: template },
        _itemViewInverse: inverse && { raw: inverse }
      };
    }

    if (hash.itemView) {
      hash.itemViewClass = hash.itemView;
    }

    if (hash.emptyView) {
      hash.emptyViewClass = hash.emptyView;
    }

    var nodeManager = ViewNodeManager.create(node, env, hash, options, parentView, null, scope, template);
    state.manager = nodeManager;

    nodeManager.render(env, hash, visitor);
  }
};

function getView(viewPath, container) {
  var viewClassOrInstance;

  if (!viewPath) {
    viewClassOrInstance = CollectionView;
  } else {
    viewClassOrInstance = readViewFactory(viewPath, container);
  }

  return viewClassOrInstance;
}
