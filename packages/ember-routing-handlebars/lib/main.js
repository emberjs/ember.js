/**
Ember Routing Handlebars Helpers

@module ember
@submodule ember-routing-handlebars
@requires ember-routing
*/

import Ember from "ember-metal/core";
import EmberHandlebars from "ember-handlebars";

import {
  deprecatedLinkToHelper,
  linkToHelper
} from "ember-routing-handlebars/helpers/link_to";

import { queryParamsHelper } from "ember-routing-handlebars/helpers/query_params";
import { outletHelper } from "ember-routing-handlebars/helpers/outlet";
import { renderHelper } from "ember-routing-handlebars/helpers/render";

import {
  ActionHelper,
  actionHelper
} from "ember-routing-handlebars/helpers/action";

EmberHandlebars.ActionHelper = ActionHelper;

EmberHandlebars.registerHelper('render', renderHelper);
EmberHandlebars.registerHelper('action', actionHelper);
EmberHandlebars.registerHelper('outlet', outletHelper);
EmberHandlebars.registerHelper('link-to', linkToHelper);
EmberHandlebars.registerHelper('linkTo', deprecatedLinkToHelper);
EmberHandlebars.registerHelper('query-params', queryParamsHelper);

export default Ember;
