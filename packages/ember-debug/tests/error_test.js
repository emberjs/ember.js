import EmberError from '../error';

QUnit.module('Ember Error Throwing');

QUnit.test('new Ember.Error displays provided message', function() {
  throws(() => {
    throw new EmberError('A Message');
  }, e => e.message === 'A Message', 'the assigned message was displayed');
});
