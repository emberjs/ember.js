import EmberObject from '@ember/object';
import { NativeArray } from '@ember/array';
import { AbstractTestCase, expectDeprecation } from 'internal-test-helpers';
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

      { foo: F },
    ];

    obj = this.newObject(ary);
    expectDeprecation(() => {
      obj.invoke('foo');
    }, /Usage of Ember.Array methods is deprecated/);
    this.assert.equal(cnt, 3, 'should have invoked 3 times');

    cnt = 0;
    expectDeprecation(() => {
      obj.invoke('foo', 2);
    }, /Usage of Ember.Array methods is deprecated/);
    this.assert.equal(cnt, 6, 'should have invoked 3 times, passing param');
  }

  '@test invoke should return an array containing the results of each invoked method'(assert) {
    let obj = this.newObject([
      {
        foo() {
          return 'one';
        },
      },
      {}, // intentionally not including `foo` method
      {
        foo() {
          return 'two';
        },
      },
    ]);

    let result;
    expectDeprecation(() => {
      result = obj.invoke('foo');
    }, /Usage of Ember.Array methods is deprecated/);
    assert.deepEqual(result, ['one', undefined, 'two']);
  }

  '@test invoke should return an extended array (aka Ember.A)'(assert) {
    let obj = this.newObject([{ foo() {} }, { foo() {} }]);

    let result;
    expectDeprecation(() => {
      result = obj.invoke('foo');
    }, /Usage of Ember.Array methods is deprecated/);

    expectDeprecation(() => {
      assert.ok(NativeArray.detect(result), 'NativeArray has been applied');
    }, /Usage of EmberArray is deprecated/);
  }
}

runArrayTests('invoke', InvokeTests);
