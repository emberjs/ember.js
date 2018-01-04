import {
  run,
  setOnerror,
  getOnerror,
  setDispatchOverride,
  getDispatchOverride
} from '../..';
import { isTesting, setTesting } from 'ember-debug';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('system/run_loop/onerror_test', class extends AbstractTestCase {
  ['@test With Ember.onerror undefined, errors in Ember.run are thrown'](assert) {
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

    assert.deepEqual(caught, thrown);
  }

  ['@test With Ember.onerror set, errors in Ember.run are caught'](assert) {
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

    assert.deepEqual(caught, thrown);
  }
});
