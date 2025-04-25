import type { GlobalContext } from '@glimmer/global-context';
import { unwrap } from '@glimmer/debug-util';
import {
  assertDestroyablesDestroyed,
  associateDestroyableChild,
  destroy,
  destroyChildren,
  enableDestroyableTracking,
  isDestroyed,
  isDestroying,
  registerDestructor,
  unregisterDestructor,
} from '@glimmer/destroyable';
import { testOverrideGlobalContext } from '@glimmer/global-context';

const { module, test } = QUnit;

let destroyQueue: (() => void)[] = [];
let destroyedQueue: (() => void)[] = [];

function flush() {
  destroyQueue.forEach((fn) => fn());
  destroyedQueue.forEach((fn) => fn());

  destroyQueue = [];
  destroyedQueue = [];
}

module('Destroyables', (hooks) => {
  let originalContext: GlobalContext | null;

  hooks.beforeEach(() => {
    originalContext = unwrap(
      testOverrideGlobalContext?.({
        scheduleDestroy<T extends object>(destroyable: T, destructor: (obj: T) => void) {
          destroyQueue.push(() => destructor(destroyable));
        },

        scheduleDestroyed(fn: () => void) {
          destroyedQueue.push(fn);
        },
      })
    );
  });

  hooks.afterEach(() => {
    unwrap(testOverrideGlobalContext)(originalContext);
  });

  hooks.afterEach((assert) => {
    assert.strictEqual(destroyQueue.length, 0, 'destruction flushed');
  });

  test('standard destructors work', (assert) => {
    const destroyable = {};
    let count = 0;

    registerDestructor(destroyable, () => count++);

    assert.false(isDestroying(destroyable), 'not destroying at first');
    assert.false(isDestroyed(destroyable), 'not destroyed at first');

    destroy(destroyable);

    assert.true(isDestroying(destroyable), 'destroying immediately after destroy() called');
    assert.false(isDestroyed(destroyable), 'not destroyed immediately after destroy()');
    assert.strictEqual(count, 0, 'count has not increased');

    flush();

    assert.true(isDestroying(destroyable), 'still destroying after flush');
    assert.true(isDestroyed(destroyable), 'destroyed after flush');
    assert.strictEqual(count, 1, 'destructor was run');
  });

  test('destructors work with functions', (assert) => {
    const destroyable = () => {};
    let count = 0;

    registerDestructor(destroyable, () => count++);

    assert.false(isDestroying(destroyable), 'not destroying at first');
    assert.false(isDestroyed(destroyable), 'not destroyed at first');

    destroy(destroyable);

    assert.true(isDestroying(destroyable), 'destroying immediately after destroy() called');
    assert.false(isDestroyed(destroyable), 'not destroyed immediately after destroy()');
    assert.strictEqual(count, 0, 'count has not increased');

    flush();

    assert.true(isDestroying(destroyable), 'still destroying after flush');
    assert.true(isDestroyed(destroyable), 'destroyed after flush');
    assert.strictEqual(count, 1, 'destructor was run');
  });

  test('can register multiple destructors', (assert) => {
    const destroyable = {};
    let count = 0;

    registerDestructor(destroyable, () => count++);
    registerDestructor(destroyable, () => count++);

    assert.false(isDestroying(destroyable), 'not destroying at first');
    assert.false(isDestroyed(destroyable), 'not destroyed at first');

    destroy(destroyable);

    assert.true(isDestroying(destroyable), 'destroying immediately after destroy() called');
    assert.false(isDestroyed(destroyable), 'not destroyed immediately after destroy()');
    assert.strictEqual(count, 0, 'count has not increased');

    flush();

    assert.true(isDestroying(destroyable), 'still destroying after flush');
    assert.true(isDestroyed(destroyable), 'destroyed after flush');
    assert.strictEqual(count, 2, 'both destructors were run');
  });

  test('destruction only happens once', (assert) => {
    const destroyable = {};
    let count = 0;

    registerDestructor(destroyable, () => count++);

    destroy(destroyable);
    flush();

    assert.true(isDestroying(destroyable), 'destroying after flush');
    assert.true(isDestroyed(destroyable), 'destroyed after flush');
    assert.strictEqual(count, 1, 'destructor was run');

    destroy(destroyable);
    flush();

    assert.true(isDestroying(destroyable), 'destroying after second flush');
    assert.true(isDestroyed(destroyable), 'destroyed after second flush');
    assert.strictEqual(count, 1, 'destructor was not run again');
  });

  test('eager destructors work', (assert) => {
    const destroyable = {};
    let count = 0;

    registerDestructor(destroyable, () => count++, true);

    destroy(destroyable);

    assert.true(isDestroying(destroyable), 'destroying immediately after destroy() called');
    assert.false(isDestroyed(destroyable), 'not destroyed immediately after destroy()');
    assert.strictEqual(count, 1, 'count has increased, eager destructor run');

    flush();

    assert.true(isDestroying(destroyable), 'destroying after flush');
    assert.true(isDestroyed(destroyable), 'destroyed after flush');
    assert.strictEqual(count, 1, 'destructor was not run again');
  });

  test('can unregister a destructor', (assert) => {
    const destroyable = {};
    let count = 0;

    const destructor = registerDestructor(destroyable, () => count++);
    unregisterDestructor(destroyable, destructor);

    destroy(destroyable);
    flush();

    assert.strictEqual(count, 0, 'destructor was not called');
  });

  test('can associate destroyable children', (assert) => {
    const parent = {};
    const child = {};

    associateDestroyableChild(parent, child);
    registerDestructor(parent, () => assert.step('parent'));
    registerDestructor(child, () => assert.step('child'));

    assert.false(isDestroying(parent), 'parent not destroying at first');
    assert.false(isDestroyed(parent), 'parent not destroyed at first');

    assert.false(isDestroying(child), 'child not destroying at first');
    assert.false(isDestroyed(child), 'child not destroyed at first');

    destroy(parent);

    assert.true(isDestroying(parent), 'parent destroying immediately after destroy() called');
    assert.false(isDestroyed(parent), 'parent not destroyed immediately after destroy()');

    assert.true(isDestroying(child), 'child destroying immediately after destroy() called');
    assert.false(isDestroyed(child), 'child not destroyed immediately after destroy()');

    assert.verifySteps([], 'nothing destroyed yet');

    flush();

    assert.true(isDestroying(parent), 'parent still destroying after flush');
    assert.true(isDestroyed(parent), 'parent destroyed after flush');

    assert.true(isDestroying(child), 'child still destroying after flush');
    assert.true(isDestroyed(child), 'child destroyed after flush');

    assert.verifySteps(['child', 'parent'], 'destructors run in correct order');
  });

  test('destroying child before a parent works', (assert) => {
    const parent = {};
    const child = {};

    associateDestroyableChild(parent, child);
    registerDestructor(parent, () => assert.step('parent'));
    registerDestructor(child, () => assert.step('child'));

    assert.false(isDestroying(parent), 'parent not destroying at first');
    assert.false(isDestroyed(parent), 'parent not destroyed at first');

    assert.false(isDestroying(child), 'child not destroying at first');
    assert.false(isDestroyed(child), 'child not destroyed at first');

    destroy(child);

    assert.false(isDestroying(parent), 'parent not immediately after child destroy()');
    assert.false(isDestroyed(parent), 'parent not destroyed after child destroy()');

    assert.true(isDestroying(child), 'child destroying immediately after destroy()');
    assert.false(isDestroyed(child), 'child not destroyed immediately after destroy() called');

    assert.verifySteps([], 'nothing destroyed yet');
    flush();

    assert.false(isDestroying(parent), 'parent still not destroying after flush');
    assert.false(isDestroyed(parent), 'parent not destroyed after flush');

    assert.true(isDestroying(child), 'child still destroying after flush');
    assert.true(isDestroyed(child), 'child destroyed after flush');

    assert.verifySteps(['child'], 'child destructor run');
    destroy(parent);

    assert.true(isDestroying(parent), 'parent destroying after destroy()');
    assert.false(isDestroyed(parent), 'parent not destroyed before flush');

    flush();

    assert.true(isDestroying(parent), 'parent still destroying after flush');
    assert.true(isDestroyed(parent), 'parent destroyed after flush');

    assert.verifySteps(['parent'], 'parent destructor run');
  });

  test('children can have multiple parents, but only destroy once', (assert) => {
    const parent1 = {};
    const parent2 = {};
    const child = {};

    associateDestroyableChild(parent1, child);
    associateDestroyableChild(parent2, child);

    registerDestructor(parent1, () => assert.step('parent1'));
    registerDestructor(parent2, () => assert.step('parent2'));
    registerDestructor(child, () => assert.step('child'));

    destroy(parent1);
    flush();

    assert.true(isDestroying(parent1), 'parent1 destroying');
    assert.true(isDestroyed(parent1), 'parent1 destroyed');

    assert.false(isDestroying(parent2), 'parent2 not destroying');
    assert.false(isDestroyed(parent2), 'parent2 not destroyed');

    assert.true(isDestroying(child), 'child destroying');
    assert.true(isDestroyed(child), 'child destroyed');

    assert.verifySteps(['child', 'parent1'], 'first parent and child destroyed');

    destroy(parent2);
    flush();

    assert.true(isDestroying(parent1), 'parent1 destroying');
    assert.true(isDestroyed(parent1), 'parent1 destroyed');

    assert.true(isDestroying(parent2), 'parent2 destroying');
    assert.true(isDestroyed(parent2), 'parent2 destroyed');

    assert.true(isDestroying(child), 'child destroying');
    assert.true(isDestroyed(child), 'child destroyed');

    assert.verifySteps(['parent2'], 'second parent destroyed');
  });

  test('can destroy children with the destroyChildren API', (assert) => {
    const parent = {};
    const child = {};

    associateDestroyableChild(parent, child);
    registerDestructor(parent, () => assert.step('parent'));
    registerDestructor(child, () => assert.step('child'));

    assert.false(isDestroying(parent), 'parent not destroying at first');
    assert.false(isDestroyed(parent), 'parent not destroyed at first');

    assert.false(isDestroying(child), 'child not destroying at first');
    assert.false(isDestroyed(child), 'child not destroyed at first');

    destroyChildren(parent);

    assert.false(isDestroying(parent), 'parent not immediately after child destroy()');
    assert.false(isDestroyed(parent), 'parent not destroyed after child destroy()');

    assert.true(isDestroying(child), 'child destroying immediately after destroy()');
    assert.false(isDestroyed(child), 'child not destroyed immediately after destroy() called');

    assert.verifySteps([], 'nothing destroyed yet');

    flush();

    assert.false(isDestroying(parent), 'parent still not destroying after flush');
    assert.false(isDestroyed(parent), 'parent not destroyed after flush');

    assert.true(isDestroying(child), 'child still destroying after flush');
    assert.true(isDestroyed(child), 'child destroyed after flush');

    assert.verifySteps(['child'], 'child destructor called');

    destroy(parent);

    assert.true(isDestroying(parent), 'parent destroying after destroy()');
    assert.false(isDestroyed(parent), 'parent not destroyed before flush');

    flush();

    assert.true(isDestroying(parent), 'parent still destroying after flush');
    assert.true(isDestroyed(parent), 'parent destroyed after flush');

    assert.verifySteps(['parent'], 'parent destructor called');
  });

  test('destroyables are destroying during destruction but not destroyed', (assert) => {
    const parent = {};
    const child = {};

    associateDestroyableChild(parent, child);

    registerDestructor(parent, () => {
      assert.step('parent destructor');

      assert.ok(isDestroying(parent), 'parent is destroying');
      assert.ok(isDestroying(child), 'child is destroying');

      assert.notOk(isDestroyed(parent), 'parent is not destroyed');
      assert.notOk(isDestroyed(child), 'child is not destroyed');
    });

    registerDestructor(child, () => {
      assert.step('child destructor');
      assert.ok(isDestroying(parent), 'parent is destroying');
      assert.ok(isDestroying(child), 'child is destroying');

      assert.notOk(isDestroyed(parent), 'parent is not destroyed');
      assert.notOk(isDestroyed(child), 'child is not destroyed');
    });

    destroy(parent);
    flush();

    assert.verifySteps(['child destructor', 'parent destructor'], 'destructors run bottom up');
  });

  test('destroyables are passed the correct object when destroying', (assert) => {
    const parent = {};
    const child = {};

    associateDestroyableChild(parent, child);
    registerDestructor(parent, (_parent) => {
      assert.step('parent destructor');
      assert.strictEqual(parent, _parent, 'passed the correct value');
    });
    registerDestructor(child, (_child) => {
      assert.step('child destructor');
      assert.strictEqual(child, _child, 'passed the correct value');
    });

    destroy(parent);
    flush();

    assert.verifySteps(['child destructor', 'parent destructor'], 'destructors run bottom up');
  });

  if (import.meta.env.DEV) {
    test('attempting to unregister a destructor that was not registered throws an error', (assert) => {
      assert.throws(() => {
        unregisterDestructor({}, () => 123);
      }, /attempted to remove a destructor that was not registered with the destroyable/u);
    });

    test('attempting to register a destructor on an object that isDestroying throws an error', (assert) => {
      assert.throws(() => {
        const destroyable = {};
        destroy(destroyable);
        registerDestructor(destroyable, () => 123);
      }, /Attempted to register a destructor with an object that is already destroying or destroyed/u);
    });

    test('attempting to unregister a destructor on an object that isDestroying throws an error', (assert) => {
      assert.throws(() => {
        const destroyable = {};
        destroy(destroyable);
        unregisterDestructor(destroyable, () => 123);
      }, /Attempted to unregister a destructor with an object that is already destroying or destroyed/u);
    });

    test('can track destroyables during tests and assert if they were not destroyed', (assert) => {
      assert.throws(() => {
        unwrap(enableDestroyableTracking)();

        registerDestructor({}, () => {});

        unwrap(assertDestroyablesDestroyed)();
      }, /Some destroyables were not destroyed during this test:/u);
    });

    test('assertion does not throw if destroyables were destroyed', () => {
      unwrap(enableDestroyableTracking)();

      const obj = {};
      registerDestructor(obj, () => {});
      destroy(obj);
      flush();

      unwrap(assertDestroyablesDestroyed)();
    });

    test('checking isDestroying does not trigger assertion', () => {
      unwrap(enableDestroyableTracking)();

      const obj = {};

      isDestroying(obj);

      unwrap(assertDestroyablesDestroyed)();
    });

    test('checking isDestroyed does not trigger assertion', () => {
      unwrap(enableDestroyableTracking)();

      const obj = {};

      isDestroyed(obj);

      unwrap(assertDestroyablesDestroyed)();
    });

    test('error thrown attaches destroyables for helpful debugging', (assert) => {
      unwrap(enableDestroyableTracking)();

      const obj1 = {};
      registerDestructor(obj1, () => {});

      const obj2 = {};
      registerDestructor(obj2, () => {});

      try {
        unwrap(assertDestroyablesDestroyed)();
      } catch (error) {
        assert.step('catch handler');
        assert.deepEqual(
          (error as { destroyables: unknown[] }).destroyables,
          [obj1, obj2],
          'destroyables property'
        );
      }

      assert.verifySteps(['catch handler']);
    });

    test('attempting to call assertDestroyablesDestroyed() before calling enableDestroyableTracking() throws', (assert) => {
      assert.throws(() => {
        unwrap(assertDestroyablesDestroyed)();
      }, /Attempted to assert destroyables destroyed, but you did not start a destroyable test. Did you forget to call `enableDestroyableTracking\(\)`/u);
    });

    test('attempting to call enabledDestroyableTracking() twice before calling assertDestroyablesDestroyed throws', (assert) => {
      assert.throws(() => {
        unwrap(enableDestroyableTracking)();
        unwrap(enableDestroyableTracking)();
      }, /Attempted to start destroyable testing, but you did not end the previous destroyable test. Did you forget to call `assertDestroyablesDestroyed\(\)`/u);
    });
  }
});
