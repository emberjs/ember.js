/**
@module ember
@submodule ember-htmlbars
*/

import lookupPartial from "ember-views/system/lookup_partial";
import { internal } from "htmlbars-runtime";

export default {
  setupState: function(state, env, scope, params, hash) {
    return { partialName: env.hooks.getValue(params[0]) };
  },

  render: function(renderNode, env, scope, params, hash, template, inverse, visitor) {
    var state = renderNode.state;
    if (!state.partialName) { return true; }
    var found = lookupPartial(env, state.partialName);
    if (!found) { return true; }

    internal.hostBlock(renderNode, env, scope, found.raw, null, null, visitor, function(options) {
      options.templates.template.yield();
    });
  }
};
