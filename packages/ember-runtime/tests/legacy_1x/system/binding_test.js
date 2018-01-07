import { context } from 'ember-environment';
import {
  get,
  set,
  run,
  Binding,
  bind,
  observer as emberObserver
} from 'ember-metal';
import EmberObject from '../../../system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';


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

  * Changed all calls to sc_super() to this._super(...arguments)

  * Changed all calls to disconnect() to pass the root object.

  * removed calls to Binding.destroy() as that method is no longer useful
    (or defined)

  * changed use of T_STRING to 'string'
*/

// ========================================================================
// Binding Tests
// ========================================================================

let TestNamespace, fromObject, toObject, binding, Bon1, bon2, root; // global variables
const originalLookup = context.lookup;
let lookup;

moduleFor('basic object binding', class extends AbstractTestCase {
  beforeEach() {
    fromObject = EmberObject.create({ value: 'start' });
    toObject = EmberObject.create({ value: 'end' });
    root = { fromObject: fromObject, toObject: toObject };
    run(() => {
      expectDeprecation(() => {
        binding = bind(root, 'toObject.value', 'fromObject.value');
      }, /`Ember\.Binding` is deprecated./);
    });
  }


  ['@test binding should have synced on connect'](assert) {
    assert.equal(get(toObject, 'value'), 'start', 'toObject.value should match fromObject.value');
  }

  ['@test fromObject change should propagate to toObject only after flush'](assert) {
    run(() => {
      set(fromObject, 'value', 'change');
      assert.equal(get(toObject, 'value'), 'start');
    });
    assert.equal(get(toObject, 'value'), 'change');
  }

  ['@test toObject change should propagate to fromObject only after flush'](assert) {
    run(() => {
      set(toObject, 'value', 'change');
      assert.equal(get(fromObject, 'value'), 'start');
    });
    assert.equal(get(fromObject, 'value'), 'change');
  }

  ['@test deferred observing during bindings'](assert) {
    // setup special binding
    fromObject = EmberObject.create({
      value1: 'value1',
      value2: 'value2'
    });

    toObject = EmberObject.extend({
      observer: emberObserver('value1', 'value2', function() {
        assert.equal(get(this, 'value1'), 'CHANGED', 'value1 when observer fires');
        assert.equal(get(this, 'value2'), 'CHANGED', 'value2 when observer fires');
        this.callCount++;
      })
    }).create({
      value1: 'value1',
      value2: 'value2',

      callCount: 0
    });

    let root = { fromObject: fromObject, toObject: toObject };
    run(function () {
      expectDeprecation(() => {
        bind(root, 'toObject.value1', 'fromObject.value1');
      }, /`Ember\.Binding` is deprecated./);

      expectDeprecation(() => {
        bind(root, 'toObject.value2', 'fromObject.value2');
      }, /`Ember\.Binding` is deprecated./);

      // change both value1 + value2, then  flush bindings.  observer should only
      // fire after bindings are done flushing.
      set(fromObject, 'value1', 'CHANGED');
      set(fromObject, 'value2', 'CHANGED');
    });

    assert.equal(toObject.callCount, 2, 'should call observer twice');
  }

  ['@test binding disconnection actually works'](assert) {
    binding.disconnect(root);
    run(function () {
      set(fromObject, 'value', 'change');
    });
    assert.equal(get(toObject, 'value'), 'start');
  }      
});
let first, second, third; // global variables

// ..........................................................
// chained binding
//

moduleFor('chained binding', class extends AbstractTestCase {

  beforeEach() {
    run(function() {
      first = EmberObject.create({ output: 'first' });

      second = EmberObject.extend({
        inputDidChange: emberObserver('input', function() {
          set(this, 'output', get(this, 'input'));
        })
      }).create({
        input: 'second',
        output: 'second'
      });

      third = EmberObject.create({ input: 'third' });

      root = { first: first, second: second, third: third };

      expectDeprecation(() => {
        bind(root, 'second.input', 'first.output');
      }, /`Ember\.Binding` is deprecated./);

      expectDeprecation(() => {
        bind(root, 'second.output', 'third.input');
      }, /`Ember\.Binding` is deprecated./);
    });
  }

  afterEach() {
    run.cancelTimers();
  }

  ['@test changing first output should propagate to third after flush'](assert) {
    run(function() {
      set(first, 'output', 'change');
      assert.equal('change', get(first, 'output'), 'first.output');
      assert.ok('change' !== get(third, 'input'), 'third.input');
    });

    assert.equal('change', get(first, 'output'), 'first.output');
    assert.equal('change', get(second, 'input'), 'second.input');
    assert.equal('change', get(second, 'output'), 'second.output');
    assert.equal('change', get(third, 'input'), 'third.input');
  }
});

// ..........................................................
// Custom Binding
//

moduleFor('Custom Binding', class extends AbstractTestCase {
  beforeEach() {
    context.lookup = lookup = {};

    Bon1 = EmberObject.extend({
      value1: 'hi',
      value2: 83,
      array1: []
    });

    bon2 = EmberObject.create({
      val1: 'hello',
      val2: 25,
      arr: [1, 2, 3, 4]
    });

    context.lookup['TestNamespace'] = TestNamespace = {
      bon2: bon2,
      Bon1: Bon1
    };
  }
  afterEach() {
    context.lookup = originalLookup;
    Bon1 = bon2 = TestNamespace  = null;
    run.cancelTimers();
  }


  ['@test two bindings to the same value should sync in the order they are initialized'](assert) {
    run.begin();

    let a = EmberObject.create({
      foo: 'bar'
    });

    let b = EmberObject.extend({
      C: EmberObject.extend({
        foo: 'bee',
        fooBinding: 'owner.foo'
      }),

      init() {
        this._super(...arguments);
        set(this, 'c', this.C.create({ owner: this }));
      }
    });

    expectDeprecation(() => {
      b = b.create({
        foo: 'baz',
        fooBinding: 'a.foo',
        a: a
      });
    }, /`Ember\.Binding` is deprecated./);

    run.end();

    assert.equal(get(a, 'foo'), 'bar', 'a.foo should not change');
    assert.equal(get(b, 'foo'), 'bar', 'a.foo should propagate up to b.foo');
    assert.equal(get(b.c, 'foo'), 'bar', 'a.foo should propagate up to b.c.foo');
  }
});

// ..........................................................
// propertyNameBinding with longhand
//

moduleFor('propertyNameBinding with longhand', class extends AbstractTestCase {
  beforeEach() {
    context.lookup = lookup = {};

    lookup['TestNamespace'] = TestNamespace = {};
    run(() => {
      TestNamespace.fromObject = EmberObject.create({
        value: 'originalValue'
      });

      expectDeprecation(() => {
        TestNamespace.toObject = EmberObject.extend({
          valueBinding: Binding.from('TestNamespace.fromObject.value'),
          relativeBinding: Binding.from('localValue')
        }).create({
          localValue: 'originalLocal'
        });
      }, /`Ember\.Binding` is deprecated./);
    });
  }

  afterEach() {
    TestNamespace = undefined;
    context.lookup = originalLookup;
  }

  ['@test works with full path'](assert) {
    run(() => set(TestNamespace.fromObject, 'value', 'updatedValue'));

    assert.equal(get(TestNamespace.toObject, 'value'), 'updatedValue');

    run(() => set(TestNamespace.fromObject, 'value', 'newerValue'));

    assert.equal(get(TestNamespace.toObject, 'value'), 'newerValue');
  }

  ['@test works with local path'](assert) {
    run(() => set(TestNamespace.toObject, 'localValue', 'updatedValue'));

    assert.equal(get(TestNamespace.toObject, 'relative'), 'updatedValue');

    run(() => set(TestNamespace.toObject, 'localValue', 'newerValue'));

    assert.equal(get(TestNamespace.toObject, 'relative'), 'newerValue');
  }
});