import { setProperties } from '..';

QUnit.module('Ember.setProperties');

QUnit.test('supports setting multiple attributes at once', function() {
  deepEqual(setProperties(null, null), null, 'noop for null properties and null object');
  deepEqual(setProperties(undefined, undefined), undefined, 'noop for undefined properties and undefined object');

  deepEqual(setProperties({}), undefined, 'noop for no properties');
  deepEqual(setProperties({}, undefined), undefined, 'noop for undefined');
  deepEqual(setProperties({}, null), null, 'noop for null');
  deepEqual(setProperties({}, NaN), NaN, 'noop for NaN');
  deepEqual(setProperties({}, {}), {}, 'meh');

  deepEqual(setProperties({}, { foo: 1 }), { foo: 1 }, 'Set a single property');

  deepEqual(setProperties({}, { foo: 1, bar: 1 }), { foo: 1, bar: 1 }, 'Set multiple properties');

  deepEqual(setProperties({ foo: 2, baz: 2 }, { foo: 1 }), { foo: 1 }, 'Set one of multiple properties');

  deepEqual(setProperties({ foo: 2, baz: 2 }, { bar: 2 }), {
    bar: 2
  }, 'Set an additional, previously unset property');
});

QUnit.test(
  "cannot traverse through dangerous built-in Object properties",
  function (assert) {
    class Inner {}
    class Example {
      constructor() {
        this.inner = new Inner();
      }
    }
    let example = new Example();

    assert.throws(function() {
      setProperties(example, {
        "__proto__.ohNo": "polluted",
      });
    }, /Property set failed: object in path "__proto__" could not be found./);
    assert.equal(
      Example.prototype.ohNo,
      undefined,
      "check for prototype pollution"
    );

    assert.throws(function() {
      setProperties(example, {
        "constructor.ohNo": "polluted",
      });
    }, /Property set failed: object in path "constructor" could not be found./);
    assert.equal(Example.ohNo, undefined, "check for prototype pollution");

    assert.throws(function() {
      setProperties(example, {
        "inner.__proto__.ohNo": "polluted",
      });
    }, /Property set failed: object in path "inner.__proto__" could not be found./);
    assert.equal(
      Inner.prototype.ohNo,
      undefined,
      "check for prototype pollution"
    );

    assert.throws(() => {
      setProperties(example, {
        "inner.constructor.ohNo": "polluted",
      });
    }, /Property set failed: object in path "inner.constructor" could not be found./);
    assert.equal(Inner.ohNo, undefined, "check for prototype pollution");
  }
);