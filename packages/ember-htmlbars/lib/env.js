import environment from "ember-metal/environment";

import DOMHelper from "dom-helper";

import { hooks } from "htmlbars-runtime";
import merge from "ember-metal/merge";

import subexpr from "ember-htmlbars/hooks/subexpr";
import concat from "ember-htmlbars/hooks/concat";
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
import debuggerKeyword from "ember-htmlbars/keywords/debugger";

merge(emberHooks.keywords, {
  "if": ifKeyword,
  "debugger": debuggerKeyword,
  unbound: unbound,
  view: view
});


export default {
  hooks: emberHooks,
  helpers: helpers,
  useFragmentCache: true
};

var domHelper = environment.hasDOM ? new DOMHelper() : null;

export { domHelper };
