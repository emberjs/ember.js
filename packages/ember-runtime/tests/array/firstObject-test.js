import { get, set } from 'ember-metal';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class FirstObjectTests extends AbstractTestCase {
  '@test returns first item in enumerable'() {
    let obj = this.newObject();
    this.assert.equal(get(obj, 'firstObject'), this.toArray(obj)[0]);
  }

  '@test returns undefined if enumerable is empty'() {
    let obj = this.newObject([]);
    this.assert.equal(get(obj, 'firstObject'), undefined);
  }

  '@test can not be set'() {
    let obj = this.newObject([]);

    this.assert.equal(get(obj, 'firstObject'), this.toArray(obj)[0]);

    this.assert.throws(() => {
      set(obj, 'firstObject', 'foo!');
    }, /Cannot set read-only property "firstObject" on object/);
  }
}

runArrayTests('firstObject', FirstObjectTests);