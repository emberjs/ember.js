module('system/run_loop/next_test');

test('should invoke immediately on next timeout', function() {

  var invoked = false;

  stop();

  Ember.run(function() {
    Ember.run.next(function() { invoked = true; });
  });

  equal(invoked, false, 'should not have invoked yet');


  setTimeout(function() {
    start();
    equal(invoked, true, 'should have invoked later item');
  }, 20);

});
