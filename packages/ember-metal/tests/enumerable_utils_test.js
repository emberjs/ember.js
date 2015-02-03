import EnumerableUtils from 'ember-metal/enumerable_utils';

QUnit.module('Ember.EnumerableUtils');

test('returns an array of objects that appear in both enumerables', function() {
  var a = [1,2,3];
  var b = [2,3,4];
  var result = EnumerableUtils.intersection(a, b);

  deepEqual(result, [2,3]);
});

test('returns an empty array if one of the arrays is undefined', function() {
  var a; //undefined
  var b = [2,3,4];
  var result = EnumerableUtils.intersection(a, b);

  deepEqual(result, []);
});

test('returns an empty array if one of the arrays is null', function() {
  var a = null;
  var b = [2,3,4];
  var result = EnumerableUtils.intersection(a, b);

  deepEqual(result, []);
});


test("large replace", function() {
  expect(0);

  // https://code.google.com/p/chromium/issues/detail?id=56588
  EnumerableUtils.replace([], 0, undefined, new Array(62401));   // max + 1 in Chrome  28.0.1500.71
  EnumerableUtils.replace([], 0, undefined, new Array(65535));   // max + 1 in Safari  6.0.5 (8536.30.1)
  EnumerableUtils.replace([], 0, undefined, new Array(491519));  // max + 1 in FireFox 22.0
});

test('returns a union of objects that appear in both enumerables', function() {
  var a = [1, 2, 3];
  var b = [2, 3, 4];
  var result = EnumerableUtils.union(a, b);

  deepEqual(result, [1, 2, 3, 4]);

  a = [1, 2, 3];
  b = [4, 5, 6];
  result = EnumerableUtils.union(a, b);

  deepEqual(result, [1, 2, 3, 4, 5, 6]);

});
