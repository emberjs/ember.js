import CustomComponentManager from 'ember-glimmer/component-managers/custom';
import { moduleFor, TestCase } from 'ember-glimmer/tests/utils/test-case';

moduleFor('Custom Component Manager', class extends TestCase {
  ['@test throws an exception if custom component manager does not define `create` method'](assert) {
    assert.throws(() => {
      new CustomComponentManager({
        getSelf() {},
        update() {}
      });
    }, /You must implement `create` method./);
  }

  ['@test throws an exception if custom component manager does not define `getSelf` method'](assert) {
    assert.throws(() => {
      new CustomComponentManager({
        create() {},
        update() {}
      });
    }, /You must implement `getSelf` method./);
  }

  ['@test throws an exception if custom component manager does not define `update` method'](assert) {
    assert.throws(() => {
      new CustomComponentManager({
        create() {},
        getSelf() {}
      });
    }, /You must implement `update` method./);
  }

  ['@test proxies `didCreateElement` method if defined'](assert) {
    let didCreateElementCalled = false;
    let componentManager = new CustomComponentManager({
      create() {},
      getSelf() {},
      update() {},
      didCreateElement() {
        didCreateElementCalled = true;
      }
    });

    componentManager.didCreateElement();
    assert.ok(didCreateElementCalled, '`didCreateElement` was successfully called');
  }

  ['@test proxies `didCreate` method if defined'](assert) {
    let didCreateCalled = false;
    let componentManager = new CustomComponentManager({
      create() {},
      getSelf() {},
      update() {},
      didCreate() {
        didCreateCalled = true;
      }
    });

    componentManager.didCreate();
    assert.ok(didCreateCalled, '`didCreate` was successfully called');
  }

  ['@test proxies `didUpdate` method if defined'](assert) {
    let didUpdateCalled = false;
    let componentManager = new CustomComponentManager({
      create() {},
      getSelf() {},
      update() {},
      didUpdate() {
        didUpdateCalled = true;
      }
    });

    componentManager.didUpdate();
    assert.ok(didUpdateCalled, '`didUpdate` was successfully called');
  }

  ['@test proxies `getDestructor` method if defined'](assert) {
    let getDestructorCalled = false;
    let componentManager = new CustomComponentManager({
      create() {},
      getSelf() {},
      update() {},
      getDestructor() {
        getDestructorCalled = true;
      }
    });

    componentManager.getDestructor();
    assert.ok(getDestructorCalled, '`getDestructor` was successfully called');
  }
});
