// require('ember-runtime');
// require('ember-views');
// require('ember-handlebars');

/**
Ember Routing

@module ember
@submodule ember-routing
@requires ember-views
*/

import EmberHandlebars from "ember-handlebars";
import Ember from "ember-metal/core";

// ES6TODO: Cleanup modules with side-effects below
import "ember-routing/ext/run_loop";
import "ember-routing/ext/controller";
import "ember-routing/ext/view";

import {resolvePaths, resolveParams} from "ember-routing/helpers/shared";
import {deprecatedLinkToHelper, linkToHelper, LinkView} from "ember-routing/helpers/link_to";


// require('ember-views');
import EmberLocation from "ember-routing/location/api";
import NoneLocation from "ember-routing/location/none_location";
import HashLocation from "ember-routing/location/hash_location";
import HistoryLocation from "ember-routing/location/history_location";
import AutoLocation from "ember-routing/location/auto_location";

import {controllerFor, generateControllerFactory, generateController} from "ember-routing/system/controller_for";
import RouterDSL from "ember-routing/system/dsl";
import Router from "ember-routing/system/router";
import Route from "ember-routing/system/route";
import {outletHelper, OutletView} from "ember-routing/helpers/outlet";
import renderHelper from "ember-routing/helpers/render";
import {ActionHelper, actionHelper} from "ember-routing/helpers/action";


Ember.Location = EmberLocation;
Ember.AutoLocation = AutoLocation;
Ember.HashLocation = HashLocation;
Ember.HistoryLocation = HistoryLocation;
Ember.NoneLocation = NoneLocation;

Ember.controllerFor = controllerFor;
Ember.generateControllerFactory = generateControllerFactory;
Ember.generateController = generateController;
Ember.RouterDSL = RouterDSL;
Ember.Router = Router;
Ember.Route = Route;
Ember.LinkView = LinkView;

Router.resolveParams = resolveParams;
Router.resolvePaths = resolvePaths;

EmberHandlebars.ActionHelper = ActionHelper;
EmberHandlebars.OutletView = OutletView;

EmberHandlebars.registerHelper('render', renderHelper)
EmberHandlebars.registerHelper('action', actionHelper);
EmberHandlebars.registerHelper('outlet', outletHelper);
EmberHandlebars.registerHelper('link-to', linkToHelper);
EmberHandlebars.registerHelper('linkTo', deprecatedLinkToHelper);

export default Ember;
