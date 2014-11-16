import Ember from "ember-metal/core";
import {
  content,
  element,
  subexpr,
  component
} from "ember-htmlbars/hooks";
import { DOMHelper } from "morph";
import template from "ember-htmlbars/system/template";
import compile from "ember-htmlbars/system/compile";

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

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  Ember.HTMLBars = {
    template: template,
    compile: compile
  };
}

export var defaultEnv = {
  dom: new DOMHelper(),

  hooks: {
    content: content,
    element: element,
    subexpr: subexpr,
    component: component
  },

  helpers: helpers
};

