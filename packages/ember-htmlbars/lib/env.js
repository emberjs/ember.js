import environment from "ember-metal/environment";

import DOMHelper from "dom-helper";

import { hooks } from "htmlbars-runtime";
import merge from "ember-metal/merge";

//import inline from "ember-htmlbars/hooks/inline";
//import content from "ember-htmlbars/hooks/content";
//import component from "ember-htmlbars/hooks/component";
//import createScope from "ember-htmlbars/hooks/create-scope";
//import block from "ember-htmlbars/hooks/block";
//import element from "ember-htmlbars/hooks/element";
import subexpr from "ember-htmlbars/hooks/subexpr";
//import attribute from "ember-htmlbars/hooks/attribute";
import concat from "ember-htmlbars/hooks/concat";
//import get from "ember-htmlbars/hooks/get";
import linkRenderNode from "ember-htmlbars/hooks/link-render-node";
import bindLocal from "ember-htmlbars/hooks/bind-local";
import bindSelf from "ember-htmlbars/hooks/bind-self";
import getRoot from "ember-htmlbars/hooks/get-root";
import getChild from "ember-htmlbars/hooks/get-child";
import getValue from "ember-htmlbars/hooks/get-value";
import cleanup from "ember-htmlbars/hooks/cleanup";

import helpers from "ember-htmlbars/helpers";

var emberHooks = merge(hooks, {
  linkRenderNode: linkRenderNode,
  bindLocal: bindLocal,
  bindSelf: bindSelf,
  getRoot: getRoot,
  getChild: getChild,
  getValue: getValue,
  subexpr: subexpr,
  concat: concat,
  cleanup: cleanup
});

import unbound from "ember-htmlbars/keywords/unbound";
import ifKeyword from "ember-htmlbars/keywords/if";
import view from "ember-htmlbars/keywords/view";

merge(emberHooks.keywords, {
  unbound: unbound,
  "if": ifKeyword,
  view: view
});


export default {
  hooks: emberHooks,
  helpers: helpers,
  useFragmentCache: true
};

var domHelper = environment.hasDOM ? new DOMHelper() : null;

export { domHelper };
