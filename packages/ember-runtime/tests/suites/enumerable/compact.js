require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

// ..........................................................
// compact()
//

suite.module('compact');

suite.test('removes null and undefined values from enumerable', function() {
  var obj = this.newObject([null, 1, false, '', undefined, 0, null]);
  var ary = obj.compact();
  deepEqual(ary, [1, false, '', 0]);
});

// ..........................................................
// compactBy()
//

if (Ember.FEATURES.isEnabled("ember-runtime-compactBy")) {

  suite.module('compactBy');

  suite.test('removes items with property equal to null and undefined from enumerable', function() {
    var arr = [Ember.Object.create({a: null}), {a: 1}, {a: false}, {a: ''}, {a: undefined}, {a: 0}, {a: null}];
    var obj = this.newObject(arr);
    var ary = obj.compactBy('a');
    deepEqual(ary, [arr[1], arr[2], arr[3], arr[5]]);
  });

}