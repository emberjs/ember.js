import { get } from 'ember-metal';
import EmberObject from '../../../../lib/system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * changed get(obj, ) and set(obj, ) to Ember.get() and Ember.set()
  * converted uses of obj.isEqual() to use deepEqual() test since isEqual is not
    always defined
*/

function K() {
  return this;
}

let klass;

moduleFor(
  'EmberObject Concatenated Properties',
  class extends AbstractTestCase {
    beforeEach() {
      klass = EmberObject.extend({
        concatenatedProperties: ['values', 'functions'],
        values: ['a', 'b', 'c'],
        functions: [K],
      });
    }

    ['@test concatenates instances'](assert) {
      let obj = klass.create({
        values: ['d', 'e', 'f'],
      });

      let values = get(obj, 'values');
      let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

      assert.deepEqual(
        values,
        expected,
        `should concatenate values property (expected: ${expected}, got: ${values})`
      );
    }

    ['@test concatenates subclasses'](assert) {
      let subKlass = klass.extend({
        values: ['d', 'e', 'f'],
      });
      let obj = subKlass.create();

      let values = get(obj, 'values');
      let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

      assert.deepEqual(
        values,
        expected,
        `should concatenate values property (expected: ${expected}, got: ${values})`
      );
    }

    ['@test concatenates reopen'](assert) {
      klass.reopen({
        values: ['d', 'e', 'f'],
      });
      let obj = klass.create();

      let values = get(obj, 'values');
      let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

      assert.deepEqual(
        values,
        expected,
        `should concatenate values property (expected: ${expected}, got: ${values})`
      );
    }

    ['@test concatenates mixin'](assert) {
      let mixin = {
        values: ['d', 'e'],
      };
      let subKlass = klass.extend(mixin, {
        values: ['f'],
      });
      let obj = subKlass.create();

      let values = get(obj, 'values');
      let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

      assert.deepEqual(
        values,
        expected,
        `should concatenate values property (expected: ${expected}, got: ${values})`
      );
    }

    ['@test concatenates reopen, subclass, and instance'](assert) {
      klass.reopen({ values: ['d'] });
      let subKlass = klass.extend({ values: ['e'] });
      let obj = subKlass.create({ values: ['f'] });

      let values = get(obj, 'values');
      let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

      assert.deepEqual(
        values,
        expected,
        `should concatenate values property (expected: ${expected}, got: ${values})`
      );
    }

    ['@test concatenates subclasses when the values are functions'](assert) {
      let subKlass = klass.extend({
        functions: K,
      });
      let obj = subKlass.create();

      let values = get(obj, 'functions');
      let expected = [K, K];

      assert.deepEqual(
        values,
        expected,
        `should concatenate functions property (expected: ${expected}, got: ${values})`
      );
    }

    ['@test concatenates instances with null/undefined properties'](assert) {
      let objA = EmberObject.extend({
        concatenatedProperties: ['values'],
        values: null
      })
      .create({
        values: ['a']
      });

      assert.deepEqual(objA.get('values'), ['a']);

      let objB = EmberObject.extend({
        concatenatedProperties: ['values'],
        values: ['a']
      })
      .create({
        values: null
      });

      assert.deepEqual(objB.get('values'), ['a']);
    }
});
