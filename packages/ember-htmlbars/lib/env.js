import environment from "ember-metal/environment";

import DOMHelper from "dom-helper";

import inline from "ember-htmlbars/hooks/inline";
import content from "ember-htmlbars/hooks/content";
import component from "ember-htmlbars/hooks/component";
import block from "ember-htmlbars/hooks/block";
import element from "ember-htmlbars/hooks/element";
import subexpr from "ember-htmlbars/hooks/subexpr";
import attribute from "ember-htmlbars/hooks/attribute";
import concat from "ember-htmlbars/hooks/concat";
import get from "ember-htmlbars/hooks/get";
import set from "ember-htmlbars/hooks/set";

import helpers from "ember-htmlbars/helpers";

export default {
  hooks: {
    get: get,
    set: set,
    inline: inline,
    content: content,
    block: block,
    element: element,
    subexpr: subexpr,
    component: component,
    attribute: attribute,
    concat: concat
  },

  helpers: helpers,

  useFragmentCache: true
};

var domHelper = environment.hasDOM ? new DOMHelper() : null;

export { domHelper };
