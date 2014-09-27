/**
Ember Routing

@module ember
@submodule ember-routing
@requires ember-views
*/

import Ember from "ember-metal/core";

// ES6TODO: Cleanup modules with side-effects below
import "ember-routing/ext/run_loop";
import "ember-routing/ext/controller";
import "ember-routing/ext/view";

import EmberLocation from "ember-routing/location/api";
import NoneLocation from "ember-routing/location/none_location";
import HashLocation from "ember-routing/location/hash_location";
import HistoryLocation from "ember-routing/location/history_location";
import AutoLocation from "ember-routing/location/auto_location";

import {
  generateControllerFactory
} from "ember-routing/system/generate_controller";
import generateController from "ember-routing/system/generate_controller";
import controllerFor from "ember-routing/system/controller_for";
import RouterDSL from "ember-routing/system/dsl";
import Router from "ember-routing/system/router";
import Route from "ember-routing/system/route";

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

export default Ember;
