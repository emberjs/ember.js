import { assignPolyfill as assign } from '..';

QUnit.module('Ember.assign');

QUnit.test('merging objects', function() {
  let trgt = { a: 1 };
  let src1 = { b: 2 };
  let src2 = { c: 3 };

  assign(trgt, src1, src2);

  deepEqual(trgt, { a: 1, b: 2, c: 3 }, 'assign copies values from one or more source objects to a target object');
  deepEqual(src1, { b: 2 }, 'assign does not change source object 1');
  deepEqual(src2, { c: 3 }, 'assign does not change source object 2');
});

QUnit.test('merging objects with same property', function() {
  let trgt = { a: 1, b: 1 };
  let src1 = { a: 2, b: 2 };
  let src2 = { a: 3 };

  assign(trgt, src1, src2);
  deepEqual(trgt, { a: 3, b: 2 }, 'properties are overwritten by other objects that have the same properties later in the parameters order');
});

QUnit.test('null', function() {
  let trgt = { a: 1 };

  assign(trgt, null);
  deepEqual(trgt, { a: 1 }, 'null as a source parameter is ignored');
});

QUnit.test('undefined', function() {
  let trgt = { a: 1 };

  assign(trgt, null);
  deepEqual(trgt, { a: 1 }, 'undefined as a source parameter is ignored');
});
