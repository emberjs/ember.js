import Ember from "ember-metal/core";

import {
  precompile,
  compile,
  template,
  registerPlugin
} from "ember-template-compiler";

import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import makeBoundHelper from "ember-htmlbars/system/make_bound_helper";

import {
  registerHelper
} from "ember-htmlbars/helpers";
import viewHelper from "ember-htmlbars/helpers/view";
//import { componentHelper } from "ember-htmlbars/helpers/component";
//import { yieldHelper } from "ember-htmlbars/helpers/yield";
//import { withHelper } from "ember-htmlbars/helpers/with";
//import { logHelper } from "ember-htmlbars/helpers/log";
//import { debuggerHelper } from "ember-htmlbars/helpers/debugger";
//import {
  //bindAttrHelper,
  //bindAttrHelperDeprecated
//} from "ember-htmlbars/helpers/bind-attr";
import {
  ifHelper,
  unlessHelper
} from "ember-htmlbars/helpers/if_unless";
//import { locHelper } from "ember-htmlbars/helpers/loc";
//import { partialHelper } from "ember-htmlbars/helpers/partial";
//import { templateHelper } from "ember-htmlbars/helpers/template";
//import { inputHelper } from "ember-htmlbars/helpers/input";
//import { textareaHelper } from "ember-htmlbars/helpers/text_area";
//import { collectionHelper } from "ember-htmlbars/helpers/collection";
//import { eachHelper } from "ember-htmlbars/helpers/each";
//import { unboundHelper } from "ember-htmlbars/helpers/unbound";

// importing adds template bootstrapping
// initializer to enable embedded templates
import "ember-htmlbars/system/bootstrap";

// importing ember-htmlbars/compat updates the
// Ember.Handlebars global if htmlbars is enabled
import "ember-htmlbars/compat";

registerHelper('@view', viewHelper);
//if (Ember.FEATURES.isEnabled('ember-htmlbars-component-helper')) {
  //registerHelper('component', componentHelper);
//}
//registerHelper('yield', yieldHelper);
//registerHelper('with', withHelper);
registerHelper('if', ifHelper);
registerHelper('unless', unlessHelper);
//registerHelper('log', logHelper);
//registerHelper('debugger', debuggerHelper);
//registerHelper('loc', locHelper);
//registerHelper('partial', partialHelper);
//registerHelper('template', templateHelper);
//registerHelper('bind-attr', bindAttrHelper);
//registerHelper('bindAttr', bindAttrHelperDeprecated);
//registerHelper('input', inputHelper);
//registerHelper('textarea', textareaHelper);
//registerHelper('collection', collectionHelper);
//registerHelper('each', eachHelper);
//registerHelper('unbound', unboundHelper);

Ember.HTMLBars = {
  _registerHelper: registerHelper,
  template: template,
  compile: compile,
  precompile: precompile,
  makeViewHelper: makeViewHelper,
  makeBoundHelper: makeBoundHelper,
  registerPlugin: registerPlugin
};
