import Ember from "ember-metal/core";
import {get} from 'ember-metal/property_get';
import {set} from 'ember-metal/property_set';
import {observer as emberObserver} from "ember-metal/mixin";
import EmberObject from 'ember-runtime/system/object';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Changed get(obj, ) and set(obj, ) to Ember.get() and Ember.set()
  * Removed obj.instanceOf() and obj.kindOf() tests.  use obj instanceof Foo
    instead
  * Removed respondsTo() and tryToPerform() tests.  Can be brought back in a
    utils package.
  * Removed destroy() test.  You can impl yourself but not built in
  * Changed Class.subclassOf() test to Class.detect()
  * Remove broken test for 'superclass' property.
  * Removed obj.didChangeFor()
*/

// ========================================================================
// EmberObject Base Tests
// ========================================================================

var obj, obj1, don; // global variables
var TestNamespace, originalLookup, lookup;

QUnit.module("A new EmberObject instance", {

  setup() {
    obj = EmberObject.create({
      foo: "bar",
      total: 12345,
      aMethodThatExists() {},
      aMethodThatReturnsTrue() { return true; },
      aMethodThatReturnsFoobar() { return "Foobar"; },
      aMethodThatReturnsFalse() { return false; }
    });
  },

  teardown() {
    obj = undefined;
  }

});

QUnit.test("Should return its properties when requested using EmberObject#get", function() {
  equal(get(obj, 'foo'), 'bar');
  equal(get(obj, 'total'), 12345);
});

QUnit.test("Should allow changing of those properties by calling EmberObject#set", function() {
  equal(get(obj, 'foo'), 'bar');
  equal(get(obj, 'total'), 12345);

  set(obj, 'foo', 'Chunky Bacon');
  set(obj, 'total', 12);

  equal(get(obj, 'foo'), 'Chunky Bacon');
  equal(get(obj, 'total'), 12);
});

QUnit.module("EmberObject observers", {
  setup() {
    originalLookup = Ember.lookup;
    Ember.lookup = lookup = {};

    // create a namespace
    lookup['TestNamespace'] = TestNamespace = {
      obj: EmberObject.create({
        value: "test"
      })
    };

    // create an object
    obj = EmberObject.createWithMixins({
      prop1: null,

      // normal observer
      observer: emberObserver("prop1", function() {
        this._normal = true;
      }),

      globalObserver: emberObserver("TestNamespace.obj.value", function() {
        this._global = true;
      }),

      bothObserver: emberObserver("prop1", "TestNamespace.obj.value", function() {
        this._both = true;
      })
    });

  },

  teardown() {
    Ember.lookup = originalLookup;
  }
});

QUnit.test("Local observers work", function() {
  obj._normal = false;
  set(obj, "prop1", false);
  equal(obj._normal, true, "Normal observer did change.");
});

QUnit.test("Global observers work", function() {
  obj._global = false;
  set(TestNamespace.obj, "value", "test2");
  equal(obj._global, true, "Global observer did change.");
});

QUnit.test("Global+Local observer works", function() {
  obj._both = false;
  set(obj, "prop1", false);
  equal(obj._both, true, "Both observer did change.");
});

QUnit.module("EmberObject superclass and subclasses", {
  setup() {
    obj = EmberObject.extend({
      method1() {
        return "hello";
      }
    });
    obj1 = obj.extend();
    don = obj1.create({
      method2() {
        return this.superclass();
      }
    });
  },

  teardown() {
    obj = undefined;
    obj1 = undefined;
    don = undefined;
  }
});

QUnit.test("Checking the detect() function on an object and its subclass", function() {
  equal(obj.detect(obj1), true);
  equal(obj1.detect(obj), false);
});

QUnit.test("Checking the detectInstance() function on an object and its subclass", function() {
  ok(EmberObject.detectInstance(obj.create()));
  ok(obj.detectInstance(obj.create()));
});
