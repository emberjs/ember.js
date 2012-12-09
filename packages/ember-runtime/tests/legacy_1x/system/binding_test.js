/*global TestNamespace:true*/

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * All calls to Ember.run.sync() were changed to
    Ember.run.sync()

  * Bindings no longer accept a root object as their second param.  Instead
    our test binding objects were put under a single object they could
    originate from.

  * tests that inspected internal properties were removed.

  * converted foo.get/foo.set to use Ember.get/Ember.set

  * Removed tests for Ember.Binding.isConnected.  Since binding instances are now
    shared this property no longer makes sense.

  * Changed call calls for obj.bind(...) to Ember.bind(obj, ...);

  * Changed all calls to sc_super() to this._super()

  * Changed all calls to disconnect() to pass the root object.

  * removed calls to Ember.Binding.destroy() as that method is no longer useful
    (or defined)

  * changed use of T_STRING to 'string'
*/

var get = Ember.get, set = Ember.set;

// ========================================================================
// Ember.Binding Tests
// ========================================================================

var fromObject, toObject, binding, Bon1, bon2, root; // global variables

module("basic object binding", {
  setup: function() {
    fromObject = Ember.Object.create({ value: 'start' }) ;
    toObject = Ember.Object.create({ value: 'end' }) ;
    root = { fromObject: fromObject, toObject: toObject };
    Ember.run(function () {
      binding = Ember.bind(root, 'toObject.value', 'fromObject.value');
    });
  }
});

test("binding should have synced on connect", function() {
  equal(get(toObject, "value"), "start", "toObject.value should match fromObject.value");
});

test("fromObject change should propagate to toObject only after flush", function() {
  Ember.run(function () {
    set(fromObject, "value", "change") ;
    equal(get(toObject, "value"), "start") ;
  });
  equal(get(toObject, "value"), "change") ;
});

test("toObject change should propagate to fromObject only after flush", function() {
  Ember.run(function () {
    set(toObject, "value", "change") ;
    equal(get(fromObject, "value"), "start") ;
  });
  equal(get(fromObject, "value"), "change") ;
});

test("deferred observing during bindings", function() {

  // setup special binding
  fromObject = Ember.Object.create({
    value1: 'value1',
    value2: 'value2'
  });

  toObject = Ember.Object.createWithMixins({
    value1: 'value1',
    value2: 'value2',

    callCount: 0,

    observer: Ember.observer(function() {
      equal(get(this, 'value1'), 'CHANGED', 'value1 when observer fires');
      equal(get(this, 'value2'), 'CHANGED', 'value2 when observer fires');
      this.callCount++;
    }, 'value1', 'value2')
  });

  var root = { fromObject: fromObject, toObject: toObject };
  Ember.run(function () {
    Ember.bind(root, 'toObject.value1', 'fromObject.value1');
    Ember.bind(root, 'toObject.value2', 'fromObject.value2');

    // change both value1 + value2, then  flush bindings.  observer should only
    // fire after bindings are done flushing.
    set(fromObject, 'value1', 'CHANGED');
    set(fromObject, 'value2', 'CHANGED');
  });

  equal(toObject.callCount, 2, 'should call observer twice');
});

test("binding disconnection actually works", function() {
  binding.disconnect(root);
  Ember.run(function () {
    set(fromObject, 'value', 'change');
  });
  equal(get(toObject, 'value'), 'start');
});

// ..........................................................
// one way binding
//

module("one way binding", {

  setup: function() {
    Ember.run(function() {
      fromObject = Ember.Object.create({ value: 'start' }) ;
      toObject = Ember.Object.create({ value: 'end' }) ;
      root = { fromObject: fromObject, toObject: toObject };
      binding = Ember.oneWay(root, 'toObject.value', 'fromObject.value');
    });
  },
  teardown: function(){
    Ember.run.cancelTimers();
  }
});

test("fromObject change should propagate after flush", function() {
  Ember.run(function() {
    set(fromObject, "value", "change") ;
    equal(get(toObject, "value"), "start") ;
    Ember.run.sync() ;
    equal(get(toObject, "value"), "change") ;
  });
});

test("toObject change should NOT propagate", function() {
  Ember.run(function() {
    set(toObject, "value", "change") ;
    equal(get(fromObject, "value"), "start") ;
    Ember.run.sync() ;
    equal(get(fromObject, "value"), "start") ;
  });
});

var first, second, third, binding1, binding2; // global variables

// ..........................................................
// chained binding
//

module("chained binding", {

  setup: function() {
    Ember.run(function() {
      first = Ember.Object.create({ output: 'first' }) ;

      second = Ember.Object.createWithMixins({
        input: 'second',
        output: 'second',

        inputDidChange: Ember.observer(function() {
          set(this, "output", get(this, "input")) ;
        }, "input")
      }) ;

      third = Ember.Object.create({ input: "third" }) ;

      root = { first: first, second: second, third: third };
      binding1 = Ember.bind(root, 'second.input', 'first.output');
      binding2 = Ember.bind(root, 'second.output', 'third.input');
    });
  },
  teardown: function(){
    Ember.run.cancelTimers();
  }
});

test("changing first output should propograte to third after flush", function() {
  Ember.run(function() {
    set(first, "output", "change") ;
    equal("change", get(first, "output"), "first.output") ;
    ok("change" !== get(third, "input"), "third.input") ;

    var didChange = true;
    while(didChange) didChange = Ember.run.sync() ;

    equal("change", get(first, "output"), "first.output") ;
    equal("change", get(second, "input"), "second.input") ;
    equal("change", get(second, "output"), "second.output") ;
    equal("change", get(third,"input"), "third.input") ;
  });
});

// ..........................................................
// Custom Binding
//

module("Custom Binding", {
  setup: function() {
    Bon1 = Ember.Object.extend({
      value1: "hi",
      value2: 83,
      array1: []
    });

    bon2 = Ember.Object.create({
      val1: "hello",
      val2: 25,
      arr: [1,2,3,4]
    });

    TestNamespace = {
      bon2: bon2,
      Bon1: Bon1
    };
  },
  teardown: function() {
    Bon1 = bon2 = TestNamespace  = null;
    Ember.run.cancelTimers();
  }
});

test("two bindings to the same value should sync in the order they are initialized", function() {

  Ember.run.begin();

  var a = Ember.Object.create({
    foo: "bar"
  });

  var b = Ember.Object.createWithMixins({
    foo: "baz",
    fooBinding: "a.foo",

    a: a,

    C: Ember.Object.extend({
      foo: "bee",
      fooBinding: "owner.foo"
    }),

    init: function() {
      this._super();
      set(this, 'c', this.C.create({ owner: this }));
    }

  });

  Ember.run.end();

  equal(get(a, 'foo'), "bar", 'a.foo should not change');
  equal(get(b, 'foo'), "bar", 'a.foo should propagate up to b.foo');
  equal(get(b.c, 'foo'), "bar", 'a.foo should propagate up to b.c.foo');
});

// ..........................................................
// propertyNameBinding with longhand
//

module("propertyNameBinding with longhand", {
  setup: function(){
    TestNamespace = {};
    Ember.run(function () {
      TestNamespace.fromObject = Ember.Object.create({
        value: "originalValue"
      });

      TestNamespace.toObject = Ember.Object.createWithMixins({
          valueBinding: Ember.Binding.from('TestNamespace.fromObject.value'),
          localValue: "originalLocal",
          relativeBinding: Ember.Binding.from('localValue')
      });
    });
  },
  teardown: function(){
    TestNamespace = undefined;
  }
});

test("works with full path", function(){
  Ember.run(function () {
    set(TestNamespace.fromObject, 'value', "updatedValue");
  });

  equal(get(TestNamespace.toObject, 'value'), "updatedValue");

  Ember.run(function () {
    set(TestNamespace.fromObject, 'value', "newerValue");
  });

  equal(get(TestNamespace.toObject, 'value'), "newerValue");
});

test("works with local path", function(){
  Ember.run(function () {
    set(TestNamespace.toObject, 'localValue', "updatedValue");
  });

  equal(get(TestNamespace.toObject, 'relative'), "updatedValue");

  Ember.run(function () {
    set(TestNamespace.toObject, 'localValue', "newerValue");
  });

  equal(get(TestNamespace.toObject, 'relative'), "newerValue");
});
