import environment from "ember-metal/environment";

import DOMHelper from "dom-helper";

import { hooks } from "htmlbars-runtime";
import merge from "ember-metal/merge";
import shouldDisplay from "ember-views/streams/should_display";
import { readArray } from "ember-metal/streams/utils";

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
import linkedRenderNode from "ember-htmlbars/hooks/linked-render-node";
import bindLocal from "ember-htmlbars/hooks/bind-local";
import bindSelf from "ember-htmlbars/hooks/bind-self";
import getRoot from "ember-htmlbars/hooks/get-root";
import getChild from "ember-htmlbars/hooks/get-child";
import getValue from "ember-htmlbars/hooks/get-value";

import helpers from "ember-htmlbars/helpers";

var emberHooks = merge(hooks, {
  linkedRenderNode: linkedRenderNode,
  bindLocal: bindLocal,
  bindSelf: bindSelf,
  getRoot: getRoot,
  getChild: getChild,
  getValue: getValue,
  subexpr: subexpr,
  concat: concat
});

emberHooks.keywords.unbound = function(morph, env, scope, originalParams, hash, template, inverse) {
  var path = originalParams.shift();
  var params = readArray(originalParams);

  if (params.length === 0) {
    return env.hooks.range(morph, env, path);
  } else if (template === null) {
    return env.hooks.inline(morph, env, scope, path.key, params, hash);
  } else {
    return env.hooks.block(morph, env, scope, path.key, params, hash, template, inverse);
  }
};

emberHooks.keywords['if'] = function(morph, env, scope, params, hash, template, inverse) {
  params[0] = shouldDisplay(params[0]);
  return true;
};

export default {
  hooks: emberHooks,
  helpers: helpers,
  useFragmentCache: true
};

var domHelper = environment.hasDOM ? new DOMHelper() : null;

export { domHelper };
