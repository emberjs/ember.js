// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

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
/*globals module test ok isObj equals expects same plan TestNamespace*/

var obj, obj1, don, don1 ; // global variables

var get = Ember.get, set = Ember.set;

module("A new Ember.Object instance", {

  setup: function() {
    obj = Ember.Object.create({
      foo: "bar",
      total: 12345,
      aMethodThatExists: function() {},
      aMethodThatReturnsTrue: function() { return true; },
      aMethodThatReturnsFoobar: function() { return "Foobar"; },
      aMethodThatReturnsFalse: function() { return NO; }
    });
  },

  teardown: function() {
    obj = undefined ;
  }

});

test("Should return it's properties when requested using Ember.Object#get", function() {
  equals(get(obj, 'foo'), 'bar') ;
  equals(get(obj, 'total'), 12345) ;
});

test("Should allow changing of those properties by calling Ember.Object#set", function() {
  equals(get(obj,'foo'), 'bar') ;
  equals(get(obj, 'total'), 12345) ;

  set(obj,  'foo', 'Chunky Bacon' ) ;
  set(obj,  'total', 12 ) ;

  equals(get(obj, 'foo'), 'Chunky Bacon') ;
  equals(get(obj, 'total'), 12) ;
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
        this._normal = YES;
      }, "prop1"),

      globalObserver: Ember.observer(function() {
        this._global = YES;
      }, "TestNamespace.obj.value"),

      bothObserver: Ember.observer(function() {
        this._both = YES;
      }, "prop1", "TestNamespace.obj.value")
    });

  }
});

test("Local observers work", function() {
  obj._normal = NO;
  set(obj, "prop1", NO);
  equals(obj._normal, YES, "Normal observer did change.");
});

test("Global observers work", function() {
  obj._global = NO;
  set(TestNamespace.obj, "value", "test2");
  equals(obj._global, YES, "Global observer did change.");
});

test("Global+Local observer works", function() {
  obj._both = NO;
  set(obj, "prop1", NO);
  equals(obj._both, YES, "Both observer did change.");
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
	equals(obj.detect(obj1), YES);
	equals(obj1.detect(obj), NO);
});

test("Checking the detectInstance() function on an object and its subclass", function() {
  ok(Ember.Object.detectInstance(obj.create()));
  ok(obj.detectInstance(obj.create()));
});

test("subclasses should contain defined subclasses", function() {
  ok(jQuery.inArray(obj1, obj.subclasses) > -1, 'obj.subclasses should contain obj1');

  equals(get(obj1.subclasses, 'length'),0,'obj1.subclasses should be empty');

  var kls2 = obj1.extend();
  ok(jQuery.inArray(kls2, obj1.subclasses) > -1, 'obj1.subclasses should contain kls2');
});
