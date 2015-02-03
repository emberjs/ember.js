QUnit.module("Ember Error Throwing");

QUnit.test("new Ember.Error displays provided message", function() {
  throws(function() {
    throw new Ember.Error('A Message');
  }, function(e) {
    return e.message === 'A Message';
  }, 'the assigned message was displayed');
});
