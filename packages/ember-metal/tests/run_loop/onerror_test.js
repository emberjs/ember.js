import run from '../../run_loop';
import { setOnerror, getOnerror, setDispatchOverride, getDispatchOverride } from '../../error_handler';
import { isTesting, setTesting } from 'ember-debug';

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
  let originalDispatchOverride = getDispatchOverride();
  let originalIsTesting = isTesting();

  let caught;
  setOnerror(error => { caught = error; });
  setDispatchOverride(null);
  setTesting(false);

  try {
    run(() => { throw thrown; });
  } finally {
    setOnerror(original);
    setDispatchOverride(originalDispatchOverride);
    setTesting(originalIsTesting);
  }

  deepEqual(caught, thrown);
});
