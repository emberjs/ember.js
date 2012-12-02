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
    testObject.bind("foo", "bar") ;

    // now make a change to see if the binding triggers.
    set(testObject, "bar", "changedValue") ;
  });

  equal("changedValue", get(testObject, "foo"), "testObject.foo");
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
    testObject = TestObject.createWithMixins({
      fooBinding: "TestNamespace.fromObject.bar"
    }) ;

    // now make a change to see if the binding triggers.
    set(fromObject, "bar", "changedValue") ;
  });


  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("fooBinding: .bar should bind to relative path", function() {
  Ember.run(function(){
    testObject = TestObject.createWithMixins({
      fooBinding: "bar"
    });
    // now make a change to see if the binding triggers.
    set(testObject, "bar", "changedValue");
  });

  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test('fooBinding: should disconnect bindings when destroyed', function () {
  Ember.run(function(){
    testObject = TestObject.createWithMixins({
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
