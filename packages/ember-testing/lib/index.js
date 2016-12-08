export { default as Test } from './test';
export { default as Adapter } from './adapters/adapter';
export { default as setupForTesting } from './setup_for_testing';
export { default as QUnitAdapter } from './adapters/qunit';

import './support';      // to handle various edge cases
import './ext/application';
import './ext/rsvp';     // setup RSVP + run loop integration
import './helpers';      // adds helpers to helpers object in Test
import './initializers'; // to setup initializer

/**
  @module ember
  @submodule ember-testing
*/
