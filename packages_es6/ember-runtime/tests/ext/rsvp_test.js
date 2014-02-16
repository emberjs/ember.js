module('Ember.RSVP');

test('Ensure that errors thrown from within a promise are sent to the console', function(){
  var error = new Error('Error thrown in a promise for testing purposes.');

  try {
    Ember.run(function(){
      new Ember.RSVP.Promise(function(resolve, reject){
        throw error;
      });
    });
    ok(false, 'expected assertion to be thrown');
  } catch (e) {
    equal(e, error, "error was re-thrown");
  }
});
