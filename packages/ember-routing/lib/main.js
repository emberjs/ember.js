/**
@module ember
@submodule ember-routing
*/

import Ember from 'ember-metal/core';

// ES6TODO: Cleanup modules with side-effects below
import 'ember-routing/ext/run_loop';
import 'ember-routing/ext/controller';
import 'ember-routing/initializers/routing-service';

var reexport = Ember.__reexport;

reexport('ember-routing/location/api', [['default', 'Location']]);
reexport('ember-routing/location/auto_location', [['default', 'AutoLocation']]);
reexport('ember-routing/location/hash_location', [['default', 'HashLocation']]);
reexport('ember-routing/location/history_location', [['default', 'HistoryLocation']]);
reexport('ember-routing/location/none_location', [['default', 'NoneLocation']]);

reexport('ember-routing/system/controller_for', 'controllerFor');
reexport('ember-routing/system/generate_controller', ['generateControllerFactory']);
reexport('ember-routing/system/generate_controller', 'generateController');
reexport('ember-routing/system/dsl', 'RouterDSL');
reexport('ember-routing/system/router', 'Router');
reexport('ember-routing/system/route', 'Route');

export default Ember;
