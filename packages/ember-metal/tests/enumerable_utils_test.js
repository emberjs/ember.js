module('Ember.EnumerableUtils.intersection');

test('returns an array of objects that appear in both enumerables', function() {
  var a = [1,2,3], b = [2,3,4], result;

  result = Ember.EnumerableUtils.intersection(a, b);

  deepEqual(result, [2,3]);
});
