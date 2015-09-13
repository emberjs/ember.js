import Ember from 'ember-metal/core';

import 'ember-testing/initializers'; // to setup initializer
import 'ember-testing/support';      // to handle various edge cases

import 'ember-testing/helpers';      // adds helpers to helpers object in Test

/**
  @module ember
  @submodule ember-testing
*/

var reexport = Ember.__reexport;

reexport('ember-testing/test', 'Test');
reexport('ember-testing/adapters/adapter', 'Test', 'Adapter');
reexport('ember-testing/adapters/qunit', 'Test', 'QUnitAdapter');
reexport('ember-testing/setup_for_testing', 'setupForTesting ');
