import Ember from "ember-metal/core";

import "ember-testing/initializers"; // to setup initializer
import "ember-testing/support";      // to handle various edge cases

import setupForTesting from "ember-testing/setup_for_testing";
import Test from "ember-testing/test";
import Adapter from "ember-testing/adapters/adapter";
import QUnitAdapter from "ember-testing/adapters/qunit";
import "ember-testing/helpers";      // adds helpers to helpers object in Test

/**
  @module ember
  @submodule ember-testing
*/

Ember.Test = Test;
Ember.Test.Adapter = Adapter;
Ember.Test.QUnitAdapter = QUnitAdapter;
Ember.setupForTesting = setupForTesting;
