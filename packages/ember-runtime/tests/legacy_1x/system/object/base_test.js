// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TestNamespace:true*/

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
// Ember.Object Base Tests
// ========================================================================

var obj, obj1, don, don1 ; // global variables

var get = Ember.get, set = Ember.set;

function inArray(item, array) {
  var len = array.length, idx;
  for (idx=0; idx<len; idx++) {
    if (array[idx] === item) { return idx; }
  }
  return -1;
}

module("A new Ember.Object instance", {

  setup: function() {
    obj = Ember.Object.create({
      foo: "bar",
      total: 12345,
      aMethodThatExists: function() {},
      aMethodThatReturnsTrue: function() { return true; },
      aMethodThatReturnsFoobar: function() { return "Foobar"; },
      aMethodThatReturnsFalse: function() { return false; }
    });
  },

  teardown: function() {
    obj = undefined ;
  }

});

test("Should return it's properties when requested using Ember.Object#get", function() {
  equal(get(obj, 'foo'), 'bar') ;
  equal(get(obj, 'total'), 12345) ;
});

test("Should allow changing of those properties by calling Ember.Object#set", function() {
  equal(get(obj,'foo'), 'bar') ;
  equal(get(obj, 'total'), 12345) ;

  set(obj,  'foo', 'Chunky Bacon' ) ;
  set(obj,  'total', 12 ) ;

  equal(get(obj, 'foo'), 'Chunky Bacon') ;
  equal(get(obj, 'total'), 12) ;
});


module("Ember.Object observers", {
  setup: function() {
    // create a namespace
    TestNamespace = {
      obj: Ember.Object.create({
        value: "test"
      })
    };

    // create an object
    obj = Ember.Object.create({
      prop1: null,

      // normal observer
      observer: Ember.observer(function(){
        this._normal = true;
      }, "prop1"),

      globalObserver: Ember.observer(function() {
        this._global = true;
      }, "TestNamespace.obj.value"),

      bothObserver: Ember.observer(function() {
        this._both = true;
      }, "prop1", "TestNamespace.obj.value")
    });

  }
});

test("Local observers work", function() {
  obj._normal = false;
  set(obj, "prop1", false);
  equal(obj._normal, true, "Normal observer did change.");
});

test("Global observers work", function() {
  obj._global = false;
  set(TestNamespace.obj, "value", "test2");
  equal(obj._global, true, "Global observer did change.");
});

test("Global+Local observer works", function() {
  obj._both = false;
  set(obj, "prop1", false);
  equal(obj._both, true, "Both observer did change.");
});



module("Ember.Object superclass and subclasses", {
  setup: function() {
    obj = Ember.Object.extend ({
    method1: function() {
      return "hello";
    }
	});
	obj1 = obj.extend();
	don = obj1.create ({
    method2: function() {
      return this.superclass();
    }
	});
  },

  teardown: function() {
	obj = undefined ;
    obj1 = undefined ;
    don = undefined ;
  }
});

test("Checking the detect() function on an object and its subclass", function(){
	equal(obj.detect(obj1), true);
	equal(obj1.detect(obj), false);
});

test("Checking the detectInstance() function on an object and its subclass", function() {
  ok(Ember.Object.detectInstance(obj.create()));
  ok(obj.detectInstance(obj.create()));
});
