import { contains } from 'ember-metal/array';

QUnit.module("Array.contains");

// https://github.com/domenic/Array.prototype.contains/blob/master/spec.md#arrayprototypecontains--searchelement---fromindex--

test("arity", function() {
  equal(contains.length, 1, 'The length property of the contains method is 1.');
});

test("If len is 0, return false.", function() {
  equal(contains.call([]), false);
});

test("If fromIndex ≥ len, return false.", function() {
  equal(contains.call([], null, 1), false);
  equal(contains.call([1], null,  1), false);
});

test("typical scenarios", function() {
  equal(contains.call([NaN], NaN, 1), false);

  var array = [1,2,3];

  equal(contains.call(array, 1, 0), true);
  equal(contains.call(array, 1, 1), false);
  equal(contains.call(array, 1, 2), false);
  equal(contains.call(array, 1, 3), false);

  equal(contains.call(array, 1, -3), true);
  equal(contains.call(array, 1, -2), false);
  equal(contains.call(array, 1, -1), false);
});

test("NaN", function() {
  equal(contains.call([NaN], NaN), true, 'finds NaN');
});

test("Infinity", function() {
  equal(contains.call([-Infinity], Infinity), false, 'finds Infinity');
  equal(contains.call([Infinity], Infinity), true, 'finds Infinity');
});
