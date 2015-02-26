/**
@module ember
@submodule ember-htmlbars
*/

import subscribe from "ember-htmlbars/utils/subscribe";
import shouldDisplay from "ember-views/streams/should_display";
import { chain, read } from "ember-metal/streams/utils";

export default function linkRenderNode(renderNode, scope, path, params, hash) {
  if (renderNode.state.unsubscribers) {
    return true;
  }

  switch (path) {
    case 'unbound': return true;
    case 'if': params[0] = shouldDisplay(params[0]); break;
    case 'each': params[0] = eachParam(params[0]); break;
  }

  if (params.length) {
    for (var i = 0; i < params.length; i++) {
      subscribe(renderNode, scope, params[i]);
    }
  }

  if (hash) {
    for (var key in hash) {
      subscribe(renderNode, scope, hash[key]);
    }
  }

  // The params and hash can be reused; they don't need to be
  // recomputed on subsequent re-renders because they are
  // streams.
  return true;
}

function eachParam(list) {
  var listChange = list.getKey('[]');

  var stream = chain(list, function() {
    read(listChange);
    return read(list);
  });

  stream.addDependency(listChange);
  return stream;
}
