/**
 * Tests for the GXT compat destroyable.ts module.
 *
 * Covers: registerDestructor, destroy, isDestroyed, isDestroying,
 *         nested destruction, double-destroy idempotency.
 */

declare const QUnit: any;

QUnit.module('Compat: destroyable.ts', function () {
  // -------------------------------------------------------- registerDestructor
  QUnit.module('registerDestructor()', function () {
    QUnit.test('registers a destructor that is called on destroy', async function (assert: any) {
      const { registerDestructor, destroy } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      let called = false;
      const obj = {};
      registerDestructor(obj, () => {
        called = true;
      });
      assert.notOk(called, 'not called before destroy');
      destroy(obj);
      assert.ok(called, 'called after destroy');
    });

    QUnit.test('destructor receives the object as argument', async function (assert: any) {
      const { registerDestructor, destroy } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      let received: any = null;
      const obj = {};
      registerDestructor(obj, (o: any) => {
        received = o;
      });
      destroy(obj);
      assert.strictEqual(received, obj, 'destructor received the object');
    });

    QUnit.test('multiple destructors all run', async function (assert: any) {
      const { registerDestructor, destroy } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      const order: number[] = [];
      const obj = {};
      registerDestructor(obj, () => order.push(1));
      registerDestructor(obj, () => order.push(2));
      registerDestructor(obj, () => order.push(3));
      destroy(obj);
      assert.strictEqual(order.length, 3, 'all three destructors ran');
      // GXT runs destructors in reverse order
      assert.deepEqual(order, [3, 2, 1], 'destructors ran in reverse registration order');
    });

    QUnit.test('third argument (eager flag) does not break registration', async function (assert: any) {
      const { registerDestructor, destroy } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      let called = false;
      const obj = {};
      // Ember sometimes passes a boolean third arg; it must not be treated as a callback
      registerDestructor(obj, () => { called = true; }, true);
      destroy(obj);
      assert.ok(called, 'destructor ran even with eager flag');
    });
  });

  // ----------------------------------------------------------------- destroy()
  QUnit.module('destroy()', function () {
    QUnit.test('marks the object as destroyed', async function (assert: any) {
      const { registerDestructor, destroy, isDestroyed } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      const obj = {};
      registerDestructor(obj, () => {});
      assert.notOk(isDestroyed(obj), 'not destroyed before');
      destroy(obj);
      assert.ok(isDestroyed(obj), 'destroyed after');
    });

    QUnit.test('runs destructors synchronously', async function (assert: any) {
      const { registerDestructor, destroy } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      let called = false;
      const obj = {};
      registerDestructor(obj, () => { called = true; });
      destroy(obj);
      // If destructors were async, called would still be false here
      assert.ok(called, 'destructor already ran (synchronous)');
    });
  });

  // -------------------------------------------------------------- isDestroyed()
  QUnit.module('isDestroyed()', function () {
    QUnit.test('returns false for a fresh object', async function (assert: any) {
      const { isDestroyed } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      assert.notOk(isDestroyed({}), 'fresh object is not destroyed');
    });

    QUnit.test('returns false DURING willDestroy (destructor execution)', async function (assert: any) {
      const { registerDestructor, destroy, isDestroyed } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      let duringDestroy: boolean | null = null;
      const obj = {};
      registerDestructor(obj, () => {
        duringDestroy = isDestroyed(obj);
      });
      destroy(obj);
      assert.strictEqual(duringDestroy, false, 'isDestroyed is false while destructors are running');
      assert.ok(isDestroyed(obj), 'isDestroyed is true after destroy completes');
    });
  });

  // ------------------------------------------------------------ isDestroying()
  QUnit.module('isDestroying()', function () {
    QUnit.test('returns false for a fresh object', async function (assert: any) {
      const { isDestroying } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      assert.notOk(isDestroying({}), 'fresh object is not destroying');
    });

    QUnit.test('returns true DURING destructor execution', async function (assert: any) {
      const { registerDestructor, destroy, isDestroying } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      let duringDestruction: boolean | null = null;
      const obj = {};
      registerDestructor(obj, () => {
        duringDestruction = isDestroying(obj);
      });
      destroy(obj);
      assert.strictEqual(duringDestruction, true, 'isDestroying is true during destruction');
    });

    QUnit.test('returns true after destroy completes', async function (assert: any) {
      const { registerDestructor, destroy, isDestroying } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      const obj = {};
      registerDestructor(obj, () => {});
      destroy(obj);
      // After destruction, GXT marks object as destroyed; isDestroying should still report true
      // (or at least isDestroyed is true, which the fallback picks up).
      const result = isDestroying(obj);
      assert.ok(result, 'isDestroying is true after destroy');
    });
  });

  // ---------------------------------------------------- nested destruction
  QUnit.module('nested destruction', function () {
    QUnit.test('destroying parent also destroys children', async function (assert: any) {
      const { registerDestructor, destroy, isDestroyed, associateDestroyableChild } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      let parentDestroyed = false;
      let childDestroyed = false;
      const parent = {};
      const child = {};

      associateDestroyableChild(parent, child);
      registerDestructor(parent, () => { parentDestroyed = true; });
      registerDestructor(child, () => { childDestroyed = true; });

      destroy(parent);

      assert.ok(parentDestroyed, 'parent destructor ran');
      assert.ok(childDestroyed, 'child destructor ran');
      assert.ok(isDestroyed(parent), 'parent is destroyed');
      assert.ok(isDestroyed(child), 'child is destroyed');
    });

    QUnit.test('grandchild is also destroyed', async function (assert: any) {
      const { registerDestructor, destroy, isDestroyed, associateDestroyableChild } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      const log: string[] = [];
      const grandparent = {};
      const parent = {};
      const child = {};

      associateDestroyableChild(grandparent, parent);
      associateDestroyableChild(parent, child);

      registerDestructor(grandparent, () => log.push('grandparent'));
      registerDestructor(parent, () => log.push('parent'));
      registerDestructor(child, () => log.push('child'));

      destroy(grandparent);

      assert.ok(log.includes('grandparent'), 'grandparent destroyed');
      assert.ok(log.includes('parent'), 'parent destroyed');
      assert.ok(log.includes('child'), 'child destroyed');
      assert.ok(isDestroyed(child), 'child isDestroyed is true');
    });
  });

  // --------------------------------------------------------- double-destroy
  QUnit.module('double-destroy', function () {
    QUnit.test('second destroy call is a no-op', async function (assert: any) {
      const { registerDestructor, destroy } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      let callCount = 0;
      const obj = {};
      registerDestructor(obj, () => { callCount++; });

      destroy(obj);
      destroy(obj);
      destroy(obj);

      assert.strictEqual(callCount, 1, 'destructor called exactly once');
    });
  });

  // ---------------------------------------- enableDestroyableTracking / assertDestroyablesDestroyed
  QUnit.module('tracking stubs', function () {
    QUnit.test('enableDestroyableTracking is a no-op function', async function (assert: any) {
      const { enableDestroyableTracking } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      assert.strictEqual(typeof enableDestroyableTracking, 'function', 'is a function');
      enableDestroyableTracking(); // should not throw
      assert.ok(true, 'did not throw');
    });

    QUnit.test('assertDestroyablesDestroyed is a no-op function', async function (assert: any) {
      const { assertDestroyablesDestroyed } = await import('../../../@ember/-internals/gxt-backend/destroyable');
      assert.strictEqual(typeof assertDestroyablesDestroyed, 'function', 'is a function');
      assertDestroyablesDestroyed(); // should not throw
      assert.ok(true, 'did not throw');
    });
  });
});
