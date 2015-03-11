import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import EmberObject from 'ember-runtime/system/object';
import Enumerable from 'ember-runtime/mixins/enumerable';

var suite = SuiteModuleBuilder.create();

suite.module('pushObjects');

suite.test("should raise exception if not Ember.Enumerable is passed to pushObjects", function() {
  var obj = this.newObject([]);

  throws(function() {
    obj.pushObjects("string");
  });
});

suite.test('Pushing objects from an Array is not deprecated', function() {
  expectNoDeprecation();
  var obj = this.newObject(this.newFixture(3));
  var items = Ember.A(this.newFixture(1));

  obj.pushObjects(items);
});

suite.test('Pushing objects from non-Array Enumerable is deprecated', function() {
  var obj = this.newObject(this.newFixture(3));
  var items = EmberObject.extend(Enumerable, {
    elt: this.newFixture(1)[0],

    length: 1,
    nextObject: function(idx) {
      return idx === 0 ? this.elt : undefined;
    },
    slice: function() {
      return [this.elt];
    }
  }).create();

  expectDeprecation(function(){
    obj.pushObjects(items);
  }, 'Passing an array-like object that is not a native Array to pushObjects() is deprecated. Please convert to a native Array, e.g. by calling .toArray().');
});

export default suite;
