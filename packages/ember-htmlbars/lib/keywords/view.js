/**
@module ember
@submodule ember-htmlbars
*/

import { readViewFactory } from "ember-views/streams/utils";
import EmberView from "ember-views/views/view";
import ViewNodeManager from "ember-htmlbars/node-managers/view-node-manager";
import objectKeys from "ember-metal/keys";

export default {
  setupState(state, env, scope, params, hash) {
    var read = env.hooks.getValue;
    var viewClassOrInstance = state.viewClassOrInstance;
    if (!viewClassOrInstance) {
      viewClassOrInstance = getView(read(params[0]), env.container);
    }

    return {
      manager: state.manager,
      parentView: scope.view,
      viewClassOrInstance
    };
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
    if (hash.tag) {
      hash = swapKey(hash, 'tag', 'tagName');
    }

    if (hash.classNameBindings) {
      hash.classNameBindings = hash.classNameBindings.split(' ');
    }

    var state = node.state;
    var parentView = state.parentView;

    var options = { component: node.state.viewClassOrInstance, layout: null };
    var componentNode = ViewNodeManager.create(node, env, hash, options, parentView, null, scope, template);
    state.manager = componentNode;

    componentNode.render(env, hash, visitor);
  }
};

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

function swapKey(hash, original, update) {
  var newHash = {};

  for (var prop in hash) {
    if (prop === original) {
      newHash[update] = hash[prop];
    } else {
      newHash[prop] = hash[prop];
    }
  }

  return newHash;
}
