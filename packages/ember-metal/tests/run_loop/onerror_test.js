import run from '../../run_loop';
import { setOnerror, getOnerror } from '../../error_handler';

QUnit.module('system/run_loop/onerror_test');

QUnit.test('With Ember.onerror undefined, errors in Ember.run are thrown', function () {
  let thrown = new Error('Boom!');
  let original = getOnerror();

  let caught;
  setOnerror(undefined);
  try {
    run(() => { throw thrown; });
  } catch (error) {
    caught = error;
  } finally {
    setOnerror(original);
  }

  deepEqual(caught, thrown);
});

QUnit.test('With Ember.onerror set, errors in Ember.run are caught', function () {
  let thrown = new Error('Boom!');
  let original = getOnerror();

  let caught;
  setOnerror(error => { caught = error; });
  try {
    run(() => { throw thrown; });
  } finally {
    setOnerror(original);
  }

  deepEqual(caught, thrown);
});
