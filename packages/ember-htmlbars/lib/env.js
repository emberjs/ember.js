import environment from "ember-metal/environment";

import DOMHelper from "dom-helper";

import { hooks } from "htmlbars-runtime";
import merge from "ember-metal/merge";

import subexpr from "ember-htmlbars/hooks/subexpr";
import concat from "ember-htmlbars/hooks/concat";
import linkRenderNode from "ember-htmlbars/hooks/link-render-node";
import createFreshScope from "ember-htmlbars/hooks/create-fresh-scope";
import bindShadowScope from "ember-htmlbars/hooks/bind-shadow-scope";
import bindSelf from "ember-htmlbars/hooks/bind-self";
import bindScope from "ember-htmlbars/hooks/bind-scope";
import bindLocal from "ember-htmlbars/hooks/bind-local";
import getRoot from "ember-htmlbars/hooks/get-root";
import getChild from "ember-htmlbars/hooks/get-child";
import getValue from "ember-htmlbars/hooks/get-value";
import cleanup from "ember-htmlbars/hooks/cleanup";
import classify from "ember-htmlbars/hooks/classify";
import component from "ember-htmlbars/hooks/component";
import lookupHelper from "ember-htmlbars/hooks/lookup-helper";
import hasHelper from "ember-htmlbars/hooks/has-helper";

import helpers from "ember-htmlbars/helpers";

var emberHooks = merge({}, hooks);

merge(emberHooks, {
  linkRenderNode: linkRenderNode,
  createFreshScope: createFreshScope,
  bindShadowScope: bindShadowScope,
  bindSelf: bindSelf,
  bindScope: bindScope,
  bindLocal: bindLocal,
  getRoot: getRoot,
  getChild: getChild,
  getValue: getValue,
  subexpr: subexpr,
  concat: concat,
  cleanup: cleanup,
  classify: classify,
  component: component,
  lookupHelper: lookupHelper,
  hasHelper: hasHelper
});

import debuggerKeyword from "ember-htmlbars/keywords/debugger";
import withKeyword from "ember-htmlbars/keywords/with";
import outlet from "ember-htmlbars/keywords/outlet";
import unbound from "ember-htmlbars/keywords/unbound";
import view from "ember-htmlbars/keywords/view";
import componentKeyword from "ember-htmlbars/keywords/component";
import partial from "ember-htmlbars/keywords/partial";

merge(emberHooks.keywords, {
  "debugger": debuggerKeyword,
  "with": withKeyword,
  outlet: outlet,
  unbound: unbound,
  view: view,
  component: componentKeyword,
  partial: partial
});

export default {
  hooks: emberHooks,
  helpers: helpers,
  useFragmentCache: true
};

var domHelper = environment.hasDOM ? new DOMHelper() : null;

export { domHelper };
