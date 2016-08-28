import Ember from 'ember-metal/core'; // reexports
import Test from './test';
import Adapter from './adapters/adapter';
import setupForTesting from './setup_for_testing';
import require from 'require';

import './support';      // to handle various edge cases
import './ext/application';
import './ext/rsvp';
import './helpers';      // adds helpers to helpers object in Test
import './initializers'; // to setup initializer

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
