/**
Ember Routing HTMLBars Helpers

@module ember
@submodule ember-routing-htmlbars
@requires ember-routing
*/

import Ember from "ember-metal/core";

import { registerHelper } from "ember-htmlbars/helpers";

import { outletHelper } from "ember-routing-htmlbars/helpers/outlet";
import {
  linkToHelper,
  deprecatedLinkToHelper
} from "ember-routing-htmlbars/helpers/link-to";
import { actionHelper } from "ember-routing-htmlbars/helpers/action";

registerHelper('outlet', outletHelper);
registerHelper('link-to', linkToHelper);
registerHelper('linkTo', deprecatedLinkToHelper);
registerHelper('action', actionHelper);

export default Ember;
