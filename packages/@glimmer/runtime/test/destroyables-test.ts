import {
  registerDestructor,
  unregisterDestructor,
  associateDestroyableChild,
  destroy,
  isDestroying,
  isDestroyed,
  _scheduleDestroy,
  _scheduleDestroyed,
  _destroyChildren,
  setScheduleDestroy,
  setScheduleDestroyed,
  enableDestroyableTracking,
  assertDestroyablesDestroyed,
} from '..';
import { DEBUG } from '@glimmer/env';

const { module, test } = QUnit;

let destroyQueue: (() => void)[] = [];
let destroyedQueue: (() => void)[] = [];

function flush() {
  destroyQueue.forEach(fn => fn());
  destroyedQueue.forEach(fn => fn());

  destroyQueue = [];
  destroyedQueue = [];
}

let originalScheduleDestroy = _scheduleDestroy;
let originalScheduleDestroyed = _scheduleDestroyed;

module('Destroyables', hooks => {
  hooks.before(() => {
    setScheduleDestroy((destroyable, destructor) => {
      destroyQueue.push(() => destructor(destroyable));
    });

    setScheduleDestroyed(fn => destroyedQueue.push(fn));
  });

  hooks.after(() => {
    setScheduleDestroy(originalScheduleDestroy);
    setScheduleDestroyed(originalScheduleDestroyed);
  });

  hooks.afterEach(assert => {
    assert.equal(destroyQueue.length, 0, 'destruction flushed');
  });

  test('standard destructors work', assert => {
    let destroyable = {};
    let count = 0;

    registerDestructor(destroyable, () => count++);

    assert.equal(isDestroying(destroyable), false, 'not destroying at first');
    assert.equal(isDestroyed(destroyable), false, 'not destroyed at first');

    destroy(destroyable);

    assert.equal(isDestroying(destroyable), true, 'destroying immediately after destroy() called');
    assert.equal(isDestroyed(destroyable), false, 'not destroyed immediately after destroy()');
    assert.equal(count, 0, 'count has not increased');

    flush();

    assert.equal(isDestroying(destroyable), true, 'still destroying after flush');
    assert.equal(isDestroyed(destroyable), true, 'destroyed after flush');
    assert.equal(count, 1, 'destructor was run');
  });

  test('destructors work with functions', assert => {
    let destroyable = () => {};
    let count = 0;

    registerDestructor(destroyable, () => count++);

    assert.equal(isDestroying(destroyable), false, 'not destroying at first');
    assert.equal(isDestroyed(destroyable), false, 'not destroyed at first');

    destroy(destroyable);

    assert.equal(isDestroying(destroyable), true, 'destroying immediately after destroy() called');
    assert.equal(isDestroyed(destroyable), false, 'not destroyed immediately after destroy()');
    assert.equal(count, 0, 'count has not increased');

    flush();

    assert.equal(isDestroying(destroyable), true, 'still destroying after flush');
    assert.equal(isDestroyed(destroyable), true, 'destroyed after flush');
    assert.equal(count, 1, 'destructor was run');
  });

  test('can register multiple destructors', assert => {
    let destroyable = {};
    let count = 0;

    registerDestructor(destroyable, () => count++);
    registerDestructor(destroyable, () => count++);

    assert.equal(isDestroying(destroyable), false, 'not destroying at first');
    assert.equal(isDestroyed(destroyable), false, 'not destroyed at first');

    destroy(destroyable);

    assert.equal(isDestroying(destroyable), true, 'destroying immediately after destroy() called');
    assert.equal(isDestroyed(destroyable), false, 'not destroyed immediately after destroy()');
    assert.equal(count, 0, 'count has not increased');

    flush();

    assert.equal(isDestroying(destroyable), true, 'still destroying after flush');
    assert.equal(isDestroyed(destroyable), true, 'destroyed after flush');
    assert.equal(count, 2, 'both destructors were run');
  });

  test('destruction only happens once', assert => {
    let destroyable = {};
    let count = 0;

    registerDestructor(destroyable, () => count++);

    destroy(destroyable);
    flush();

    assert.equal(isDestroying(destroyable), true, 'destroying after flush');
    assert.equal(isDestroyed(destroyable), true, 'destroyed after flush');
    assert.equal(count, 1, 'destructor was run');

    destroy(destroyable);
    flush();

    assert.equal(isDestroying(destroyable), true, 'destroying after second flush');
    assert.equal(isDestroyed(destroyable), true, 'destroyed after second flush');
    assert.equal(count, 1, 'destructor was not run again');
  });

  test('eager destructors work', assert => {
    let destroyable = {};
    let count = 0;

    registerDestructor(destroyable, () => count++, true);

    destroy(destroyable);

    assert.equal(isDestroying(destroyable), true, 'destroying immediately after destroy() called');
    assert.equal(isDestroyed(destroyable), false, 'not destroyed immediately after destroy()');
    assert.equal(count, 1, 'count has increased, eager destructor run');

    flush();

    assert.equal(isDestroying(destroyable), true, 'destroying after flush');
    assert.equal(isDestroyed(destroyable), true, 'destroyed after flush');
    assert.equal(count, 1, 'destructor was not run again');
  });

  test('can unregister a destructor', assert => {
    let destroyable = {};
    let count = 0;

    let destructor = registerDestructor(destroyable, () => count++);
    unregisterDestructor(destroyable, destructor);

    destroy(destroyable);
    flush();

    assert.equal(count, 0, 'destructor was not called');
  });

  test('can associate destroyable children', assert => {
    let parent = {};
    let child = {};

    associateDestroyableChild(parent, child);
    registerDestructor(parent, () => assert.step('parent'));
    registerDestructor(child, () => assert.step('child'));

    assert.equal(isDestroying(parent), false, 'parent not destroying at first');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed at first');

    assert.equal(isDestroying(child), false, 'child not destroying at first');
    assert.equal(isDestroyed(child), false, 'child not destroyed at first');

    destroy(parent);

    assert.equal(
      isDestroying(parent),
      true,
      'parent destroying immediately after destroy() called'
    );
    assert.equal(isDestroyed(parent), false, 'parent not destroyed immediately after destroy()');

    assert.equal(isDestroying(child), true, 'child destroying immediately after destroy() called');
    assert.equal(isDestroyed(child), false, 'child not destroyed immediately after destroy()');

    assert.verifySteps([], 'nothing destroyed yet');

    flush();

    assert.equal(isDestroying(parent), true, 'parent still destroying after flush');
    assert.equal(isDestroyed(parent), true, 'parent destroyed after flush');

    assert.equal(isDestroying(child), true, 'child still destroying after flush');
    assert.equal(isDestroyed(child), true, 'child destroyed after flush');

    assert.verifySteps(['child', 'parent'], 'destructors run in correct order');
  });

  test('destroying child before a parent works', assert => {
    let parent = {};
    let child = {};

    associateDestroyableChild(parent, child);
    registerDestructor(parent, () => assert.step('parent'));
    registerDestructor(child, () => assert.step('child'));

    assert.equal(isDestroying(parent), false, 'parent not destroying at first');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed at first');

    assert.equal(isDestroying(child), false, 'child not destroying at first');
    assert.equal(isDestroyed(child), false, 'child not destroyed at first');

    destroy(child);

    assert.equal(isDestroying(parent), false, 'parent not immediately after child destroy()');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed after child destroy()');

    assert.equal(isDestroying(child), true, 'child destroying immediately after destroy()');
    assert.equal(
      isDestroyed(child),
      false,
      'child not destroyed immediately after destroy() called'
    );

    assert.verifySteps([], 'nothing destroyed yet');
    flush();

    assert.equal(isDestroying(parent), false, 'parent still not destroying after flush');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed after flush');

    assert.equal(isDestroying(child), true, 'child still destroying after flush');
    assert.equal(isDestroyed(child), true, 'child destroyed after flush');

    assert.verifySteps(['child'], 'child destructor run');
    destroy(parent);

    assert.equal(isDestroying(parent), true, 'parent destroying after destroy()');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed before flush');

    flush();

    assert.equal(isDestroying(parent), true, 'parent still destroying after flush');
    assert.equal(isDestroyed(parent), true, 'parent destroyed after flush');

    assert.verifySteps(['parent'], 'parent destructor run');
  });

  test('children can have multiple parents, but only destroy once', assert => {
    let parent1 = {};
    let parent2 = {};
    let child = {};

    associateDestroyableChild(parent1, child);
    associateDestroyableChild(parent2, child);

    registerDestructor(parent1, () => assert.step('parent1'));
    registerDestructor(parent2, () => assert.step('parent2'));
    registerDestructor(child, () => assert.step('child'));

    destroy(parent1);
    flush();

    assert.equal(isDestroying(parent1), true, 'parent1 destroying');
    assert.equal(isDestroyed(parent1), true, 'parent1 destroyed');

    assert.equal(isDestroying(parent2), false, 'parent2 not destroying');
    assert.equal(isDestroyed(parent2), false, 'parent2 not destroyed');

    assert.equal(isDestroying(child), true, 'child destroying');
    assert.equal(isDestroyed(child), true, 'child destroyed');

    assert.verifySteps(['child', 'parent1'], 'first parent and child destroyed');

    destroy(parent2);
    flush();

    assert.equal(isDestroying(parent1), true, 'parent1 destroying');
    assert.equal(isDestroyed(parent1), true, 'parent1 destroyed');

    assert.equal(isDestroying(parent2), true, 'parent2 destroying');
    assert.equal(isDestroyed(parent2), true, 'parent2 destroyed');

    assert.equal(isDestroying(child), true, 'child destroying');
    assert.equal(isDestroyed(child), true, 'child destroyed');

    assert.verifySteps(['parent2'], 'second parent destroyed');
  });

  test('can destroy children with the destroyChildren API', assert => {
    let parent = {};
    let child = {};

    associateDestroyableChild(parent, child);
    registerDestructor(parent, () => assert.step('parent'));
    registerDestructor(child, () => assert.step('child'));

    assert.equal(isDestroying(parent), false, 'parent not destroying at first');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed at first');

    assert.equal(isDestroying(child), false, 'child not destroying at first');
    assert.equal(isDestroyed(child), false, 'child not destroyed at first');

    _destroyChildren(parent);

    assert.equal(isDestroying(parent), false, 'parent not immediately after child destroy()');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed after child destroy()');

    assert.equal(isDestroying(child), true, 'child destroying immediately after destroy()');
    assert.equal(
      isDestroyed(child),
      false,
      'child not destroyed immediately after destroy() called'
    );

    assert.verifySteps([], 'nothing destroyed yet');

    flush();

    assert.equal(isDestroying(parent), false, 'parent still not destroying after flush');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed after flush');

    assert.equal(isDestroying(child), true, 'child still destroying after flush');
    assert.equal(isDestroyed(child), true, 'child destroyed after flush');

    assert.verifySteps(['child'], 'child destructor called');

    destroy(parent);

    assert.equal(isDestroying(parent), true, 'parent destroying after destroy()');
    assert.equal(isDestroyed(parent), false, 'parent not destroyed before flush');

    flush();

    assert.equal(isDestroying(parent), true, 'parent still destroying after flush');
    assert.equal(isDestroyed(parent), true, 'parent destroyed after flush');

    assert.verifySteps(['parent'], 'parent destructor called');
  });

  test('destroyables are destroying during destruction but not destroyed', assert => {
    assert.expect(9);

    let parent = {};
    let child = {};

    associateDestroyableChild(parent, child);

    registerDestructor(parent, () => {
      assert.ok(isDestroying(parent), 'parent is destroying');
      assert.ok(isDestroying(child), 'child is destroying');

      assert.notOk(isDestroyed(parent), 'parent is not destroyed');
      assert.notOk(isDestroyed(child), 'child is not destroyed');
    });

    registerDestructor(child, () => {
      assert.ok(isDestroying(parent), 'parent is destroying');
      assert.ok(isDestroying(child), 'child is destroying');

      assert.notOk(isDestroyed(parent), 'parent is not destroyed');
      assert.notOk(isDestroyed(child), 'child is not destroyed');
    });

    destroy(parent);
    flush();
  });

  test('destroyables are passed the correct object when destroying', assert => {
    assert.expect(3);

    let parent = {};
    let child = {};

    associateDestroyableChild(parent, child);
    registerDestructor(parent, _parent =>
      assert.equal(parent, _parent, 'passed the correct value')
    );
    registerDestructor(child, _child => assert.equal(child, _child, 'passed the correct value'));

    destroy(parent);
    flush();
  });

  if (DEBUG) {
    test('attempting to unregister a destructor that was not registered throws an error', assert => {
      assert.throws(() => {
        unregisterDestructor({}, () => 123);
      }, /attempted to remove a destructor that was not registered with the destroyable/);
    });

    test('attempting to register a destructor on an object that isDestroying throws an error', assert => {
      assert.throws(() => {
        let destroyable = {};
        destroy(destroyable);
        registerDestructor(destroyable, () => 123);
      }, /Attempted to register a destructor with an object that is already destroying or destroyed/);
    });

    test('attempting to unregister a destructor on an object that isDestroying throws an error', assert => {
      assert.throws(() => {
        let destroyable = {};
        destroy(destroyable);
        unregisterDestructor(destroyable, () => 123);
      }, /Attempted to unregister a destructor with an object that is already destroying or destroyed/);
    });

    test('can track destroyables during tests and assert if they were not destroyed', assert => {
      assert.throws(() => {
        enableDestroyableTracking!();

        registerDestructor({}, () => {});

        assertDestroyablesDestroyed!();
      }, /Some destroyables were not destroyed during this test:/);
    });

    test('assertion does not throw if destroyables were destroyed', assert => {
      assert.expect(1);
      enableDestroyableTracking!();

      let obj = {};
      registerDestructor(obj, () => {});
      destroy(obj);
      flush();

      assertDestroyablesDestroyed!();
    });

    test('checking isDestroying does not trigger assertion', assert => {
      assert.expect(1);
      enableDestroyableTracking!();

      let obj = {};

      isDestroying(obj);

      assertDestroyablesDestroyed!();
    });

    test('checking isDestroyed does not trigger assertion', assert => {
      assert.expect(1);
      enableDestroyableTracking!();

      let obj = {};

      isDestroyed(obj);

      assertDestroyablesDestroyed!();
    });

    test('attempting to call assertDestroyablesDestroyed() before calling enableDestroyableTracking() throws', assert => {
      assert.throws(() => {
        assertDestroyablesDestroyed!();
      }, /Attempted to assert destroyables destroyed, but you did not start a destroyable test. Did you forget to call `enableDestroyableTracking\(\)`/);
    });

    test('attempting to call enabledDestroyableTracking() twice before calling assertDestroyablesDestroyed throws', assert => {
      assert.throws(() => {
        enableDestroyableTracking!();
        enableDestroyableTracking!();
      }, /Attempted to start destroyable testing, but you did not end the previous destroyable test. Did you forget to call `assertDestroyablesDestroyed\(\)`/);
    });
  }
});
