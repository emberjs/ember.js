import { content, element, subexpr, lookupHelper } from "ember-htmlbars/hooks";
import { DOMHelper } from "morph";
import Stream from "ember-metal/streams/stream";

export var defaultEnv = {
  dom: new DOMHelper(),

  hooks: {
    content: content,
    element: element,
    subexpr: subexpr,
    lookupHelper: lookupHelper,

    streamFor: function(context, path) {
      return new Stream(function() {
        return context[path];
      });
    }
  },

  helpers: {

  }
};
