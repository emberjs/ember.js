import { run } from '@ember/runloop';
import { alias, observer, get, set } from '@ember/-internals/metal';
import EmberObject from '../../../lib/system/object';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

moduleFor(
  'EmberObject observer',
  class extends AbstractTestCase {
    async ['@test observer on class'](assert) {
      let MyClass = EmberObject.extend({
        count: 0,

        foo: observer('bar', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      let obj = MyClass.create();
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');

      obj.destroy();
    }

    async ['@test setting `undefined` value on observed property behaves correctly'](assert) {
      let MyClass = EmberObject.extend({
        mood: 'good',
        foo: observer('mood', function () {}),
      });

      let obj = MyClass.create();
      assert.equal(get(obj, 'mood'), 'good');

      set(obj, 'mood', 'bad');
      await runLoopSettled();

      assert.equal(get(obj, 'mood'), 'bad');

      set(obj, 'mood', undefined);
      await runLoopSettled();

      assert.equal(get(obj, 'mood'), undefined);

      set(obj, 'mood', 'awesome');
      await runLoopSettled();

      assert.equal(get(obj, 'mood'), 'awesome');

      obj.destroy();
    }

    async ['@test observer on subclass'](assert) {
      let MyClass = EmberObject.extend({
        count: 0,

        foo: observer('bar', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      let Subclass = MyClass.extend({
        foo: observer('baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      let obj = Subclass.create();
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 0, 'should not invoke observer after change');

      set(obj, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');

      obj.destroy();
    }

    async ['@test observer on instance'](assert) {
      let obj = EmberObject.extend({
        foo: observer('bar', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      }).create({
        count: 0,
      });

      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');

      obj.destroy();
      await runLoopSettled();
    }

    async ['@test observer on instance overriding class'](assert) {
      let MyClass = EmberObject.extend({
        count: 0,

        foo: observer('bar', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      let obj = MyClass.extend({
        foo: observer('baz', function () {
          // <-- change property we observe
          set(this, 'count', get(this, 'count') + 1);
        }),
      }).create();

      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 0, 'should not invoke observer after change');

      set(obj, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 1, 'should invoke observer after change');

      obj.destroy();
    }

    async ['@test observer should not fire after being destroyed'](assert) {
      let obj = EmberObject.extend({
        count: 0,
        foo: observer('bar', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      }).create();

      assert.equal(get(obj, 'count'), 0, 'precond - should not invoke observer immediately');

      run(() => obj.destroy());

      expectAssertion(function () {
        set(obj, 'bar', 'BAZ');
      }, `calling set on destroyed object: ${obj}.bar = BAZ`);

      assert.equal(get(obj, 'count'), 0, 'should not invoke observer after change');

      obj.destroy();
    }

    // ..........................................................
    // COMPLEX PROPERTIES
    //

    async ['@test chain observer on class'](assert) {
      let MyClass = EmberObject.extend({
        count: 0,

        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      let obj1 = MyClass.create({
        bar: { baz: 'biff' },
      });

      let obj2 = MyClass.create({
        bar: { baz: 'biff2' },
      });

      assert.equal(get(obj1, 'count'), 0, 'should not invoke yet');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj1, 'bar'), 'baz', 'BIFF1');
      await runLoopSettled();

      assert.equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj2, 'bar'), 'baz', 'BIFF2');
      await runLoopSettled();

      assert.equal(get(obj1, 'count'), 1, 'should not invoke again');
      assert.equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');

      obj1.destroy();
      obj2.destroy();
    }

    async ['@test clobbering a chain observer on subclass'](assert) {
      let MyClass = EmberObject.extend({
        count: 0,

        foo: observer('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      });

      let obj1 = MyClass.extend().create({
        bar: { baz: 'biff' },
      });

      let obj2 = MyClass.extend({
        foo: observer('bar2.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
        }),
      }).create({
        bar: { baz: 'biff2' },
        bar2: { baz: 'biff3' },
      });

      assert.equal(get(obj1, 'count'), 0, 'should not invoke yet');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj1, 'bar'), 'baz', 'BIFF1');
      await runLoopSettled();

      assert.equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj2, 'bar'), 'baz', 'BIFF2');
      await runLoopSettled();

      assert.equal(get(obj1, 'count'), 1, 'should not invoke again');
      assert.equal(get(obj2, 'count'), 0, 'should not invoke yet');

      set(get(obj2, 'bar2'), 'baz', 'BIFF3');
      await runLoopSettled();

      assert.equal(get(obj1, 'count'), 1, 'should not invoke again');
      assert.equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');

      obj1.destroy();
      obj2.destroy();
    }

    async ['@test chain observer on class that has a reference to an uninitialized object will finish chains that reference it'](
      assert
    ) {
      let changed = false;

      let ChildClass = EmberObject.extend({
        parent: null,
        parentOneTwoDidChange: observer('parent.one.two', function () {
          changed = true;
        }),
      });

      let ParentClass = EmberObject.extend({
        one: {
          two: 'old',
        },
        init() {
          this.child = ChildClass.create({
            parent: this,
          });
        },
      });

      let parent = ParentClass.create();

      assert.equal(changed, false, 'precond');

      set(parent, 'one.two', 'new');
      await runLoopSettled();

      assert.equal(changed, true, 'child should have been notified of change to path');

      set(parent, 'one', { two: 'newer' });
      await runLoopSettled();

      assert.equal(changed, true, 'child should have been notified of change to path');

      parent.child.destroy();
      parent.destroy();
    }

    async ['@test cannot re-enter observer while it is flushing'](assert) {
      let changed = false;

      let Class = EmberObject.extend({
        bar: 0,

        get foo() {
          // side effects during creation, setting a value and running through
          // sync observers for a second time.
          return this.incrementProperty('bar');
        },

        // Ensures we get `foo` eagerly when attempting to observe it
        fooAlias: alias('foo'),

        parentOneTwoDidChange: observer({
          dependentKeys: ['fooAlias'],
          fn() {
            changed = true;
          },
          sync: true,
        }),
      });

      let obj = Class.create();

      obj.notifyPropertyChange('foo');

      assert.equal(changed, true, 'observer fired successfully');

      obj.destroy();
    }
  }
);
