import { get, set } from '@ember/object';
import { AbstractTestCase, expectDeprecation } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class FirstObjectTests extends AbstractTestCase {
  '@test returns first item in enumerable'() {
    let obj = this.newObject();
    expectDeprecation(() => {
      this.assert.equal(get(obj, 'firstObject'), this.toArray(obj)[0]);
    }, /Usage of Ember.Array methods is deprecated/);
  }

  '@test returns undefined if enumerable is empty'() {
    let obj = this.newObject([]);
    expectDeprecation(() => {
      this.assert.equal(get(obj, 'firstObject'), undefined);
    }, /Usage of Ember.Array methods is deprecated/);
  }

  '@test can not be set'() {
    let obj = this.newObject([]);

    expectDeprecation(() => {
      this.assert.equal(get(obj, 'firstObject'), this.toArray(obj)[0]);
    }, /Usage of Ember.Array methods is deprecated/);

    this.assert.throws(() => {
      set(obj, 'firstObject', 'foo!');
    }, /Cannot set read-only property "firstObject" on object/);
  }
}

runArrayTests('firstObject', FirstObjectTests);
