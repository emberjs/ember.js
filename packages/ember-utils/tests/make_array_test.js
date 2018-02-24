import { makeArray } from '..';
import {
  moduleFor,
  AbstractTestCase as TestCase
} from 'internal-test-helpers';

moduleFor('Ember.makeArray', class extends TestCase {
  ['@test undefined'](assert) {
    assert.deepEqual(makeArray(), []);
    assert.deepEqual(makeArray(undefined), []);
  }

  ['@test null'](assert) {
    assert.deepEqual(makeArray(null), []);
  }

  ['@test string'](assert) {
    assert.deepEqual(makeArray('lindsay'), ['lindsay']);
  }

  ['@test number'](assert) {
    assert.deepEqual(makeArray(0), [0]);
    assert.deepEqual(makeArray(1), [1]);
  }

  ['@test array'](assert) {
    assert.deepEqual(makeArray([1, 2, 42]), [1, 2, 42]);
  }

  ['@test true'](assert) {
    assert.deepEqual(makeArray(true), [true]);
  }

  ['@test false'](assert) {
    assert.deepEqual(makeArray(false), [false]);
  }

  ['@test object'](assert) {
    assert.deepEqual(makeArray({}), [{}]);
  }
});

