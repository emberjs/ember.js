import { HAS_NATIVE_SYMBOL, inspect } from '..';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.inspect',
  class extends TestCase {
    ['@test strings'](assert) {
      assert.equal(inspect('foo'), 'foo');
    }

    ['@test numbers'](assert) {
      assert.equal(inspect(2.6), '2.6');
    }

    ['@test null'](assert) {
      assert.equal(inspect(null), 'null');
    }

    ['@test undefined'](assert) {
      assert.equal(inspect(undefined), 'undefined');
    }

    ['@test true'](assert) {
      assert.equal(inspect(true), 'true');
    }

    ['@test false'](assert) {
      assert.equal(inspect(false), 'false');
    }

    ['@test object'](assert) {
      assert.equal(inspect({}), '{}');
      assert.equal(inspect({ foo: 'bar' }), '{foo: bar}');
      assert.equal(
        inspect({
          foo() {
            return this;
          },
        }),
        '{foo: function() { ... }}'
      );
    }

    ['@test objects without a prototype'](assert) {
      let prototypelessObj = Object.create(null);
      assert.equal(inspect({ foo: prototypelessObj }), '{foo: [object Object]}');
    }

    ['@test array'](assert) {
      assert.equal(inspect([1, 2, 3]), '[1,2,3]');
    }

    ['@test regexp'](assert) {
      assert.equal(inspect(/regexp/), '/regexp/');
    }

    ['@test date'](assert) {
      let inspected = inspect(new Date('Sat Apr 30 2011 13:24:11'));
      assert.ok(inspected.match(/Sat Apr 30/), 'The inspected date has its date');
      assert.ok(inspected.match(/2011/), 'The inspected date has its year');
      assert.ok(inspected.match(/13:24:11/), 'The inspected date has its time');
    }

    ['@test inspect outputs the toString() representation of Symbols'](assert) {
      if (HAS_NATIVE_SYMBOL) {
        let symbol = Symbol('test');
        assert.equal(inspect(symbol), 'Symbol(test)');
      } else {
        assert.expect(0);
      }
    }
  }
);
