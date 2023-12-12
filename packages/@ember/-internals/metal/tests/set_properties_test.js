import { setProperties } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'setProperties',
  class extends AbstractTestCase {
    ['@test supports setting multiple attributes at once'](assert) {
      assert.deepEqual(setProperties(null, null), null, 'noop for null properties and null object');
      assert.deepEqual(
        setProperties(undefined, undefined),
        undefined,
        'noop for undefined properties and undefined object'
      );

      assert.deepEqual(setProperties({}), undefined, 'noop for no properties');
      assert.deepEqual(setProperties({}, undefined), undefined, 'noop for undefined');
      assert.deepEqual(setProperties({}, null), null, 'noop for null');
      assert.deepEqual(setProperties({}, NaN), NaN, 'noop for NaN');
      assert.deepEqual(setProperties({}, {}), {}, 'meh');

      let props = setProperties({}, { foo: undefined });
      assert.deepEqual(props, { foo: undefined }, 'Setting undefined value');
      assert.ok('foo' in props, 'Setting undefined value');
      assert.deepEqual(Object.keys(props), ['foo'], 'Setting undefined value');

      assert.deepEqual(setProperties({}, { foo: 1 }), { foo: 1 }, 'Set a single property');

      assert.deepEqual(
        setProperties({}, { foo: 1, bar: 1 }),
        { foo: 1, bar: 1 },
        'Set multiple properties'
      );

      assert.deepEqual(
        setProperties({ foo: 2, baz: 2 }, { foo: 1 }),
        { foo: 1 },
        'Set one of multiple properties'
      );

      assert.deepEqual(
        setProperties({ foo: 2, baz: 2 }, { bar: 2 }),
        {
          bar: 2,
        },
        'Set an additional, previously unset property'
      );
    }

    ['@test cannot traverse through dangerous built-in Object properties'](assert) {
      class Inner {}
      class Example {
        inner = new Inner();
      }
      let example = new Example();

      assert.throws(() => {
        setProperties(example, {
          '__proto__.ohNo': 'polluted',
        });
      }, /Property set failed: object in path "__proto__" could not be found./);
      assert.equal(Example.prototype.ohNo, undefined, 'check for prototype pollution');

      assert.throws(() => {
        setProperties(example, {
          'constructor.ohNo': 'polluted',
        });
      }, /Property set failed: object in path "constructor" could not be found./);
      assert.equal(Example.ohNo, undefined, 'check for prototype pollution');

      assert.throws(() => {
        setProperties(example, {
          'inner.__proto__.ohNo': 'polluted',
        });
      }, /Property set failed: object in path "inner.__proto__" could not be found./);
      assert.equal(Inner.prototype.ohNo, undefined, 'check for prototype pollution');

      assert.throws(() => {
        setProperties(example, {
          'inner.constructor.ohNo': 'polluted',
        });
      }, /Property set failed: object in path "inner.constructor" could not be found./);
      assert.equal(Inner.ohNo, undefined, 'check for prototype pollution');
    }
  }
);
