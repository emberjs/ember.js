import environment from "ember-metal/environment";

import DOMHelper from "dom-helper";

import inline from "ember-htmlbars/hooks/inline";
import content from "ember-htmlbars/hooks/content";
import component from "ember-htmlbars/hooks/component";
import createScope from "ember-htmlbars/hooks/create-scope";
import block from "ember-htmlbars/hooks/block";
import element from "ember-htmlbars/hooks/element";
import subexpr from "ember-htmlbars/hooks/subexpr";
import attribute from "ember-htmlbars/hooks/attribute";
import concat from "ember-htmlbars/hooks/concat";
import get from "ember-htmlbars/hooks/get";
import bindLocal from "ember-htmlbars/hooks/bind-local";

import helpers from "ember-htmlbars/helpers";

export default {
  hooks: {
    get: get,
    bindLocal: bindLocal,
    inline: inline,
    content: content,
    createScope: createScope,
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
