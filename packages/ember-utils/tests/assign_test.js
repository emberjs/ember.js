import assign from '../assign';

QUnit.module('Ember.assign');

QUnit.test('Ember.assign', function() {
  let a = { a: 1 };
  let b = { b: 2 };
  let c = { c: 3 };
  let a2 = { a: 4 };

  assign(a, b, c, a2);

  deepEqual(a, { a: 4, b: 2, c: 3 });
  deepEqual(b, { b: 2 });
  deepEqual(c, { c: 3 });
  deepEqual(a2, { a: 4 });
});
