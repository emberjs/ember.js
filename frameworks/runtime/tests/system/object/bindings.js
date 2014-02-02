// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Object bindings Tests
// ========================================================================
/*globals module test ok isObj equals expects TestNamespace */

var testObject, fromObject, extraObject, TestObject;

module("bind() method", {
  
  setup: function() {
    testObject = SC.Object.create({
      foo: "bar",
      bar: "foo",
      extraObject: null 
    });
    
    fromObject = SC.Object.create({
      bar: "foo",
      extraObject: null 
    }) ;
    
    extraObject = SC.Object.create({
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
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  fromObject.set("bar", "changedValue") ;
  
  // support new-style bindings if available
  SC.Binding.flushPendingChanges();
  equals("changedValue", testObject.get("foo"), "testObject.foo");
});
  
test("bind(.bar) should bind to relative path", function() {
  // create binding
  testObject.bind("foo", ".bar") ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  testObject.set("bar", "changedValue") ;
  
  SC.Binding.flushPendingChanges();
  equals("changedValue", testObject.get("foo"), "testObject.foo");
});

test("SC.Binding.bool(TestNamespace.fromObject.bar)) should create binding with bool transform", function() {
  // create binding
  testObject.bind("foo", SC.Binding.bool("TestNamespace.fromObject.bar")) ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  fromObject.set("bar", 1) ;
  
  SC.Binding.flushPendingChanges();
  equals(YES, testObject.get("foo"), "testObject.foo == YES");
  
  fromObject.set("bar", 0) ;
  
  SC.Binding.flushPendingChanges();
  equals(NO, testObject.get("foo"), "testObject.foo == NO");
});

test("bind(TestNamespace.fromObject*extraObject.foo) should create chained binding", function() {
  testObject.bind("foo", "TestNamespace.fromObject*extraObject.foo");
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  fromObject.set("extraObject", extraObject) ;
  
  SC.Binding.flushPendingChanges();
  equals("extraObjectValue", testObject.get("foo"), "testObject.foo") ;
});

test("bind(*extraObject.foo) should create locally chained binding", function() {
  testObject.bind("foo", "*extraObject.foo");
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  testObject.set("extraObject", extraObject) ;
  
  SC.Binding.flushPendingChanges();
  equals("extraObjectValue", testObject.get("foo"), "testObject.foo") ;
});


test("bind(*extraObject.foo) should be disconnectable");
// The following contains no test
/*
test("bind(*extraObject.foo) should be disconnectable", function() {
  var binding = testObject.bind("foo", "*extraObject.foo");
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  binding.disconnect();
  SC.Binding.flushPendingChanges() ;
});
*/

module("fooBinding method", {
  
  setup: function() {
    TestObject = SC.Object.extend({
      foo: "bar",
      bar: "foo",
      extraObject: null 
    });
    
    fromObject = SC.Object.create({
      bar: "foo",
      extraObject: null 
    }) ;
    
    extraObject = SC.Object.create({
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
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  fromObject.set("bar", "changedValue") ;
  
  SC.Binding.flushPendingChanges();
  equals("changedValue", testObject.get("foo"), "testObject.foo");
});

test("fooBinding: .bar should bind to relative path", function() {
  
  testObject = TestObject.create({
    fooBinding: ".bar"
  }) ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  testObject.set("bar", "changedValue") ;
  
  SC.Binding.flushPendingChanges();
  equals("changedValue", testObject.get("foo"), "testObject.foo");
});

test("fooBinding: SC.Binding.bool(TestNamespace.fromObject.bar should create binding with bool transform", function() {
  
  testObject = TestObject.create({
    fooBinding: SC.Binding.bool("TestNamespace.fromObject.bar") 
  }) ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  fromObject.set("bar", 1) ;
  
  SC.Binding.flushPendingChanges();
  equals(YES, testObject.get("foo"), "testObject.foo == YES");
  
  fromObject.set("bar", 0) ;
  
  SC.Binding.flushPendingChanges();
  equals(NO, testObject.get("foo"), "testObject.foo == NO");
});

test("fooBinding: TestNamespace.fromObject*extraObject.foo should create chained binding", function() {
  
  testObject = TestObject.create({
    fooBinding: "TestNamespace.fromObject*extraObject.foo" 
  }) ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  fromObject.set("extraObject", extraObject) ;
  
  SC.Binding.flushPendingChanges();
  equals("extraObjectValue", testObject.get("foo"), "testObject.foo") ;
});

test("fooBinding: *extraObject.foo should create locally chained binding", function() {
  
  testObject = TestObject.create({
    fooBinding: "*extraObject.foo" 
  }) ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  testObject.set("extraObject", extraObject) ;
  
  SC.Binding.flushPendingChanges();
  equals("extraObjectValue", testObject.get("foo"), "testObject.foo") ;
});

test('fooBinding: should disconnect bindings when destroyed', function () {

  testObject = TestObject.create({
    fooBinding: "TestNamespace.fromObject.bar"
  }) ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding

  var binding = testObject.get('fooBinding');
  
  ok(binding.isConnected);
  SC.run(testObject.destroy, testObject);
  ok(!binding.isConnected);
});

module("fooBindingDefault: SC.Binding.Bool (old style)", {
  
  setup: function() {
    TestObject = SC.Object.extend({
      foo: "bar",
      fooBindingDefault: SC.Binding.bool(),
      bar: "foo",
      extraObject: null 
    });
    
    fromObject = SC.Object.create({
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
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  fromObject.set("bar", 1) ;
  
  SC.Binding.flushPendingChanges();
  equals(YES, testObject.get("foo"), "testObject.foo == YES");
  
  fromObject.set("bar", 0) ;
  
  SC.Binding.flushPendingChanges();
  equals(NO, testObject.get("foo"), "testObject.foo == NO");
});

test("fooBinding: SC.Binding.not(TestNamespace.fromObject.bar should override default", function() {
  
  testObject = TestObject.create({
    fooBinding: SC.Binding.not("TestNamespace.fromObject.bar") 
  }) ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  fromObject.set("bar", 1) ;
  
  SC.Binding.flushPendingChanges();
  equals(NO, testObject.get("foo"), "testObject.foo == NO");
  
  fromObject.set("bar", 0) ;
  
  SC.Binding.flushPendingChanges();
  equals(YES, testObject.get("foo"), "testObject.foo == YES");
});

module("fooBindingDefault: SC.Binding.bool() (new style)", {
  
  setup: function() {
    TestObject = SC.Object.extend({
      foo: "bar",
      fooBindingDefault: SC.Binding.bool(),
      bar: "foo",
      extraObject: null 
    });
    
    fromObject = SC.Object.create({
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
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  fromObject.set("bar", 1) ;
  
  SC.Binding.flushPendingChanges();
  equals(YES, testObject.get("foo"), "testObject.foo == YES");
  
  fromObject.set("bar", 0) ;
  
  SC.Binding.flushPendingChanges();
  equals(NO, testObject.get("foo"), "testObject.foo == NO");
});

test("fooBinding: SC.Binding.not(TestNamespace.fromObject.bar should override default", function() {
  
  testObject = TestObject.create({
    fooBinding: SC.Binding.not("TestNamespace.fromObject.bar") 
  }) ;
  SC.Binding.flushPendingChanges() ; // actually sets up up the binding
  
  // now make a change to see if the binding triggers.
  fromObject.set("bar", 1) ;
  
  SC.Binding.flushPendingChanges();
  equals(NO, testObject.get("foo"), "testObject.foo == NO");
  
  fromObject.set("bar", 0) ;
  
  SC.Binding.flushPendingChanges();
  equals(YES, testObject.get("foo"), "testObject.foo == YES");
});

test("Chained binding should be null if intermediate object in chain is null", function() {
  var a, z;
  
  a = SC.Object.create({
    b: SC.Object.create({
      c: 'c'
    }),
    zBinding: '*b.c'
  });
  
  SC.Binding.flushPendingChanges();
  equals(a.get('z'), 'c', "a.z == 'c'");
    
  a.set('b', null);
  SC.Binding.flushPendingChanges();
  equals(a.get('z'), null, "a.z == null");
});
