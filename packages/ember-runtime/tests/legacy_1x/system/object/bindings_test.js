import {context} from 'ember-environment';
import {get} from 'ember-metal/property_get';
import {set} from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * changed Ember.Bending.flushPendingChanges() -> run.sync();
  * changes obj.set() and obj.get() to Ember.set() and Ember.get()
  * Fixed an actual bug in unit tests around line 133
  * fixed 'bindings should disconnect on destroy' test to use destroy.
*/

// ========================================================================
// EmberObject bindings Tests
// ========================================================================

let originalLookup = context.lookup;
let testObject, fromObject, extraObject, TestObject;
let TestNamespace, lookup;

var bindModuleOpts = {

  setup() {
    context.lookup = lookup = {};

    testObject = EmberObject.create({
      foo: 'bar',
      bar: 'foo',
      extraObject: null
    });

    fromObject = EmberObject.create({
      bar: 'foo',
      extraObject: null
    });

    extraObject = EmberObject.create({
      foo: 'extraObjectValue'
    });

    lookup['TestNamespace'] = TestNamespace = {
      fromObject: fromObject,
      testObject: testObject
    };
  },

  teardown() {
    testObject = fromObject = extraObject = null;
    context.lookup = originalLookup;
  }

};

QUnit.module('bind() method', bindModuleOpts);

QUnit.test('bind(TestNamespace.fromObject.bar) should follow absolute path', function() {
  run(function() {
    let deprecationMessage = '`Ember.Binding` is deprecated. Since you' +
      ' are binding to a global consider using a service instead.';

    expectDeprecation(() => {
      // create binding
      testObject.bind('foo', 'TestNamespace.fromObject.bar');
    }, deprecationMessage);

    // now make a change to see if the binding triggers.
    set(fromObject, 'bar', 'changedValue');
  });

  equal('changedValue', get(testObject, 'foo'), 'testObject.foo');
});

QUnit.test('bind(.bar) should bind to relative path', function() {
  run(function() {
    let deprecationMessage = '`Ember.Binding` is deprecated. Consider' +
      ' using an `alias` computed property instead.';

    expectDeprecation(() => {
      // create binding
      testObject.bind('foo', 'bar');
    }, deprecationMessage);

    // now make a change to see if the binding triggers.
    set(testObject, 'bar', 'changedValue');
  });

  equal('changedValue', get(testObject, 'foo'), 'testObject.foo');
});

var fooBindingModuleOpts = {

  setup() {
    context.lookup = lookup = {};

    TestObject = EmberObject.extend({
      foo: 'bar',
      bar: 'foo',
      extraObject: null
    });

    fromObject = EmberObject.create({
      bar: 'foo',
      extraObject: null
    });

    extraObject = EmberObject.create({
      foo: 'extraObjectValue'
    });

    lookup['TestNamespace'] = TestNamespace = {
      fromObject: fromObject,
      testObject: TestObject
    };
  },

  teardown() {
    context.lookup = originalLookup;
    TestObject = fromObject = extraObject = null;
    //  delete TestNamespace;
  }

};

QUnit.module('fooBinding method', fooBindingModuleOpts);


QUnit.test('fooBinding: TestNamespace.fromObject.bar should follow absolute path', function() {
  run(function() {
    let deprecationMessage = '`Ember.Binding` is deprecated. Since you' +
      ' are binding to a global consider using a service instead.';

    expectDeprecation(() => {
      // create binding
      testObject = TestObject.extend({
        fooBinding: 'TestNamespace.fromObject.bar'
      }).create();
    }, deprecationMessage);

    // now make a change to see if the binding triggers.
    set(fromObject, 'bar', 'changedValue');
  });

  equal('changedValue', get(testObject, 'foo'), 'testObject.foo');
});

QUnit.test('fooBinding: .bar should bind to relative path', function() {
  run(function() {
    let deprecationMessage = '`Ember.Binding` is deprecated. Consider' +
      ' using an `alias` computed property instead.';

    expectDeprecation(() => {
      // create binding
      testObject = TestObject.extend({
        fooBinding: 'bar'
      }).create();
    }, deprecationMessage);

    // now make a change to see if the binding triggers.
    set(testObject, 'bar', 'changedValue');
  });

  equal('changedValue', get(testObject, 'foo'), 'testObject.foo');
});

QUnit.test('fooBinding: should disconnect bindings when destroyed', function () {
  run(function() {
    let deprecationMessage = '`Ember.Binding` is deprecated. Since you' +
      ' are binding to a global consider using a service instead.';

    expectDeprecation(() => {
      // create binding
      testObject = TestObject.extend({
        fooBinding: 'TestNamespace.fromObject.bar'
      }).create();
    }, deprecationMessage);

    set(TestNamespace.fromObject, 'bar', 'BAZ');
  });

  equal(get(testObject, 'foo'), 'BAZ', 'binding should have synced');

  run(() => {
    testObject.destroy();
  });

  run(function() {
    set(TestNamespace.fromObject, 'bar', 'BIFF');
  });

  ok(get(testObject, 'foo') !== 'bar', 'binding should not have synced');
});
