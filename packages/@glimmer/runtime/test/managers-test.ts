import { DEBUG } from '@glimmer/env';
import {
  ComponentCapabilities,
  ComponentManager,
  Helper,
  HelperCapabilities,
  HelperManager,
  ModifierCapabilities,
  ModifierManager,
} from '@glimmer/interfaces';
import {
  getComponentManager,
  setComponentManager,
  getModifierManager,
  setModifierManager,
  getHelperManager,
  setHelperManager,
  buildCapabilities,
  BaseInternalComponentManager,
  BaseInternalModifierManager,
} from '..';
import { UNDEFINED_REFERENCE } from '@glimmer/reference';
import { createUpdatableTag } from '@glimmer/validator';

const { module, test } = QUnit;

module('Managers', () => {
  module('Component', () => {
    test('it works', (assert) => {
      class CustomManager implements ComponentManager<unknown> {
        capabilities = buildCapabilities({}) as ComponentCapabilities;

        constructor(public owner: object | undefined) {}

        createComponent() {}

        getContext() {}
      }

      let definition = setComponentManager((owner) => {
        return new CustomManager(owner);
      }, {});

      let owner1 = {};

      let instance1 = getComponentManager(owner1, definition) as CustomManager;

      assert.ok(instance1 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.equal(instance1.owner, owner1, 'owner is correct');

      let instance2 = getComponentManager(owner1, definition) as CustomManager;

      assert.ok(instance2 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.equal(instance1, instance2, 'same value returned for same owner');

      let owner2 = {};

      let instance3 = getComponentManager(owner2, definition);

      assert.ok(instance3 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.notEqual(instance1, instance3, 'different manager returned for different owner');

      let instance4 = getComponentManager(undefined, definition);

      assert.ok(instance4 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.notEqual(instance1, instance4, 'different manager returned for undefined owner');
    });

    test('it works with internal managers', (assert) => {
      class TestInternalComponentManager extends BaseInternalComponentManager<unknown, unknown> {
        constructor(public owner: object) {
          super();
        }

        create() {}

        getCapabilities() {
          return {
            dynamicLayout: false,
            dynamicTag: false,
            prepareArgs: false,
            createArgs: false,
            attributeHook: false,
            elementHook: false,
            dynamicScope: false,
            createCaller: false,
            updateHook: false,
            createInstance: false,
            wrapped: false,
            willDestroy: false,
          };
        }

        getDebugName() {
          return 'internal';
        }

        getDestroyable() {
          return null;
        }

        getSelf() {
          return UNDEFINED_REFERENCE;
        }
      }

      let definition = setComponentManager((owner) => {
        return new TestInternalComponentManager(owner);
      }, {});

      let instance1 = getComponentManager(undefined, definition) as TestInternalComponentManager;

      assert.ok(
        instance1 instanceof TestInternalComponentManager,
        'manager is an instance of the custom manager'
      );
      assert.equal(instance1.owner, undefined, 'owner is undefined');
    });

    test('throws if multiple component managers associated with the same definition', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setComponentManager(() => {
        return {} as any;
      }, {});

      assert.throws(() => {
        setComponentManager(() => {
          return {} as any;
        }, definition);
      }, /Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type/);
    });

    test('throws a useful error when missing capabilities on non-internal managers', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setComponentManager(() => {
        return {} as any;
      }, {});

      assert.throws(() => {
        getComponentManager(undefined, definition);
      }, /Custom component managers must have a `capabilities` property /);
    });

    test('throws a useful error when capabilities not made with buildCapabilities are used on non-internal managers', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setComponentManager(() => {
        return {
          capabilities: {},
        } as any;
      }, {});

      assert.throws(() => {
        getComponentManager(undefined, definition);
      }, /Custom component managers must have a `capabilities` property /);
    });

    test('throws an error if used with primitive values', (assert) => {
      assertPrimitiveUsage(assert, setComponentManager);
    });
  });

  module('Helper', () => {
    test('it works', (assert) => {
      class CustomManager implements HelperManager<unknown> {
        capabilities = buildCapabilities({}) as HelperCapabilities;

        constructor(public owner: object | undefined) {}

        createHelper() {}
      }

      let definition = setHelperManager((owner) => {
        return new CustomManager(owner);
      }, {});

      let owner1 = {};

      let instance1 = getHelperManager(owner1, definition) as CustomManager;

      assert.ok(instance1 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.equal(instance1.owner, owner1, 'owner is correct');

      let instance2 = getHelperManager(owner1, definition) as CustomManager;

      assert.ok(instance2 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.equal(instance1, instance2, 'same value returned for same owner');

      let owner2 = {};

      let instance3 = getHelperManager(owner2, definition);

      assert.ok(instance3 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.notEqual(instance1, instance3, 'different manager returned for different owner');

      let instance4 = getHelperManager(undefined, definition);

      assert.ok(instance4 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.notEqual(instance1, instance4, 'different manager returned for undefined owner');
    });

    test('it works with internal helpers', (assert) => {
      let helper = () => {
        return UNDEFINED_REFERENCE;
      };

      let definition = setHelperManager(() => helper, {});
      let instance1 = getHelperManager(undefined, definition) as Helper;

      assert.equal(instance1, helper, 'manager is an instance of the custom manager');
    });

    test('throws if multiple helper managers associated with the same definition', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setHelperManager(() => {
        return {} as any;
      }, {});

      assert.throws(() => {
        setHelperManager(() => {
          return {} as any;
        }, definition);
      }, /Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type/);
    });

    test('throws a useful error when missing capabilities on non-internal managers', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setHelperManager(() => {
        return {} as any;
      }, {});

      assert.throws(() => {
        getHelperManager(undefined, definition);
      }, /Custom helper managers must have a `capabilities` property /);
    });

    test('throws a useful error when capabilities not made with buildCapabilities are used on non-internal managers', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setHelperManager(() => {
        return {
          capabilities: {},
        } as any;
      }, {});

      assert.throws(() => {
        getHelperManager(undefined, definition);
      }, /Custom helper managers must have a `capabilities` property /);
    });

    test('throws an error if used with primitive values', (assert) => {
      assertPrimitiveUsage(assert, setHelperManager);
    });
  });

  module('Modifier', () => {
    test('it works', (assert) => {
      class CustomManager implements ModifierManager<unknown> {
        capabilities = buildCapabilities({}) as ModifierCapabilities;

        constructor(public owner: object | undefined) {}

        createModifier() {}
        installModifier() {}
        updateModifier() {}
        destroyModifier() {}
      }

      let definition = setModifierManager((owner) => {
        return new CustomManager(owner);
      }, {});

      let owner1 = {};

      let instance1 = getModifierManager(owner1, definition) as CustomManager;

      assert.ok(instance1 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.equal(instance1.owner, owner1, 'owner is correct');

      let instance2 = getModifierManager(owner1, definition) as CustomManager;

      assert.ok(instance2 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.equal(instance1, instance2, 'same value returned for same owner');

      let owner2 = {};

      let instance3 = getModifierManager(owner2, definition);

      assert.ok(instance3 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.notEqual(instance1, instance3, 'different manager returned for different owner');

      let instance4 = getModifierManager(undefined, definition);

      assert.ok(instance4 instanceof CustomManager, 'manager is an instance of the custom manager');
      assert.notEqual(instance1, instance4, 'different manager returned for undefined owner');
    });

    test('it works with internal managers', (assert) => {
      class TestInternalModifierManager extends BaseInternalModifierManager<unknown, unknown> {
        constructor(public owner: object | undefined) {
          super();
        }

        create() {}

        getDebugName() {
          return 'internal';
        }

        getDestroyable() {
          return null;
        }

        getTag() {
          return createUpdatableTag();
        }

        install() {}

        update() {}
      }

      let definition = setModifierManager((owner) => {
        return new TestInternalModifierManager(owner);
      }, {});

      let instance1 = getModifierManager(undefined, definition) as TestInternalModifierManager;

      assert.ok(
        instance1 instanceof TestInternalModifierManager,
        'manager is an instance of the custom manager'
      );
      assert.equal(instance1.owner, undefined, 'owner is undefined');
    });

    test('throws if multiple modifier managers associated with the same definition', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setModifierManager(() => {
        return {} as any;
      }, {});

      assert.throws(() => {
        setModifierManager(() => {
          return {} as any;
        }, definition);
      }, /Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type/);
    });

    test('throws a useful error when missing capabilities on non-internal managers', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setModifierManager(() => {
        return {} as any;
      }, {});

      assert.throws(() => {
        getModifierManager(undefined, definition);
      }, /Custom modifier managers must have a `capabilities` property /);
    });

    test('throws a useful error when capabilities not made with buildCapabilities are used on non-internal managers', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setModifierManager(() => {
        return {
          capabilities: {},
        } as any;
      }, {});

      assert.throws(() => {
        getModifierManager(undefined, definition);
      }, /Custom modifier managers must have a `capabilities` property /);
    });

    test('throws an error if used with primitive values', (assert) => {
      assertPrimitiveUsage(assert, setModifierManager);
    });
  });

  test('Can set different types of managers', (assert) => {
    let manager = {
      capabilities: buildCapabilities({}),
    } as any;
    let makeManager = () => manager;

    let definition = {};

    setComponentManager(makeManager, definition);
    setModifierManager(makeManager, definition);
    setHelperManager(makeManager, definition);

    assert.equal(manager, getComponentManager(undefined, definition), 'component manager works');
    assert.equal(manager, getModifierManager(undefined, definition), 'modifier manager works');
    assert.equal(manager, getHelperManager(undefined, definition), 'helper manager works');
  });
});

function assertPrimitiveUsage(assert: Assert, setManager: any) {
  if (!DEBUG) {
    assert.expect(0);
    return;
  }

  assert.throws(() => {
    setManager(() => ({} as any), null as any);
  }, /Attempted to set a manager on a non-object value/);

  assert.throws(() => {
    setManager(() => ({} as any), undefined as any);
  }, /Attempted to set a manager on a non-object value/);

  assert.throws(() => {
    setManager(() => ({} as any), true as any);
  }, /Attempted to set a manager on a non-object value/);

  assert.throws(() => {
    setManager(() => ({} as any), false as any);
  }, /Attempted to set a manager on a non-object value/);

  assert.throws(() => {
    setManager(() => ({} as any), 123 as any);
  }, /Attempted to set a manager on a non-object value/);

  assert.throws(() => {
    setManager(() => ({} as any), 'foo' as any);
  }, /Attempted to set a manager on a non-object value/);

  if (typeof Symbol === 'function') {
    assert.throws(() => {
      setManager(() => ({} as any), Symbol('foo') as any);
    }, /Attempted to set a manager on a non-object value/);
  }
}
