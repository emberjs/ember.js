import environment from "ember-metal/environment";

import DOMHelper from "dom-helper";

import { hooks } from "htmlbars-runtime";
import merge from "ember-metal/merge";

import subexpr from "ember-htmlbars/hooks/subexpr";
import concat from "ember-htmlbars/hooks/concat";
import linkRenderNode from "ember-htmlbars/hooks/link-render-node";
import createFreshScope from "ember-htmlbars/hooks/create-fresh-scope";
import bindSelf from "ember-htmlbars/hooks/bind-self";
import bindLocal from "ember-htmlbars/hooks/bind-local";
import getRoot from "ember-htmlbars/hooks/get-root";
import getChild from "ember-htmlbars/hooks/get-child";
import getValue from "ember-htmlbars/hooks/get-value";
import cleanup from "ember-htmlbars/hooks/cleanup";
import content from "ember-htmlbars/hooks/content";
import inline from "ember-htmlbars/hooks/inline";
import block from "ember-htmlbars/hooks/block";
import component from "ember-htmlbars/hooks/component";

import helpers from "ember-htmlbars/helpers";

var emberHooks = merge({}, hooks);

merge(emberHooks, {
  linkRenderNode: linkRenderNode,
  createFreshScope: createFreshScope,
  bindSelf: bindSelf,
  bindLocal: bindLocal,
  getRoot: getRoot,
  getChild: getChild,
  getValue: getValue,
  subexpr: subexpr,
  concat: concat,
  cleanup: cleanup,
  content: content,
  inline: inline,
  block: block,
  component: component
});

import debuggerKeyword from "ember-htmlbars/keywords/debugger";
import outlet from "ember-htmlbars/keywords/outlet";
import unbound from "ember-htmlbars/keywords/unbound";
import view from "ember-htmlbars/keywords/view";

merge(emberHooks.keywords, {
  "debugger": debuggerKeyword,
  outlet: outlet,
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
