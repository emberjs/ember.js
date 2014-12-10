import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import EmberObject from 'ember-runtime/system/object';
import Enumerable from 'ember-runtime/mixins/enumerable';
import {get} from 'ember-metal/property_get';
import Ember from "ember-metal/core";

var suite = SuiteModuleBuilder.create();

suite.module('addObjects');

suite.test("should return receiver", function() {
  var before, obj;
  before = Ember.A(this.newFixture(3));
  obj = before;
  equal(obj.addObjects(this.newFixture(1)), obj, 'should return receiver');
});

suite.test("[A,B].addObjects([C]) => [A,B,C] + notify", function() {
  var obj, before, after, observer, items;

  before = Ember.A(this.newFixture(2));
  items  = Ember.A(this.newFixture(1));
  after  = [before[0], before[1], items[0]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');
  get(obj, 'firstObject');
  get(obj, 'lastObject');

  obj.addObjects(items);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    equal(observer.timesCalled('length'), 1, 'should have notified length once');
    equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
    // This gets called since MutableEnumerable is naive about changes
    equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  }
});

suite.test("[A,B].addObjects([B,C]) => [A,B,C] + notify", function() {
  var obj, before, after, observer, items;

  before = Ember.A(this.newFixture(2));
  items  = Ember.A([before[1], this.newFixture(1)[0]]);
  after  = [before[0], before[1], items[1]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');
  get(obj, 'firstObject');
  get(obj, 'lastObject');

  obj.addObjects(items);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    equal(observer.timesCalled('length'), 1, 'should have notified length once');
    equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
    // This gets called since MutableEnumerable is naive about changes
    equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  }
});

suite.test("[A,B,C].addObjects([A]) => [A,B,C] + NO notify", function() {
  var obj, before, after, observer, items;

  before = this.newFixture(3);
  after  = before;
  items  = Ember.A([before[0]]);
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

  obj.addObjects(items); // note: items in set

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), false, 'should NOT have notified []');
    equal(observer.validate('length'), false, 'should NOT have notified length');
    equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
    equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
  }
});

suite.test('Adding objects should notify enumerable observer', function() {
  var obj = this.newObject(this.newFixture(3));
  var observer = this.newObserver(obj).observeEnumerable(obj);
  var item = this.newFixture(1)[0];

  obj.addObjects(Ember.A([item]));

  deepEqual(observer._before, [obj, null, [item]]);
  deepEqual(observer._after, [obj, null, [item]]);
});

suite.test("should raise exception if not Ember.Enumerable is passed to addObjects", function() {
  var obj = this.newObject([]);

  raises(function() {
    obj.addObjects( "string" );
  });
});

suite.test('Adding objects from an Array is not deprecated', function() {
  expectNoDeprecation();
  var obj = this.newObject(this.newFixture(3));
  var items = Ember.A(this.newFixture(1));

  obj.addObjects(items);
});

suite.test('Adding objects from non-Array Enumerable is deprecated', function() {
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
    obj.addObjects(items);
  }, 'Passing an array-like object that is not a native Array to addObjects() is deprecated. Please convert to a native Array, e.g. by calling .toArray().');
});

export default suite;
