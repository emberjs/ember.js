import Ember from "ember-metal/core";
import Logger from "ember-metal/logger";

var RSVP = requireModule("rsvp");

RSVP.onerrorDefault = function(error) {
  if (error instanceof Error) {
    if (Ember.testing) {
      if (Ember.Test && Ember.Test.adapter) {
        Ember.Test.adapter.exception(error);
      } else {
        throw error;
      }
    } else {
      Logger.error(error.stack);
      Ember.assert(error, false);
    }
  }
};

RSVP.on('error', RSVP.onerrorDefault);

Ember.RSVP = RSVP;

export default RSVP;
