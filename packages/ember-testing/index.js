export { default as Test } from './lib/test';
export { default as Adapter } from './lib/adapters/adapter';
export { default as setupForTesting } from './lib/setup_for_testing';
export { default as QUnitAdapter } from './lib/adapters/qunit';

import './lib/support'; // to handle various edge cases
import './lib/ext/application';
import './lib/ext/rsvp'; // setup RSVP + run loop integration
import './lib/helpers'; // adds helpers to helpers object in Test
import './lib/initializers'; // to setup initializer
