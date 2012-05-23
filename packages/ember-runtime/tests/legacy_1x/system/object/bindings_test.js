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

  * changed Ember.Bending.flushPendingChanges() -> Ember.run.sync();
  * changes obj.set() and obj.get() to Ember.set() and Ember.get()
  * Fixed an actual bug in unit tests around line 133
  * fixed 'bindings should disconnect on destroy' test to use Ember.destroy.
*/

// ========================================================================
// Ember.Object bindings Tests
// ========================================================================

var testObject, fromObject, extraObject, TestObject;

var set = Ember.set, get = Ember.get;

var bindModuleOpts = {

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

};

module("bind() method", bindModuleOpts);

test("bind(TestNamespace.fromObject.bar) should follow absolute path", function() {
  Ember.run(function(){
    // create binding
    testObject.bind("foo", "TestNamespace.fromObject.bar");
    
    // now make a change to see if the binding triggers.
    set(fromObject, "bar", "changedValue");
  });
  
  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("bind(.bar) should bind to relative path", function() {
  Ember.run(function(){
    // create binding
    testObject.bind("foo", ".bar") ;

    // now make a change to see if the binding triggers.
    set(testObject, "bar", "changedValue") ;
  });
  
  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("Ember.Binding.bool(TestNamespace.fromObject.bar)) should create binding with bool transform", function() {
  Ember.run(function(){
    // create binding
    testObject.bind("foo", Ember.Binding.bool("TestNamespace.fromObject.bar"));
    
    // now make a change to see if the binding triggers.
    set(fromObject, "bar", 1);
  });
  

  equal(true, get(testObject, "foo"), "testObject.foo == true");

  Ember.run(function(){
    set(fromObject, "bar", 0);
  });
  

  equal(false, get(testObject, "foo"), "testObject.foo == false");
});


module("bind() method - deprecated", {
  setup: function() {
    Ember.TESTING_DEPRECATION = true;
    bindModuleOpts.setup();
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
    bindModuleOpts.teardown();
  }
});

test("bind(TestNamespace.fromObject*extraObject.foo) should create chained binding", function() {
  Ember.run(function(){
    testObject.bind("foo", "TestNamespace.fromObject*extraObject.foo");
    set(fromObject, "extraObject", extraObject);
  });

  equal("extraObjectValue", get(testObject, "foo"), "testObject.foo") ;
});

test("bind(*extraObject.foo) should create locally chained binding", function() {
  Ember.run(function(){
    testObject.bind("foo", "*extraObject.foo");
    set(testObject, "extraObject", extraObject);
  });

  equal("extraObjectValue", get(testObject, "foo"), "testObject.foo") ;
});


// The following contains no test
test("bind(*extraObject.foo) should be disconnectable", function() {
  var binding;
  Ember.run(function(){
    binding = testObject.bind("foo", "*extraObject.foo");
  });
  
  binding.disconnect(testObject);

  Ember.run(function(){
    set(testObject, 'extraObject', extraObject);
  });
  
  // there was actually a bug here - the binding above should have synced to
  // null as there was no original value
  equal(null, get(testObject, "foo"), "testObject.foo after disconnecting");
});

var fooBindingModuleOpts = {

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

};

module("fooBinding method", fooBindingModuleOpts);


test("fooBinding: TestNamespace.fromObject.bar should follow absolute path", function() {
  // create binding
  Ember.run(function(){
    testObject = TestObject.create({
      fooBinding: "TestNamespace.fromObject.bar"
    }) ;

    // now make a change to see if the binding triggers.
    set(fromObject, "bar", "changedValue") ;
  });
  

  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("fooBinding: .bar should bind to relative path", function() {
  Ember.run(function(){
    testObject = TestObject.create({
      fooBinding: ".bar"
    });
    // now make a change to see if the binding triggers.
    set(testObject, "bar", "changedValue");
  });
  
  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("fooBinding: Ember.Binding.bool(TestNamespace.fromObject.bar should create binding with bool transform", function() {

  Ember.run(function(){
    testObject = TestObject.create({
      fooBinding: Ember.Binding.bool("TestNamespace.fromObject.bar")
    });

    // now make a change to see if the binding triggers.
    set(fromObject, "bar", 1);
  });
  
  equal(true, get(testObject, "foo"), "testObject.foo == true");

  Ember.run(function(){
    set(fromObject, "bar", 0);
  });
  
  equal(false, get(testObject, "foo"), "testObject.foo == false");
});

test('fooBinding: should disconnect bindings when destroyed', function () {
  Ember.run(function(){
    testObject = TestObject.create({
      fooBinding: "TestNamespace.fromObject.bar"
    });

    set(TestNamespace.fromObject, 'bar', 'BAZ');
  });
  
  equal(get(testObject, 'foo'), 'BAZ', 'binding should have synced');

  Ember.destroy(testObject);
  
  Ember.run(function(){
    set(TestNamespace.fromObject, 'bar', 'BIFF');
  });
  
  ok(get(testObject, 'foo') !== 'bar', 'binding should not have synced');
});


module("fooBinding method - deprecated", {
  setup: function() {
    Ember.TESTING_DEPRECATION = true;
    fooBindingModuleOpts.setup();
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
    fooBindingModuleOpts.teardown();
  }
});

test("fooBinding: TestNamespace.fromObject*extraObject.foo should create chained binding", function() {

  Ember.run(function(){
    testObject = TestObject.create({
      fooBinding: "TestNamespace.fromObject*extraObject.foo"
    });

    set(fromObject, "extraObject", extraObject);
  });

  equal("extraObjectValue", get(testObject, "foo"), "testObject.foo") ;
});

test("fooBinding: *extraObject.foo should create locally chained binding", function() {
  Ember.run(function(){
    testObject = TestObject.create({
      fooBinding: "*extraObject.foo"
    });
    set(testObject, "extraObject", extraObject);
  });

  equal("extraObjectValue", get(testObject, "foo"), "testObject.foo") ;
});
