import setProperties from 'ember-metal/set_properties';

QUnit.module('Ember.setProperties');

QUnit.test("supports setting multiple attributes at once", function() {
  deepEqual(setProperties(null, null), null, 'noop for null properties and null object');
  deepEqual(setProperties(undefined, undefined), undefined, 'noop for undefined properties and undefined object');

  deepEqual(setProperties({}), {}, 'noop for no properties');
  deepEqual(setProperties({}, undefined), {}, 'noop for undefined');
  deepEqual(setProperties({}, null), {}, 'noop for null');
  deepEqual(setProperties({}, NaN), {}, 'noop for NaN');
  deepEqual(setProperties({}, {}), {}, 'meh');

  deepEqual(setProperties({}, { foo: 1 }), { foo: 1 }, 'Set a single property');

  deepEqual(setProperties({}, { foo: 1, bar: 1 }), { foo: 1, bar: 1 }, 'Set multiple properties');

  deepEqual(setProperties({ foo: 2, baz: 2 }, { foo: 1 }), { foo: 1, baz: 2 }, 'Set one of multiple properties');

  deepEqual(setProperties({ foo: 2, baz: 2 }, { bar: 2 }), {
    bar: 2,
    foo: 2,
    baz: 2
  }, 'Set an additional, previously unset property');
});
