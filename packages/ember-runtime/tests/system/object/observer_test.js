import { observer, run, get, set } from 'ember-metal';
import EmberObject from '../../../system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'EmberObject observer',
  class extends AbstractTestCase {
    ['@test observer on class'](assert) {
      let MyClass = EmberObject.extend({
        count: 0,

        foo: observer('bar', function() {
          set(this, 'count', get(this, 'count') + 1);
        })
      });

      let obj = new MyClass();
      assert.equal(
        get(obj, 'count'),
        0,
        'should not invoke observer immediately'
      );

      set(obj, 'bar', 'BAZ');
      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    ['@test observer on subclass'](assert) {
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
      assert.equal(
        get(obj, 'count'),
        0,
        'should not invoke observer immediately'
      );

      set(obj, 'bar', 'BAZ');
      assert.equal(
        get(obj, 'count'),
        0,
        'should not invoke observer after change'
      );

      set(obj, 'baz', 'BAZ');
      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    ['@test observer on instance'](assert) {
      let obj = EmberObject.extend({
        foo: observer('bar', function() {
          set(this, 'count', get(this, 'count') + 1);
        })
      }).create({
        count: 0
      });

      assert.equal(
        get(obj, 'count'),
        0,
        'should not invoke observer immediately'
      );

      set(obj, 'bar', 'BAZ');
      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    ['@test observer on instance overriding class'](assert) {
      let MyClass = EmberObject.extend({
        count: 0,

        foo: observer('bar', function() {
          set(this, 'count', get(this, 'count') + 1);
        })
      });

      let obj = MyClass.extend({
        foo: observer('baz', function() {
          // <-- change property we observe
          set(this, 'count', get(this, 'count') + 1);
        })
      }).create();

      assert.equal(
        get(obj, 'count'),
        0,
        'should not invoke observer immediately'
      );

      set(obj, 'bar', 'BAZ');
      assert.equal(
        get(obj, 'count'),
        0,
        'should not invoke observer after change'
      );

      set(obj, 'baz', 'BAZ');
      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');
    }

    ['@test observer should not fire after being destroyed'](assert) {
      let obj = EmberObject.extend({
        count: 0,
        foo: observer('bar', function() {
          set(this, 'count', get(this, 'count') + 1);
        })
      }).create();

      assert.equal(
        get(obj, 'count'),
        0,
        'precond - should not invoke observer immediately'
      );

      run(() => obj.destroy());

      expectAssertion(function() {
        set(obj, 'bar', 'BAZ');
      }, `calling set on destroyed object: ${obj}.bar = BAZ`);

      assert.equal(
        get(obj, 'count'),
        0,
        'should not invoke observer after change'
      );
    }

    // ..........................................................
    // COMPLEX PROPERTIES
    //

    ['@test chain observer on class'](assert) {
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

      assert.equal(get(obj1, 'count'), 0, 'should not invoke yet');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj1, 'bar'), 'baz', 'BIFF1');
      assert.equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj2, 'bar'), 'baz', 'BIFF2');
      assert.equal(get(obj1, 'count'), 1, 'should not invoke again');
      assert.equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');
    }

    ['@test chain observer on class'](assert) {
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

      assert.equal(get(obj1, 'count'), 0, 'should not invoke yet');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj1, 'bar'), 'baz', 'BIFF1');
      assert.equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj2, 'bar'), 'baz', 'BIFF2');
      assert.equal(get(obj1, 'count'), 1, 'should not invoke again');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj2, 'bar2'), 'baz', 'BIFF3');
      assert.equal(get(obj1, 'count'), 1, 'should not invoke again');
      assert.equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');
    }

    ['@test chain observer on class that has a reference to an uninitialized object will finish chains that reference it'](
      assert
    ) {
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

      assert.equal(changed, false, 'precond');

      set(parent, 'one.two', 'new');

      assert.equal(
        changed,
        true,
        'child should have been notified of change to path'
      );

      set(parent, 'one', { two: 'newer' });

      assert.equal(
        changed,
        true,
        'child should have been notified of change to path'
      );
    }
  }
);
