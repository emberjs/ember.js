import Ember from './ember';

let module, RSVP;

try {
  module = requireModule('rsvp');
  RSVP = module.default;

  // The RSVP module should have named exports for `Promise`, etc,
  // but some old versions do not and provide `RSVP.Promise`, etc.
  if (!('Promise' in module)) {
    module = RSVP;
  }
} catch {
  module = RSVP = Ember.RSVP;
}

export let { Promise, all, resolve } = module;

export default RSVP;
