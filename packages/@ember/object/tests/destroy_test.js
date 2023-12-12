import { run } from '@ember/runloop';
import { beginPropertyChanges, endPropertyChanges } from '@ember/-internals/metal';
import { peekMeta } from '@ember/-internals/meta';
import EmberObject, { get, set, observer } from '@ember/object';
import { DEBUG } from '@glimmer/env';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

moduleFor(
  '@ember/-internals/runtime/system/object/destroy_test',
  class extends AbstractTestCase {
    ['@test should schedule objects to be destroyed at the end of the run loop'](assert) {
      let obj = EmberObject.create();
      let meta;

      run(() => {
        obj.destroy();
        meta = peekMeta(obj);
        assert.ok(meta, 'meta is not destroyed immediately');
        assert.ok(get(obj, 'isDestroying'), 'object is marked as destroying immediately');
        assert.ok(!get(obj, 'isDestroyed'), 'object is not destroyed immediately');
      });

      meta = peekMeta(obj);
      assert.ok(get(obj, 'isDestroyed'), 'object is destroyed after run loop finishes');
    }

    // MANDATORY_SETTER moves value to meta.values
    // a destroyed object removes meta but leaves the accessor
    // that looks it up
    ['@test should raise an exception when modifying watched properties on a destroyed object'](
      assert
    ) {
      if (DEBUG) {
        let obj = EmberObject.extend({
          fooDidChange: observer('foo', function () {}),
        }).create({
          foo: 'bar',
        });

        run(() => obj.destroy());

        assert.throws(() => set(obj, 'foo', 'baz'), Error, 'raises an exception');
      } else {
        assert.expect(0);
      }
    }

    async ['@test observers should not fire after an object has been destroyed'](assert) {
      let count = 0;
      let obj = EmberObject.extend({
        fooDidChange: observer('foo', function () {
          count++;
        }),
      }).create();

      obj.set('foo', 'bar');
      await runLoopSettled();

      assert.equal(count, 1, 'observer was fired once');

      beginPropertyChanges();
      obj.set('foo', 'quux');
      obj.destroy();
      endPropertyChanges();
      await runLoopSettled();

      assert.equal(count, 1, 'observer was not called after object was destroyed');
    }

    async ['@test destroyed objects should not see each others changes during teardown but a long lived object should'](
      assert
    ) {
      let shouldChange = 0;
      let shouldNotChange = 0;

      let objs = {};

      let A = EmberObject.extend({
        objs: objs,
        isAlive: true,
        willDestroy() {
          this.set('isAlive', false);
        },
        bDidChange: observer('objs.b.isAlive', function () {
          shouldNotChange++;
        }),
        cDidChange: observer('objs.c.isAlive', function () {
          shouldNotChange++;
        }),
      });

      let B = EmberObject.extend({
        objs: objs,
        isAlive: true,
        willDestroy() {
          this.set('isAlive', false);
        },
        aDidChange: observer('objs.a.isAlive', function () {
          shouldNotChange++;
        }),
        cDidChange: observer('objs.c.isAlive', function () {
          shouldNotChange++;
        }),
      });

      let C = EmberObject.extend({
        objs: objs,
        isAlive: true,
        willDestroy() {
          this.set('isAlive', false);
        },
        aDidChange: observer('objs.a.isAlive', function () {
          shouldNotChange++;
        }),
        bDidChange: observer('objs.b.isAlive', function () {
          shouldNotChange++;
        }),
      });

      let LongLivedObject = EmberObject.extend({
        objs: objs,
        isAliveDidChange: observer('objs.a.isAlive', function () {
          shouldChange++;
        }),
      });

      objs.a = A.create();

      objs.b = B.create();

      objs.c = C.create();

      let longLived = LongLivedObject.create();

      for (let obj in objs) {
        objs[obj].destroy();
      }

      await runLoopSettled();

      assert.equal(shouldNotChange, 0, 'destroyed graph objs should not see change in willDestroy');
      assert.equal(shouldChange, 1, 'long lived should see change in willDestroy');

      longLived.destroy();
    }
  }
);
