require('ember-runtime/~tests/suites/array');

var suite = Ember.ArrayTests;

suite.module('indexOf');

suite.test("should return index of object", function() {
  var expected = this.newFixture(3),
      obj      = this.newObject(expected),
      len      = 3,
      idx;

  for(idx=0;idx<len;idx++) {
    equal(obj.indexOf(expected[idx]), idx, Ember.String.fmt('obj.indexOf(%@) should match idx', [expected[idx]]));
  }

});

suite.test("should return -1 when requesting object not in index", function() {
  var obj = this.newObject(this.newFixture(3)), foo = {};
  equal(obj.indexOf(foo), -1, 'obj.indexOf(foo) should be < 0');
});

