/**
Ember Routing Handlebars

@module ember
@submodule ember-routing-handlebars
@requires ember-views
*/

import Ember from "ember-metal/core";
import EmberHandlebars from "ember-handlebars";
import Router from "ember-routing/system/router";

import {
  resolvePaths,
  resolveParams
} from "ember-routing-handlebars/helpers/shared";

import {
  deprecatedLinkToHelper,
  linkToHelper,
  LinkView
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

Router.resolveParams = resolveParams;
Router.resolvePaths = resolvePaths;

Ember.LinkView = LinkView;
EmberHandlebars.ActionHelper = ActionHelper;
EmberHandlebars.OutletView = OutletView;

EmberHandlebars.registerHelper('render', renderHelper);
EmberHandlebars.registerHelper('action', actionHelper);
EmberHandlebars.registerHelper('outlet', outletHelper);
EmberHandlebars.registerHelper('link-to', linkToHelper);
EmberHandlebars.registerHelper('linkTo', deprecatedLinkToHelper);

export default Ember;
