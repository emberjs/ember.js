import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';
import { get, set } from '@ember/-internals/metal';

class LastObjectTests extends AbstractTestCase {
  '@test returns last item in enumerable'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);

    this.assert.equal(get(obj, 'lastObject'), ary[ary.length - 1]);
  }

  '@test returns undefined if enumerable is empty'() {
    let obj = this.newObject([]);

    this.assert.equal(get(obj, 'lastObject'), undefined);
  }

  '@test can not be set'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);

    this.assert.equal(get(obj, 'lastObject'), ary[ary.length - 1]);

    this.assert.throws(function() {
      set(obj, 'lastObject', 'foo!');
    }, /Cannot set read-only property "lastObject" on object/);
  }
}

runArrayTests('lastObject', LastObjectTests);
