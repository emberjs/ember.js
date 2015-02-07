import Ember from "ember-metal/core";

import {
  precompile,
  compile,
  template,
  registerPlugin
} from "ember-template-compiler";

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
import { DOMHelper } from "morph";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import makeBoundHelper from "ember-htmlbars/system/make_bound_helper";

import {
  registerHelper,
  default as helpers
} from "ember-htmlbars/helpers";
import { bindHelper } from "ember-htmlbars/helpers/binding";
import { viewHelper } from "ember-htmlbars/helpers/view";
import { yieldHelper } from "ember-htmlbars/helpers/yield";
import { withHelper } from "ember-htmlbars/helpers/with";
import { logHelper } from "ember-htmlbars/helpers/log";
import { debuggerHelper } from "ember-htmlbars/helpers/debugger";
import {
  bindAttrHelper,
  bindAttrHelperDeprecated
} from "ember-htmlbars/helpers/bind-attr";
import {
  ifHelper,
  unlessHelper,
  unboundIfHelper,
  boundIfHelper
} from "ember-htmlbars/helpers/if_unless";
import { locHelper } from "ember-htmlbars/helpers/loc";
import { partialHelper } from "ember-htmlbars/helpers/partial";
import { templateHelper } from "ember-htmlbars/helpers/template";
import { inputHelper } from "ember-htmlbars/helpers/input";
import { textareaHelper } from "ember-htmlbars/helpers/text_area";
import { collectionHelper } from "ember-htmlbars/helpers/collection";
import { eachHelper } from "ember-htmlbars/helpers/each";
import { unboundHelper } from "ember-htmlbars/helpers/unbound";

// importing adds template bootstrapping
// initializer to enable embedded templates
import "ember-htmlbars/system/bootstrap";

// importing ember-htmlbars/compat updates the
// Ember.Handlebars global if htmlbars is enabled
import "ember-htmlbars/compat";

registerHelper('bindHelper', bindHelper);
registerHelper('bind', bindHelper);
registerHelper('view', viewHelper);
registerHelper('yield', yieldHelper);
registerHelper('with', withHelper);
registerHelper('if', ifHelper);
registerHelper('unless', unlessHelper);
registerHelper('unboundIf', unboundIfHelper);
registerHelper('boundIf', boundIfHelper);
registerHelper('log', logHelper);
registerHelper('debugger', debuggerHelper);
registerHelper('loc', locHelper);
registerHelper('partial', partialHelper);
registerHelper('template', templateHelper);
registerHelper('bind-attr', bindAttrHelper);
registerHelper('bindAttr', bindAttrHelperDeprecated);
registerHelper('input', inputHelper);
registerHelper('textarea', textareaHelper);
registerHelper('collection', collectionHelper);
registerHelper('each', eachHelper);
registerHelper('unbound', unboundHelper);
registerHelper('concat', concat);

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  Ember.HTMLBars = {
    _registerHelper: registerHelper,
    template: template,
    compile: compile,
    precompile: precompile,
    makeViewHelper: makeViewHelper,
    makeBoundHelper: makeBoundHelper,
    registerPlugin: registerPlugin
  };

}

export var defaultEnv = {
  dom: new DOMHelper(),

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
