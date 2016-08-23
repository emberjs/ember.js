/**
@module ember
@submodule ember-routing
*/

// ES6TODO: Cleanup modules with side-effects below
import './ext/run_loop';
import './ext/controller';

import EmberLocation from './location/api';
import NoneLocation from './location/none_location';
import HashLocation from './location/hash_location';
import HistoryLocation from './location/history_location';
import AutoLocation from './location/auto_location';

import generateController from './system/generate_controller';
import {
  generateControllerFactory
} from './system/generate_controller';
import controllerFor from './system/controller_for';
import RouterDSL from './system/dsl';
import Router from './system/router';
import RouterService from './services/router';
import Route from './system/route';

Ember.Location = EmberLocation;
Ember.AutoLocation = AutoLocation;
Ember.HashLocation = HashLocation;
Ember.HistoryLocation = HistoryLocation;
Ember.NoneLocation = NoneLocation;

Ember.controllerFor = controllerFor;
Ember.generateControllerFactory = generateControllerFactory;
Ember.generateController = generateController;
Ember.RouterDSL = RouterDSL;
Ember.Router = RouterService;
Ember.Route = Route;
>>>>>>> Assign RouterService to Ember.Router instead of internal Router

export {
  default as generateController,
  generateControllerFactory
} from './system/generate_controller';
export { default as controllerFor } from './system/controller_for';
export { default as RouterDSL } from './system/dsl';
export { default as Router } from './system/router';
export { default as Route } from './system/route';
export { default as QueryParams } from './system/query_params';
export { default as RoutingService } from './services/routing';
export { default as BucketCache } from './system/cache';
