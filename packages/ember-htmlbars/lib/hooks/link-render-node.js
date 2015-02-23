/**
@module ember
@submodule ember-htmlbars
*/

import { isStream } from "ember-metal/streams/utils";
import run from "ember-metal/run_loop";

export default function linkRenderNode(renderNode, scope, params, hash) {
  if (renderNode.state.unbound) {
    return true;
  }

  var unsubscribers = [];

  if (params.length) {
    for (var i = 0; i < params.length; i++) {
      subscribe(renderNode, scope, params[i], unsubscribers);
    }
  }

  if (hash) {
    for (var key in hash) {
      subscribe(renderNode, scope, hash[key], unsubscribers);
    }
  }

  renderNode.state.unsubscribers = unsubscribers;

  // The params and hash can be reused; they don't need to be
  // recomputed on subsequent re-renders because they are
  // streams.
  return true;
}

function subscribe(node, scope, stream, unsubscribers) {
  if (!isStream(stream)) { return; }
  var component = scope.component;

  unsubscribers.push(stream.subscribe(function() {
    node.isDirty = true;
    // TODO: Make sure this flips to false somehow on non-components
    node.state.shouldRerender = true;

    if (component && component.renderNode) {
      component.renderNode.isDirty = true;
    }

    run.scheduleOnce('render', node.ownerNode.state.view, 'revalidate');
  }));
}
