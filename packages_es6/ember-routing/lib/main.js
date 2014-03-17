// require('ember-runtime');
// require('ember-views');
// require('ember-handlebars');

/**
Ember Routing

@module ember
@submodule ember-routing
@requires ember-views
*/

// BEGIN IMPORTS
import Ember from "ember-metal/core";

// ES6TODO: Cleanup modules with side-effects below
import "ember-routing/ext";
import "ember-routing/ext/controller";
import "ember-routing/ext/view";
import "ember-routing/helpers/shared";
import "ember-routing/helpers/link_to";
import "ember-routing/helpers/outlet";
import "ember-routing/helpers/render";
import "ember-routing/helpers/action";

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
// END IMPORTS


// BEGIN EXPORTS
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
// END EXPORTS

export default Ember;
