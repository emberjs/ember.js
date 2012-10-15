require('ember-runtime/~tests/suites/array');

var suite = Ember.ArrayTests;

suite.module('objectAt');

suite.test("should return object at specified index", function() {
  var expected = this.newFixture(3),
      obj      = this.newObject(expected),
      len      = expected.length,
      idx;

  for(idx=0;idx<len;idx++) {
    equal(obj.objectAt(idx), expected[idx], Ember.String.fmt('obj.objectAt(%@) should match', [idx]));
  }

});

suite.test("should return undefined when requesting objects beyond index", function() {
  var obj;

  obj = this.newObject(this.newFixture(3));
  equal(obj.objectAt(5), undefined, 'should return undefined for obj.objectAt(5) when len = 3');

  obj = this.newObject([]);
  equal(obj.objectAt(0), undefined, 'should return undefined for obj.objectAt(0) when len = 0');
});


