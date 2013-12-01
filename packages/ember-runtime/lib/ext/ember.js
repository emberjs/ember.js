Ember.RSVP = requireModule('rsvp');

Ember.RSVP.onerrorDefault = function(error) {
  if (error instanceof Error) {
    if (Ember.testing) {
      if (Ember.Test.adapter) {
        Ember.Test.adapter.exception(error);
      } else {
        throw error;
      }
    } else {
      Ember.Logger.error(error.stack);
      Ember.assert(error, false);
    }
  }
};

Ember.RSVP.on('error', Ember.RSVP.onerrorDefault);
