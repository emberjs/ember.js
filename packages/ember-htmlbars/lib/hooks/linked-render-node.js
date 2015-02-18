/**
@module ember
@submodule ember-htmlbars
*/

import { isStream } from "ember-metal/streams/utils";
import run from "ember-metal/run_loop";

export default function linkedRenderNode(renderNode, params, hash) {
  if (params.length) {
    for (var i = 0; i < params.length; i++) {
      subscribe(renderNode, params[i]);
    }
  }

  if (hash) {
    for (var key in hash) {
      subscribe(renderNode, hash[key]);
    }
  }
}

function subscribe(node, stream) {
  if (!isStream(stream)) { return; }

  stream.subscribe(function() {
    node.isDirty = true;
    run.scheduleOnce('render', node.ownerNode, rerender);
  });
}

function rerender() {
  this.lastResult.revalidate();
}
