export { default as Test } from './test';
export { default as Adapter } from './adapters/adapter';

import './ext/application';
import './ext/rsvp'; // setup RSVP + run loop integration
import './helpers'; // adds helpers to helpers object in Test
import './initializers'; // to setup initializer
