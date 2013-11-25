/**
  Expose RSVP implementation
  
  Documentation can be found here: https://github.com/tildeio/rsvp.js/blob/master/README.md

  @class RSVP
  @namespace Ember
  @constructor
*/
Ember.RSVP = requireModule('rsvp');

Ember.RSVP.onerrorDefault = function(event) {
  var error = event.detail;

  if (error instanceof Error) {
    Ember.Logger.error(error.stack);

    if (Ember.testing) {
      throw error;
    } else {
      Ember.assert(error, false);
    }
  }
};

Ember.RSVP.on('error', Ember.RSVP.onerrorDefault);
