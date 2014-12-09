/**
Ember Routing Handlebars

@module ember
@submodule ember-routing-handlebars
@requires ember-views
*/

import Ember from "ember-metal/core";
import EmberHandlebars from "ember-handlebars";

import {
  deprecatedLinkToHelper,
  linkToHelper,
  LinkView,
  queryParamsHelper
} from "ember-routing-handlebars/helpers/link_to";

import {
  outletHelper,
  OutletView
} from "ember-routing-handlebars/helpers/outlet";

import renderHelper from "ember-routing-handlebars/helpers/render";

import {
  ActionHelper,
  actionHelper
} from "ember-routing-handlebars/helpers/action";

Ember.LinkView = LinkView;
EmberHandlebars.ActionHelper = ActionHelper;
EmberHandlebars.OutletView = OutletView;

EmberHandlebars.registerHelper('render', renderHelper);
EmberHandlebars.registerHelper('action', actionHelper);
EmberHandlebars.registerHelper('outlet', outletHelper);
EmberHandlebars.registerHelper('link-to', linkToHelper);
EmberHandlebars.registerHelper('linkTo', deprecatedLinkToHelper);
EmberHandlebars.registerHelper('query-params', queryParamsHelper);

export default Ember;
