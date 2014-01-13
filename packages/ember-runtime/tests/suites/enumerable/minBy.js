require('ember-runtime/~tests/suites/enumerable');
var get = Ember.get;

var suite = Ember.EnumerableTests;

if (Ember.FEATURES.isEnabled("ember-runtime-minBy")) {

  suite.module('minBy');

  suite.test('get object with minimum value of provided property', function() {
    var arr = [{a: 2},
               {a: 1},
               Ember.Object.create({a: 3}),
               {a: 4}],
        obj = this.newObject(arr),
        min = obj.minBy('a');
    equal(min, arr[1]);
  });

  suite.test('should return first object if there are many objects with equal minimum value of provided property', function() {
    var arr = [{a: 2},
               {a: 5},
               {a: 1,b: 4},
               {a: 1},
               Ember.Object.create({a: 3}),
               {a: 4}],
        obj = this.newObject(arr),
        min = obj.minBy('a');
    equal(min, arr[2]);
  });

  suite.test('undefined returned for empty collection', function() {
    var obj = this.newObject([]),
        min = obj.minBy('a');
    equal(min, undefined);
  });

  suite.test('undefined returned if any element doesn\'t have provided property', function() {
    var obj = this.newObject([{b: 2},
                              {c: 3}]),
        min = obj.minBy('a');
    equal(min, undefined);
  });

  suite.test('elements with property equal to null or undefined should be skipped', function() {
    var arr = [{a: null},
               {a: 0},
               {a: undefined},
               Ember.Object.create({a: undefined}),
               {b: 0}],
        obj = this.newObject(arr),
        min = obj.minBy('a');
    equal(min, arr[1]);
  });

  suite.test('undefined returned if all elements have property equal to null or undefined', function() {
    var arr = [{a: null},
               {a: null},
               {a: undefined},
               Ember.Object.create({a: null})],
        obj = this.newObject(arr),
        min = obj.minBy('a');
    equal(min, undefined);
  });

}
