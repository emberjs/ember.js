import copy from '../../lib/copy';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember Copy Method',
  class extends AbstractTestCase {
    ['@test Ember.copy null'](assert) {
      let obj = { field: null };
      let copied = null;
      expectDeprecation(() => {
        copied = copy(obj, true);
      }, 'Use ember-copy addon instead of copy method and Copyable mixin.');
      assert.equal(copied.field, null, 'null should still be null');
    }

    ['@test Ember.copy date'](assert) {
      let date = new Date(2014, 7, 22);
      let dateCopy = null;
      expectDeprecation(() => {
        dateCopy = copy(date);
      }, 'Use ember-copy addon instead of copy method and Copyable mixin.');
      assert.equal(date.getTime(), dateCopy.getTime(), 'dates should be equivalent');
    }

    ['@test Ember.copy null prototype object'](assert) {
      let obj = Object.create(null);

      obj.foo = 'bar';
      let copied = null;
      expectDeprecation(() => {
        copied = copy(obj);
      }, 'Use ember-copy addon instead of copy method and Copyable mixin.');

      assert.equal(copied.foo, 'bar', 'bar should still be bar');
    }

    ['@test Ember.copy Array'](assert) {
      let array = [1, null, new Date(2015, 9, 9), 'four'];
      let arrayCopy = null;
      expectDeprecation(() => {
        arrayCopy = copy(array);
      }, 'Use ember-copy addon instead of copy method and Copyable mixin.');

      assert.deepEqual(array, arrayCopy, 'array content cloned successfully in new array');
    }

    ['@test Ember.copy cycle detection'](assert) {
      let obj = {
        foo: {
          bar: 'bar',
        },
      };
      obj.foo.foo = obj.foo;
      let cycleCopy = null;
      expectDeprecation(() => {
        cycleCopy = copy(obj, true);
      }, 'Use ember-copy addon instead of copy method and Copyable mixin.');

      assert.equal(cycleCopy.foo.bar, 'bar');
      assert.notEqual(cycleCopy.foo.foo, obj.foo.foo);
      assert.strictEqual(cycleCopy.foo.foo, cycleCopy.foo.foo);
    }
  }
);
