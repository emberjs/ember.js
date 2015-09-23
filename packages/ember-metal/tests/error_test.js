import EmberError from 'ember-metal/error';

QUnit.module('Ember Error Throwing');

QUnit.test('new Ember.Error displays provided message', function() {
  throws(function() {
    throw new EmberError('A Message');
  }, function(e) {
    return e.message === 'A Message';
  }, 'the assigned message was displayed');
});
