import EmberObject from '../../system/object';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class InvokeTests extends AbstractTestCase {
  '@test invoke should call on each object that implements'() {
    let cnt, ary, obj;

    function F(amt) {
      cnt += amt === undefined ? 1 : amt;
    }
    cnt = 0;
    ary = [
      { foo: F },
      EmberObject.create({ foo: F }),

      // NOTE: does not impl foo - invoke should just skip
      EmberObject.create({ bar: F }),

      { foo: F }
    ];

    obj = this.newObject(ary);
    obj.invoke('foo');
    this.assert.equal(cnt, 3, 'should have invoked 3 times');

    cnt = 0;
    obj.invoke('foo', 2);
    this.assert.equal(cnt, 6, 'should have invoked 3 times, passing param');
  }
}

runArrayTests('invoke', InvokeTests);
