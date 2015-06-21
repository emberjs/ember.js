import { computed } from "ember-metal/computed";
import { addObserver } from "ember-metal/observer";
import EmberObject from "ember-runtime/system/object";
import { testBoth } from "ember-metal/tests/props_helper";

QUnit.module('mixins/observable');

QUnit.test('should be able to use getProperties to get a POJO of provided keys', function() {
  var obj = EmberObject.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });

  var pojo = obj.getProperties("firstName", "lastName");
  equal("Steve", pojo.firstName);
  equal("Jobs", pojo.lastName);
});

QUnit.test('should be able to use getProperties with array parameter to get a POJO of provided keys', function() {
  var obj = EmberObject.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });

  var pojo = obj.getProperties(["firstName", "lastName"]);
  equal("Steve", pojo.firstName);
  equal("Jobs", pojo.lastName);
});

QUnit.test('should be able to use setProperties to set multiple properties at once', function() {
  var obj = EmberObject.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });

  obj.setProperties({ firstName: "Tim", lastName: "Cook" });
  equal("Tim", obj.get("firstName"));
  equal("Cook", obj.get("lastName"));
});

testBoth('calling setProperties completes safely despite exceptions', function(get, set) {
  var exc = new Error('Something unexpected happened!');
  var obj = EmberObject.extend({
    companyName: computed({
      get() { return 'Apple, Inc.'; },
      set(key, value) { throw exc; }
    })
  }).create({
    firstName: 'Steve',
    lastName: 'Jobs'
  });

  var firstNameChangedCount = 0;

  addObserver(obj, 'firstName', function() { firstNameChangedCount++; });

  try {
    obj.setProperties({
      firstName: 'Tim',
      lastName: 'Cook',
      companyName: 'Fruit Co., Inc.'
    });
  } catch(err) {
    if (err !== exc) {
      throw err;
    }
  }

  equal(firstNameChangedCount, 1, 'firstName should have fired once');
});

testBoth('should be able to retrieve cached values of computed properties without invoking the computed property', function(get) {
  var obj = EmberObject.extend({
    foo: computed(function() {
      return 'foo';
    })
  }).create({
    bar: 'bar'
  });

  equal(obj.cacheFor('foo'), undefined, "should return undefined if no value has been cached");
  get(obj, 'foo');

  equal(get(obj, 'foo'), "foo", "precond - should cache the value");
  equal(obj.cacheFor('foo'), "foo", "should return the cached value after it is invoked");

  equal(obj.cacheFor('bar'), undefined, "returns undefined if the value is not a computed property");
});

QUnit.test('incrementProperty should work even if value is number in string', function() {
  var obj = EmberObject.create({
    age: "24"
  });
  obj.incrementProperty('age');
  equal(25, obj.get('age'));
});
