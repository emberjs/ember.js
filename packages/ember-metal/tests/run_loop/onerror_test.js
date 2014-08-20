import Ember from 'ember-metal';
import run from 'ember-metal/run_loop';

QUnit.module('system/run_loop/onerror_test');

test('With Ember.onerror undefined, errors in Ember.run are thrown', function () {
  var defaultOnError = Ember.onerror;
  Ember.onerror = undefined;
  var thrown = new Error('Boom!');
  var caught;

  try {
    run(function() { throw thrown; });
  } catch (error) {
    caught = error;
  }

  Ember.onerror = defaultOnError;
  deepEqual(caught, thrown);
});

test('With Ember.onerror set, errors in Ember.run are caught', function () {
  var thrown = new Error('Boom!');
  var originalOnError = Ember.onerror;
  var caught;

  Ember.onerror = function(error){
    caught = error;
  };

  run(function() { throw thrown; });

  deepEqual(caught, thrown);

  Ember.onerror = originalOnError;
});

if (new Error().stack){

  asyncTest('Ember.run.backburner.DEBUG = true gets error recorded for stack traces', function(){
    var thrown          = new Error('Boom!');
    var originalOnError = Ember.onerror;
    var caught, stackError;

    Ember.run.backburner.DEBUG = true;

    Ember.onerror = function(error, errorRecordedForStack){
      stackError = errorRecordedForStack;
      caught     = error;
      QUnit.start();
      deepEqual(caught, thrown);
      ok(stackError, 'gets a error with stack for when the work was queued');
    };

    run(function(){
      run.scheduleOnce('afterRender', function(){
        throw thrown;
      });
    });

    Ember.run.backburner.DEBUG = false;

    Ember.onerror = originalOnError;
  });
}
