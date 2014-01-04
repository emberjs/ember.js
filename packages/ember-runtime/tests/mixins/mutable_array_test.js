require('ember-runtime/~tests/suites/mutable_array');

var array;

module('mutable array', {
  setup: function() {
    array = Ember.A([1,2,3,4]);
  },
  teardown: function() {
    array = null;
  }
});

test('should remove element at a specified index', function() {
  deepEqual(array.removeAt(2), [1,2,4]);
});

test('should not throw OUT_OF_RANGE_EXCEPTION when start === length', function() {
  var exceptionThrown = false;

  try {
    array.removeAt(0, 0);
  } catch(e) {
    exceptionThrown = true;
  }

  equal(exceptionThrown, false);
});

test('should return this if length === 0', function() {
  var result = [];

  result = array.removeAt(0, 0);

  deepEqual(result, array);
});

test('should throw OUT_OF_RANGE_EXCEPTION when start > length', function() {
  throws(function() {
    array.removeAt(4, 0);
  });
});
