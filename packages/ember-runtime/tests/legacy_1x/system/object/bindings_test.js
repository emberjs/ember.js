import { context } from 'ember-environment';
import { get, set, run } from 'ember-metal';
import EmberObject from '../../../../system/object';

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
let testObject, fromObject, TestObject;
let TestNamespace, lookup;

QUnit.module('bind() method', {
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

    lookup['TestNamespace'] = TestNamespace = {
      fromObject: fromObject,
      testObject: testObject
    };
  },

  teardown() {
    testObject = fromObject = null;
    context.lookup = originalLookup;
  }
});

QUnit.test('bind(TestNamespace.fromObject.bar) should follow absolute path', function() {
  run(() => {
    expectDeprecation(() => {
      // create binding
      testObject.bind('foo', 'TestNamespace.fromObject.bar');
    }, /`Ember.Binding` is deprecated/);

    // now make a change to see if the binding triggers.
    set(fromObject, 'bar', 'changedValue');
  });

  equal('changedValue', get(testObject, 'foo'), 'testObject.foo');
});

QUnit.test('bind(.bar) should bind to relative path', function() {
  run(() => {
    expectDeprecation(() => {
      // create binding
      testObject.bind('foo', 'bar');
    }, /`Ember.Binding` is deprecated/);

    // now make a change to see if the binding triggers.
    set(testObject, 'bar', 'changedValue');
  });

  equal('changedValue', get(testObject, 'foo'), 'testObject.foo');
});

QUnit.module('fooBinding method', {
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

    lookup['TestNamespace'] = TestNamespace = {
      fromObject: fromObject,
      testObject: TestObject
    };
  },

  teardown() {
    context.lookup = originalLookup;
    TestObject = fromObject = null;
    //  delete TestNamespace;
  }
});

let deprecationMessage = /`Ember.Binding` is deprecated/;

QUnit.test('fooBinding: TestNamespace.fromObject.bar should follow absolute path', function() {
  run(() => {
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
  run(() => {
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
  run(() => {
    expectDeprecation(() => {
      // create binding
      testObject = TestObject.extend({
        fooBinding: 'TestNamespace.fromObject.bar'
      }).create();
    }, deprecationMessage);

    set(TestNamespace.fromObject, 'bar', 'BAZ');
  });

  equal(get(testObject, 'foo'), 'BAZ', 'binding should have synced');

  run(() => testObject.destroy());

  run(() => set(TestNamespace.fromObject, 'bar', 'BIFF'));

  ok(get(testObject, 'foo') !== 'bar', 'binding should not have synced');
});
