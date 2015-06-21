/**
@module ember
@submodule ember-htmlbars
*/

import Ember from 'ember-metal/core';
import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';
import { readViewFactory } from 'ember-views/streams/utils';
import { isStream } from 'ember-metal/streams/utils';

export default {
  setupState(state, env, scope, params, hash) {
    Ember.assert(
      'Using a quoteless view parameter with {{outlet}} is not supported',
      !hash.view || !isStream(hash.view)
    );
    var read = env.hooks.getValue;
    var viewClass = read(hash.viewClass) ||
          readViewFactory(read(hash.view), env.container);
    return { viewClass };
  },
  render(renderNode, env, scope, params, hash, template, inverse, visitor) {
    var state = renderNode.state;
    var parentView = env.view;

    var options = {
      component: state.viewClass
    };
    var nodeManager = ViewNodeManager.create(renderNode, env, hash, options, parentView, null, null, null);
    state.manager = nodeManager;
    nodeManager.render(env, hash, visitor);
  }
};
