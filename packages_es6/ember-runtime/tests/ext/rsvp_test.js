import run from "ember-metal/run_loop";
import RSVP from "ember-runtime/ext/rsvp";

module('Ember.RSVP');

test('Ensure that errors thrown from within a promise are sent to the console', function(){
  var error = new Error('Error thrown in a promise for testing purposes.');

  try {
    run(function(){
      new RSVP.Promise(function(resolve, reject){
        throw error;
      });
    });
    ok(false, 'expected assertion to be thrown');
  } catch (e) {
    equal(e, error, "error was re-thrown");
  }
});
