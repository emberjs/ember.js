import Ember from "ember-metal/core";
import {get} from 'ember-metal/property_get';
import {set} from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import {Binding, bind, oneWay} from "ember-metal/binding";
import {observer as emberObserver} from "ember-metal/mixin";
import EmberObject from 'ember-runtime/system/object';


/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * All calls to run.sync() were changed to
    run.sync()

  * Bindings no longer accept a root object as their second param.  Instead
    our test binding objects were put under a single object they could
    originate from.

  * tests that inspected internal properties were removed.

  * converted foo.get/foo.set to use get/Ember.set

  * Removed tests for Binding.isConnected.  Since binding instances are now
    shared this property no longer makes sense.

  * Changed call calls for obj.bind(...) to bind(obj, ...);

  * Changed all calls to sc_super() to this._super.apply(this, arguments)

  * Changed all calls to disconnect() to pass the root object.

  * removed calls to Binding.destroy() as that method is no longer useful
    (or defined)

  * changed use of T_STRING to 'string'
*/

// ========================================================================
// Binding Tests
// ========================================================================

var TestNamespace, fromObject, toObject, binding, Bon1, bon2, root; // global variables
var originalLookup, lookup;

QUnit.module("basic object binding", {
  setup() {
    fromObject = EmberObject.create({ value: 'start' });
    toObject = EmberObject.create({ value: 'end' });
    root = { fromObject: fromObject, toObject: toObject };
    run(function () {
      binding = bind(root, 'toObject.value', 'fromObject.value');
    });
  }
});

QUnit.test("binding should have synced on connect", function() {
  equal(get(toObject, "value"), "start", "toObject.value should match fromObject.value");
});

QUnit.test("fromObject change should propagate to toObject only after flush", function() {
  run(function () {
    set(fromObject, "value", "change");
    equal(get(toObject, "value"), "start");
  });
  equal(get(toObject, "value"), "change");
});

QUnit.test("toObject change should propagate to fromObject only after flush", function() {
  run(function () {
    set(toObject, "value", "change");
    equal(get(fromObject, "value"), "start");
  });
  equal(get(fromObject, "value"), "change");
});

QUnit.test("deferred observing during bindings", function() {

  // setup special binding
  fromObject = EmberObject.create({
    value1: 'value1',
    value2: 'value2'
  });

  toObject = EmberObject.createWithMixins({
    value1: 'value1',
    value2: 'value2',

    callCount: 0,

    observer: emberObserver('value1', 'value2', function() {
      equal(get(this, 'value1'), 'CHANGED', 'value1 when observer fires');
      equal(get(this, 'value2'), 'CHANGED', 'value2 when observer fires');
      this.callCount++;
    })
  });

  var root = { fromObject: fromObject, toObject: toObject };
  run(function () {
    bind(root, 'toObject.value1', 'fromObject.value1');
    bind(root, 'toObject.value2', 'fromObject.value2');

    // change both value1 + value2, then  flush bindings.  observer should only
    // fire after bindings are done flushing.
    set(fromObject, 'value1', 'CHANGED');
    set(fromObject, 'value2', 'CHANGED');
  });

  equal(toObject.callCount, 2, 'should call observer twice');
});

QUnit.test("binding disconnection actually works", function() {
  binding.disconnect(root);
  run(function () {
    set(fromObject, 'value', 'change');
  });
  equal(get(toObject, 'value'), 'start');
});

// ..........................................................
// one way binding
//

QUnit.module("one way binding", {

  setup() {
    run(function() {
      fromObject = EmberObject.create({ value: 'start' });
      toObject = EmberObject.create({ value: 'end' });
      root = { fromObject: fromObject, toObject: toObject };
      binding = oneWay(root, 'toObject.value', 'fromObject.value');
    });
  },
  teardown() {
    run.cancelTimers();
  }
});

QUnit.test("fromObject change should propagate after flush", function() {
  run(function() {
    set(fromObject, "value", "change");
    equal(get(toObject, "value"), "start");
  });
  equal(get(toObject, "value"), "change");
});

QUnit.test("toObject change should NOT propagate", function() {
  run(function() {
    set(toObject, "value", "change");
    equal(get(fromObject, "value"), "start");
  });
  equal(get(fromObject, "value"), "start");
});

var first, second, third, binding1, binding2; // global variables

// ..........................................................
// chained binding
//

QUnit.module("chained binding", {

  setup() {
    run(function() {
      first = EmberObject.create({ output: 'first' });

      second = EmberObject.createWithMixins({
        input: 'second',
        output: 'second',

        inputDidChange: emberObserver("input", function() {
          set(this, "output", get(this, "input"));
        })
      });

      third = EmberObject.create({ input: "third" });

      root = { first: first, second: second, third: third };
      binding1 = bind(root, 'second.input', 'first.output');
      binding2 = bind(root, 'second.output', 'third.input');
    });
  },
  teardown() {
    run.cancelTimers();
  }
});

QUnit.test("changing first output should propagate to third after flush", function() {
  run(function() {
    set(first, "output", "change");
    equal("change", get(first, "output"), "first.output");
    ok("change" !== get(third, "input"), "third.input");
  });

  equal("change", get(first, "output"), "first.output");
  equal("change", get(second, "input"), "second.input");
  equal("change", get(second, "output"), "second.output");
  equal("change", get(third, "input"), "third.input");
});

// ..........................................................
// Custom Binding
//

QUnit.module("Custom Binding", {
  setup() {
    originalLookup = Ember.lookup;
    Ember.lookup = lookup = {};

    Bon1 = EmberObject.extend({
      value1: "hi",
      value2: 83,
      array1: []
    });

    bon2 = EmberObject.create({
      val1: "hello",
      val2: 25,
      arr: [1,2,3,4]
    });

    Ember.lookup['TestNamespace'] = TestNamespace = {
      bon2: bon2,
      Bon1: Bon1
    };
  },
  teardown() {
    Ember.lookup = originalLookup;
    Bon1 = bon2 = TestNamespace  = null;
    run.cancelTimers();
  }
});

QUnit.test("two bindings to the same value should sync in the order they are initialized", function() {

  run.begin();

  var a = EmberObject.create({
    foo: "bar"
  });

  var b = EmberObject.createWithMixins({
    foo: "baz",
    fooBinding: "a.foo",

    a: a,

    C: EmberObject.extend({
      foo: "bee",
      fooBinding: "owner.foo"
    }),

    init() {
      this._super.apply(this, arguments);
      set(this, 'c', this.C.create({ owner: this }));
    }

  });

  run.end();

  equal(get(a, 'foo'), "bar", 'a.foo should not change');
  equal(get(b, 'foo'), "bar", 'a.foo should propagate up to b.foo');
  equal(get(b.c, 'foo'), "bar", 'a.foo should propagate up to b.c.foo');
});

// ..........................................................
// propertyNameBinding with longhand
//

QUnit.module("propertyNameBinding with longhand", {
  setup() {
    originalLookup = Ember.lookup;
    Ember.lookup = lookup = {};

    Ember.lookup['TestNamespace'] = TestNamespace = {};
    run(function () {
      TestNamespace.fromObject = EmberObject.create({
        value: "originalValue"
      });

      TestNamespace.toObject = EmberObject.createWithMixins({
        valueBinding: Binding.from('TestNamespace.fromObject.value'),
        localValue: "originalLocal",
        relativeBinding: Binding.from('localValue')
      });
    });
  },
  teardown() {
    TestNamespace = undefined;
    Ember.lookup = originalLookup;
  }
});

QUnit.test("works with full path", function() {
  run(function () {
    set(TestNamespace.fromObject, 'value', "updatedValue");
  });

  equal(get(TestNamespace.toObject, 'value'), "updatedValue");

  run(function () {
    set(TestNamespace.fromObject, 'value', "newerValue");
  });

  equal(get(TestNamespace.toObject, 'value'), "newerValue");
});

QUnit.test("works with local path", function() {
  run(function () {
    set(TestNamespace.toObject, 'localValue', "updatedValue");
  });

  equal(get(TestNamespace.toObject, 'relative'), "updatedValue");

  run(function () {
    set(TestNamespace.toObject, 'localValue', "newerValue");
  });

  equal(get(TestNamespace.toObject, 'relative'), "newerValue");
});
