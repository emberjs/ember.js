/**
@module ember
@submodule ember-routing
*/

import Ember from 'ember-metal/core'; // reexports

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
Ember.Router = Router;
Ember.Route = Route;

export default Ember;
