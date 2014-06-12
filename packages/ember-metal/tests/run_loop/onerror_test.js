import Ember from 'ember-metal';
import run from 'ember-metal/run_loop';

QUnit.module('system/run_loop/onerror_test');

test('With Ember.onerror undefined, errors in Ember.run are thrown', function () {
  var thrown = new Error('Boom!'),
      caught;

  try {
    run(function() { throw thrown; });
  } catch (error) {
    caught = error;
  }

  deepEqual(caught, thrown);
});

test('With Ember.onerror set, errors in Ember.run are caught', function () {
  var thrown = new Error('Boom!'),
      caught;

  Ember.onerror = function(error) { caught = error; };

  run(function() { throw thrown; });

  deepEqual(caught, thrown);

  Ember.onerror = undefined;
});
