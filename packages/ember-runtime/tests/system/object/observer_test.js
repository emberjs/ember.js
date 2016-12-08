import { observer, run } from 'ember-metal';
import { testBoth } from 'internal-test-helpers';
import EmberObject from '../../../system/object';

QUnit.module('EmberObject observer');

testBoth('observer on class', function(get, set) {
  let MyClass = EmberObject.extend({
    count: 0,

    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj = new MyClass();
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observer on subclass', function(get, set) {
  let MyClass = EmberObject.extend({
    count: 0,

    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let Subclass = MyClass.extend({
    foo: observer('baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj = new Subclass();
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observer on instance', function(get, set) {
  let obj = EmberObject.extend({
    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  }).create({
    count: 0
  });

  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observer on instance overriding class', function(get, set) {
  let MyClass = EmberObject.extend({
    count: 0,

    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj = MyClass.extend({
    foo: observer('baz', function() { // <-- change property we observe
      set(this, 'count', get(this, 'count') + 1);
    })
  }).create();

  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', 'BAZ');
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observer should not fire after being destroyed', function(get, set) {
  let obj = EmberObject.extend({
    count: 0,
    foo: observer('bar', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  }).create();

  equal(get(obj, 'count'), 0, 'precond - should not invoke observer immediately');

  run(() => obj.destroy());

  expectAssertion(function() {
    set(obj, 'bar', 'BAZ');
  }, `calling set on destroyed object: ${obj}.bar = BAZ`);

  equal(get(obj, 'count'), 0, 'should not invoke observer after change');
});
// ..........................................................
// COMPLEX PROPERTIES
//


testBoth('chain observer on class', function(get, set) {
  let MyClass = EmberObject.extend({
    count: 0,

    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj1 = MyClass.create({
    bar: { baz: 'biff' }
  });

  let obj2 = MyClass.create({
    bar: { baz: 'biff2' }
  });

  equal(get(obj1, 'count'), 0, 'should not invoke yet');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj1, 'bar'), 'baz', 'BIFF1');
  equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar'), 'baz', 'BIFF2');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');
});


testBoth('chain observer on class', function(get, set) {
  let MyClass = EmberObject.extend({
    count: 0,

    foo: observer('bar.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  });

  let obj1 = MyClass.extend().create({
    bar: { baz: 'biff' }
  });

  let obj2 = MyClass.extend({
    foo: observer('bar2.baz', function() {
      set(this, 'count', get(this, 'count') + 1);
    })
  }).create({
    bar: { baz: 'biff2' },
    bar2: { baz: 'biff3' }
  });

  equal(get(obj1, 'count'), 0, 'should not invoke yet');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj1, 'bar'), 'baz', 'BIFF1');
  equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar'), 'baz', 'BIFF2');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar2'), 'baz', 'BIFF3');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');
});

testBoth('chain observer on class that has a reference to an uninitialized object will finish chains that reference it', function(get, set) {
  let changed = false;

  let ChildClass = EmberObject.extend({
    parent: null,
    parentOneTwoDidChange: observer('parent.one.two', function() {
      changed = true;
    })
  });

  let ParentClass = EmberObject.extend({
    one: {
      two: 'old'
    },
    init() {
      this.child = ChildClass.create({
        parent: this
      });
    }
  });

  let parent = new ParentClass();

  equal(changed, false, 'precond');

  parent.set('one.two', 'new');

  equal(changed, true, 'child should have been notified of change to path');

  parent.set('one', { two: 'newer' });

  equal(changed, true, 'child should have been notified of change to path');
});
