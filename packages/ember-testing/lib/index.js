import Ember from 'ember-metal/core'; // reexports
import Test from 'ember-testing/test';
import Adapter from 'ember-testing/adapters/adapter';
import setupForTesting from 'ember-testing/setup_for_testing';
import require from 'require';

import 'ember-testing/support';      // to handle various edge cases
import 'ember-testing/ext/application';
import 'ember-testing/ext/rsvp';
import 'ember-testing/helpers';      // adds helpers to helpers object in Test
import 'ember-testing/initializers'; // to setup initializer

/**
  @module ember
  @submodule ember-testing
*/

Ember.Test = Test;
Ember.Test.Adapter = Adapter;
Ember.setupForTesting = setupForTesting;
Object.defineProperty(Test, 'QUnitAdapter', {
  get: () => require('ember-testing/adapters/qunit').default
});
