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

  * changed Ember.Bending.flushPendingChanges() -> Ember.run.sync();
  * changes obj.set() and obj.get() to Ember.set() and Ember.get()
  * Fixed an actual bug in unit tests around line 133
  * fixed 'bindings should disconnect on destroy' test to use Ember.destroy.
*/

// ========================================================================
// Ember.Object bindings Tests
// ========================================================================
/*globals module test ok isObj equals expects TestNamespace */

var testObject, fromObject, extraObject, TestObject;

var set = Ember.set, get = Ember.get;

module("bind() method", {

  setup: function() {
    testObject = Ember.Object.create({
      foo: "bar",
      bar: "foo",
      extraObject: null
    });

    fromObject = Ember.Object.create({
      bar: "foo",
      extraObject: null
    }) ;

    extraObject = Ember.Object.create({
      foo: "extraObjectValue"
    }) ;

    TestNamespace = {
      fromObject: fromObject,
      testObject: testObject
    } ;
  },

  teardown: function() {
    testObject = fromObject = extraObject = null ;
  }

});

test("bind(TestNamespace.fromObject.bar) should follow absolute path", function() {
  // create binding
  testObject.bind("foo", "TestNamespace.fromObject.bar") ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(fromObject, "bar", "changedValue") ;

  // support new-style bindings if available
  Ember.run.sync();
  equals("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("bind(.bar) should bind to relative path", function() {
  // create binding
  testObject.bind("foo", ".bar") ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(testObject, "bar", "changedValue") ;

  Ember.run.sync();
  equals("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("Ember.Binding.bool(TestNamespace.fromObject.bar)) should create binding with bool transform", function() {
  // create binding
  testObject.bind("foo", Ember.Binding.bool("TestNamespace.fromObject.bar")) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(fromObject, "bar", 1) ;

  Ember.run.sync();
  equals(YES, get(testObject, "foo"), "testObject.foo == YES");

  set(fromObject, "bar", 0) ;

  Ember.run.sync();
  equals(NO, get(testObject, "foo"), "testObject.foo == NO");
});

test("bind(TestNamespace.fromObject*extraObject.foo) should create chained binding", function() {
  testObject.bind("foo", "TestNamespace.fromObject*extraObject.foo");
  Ember.run.sync() ; // actually sets up up the binding

  set(fromObject, "extraObject", extraObject) ;

  Ember.run.sync();
  equals("extraObjectValue", get(testObject, "foo"), "testObject.foo") ;
});

test("bind(*extraObject.foo) should create locally chained binding", function() {
  testObject.bind("foo", "*extraObject.foo");
  Ember.run.sync() ; // actually sets up up the binding

  set(testObject, "extraObject", extraObject) ;

  Ember.run.sync();
  equals("extraObjectValue", get(testObject, "foo"), "testObject.foo") ;
});


// The following contains no test
test("bind(*extraObject.foo) should be disconnectable", function() {
  var binding = testObject.bind("foo", "*extraObject.foo");
  Ember.run.sync() ; // actually sets up up the binding

  binding.disconnect(testObject);

  set(testObject, 'extraObject', extraObject);
  Ember.run.sync() ;

  // there was actually a bug here - the binding above should have synced to
  // null as there was no original value
  equals(null, get(testObject, "foo"), "testObject.foo after disconnecting");
});

module("fooBinding method", {

  setup: function() {
    TestObject = Ember.Object.extend({
      foo: "bar",
      bar: "foo",
      extraObject: null
    });

    fromObject = Ember.Object.create({
      bar: "foo",
      extraObject: null
    }) ;

    extraObject = Ember.Object.create({
      foo: "extraObjectValue"
    }) ;

    TestNamespace = {
      fromObject: fromObject,
      testObject: TestObject
    } ;
  },

  teardown: function() {
    TestObject = fromObject = extraObject = null ;
  //  delete TestNamespace ;
  }

});

test("fooBinding: TestNamespace.fromObject.bar should follow absolute path", function() {
  // create binding
  testObject = TestObject.create({
    fooBinding: "TestNamespace.fromObject.bar"
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(fromObject, "bar", "changedValue") ;

  Ember.run.sync();
  equals("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("fooBinding: .bar should bind to relative path", function() {

  testObject = TestObject.create({
    fooBinding: ".bar"
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(testObject, "bar", "changedValue") ;

  Ember.run.sync();
  equals("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("fooBinding: Ember.Binding.bool(TestNamespace.fromObject.bar should create binding with bool transform", function() {

  testObject = TestObject.create({
    fooBinding: Ember.Binding.bool("TestNamespace.fromObject.bar")
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(fromObject, "bar", 1) ;

  Ember.run.sync();
  equals(YES, get(testObject, "foo"), "testObject.foo == YES");

  set(fromObject, "bar", 0) ;

  Ember.run.sync();
  equals(NO, get(testObject, "foo"), "testObject.foo == NO");
});

test("fooBinding: TestNamespace.fromObject*extraObject.foo should create chained binding", function() {

  testObject = TestObject.create({
    fooBinding: "TestNamespace.fromObject*extraObject.foo"
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  set(fromObject, "extraObject", extraObject) ;

  Ember.run.sync();
  equals("extraObjectValue", get(testObject, "foo"), "testObject.foo") ;
});

test("fooBinding: *extraObject.foo should create locally chained binding", function() {

  testObject = TestObject.create({
    fooBinding: "*extraObject.foo"
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  set(testObject, "extraObject", extraObject) ;

  Ember.run.sync();
  equals("extraObjectValue", get(testObject, "foo"), "testObject.foo") ;
});

test('fooBinding: should disconnect bindings when destroyed', function () {

  testObject = TestObject.create({
    fooBinding: "TestNamespace.fromObject.bar"
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  set(TestNamespace.fromObject, 'bar', 'BAZ');
  Ember.run.sync();
  equals(get(testObject, 'foo'), 'BAZ', 'binding should have synced');

  Ember.destroy(testObject);
  set(TestNamespace.fromObject, 'bar', 'BIFF');
  Ember.run.sync();
  ok(get(testObject, 'foo') !== 'bar', 'binding should not have synced');
});

module("fooBindingDefault: Ember.Binding.Bool (old style)", {

  setup: function() {
    TestObject = Ember.Object.extend({
      foo: "bar",
      fooBindingDefault: Ember.Binding.bool(),
      bar: "foo",
      extraObject: null
    });

    fromObject = Ember.Object.create({
      bar: "foo",
      extraObject: null
    }) ;

    TestNamespace = {
      fromObject: fromObject,
      testObject: TestObject
    } ;
  },

  teardown: function() {
    TestObject = fromObject = null ;
 //   delete TestNamespace ;
  }

});

test("fooBinding: TestNamespace.fromObject.bar should have bool binding", function() {
  // create binding
  testObject = TestObject.create({
    fooBinding: "TestNamespace.fromObject.bar"
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(fromObject, "bar", 1) ;

  Ember.run.sync();
  equals(YES, get(testObject, "foo"), "testObject.foo == YES");

  set(fromObject, "bar", 0) ;

  Ember.run.sync();
  equals(NO, get(testObject, "foo"), "testObject.foo == NO");
});

test("fooBinding: Ember.Binding.not(TestNamespace.fromObject.bar should override default", function() {

  testObject = TestObject.create({
    fooBinding: Ember.Binding.not("TestNamespace.fromObject.bar")
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(fromObject, "bar", 1) ;

  Ember.run.sync();
  equals(NO, get(testObject, "foo"), "testObject.foo == NO");

  set(fromObject, "bar", 0) ;

  Ember.run.sync();
  equals(YES, get(testObject, "foo"), "testObject.foo == YES");
});

module("fooBindingDefault: Ember.Binding.bool() (new style)", {

  setup: function() {
    TestObject = Ember.Object.extend({
      foo: "bar",
      fooBindingDefault: Ember.Binding.bool(),
      bar: "foo",
      extraObject: null
    });

    fromObject = Ember.Object.create({
      bar: "foo",
      extraObject: null
    }) ;

    TestNamespace = {
      fromObject: fromObject,
      testObject: testObject
    } ;
  },

  teardown: function() {
    TestObject = fromObject = null ;
   // delete TestNamespace ;
  }

});

test("fooBinding: TestNamespace.fromObject.bar should have bool binding", function() {
  // create binding
  testObject = TestObject.create({
    fooBinding: "TestNamespace.fromObject.bar"
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(fromObject, "bar", 1) ;

  Ember.run.sync();
  equals(YES, get(testObject, "foo"), "testObject.foo == YES");

  set(fromObject, "bar", 0) ;

  Ember.run.sync();
  equals(NO, get(testObject, "foo"), "testObject.foo == NO");
});

test("fooBinding: Ember.Binding.not(TestNamespace.fromObject.bar should override default", function() {

  testObject = TestObject.create({
    fooBinding: Ember.Binding.not("TestNamespace.fromObject.bar")
  }) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  set(fromObject, "bar", 1) ;

  Ember.run.sync();
  equals(NO, get(testObject, "foo"), "testObject.foo == NO");

  set(fromObject, "bar", 0) ;

  Ember.run.sync();
  equals(YES, get(testObject, "foo"), "testObject.foo == YES");
});

test("Chained binding should be null if intermediate object in chain is null", function() {
  var a, z;

  a = Ember.Object.create({
    b: Ember.Object.create({
      c: 'c'
    }),
    zBinding: '*b.c'
  });

  Ember.run.sync();
  equals(get(a, 'z'), 'c', "a.z == 'c'");

  set(a, 'b', null);
  Ember.run.sync();
  equals(get(a, 'z'), null, "a.z == null");
});
