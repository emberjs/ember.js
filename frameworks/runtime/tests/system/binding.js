// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Binding Tests
// ========================================================================
/*globals module, test, ok, isObj, equals, expects */

var fromObject, midObject, toObject, binding, Bon1, bon2, first, second, third, binding1, binding2;

module("basic object binding", {

  setup: function () {
    fromObject = SC.Object.create({ value: 'start' });
    midObject = SC.Object.create({ value: 'middle' });
    toObject = SC.Object.create({ value: 'end' });
    binding1 = SC.Binding.from("value", fromObject).to("value", midObject).connect();
    binding2 = SC.Binding.from("value", midObject).to("value", toObject).connect();
    SC.Binding.flushPendingChanges(); // actually sets up up the connection
  },

  teardown: function () {
    fromObject.destroy();
    midObject.destroy();
    toObject.destroy();
    fromObject = midObject = toObject = binding1 = binding2 = null;
  }
});

test("binding is connected", function () {
  equals(binding1.isConnected, YES, "binding1.isConnected");
  equals(binding2.isConnected, YES, "binding2.isConnected");
});

test("binding has actually been setup", function () {
  equals(binding1._connectionPending, NO, "binding1._connectionPending");
  equals(binding2._connectionPending, NO, "binding2._connectionPending");
});

test("binding should have synced on connect", function () {
  equals(toObject.get("value"), "start", "toObject.value should match fromObject.value");
  equals(midObject.get("value"), "start", "midObject.value should match fromObject.value");
});

test("changing fromObject should mark binding as dirty", function () {
  fromObject.set("value", "change");
  ok(SC.Binding._changeQueue.contains(binding1), "the binding should be in the _changeQueue");
  SC.Binding.flushPendingChanges();
  ok(SC.Binding._changeQueue.contains(binding2), "the binding should be in the _changeQueue");
});

test("fromObject change should propogate to toObject only after flush", function () {
  fromObject.set("value", "change");
  equals(midObject.get("value"), "start");
  equals(toObject.get("value"), "start");
  SC.Binding.flushPendingChanges();
  equals(midObject.get("value"), "change");
  SC.Binding.flushPendingChanges();
  equals(toObject.get("value"), "change");
});

test("changing toObject should mark binding as dirty", function () {
  toObject.set("value", "change");
  ok(SC.Binding._changeQueue.contains(binding2), "the binding should be in the _changeQueue");
  SC.Binding.flushPendingChanges();
  ok(SC.Binding._changeQueue.contains(binding1), "the binding should be in the _changeQueue");
});

test("toObject change should propogate to fromObject only after flush", function () {
  toObject.set("value", "change");
  equals(midObject.get("value"), "start");
  equals(fromObject.get("value"), "start");
  SC.Binding.flushPendingChanges();
  equals(midObject.get("value"), "change");
  SC.Binding.flushPendingChanges();
  equals(fromObject.get("value"), "change");
});

test("suspended observing during bindings", function () {

  // setup special binding
  fromObject = SC.Object.create({
    value1: 'value1',
    value2: 'value2'
  });

  toObject = SC.Object.create({
    value1: 'value1',
    value2: 'value2',

    callCount: 0,

    observer: function () {
      equals(this.get('value1'), 'CHANGED', 'value1 when observer fires');
      equals(this.get('value2'), 'CHANGED', 'value2 when observer fires');
      this.callCount++;
    }.observes('value1', 'value2')
  });

  toObject.bind('value1', fromObject, 'value1');
  toObject.bind('value2', fromObject, 'value2');

  // change both value1 + value2, then  flush bindings.  observer should only
  // fire after bindings are done flushing.
  fromObject.set('value1', 'CHANGED').set('value2', 'CHANGED');
  SC.Binding.flushPendingChanges();

  equals(toObject.callCount, 2, 'should call observer twice');
});

test("binding will disconnect", function () {
  binding1.disconnect();
  equals(binding1.isConnected, NO, "binding1.isConnected");
});

test("binding disconnection actually works", function () {
  binding1.disconnect();
  fromObject.set('value', 'change');
  SC.Binding.flushPendingChanges();
  equals(midObject.get('value'), 'start');
  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), 'start');

  binding1.connect();
  SC.Binding.flushPendingChanges();
  equals(midObject.get('value'), 'change');
  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), 'change');
});

test("binding destruction actually works", function () {
  binding1.destroy();
  ok(binding1.isDestroyed, "binding marks itself as destroyed.");
  ok(!binding1._fromTarget && !binding1._toTarget, "binding destruction removes binding targets.");
});

module("bindings on classes");

test("should connect when multiple instances of class are created", function () {
  window.TestNamespace = {};
  window.TestNamespace.stubController = SC.Object.create({
    name: 'How to Be Happy'
  });

  try {
    var myClass = SC.Object.extend({
      fooBinding: SC.Binding.from('TestNamespace.stubController.name')
    });

    var myFirstObj;

    SC.run(function () { myFirstObj = myClass.create(); });
    equals(myFirstObj.get('foo'), "How to Be Happy");

    var mySecondObj;
    SC.run(function () { mySecondObj = myClass.create(); });
    equals(mySecondObj.get('foo'), "How to Be Happy");

    SC.run(function () { myFirstObj.destroy(); });
    ok(myFirstObj.fooBinding.isDestroyed, "destroying an object destroys its class bindings.");

  } finally {
    window.TestNamespace = undefined;
  }
});

module("one way binding", {
  setup: function () {
    fromObject = SC.Object.create({ value: 'start' });
    toObject = SC.Object.create({ value: 'end' });
    binding = SC.Binding.from("value", fromObject).to("value", toObject).oneWay().connect();
    SC.Binding.flushPendingChanges(); // actually sets up up the connection
  }

});

test("changing fromObject should mark binding as dirty", function () {
  fromObject.set("value", "change");
  ok(SC.Binding._changeQueue.contains(binding), "the binding should be in the _changeQueue");
});

test("fromObject change should propogate after flush", function () {
  fromObject.set("value", "change");
  equals(toObject.get("value"), "start");
  SC.Binding.flushPendingChanges();
  equals(toObject.get("value"), "change");
});

test("changing toObject should not make binding dirty", function () {
  toObject.set("value", "change");
  ok(!SC.Binding._changeQueue.contains(binding), "the binding should not be in the _changeQueue");
});

test("toObject change should NOT propogate", function () {
  toObject.set("value", "change");
  equals(fromObject.get("value"), "start");
  SC.Binding.flushPendingChanges();
  equals(fromObject.get("value"), "start");
});

module("chained binding", {

  setup: function () {
    first = SC.Object.create({ output: 'first' });

    second = SC.Object.create({
      input: 'second',
      output: 'second',

      inputDidChange: function () {
        this.set("output", this.get("input"));
      }.observes("input")
    });

    third = SC.Object.create({ input: "third" });

    binding1 = SC.Binding.from("output", first).to("input", second).connect();
    binding2 = SC.Binding.from("output", second).to("input", third).connect();
    SC.Binding.flushPendingChanges(); // actually sets up up the connection
  }

});

test("changing first output should propagate to third after flush", function () {
  first.set("output", "change");
  equals("change", first.get("output"), "first.output");
  ok("change" !== third.get("input"), "third.input");

  var didChange = YES;
  while (didChange) { didChange = SC.Binding.flushPendingChanges(); }

  // bindings should not have bending changes
  ok(!SC.Binding._changeQueue.contains(binding1), "the binding should not be in the _changeQueue");
  ok(!SC.Binding._changeQueue.contains(binding2), "the binding should not be in the _changeQueue");

  equals("change", first.get("output"), "first.output");
  equals("change", second.get("input"), "second.input");
  equals("change", second.get("output"), "second.output");
  equals("change", third.get("input"), "third.input");
});

module("Custom Binding", {

  setup: function () {
    Bon1 = SC.Object.extend({
      value1: "hi",
      value2: 83,
      array1: []
    });

    bon2 = SC.Object.create({
      val1: "hello",
      val2: 25,
      arr: [1, 2, 3, 4]
    });

    window.TestNamespace = {
      bon2: bon2,
      Bon1: Bon1
    };
  },

  teardown: function () {
    bon2.destroy();
  }
});

test("Binding value1 such that it will receive only single values", function () {
  var bon1 = Bon1.create({
    value1Binding: SC.Binding.single("TestNamespace.bon2.val1"),
    array1Binding: SC.Binding.single("TestNamespace.bon2.arr")
  });
  SC.Binding.flushPendingChanges();
  var a = [23, 31, 12, 21];
  bon2.set("arr", a);
  bon2.set("val1", "changed");
  SC.Binding.flushPendingChanges();
  equals(bon2.get("val1"), bon1.get("value1"));
  equals("@@MULT@@", bon1.get("array1"));
  bon1.destroy();
});

test("Single binding using notEmpty function.", function () {
  var bond = Bon1.create({
    array1Binding: SC.Binding.single("TestNamespace.bon2.arr").notEmpty(null, '(EMPTY)')
  });
  SC.Binding.flushPendingChanges();
  bon2.set("arr", []);
  SC.Binding.flushPendingChanges();
  equals("(EMPTY)", bond.get("array1"));
});

test("Binding with transforms, function to check the type of value", function () {
  var jon = Bon1.create({
    value1Binding: SC.Binding.transform(function (val1) {
      return (SC.typeOf(val1) == SC.T_STRING) ? val1 : "";
    }).from("TestNamespace.bon2.val1")
  });
  SC.Binding.flushPendingChanges();
  bon2.set("val1", "changed");
  SC.Binding.flushPendingChanges();
  equals(jon.get("value1"), bon2.get("val1"));
});

test("Adding transform does not affect parent binding", function () {
  var A,
      a,
      b;

  A = SC.Object.extend({
    isEnabledBindingDefault: SC.Binding.oneWay().bool()
  });

  b = SC.Object.create({
    isEnabled: YES
  });

  a = A.create();
  a.bind('isEnabled', b, 'isEnabled').not();

  ok(A.prototype.isEnabledBindingDefault._transforms !== a.bindings[0]._transforms, "transforms array not shared with parent binding");
});

test("two bindings to the same value should sync in the order they are initialized", function () {

  SC.LOG_BINDINGS = YES;

  SC.RunLoop.begin();

  window.a = SC.Object.create({
    foo: "bar"
  });

  var a = window.a;

  window.b = SC.Object.create({
    foo: "baz",
    fooBinding: "a.foo",

    C: SC.Object.extend({
      foo: "bee",
      fooBinding: "*owner.foo"
    }),

    init: function () {
      sc_super();
      this.set('c', this.C.create({ owner: this }));
    }

  });

  var b = window.b;

  SC.LOG_BINDINGS = NO;

  SC.RunLoop.end();

  equals(a.get('foo'), "bar", 'a.foo should not change');
  equals(b.get('foo'), "bar", 'a.foo should propogate up to b.foo');
  equals(b.c.get('foo'), "bar", 'a.foo should propogate up to b.c.foo');

  window.a = window.b = null;

});

module("AND binding", {

  setup: function () {
    // temporarily set up two source objects in the SC namespace so we can
    // use property paths to access them
    SC.testControllerA = SC.Object.create({ value: NO });
    SC.testControllerB = SC.Object.create({ value: NO });

    toObject = SC.Object.create({
      value: null,
      valueBinding: SC.Binding.and('SC.testControllerA.value', 'SC.testControllerB.value'),
      localValue1: NO,
      localValue2: NO,
      boundLocalValue: NO,
      boundLocalValueBinding: SC.Binding.and('.localValue1', '.localValue2')
    });
  },

  teardown: function () {
    SC.testControllerA.destroy();
    SC.testControllerB.destroy();
  }

});

test("bound value should be YES if both sources are YES", function () {
  SC.RunLoop.begin();
  SC.testControllerA.set('value', YES);
  SC.testControllerB.set('value', YES);
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), YES, 'Bound value');

  SC.RunLoop.begin();
  toObject.set('localValue1', YES);
  toObject.set('localValue2', YES);
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('boundLocalValue'), YES, 'Local bound value');
});

test("toObject.value should be NO if either source is NO", function () {
  SC.RunLoop.begin();
  SC.testControllerA.set('value', YES);
  SC.testControllerB.set('value', NO);
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), NO, 'Bound value on YES/NO');

  SC.RunLoop.begin();
  SC.testControllerA.set('value', YES);
  SC.testControllerB.set('value', YES);
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), YES, 'Bound value on YES/YES');

  SC.RunLoop.begin();
  SC.testControllerA.set('value', NO);
  SC.testControllerB.set('value', YES);
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), NO, 'Bound value on NO/YES');

  SC.RunLoop.begin();
  toObject.set('localValue1', YES);
  toObject.set('localValue2', NO);
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('boundLocalValue'), NO, 'Local bound value on YES/NO');

  SC.RunLoop.begin();
  toObject.set('localValue1', YES);
  toObject.set('localValue2', YES);
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('boundLocalValue'), YES, 'Local bound value on YES/YES');

  SC.RunLoop.begin();
  toObject.set('localValue1', NO);
  toObject.set('localValue2', YES);
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('boundLocalValue'), NO, 'Local bound value on NO/YES');
});

test("remote paths work when binding is defined on a class", function() {
  // This tests the solution to a bug which was hooking all instances of a class's `and` binding
  // up through the same internal object, which would be destroyed the first time any instance
  // was destroyed.

  var ToObject = SC.Object.extend({
    value: null,
    valueBinding: SC.Binding.and('SC.testControllerA.value', 'SC.testControllerB.value')
  });

  var toObject1, toObject2;
  SC.run(function() {
    toObject1 = ToObject.create();
    toObject2 = ToObject.create();
  });

  ok(!toObject1.get('value') && !toObject2.get('value'), "PRELIM: instances' initial values are correct.");

  SC.run(function() {
    SC.testControllerA.set('value', YES);
    SC.testControllerB.set('value', YES);
  });

  ok(toObject1.get('value') && toObject2.get('value'), "PRELIM: instances' values update correctly.");

  SC.run(function() {
    toObject1.destroy();
    SC.testControllerB.set('value', NO);
  });

  ok(!toObject2.get('value'), "Second instance updates correctly after first instance is destroyed.");

  // Cleanup.
  toObject2.destroy();

});

test("local paths work when binding is defined on a class", function() {
  // This tests the solution to a bug which was hooking all instances of a class's `and` binding
  // up through the same internal object, which would cause multiple instances to cross-polinate.

  var ToObject = SC.Object.extend({
    localValue1: NO,
    localValue2: NO,
    value: NO,
    valueBinding: SC.Binding.and('.localValue1', '.localValue2')
  });
  var toObject1, toObject2;
  SC.run(function() {
    toObject1 = ToObject.create();
    toObject2 = ToObject.create();
  });

  ok(!toObject1.get('value') && !toObject2.get('value'), "PRELIM: instances' initial values are correct.");

  SC.run(function() {
    toObject1.set('localValue1', YES).set('localValue2', YES);
  });

  ok(toObject1.get('value'), "First instance updates correctly when its own values are changed.");
  ok(!toObject2.get('value'), "Second instance does not update when first instance's values are changed.");

  // Cleanup.
  toObject1.destroy();
  toObject2.destroy();

});

module("OR binding", {

  setup: function () {
    // temporarily set up two source objects in the SC namespace so we can
    // use property paths to access them
    SC.testControllerA = SC.Object.create({ value: NO });
    SC.testControllerB = SC.Object.create({ value: null });

    toObject = SC.Object.create({
      value: null,
      valueBinding: SC.Binding.or('SC.testControllerA.value', 'SC.testControllerB.value'),
      localValue1: NO,
      localValue2: NO,
      boundLocalValue: NO,
      boundLocalValueBinding: SC.Binding.or('.localValue1', '.localValue2')
    });
  },

  teardown: function () {
    SC.testControllerA.destroy();
    SC.testControllerB.destroy();
  }

});

test("toObject.value should be first value if first value is truthy", function () {
  SC.RunLoop.begin();
  SC.testControllerA.set('value', 'first value');
  SC.testControllerB.set('value', 'second value');
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), 'first value', 'Bound value on truthy first value');

  SC.RunLoop.begin();
  toObject.set('localValue1', 'first value');
  toObject.set('localValue2', 'second value');
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('boundLocalValue'), 'first value', 'Locally bound value on truthy first value');

});

test("toObject.value should be second value if first is falsy", function () {
  SC.RunLoop.begin();
  SC.testControllerA.set('value', NO);
  SC.testControllerB.set('value', 'second value');
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), 'second value', 'Bound value on falsy first value');

  SC.RunLoop.begin();
  toObject.set('localValue1', NO);
  toObject.set('localValue2', 'second value');
  SC.RunLoop.end();

  SC.Binding.flushPendingChanges();
  equals(toObject.get('boundLocalValue'), 'second value', 'Locally bound value on falsy first value');

});

test("remote paths work when binding is defined on a class", function() {
  // This tests the solution to a bug which was hooking all instances of a class's `or` binding
  // up through the same internal object, which would be destroyed the first time any instance
  // was destroyed.

  var ToObject = SC.Object.extend({
    value: null,
    valueBinding: SC.Binding.or('SC.testControllerA.value', 'SC.testControllerB.value')
  });

  var toObject1, toObject2;
  SC.run(function() {
    toObject1 = ToObject.create();
    toObject2 = ToObject.create();
  });

  ok(!toObject1.get('value') && !toObject2.get('value'), "PRELIM: instances' initial values are correct.");

  SC.run(function() {
    SC.testControllerB.set('value', YES);
  });

  ok(toObject1.get('value') && toObject2.get('value'), "PRELIM: instances' values update correctly.");

  SC.run(function() {
    toObject1.destroy();
    SC.testControllerB.set('value', NO);
  });

  ok(!toObject2.get('value'), "Second instance updates correctly after first instance is destroyed.");

  // Cleanup.
  toObject2.destroy();

});

test("local paths work when binding is defined on a class", function() {
  // This tests the solution to a bug which was hooking all instances of a class's `or` binding
  // up through the same internal object, which would cause multiple instances to cross-polinate.

  var ToObject = SC.Object.extend({
    localValue1: NO,
    localValue2: NO,
    value: NO,
    valueBinding: SC.Binding.or('.localValue1', '.localValue2')
  });
  var toObject1, toObject2;
  SC.run(function() {
    toObject1 = ToObject.create();
    toObject2 = ToObject.create();
  });

  ok(!toObject1.get('value') && !toObject2.get('value'), "PRELIM: instances' initial values are correct.");

  SC.run(function() {
    toObject1.set('localValue1', YES);
  });

  ok(toObject1.get('value'), "First instance updates correctly when its own values are changed.");
  ok(!toObject2.get('value'), "Second instance does not update when first instance's values are changed.");

  // Cleanup.
  toObject1.destroy();
  toObject2.destroy();

});

module("Binding with '[]'", {
  setup: function () {
    fromObject = SC.Object.create({ value: [] });
    toObject = SC.Object.create({ value: '' });
    binding = SC.Binding.transform(function (v) {
      return v ? v.join(',') : '';
    }).from("value.[]", fromObject).to("value", toObject).connect();
  }
});

test("Binding refreshes after a couple of items have been pushed in the array", function () {
  fromObject.get('value').pushObjects(['foo', 'bar']);
  SC.Binding.flushPendingChanges();
  equals(toObject.get('value'), 'foo,bar');
});


module("propertyNameBinding with longhand", {
  setup: function () {
    TestNamespace = {
      fromObject: SC.Object.create({
        value: "originalValue"
      }),
      toObject: SC.Object.create({
        valueBinding: SC.Binding.from('TestNamespace.fromObject.value'),
        localValue: "originalLocal",
        relativeBinding: SC.Binding.from('.localValue')
      })
    };
  },
  teardown: function () {
    TestNamespace.fromObject.destroy();
    TestNamespace.toObject.destroy();
    delete TestNamespace.fromObject;
    delete TestNamespace.toObject;
  }
});

test("works with full path", function () {
  SC.RunLoop.begin();
  TestNamespace.fromObject.set('value', "updatedValue");
  SC.RunLoop.end();

  equals(TestNamespace.toObject.get('value'), "updatedValue");

  SC.RunLoop.begin();
  TestNamespace.fromObject.set('value', "newerValue");
  SC.RunLoop.end();

  equals(TestNamespace.toObject.get('value'), "newerValue");
});

test("works with local path", function () {
  SC.RunLoop.begin();
  TestNamespace.toObject.set('localValue', "updatedValue");
  SC.RunLoop.end();

  equals(TestNamespace.toObject.get('relative'), "updatedValue");

  SC.RunLoop.begin();
  TestNamespace.toObject.set('localValue', "newerValue");
  SC.RunLoop.end();

  equals(TestNamespace.toObject.get('relative'), "newerValue");
});
