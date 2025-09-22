import { AbstractTestCase, expectDeprecation } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';
import { get, set } from '@ember/object';

class LastObjectTests extends AbstractTestCase {
  '@test returns last item in enumerable'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);

    expectDeprecation(() => {
      this.assert.equal(get(obj, 'lastObject'), ary[ary.length - 1]);
    }, /Usage of Ember.Array methods is deprecated/);
  }

  '@test returns undefined if enumerable is empty'() {
    let obj = this.newObject([]);

    expectDeprecation(() => {
      this.assert.equal(get(obj, 'lastObject'), undefined);
    }, /Usage of Ember.Array methods is deprecated/);
  }

  '@test can not be set'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);

    expectDeprecation(() => {
      this.assert.equal(get(obj, 'lastObject'), ary[ary.length - 1]);
    }, /Usage of Ember.Array methods is deprecated/);

    this.assert.throws(function () {
      set(obj, 'lastObject', 'foo!');
    }, /Cannot set read-only property "lastObject" on object/);
  }
}

runArrayTests('lastObject', LastObjectTests);
