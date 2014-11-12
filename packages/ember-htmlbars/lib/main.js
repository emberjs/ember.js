import { content, element, subexpr, lookupHelper } from "ember-htmlbars/hooks";
import { DOMHelper } from "morph";

import {
  registerHelper,
  default as helpers
} from "ember-htmlbars/helpers";
import { concat } from "ember-htmlbars/helpers/concat";
import { attribute } from "ember-htmlbars/helpers/attribute";
import { bindHelper } from "ember-htmlbars/helpers/binding";
import { viewHelper } from "ember-htmlbars/helpers/view";
import { yieldHelper } from "ember-htmlbars/helpers/yield";
import { withHelper } from "ember-htmlbars/helpers/with";
import { logHelper } from "ember-htmlbars/helpers/log";
import { debuggerHelper } from "ember-htmlbars/helpers/debugger";
import {
  ifHelper,
  unlessHelper,
  unboundIfHelper,
  boundIfHelper
} from "ember-htmlbars/helpers/if_unless";
import { locHelper } from "ember-htmlbars/helpers/loc";

registerHelper('concat', concat);
registerHelper('attribute', attribute);
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

export var defaultEnv = {
  dom: new DOMHelper(),

  hooks: {
    content: content,
    element: element,
    subexpr: subexpr,
    lookupHelper: lookupHelper
  },

  helpers: helpers
};

