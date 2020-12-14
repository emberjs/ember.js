import { DEBUG } from '@glimmer/env';
import {
  ComponentManager,
  HelperManager,
  InternalComponentManager,
  InternalHelperManager,
  ModifierManager,
} from '@glimmer/interfaces';
import { UNDEFINED_REFERENCE } from '@glimmer/reference';
import { createUpdatableTag } from '@glimmer/validator';

import {
  setInternalComponentManager,
  getInternalComponentManager,
  setInternalModifierManager,
  getInternalModifierManager,
  setInternalHelperManager,
  getInternalHelperManager,
  setComponentManager,
  setModifierManager,
  setHelperManager,
  componentCapabilities,
  modifierCapabilities,
  helperCapabilities,
  CustomComponentManager,
  CustomModifierManager,
  CustomHelperManager,
} from '..';

const { module, test } = QUnit;

module('Managers', () => {
  module('Component', () => {
    test('it works', (assert) => {
      class CustomManager implements ComponentManager<unknown> {
        capabilities = componentCapabilities('3.13');

        constructor(public owner: object | undefined) {}

        createComponent() {}

        getContext() {}
      }

      let factory = (owner: object) => new CustomManager(owner);
      let definition = setComponentManager(factory, {});

      let instance = getInternalComponentManager(definition) as CustomComponentManager<
        object,
        unknown
      >;

      assert.ok(instance instanceof CustomComponentManager, 'internal manager is a custom manager');
      assert.equal(instance['factory'], factory, 'delegate is an instance of the custom manager');
    });

    test('it works with internal managers', (assert) => {
      class TestInternalComponentManager implements InternalComponentManager {
        constructor() {}

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
            hasSubOwner: false,
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

      let definition = setInternalComponentManager(new TestInternalComponentManager(), {});

      let instance1 = getInternalComponentManager(definition) as TestInternalComponentManager;

      assert.ok(
        instance1 instanceof TestInternalComponentManager,
        'manager is an instance of the custom manager'
      );
    });

    test('throws if multiple component managers associated with the same definition', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setInternalComponentManager({} as any, {});

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

      let manager = getInternalComponentManager(definition) as CustomComponentManager<
        object,
        unknown
      >;

      assert.throws(() => {
        manager.create({}, {}, {} as any);
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

      let manager = getInternalComponentManager(definition) as CustomComponentManager<
        object,
        unknown
      >;

      assert.throws(() => {
        manager.create({}, {}, {} as any);
      }, /Custom component managers must have a `capabilities` property /);
    });

    test('throws an error if used with primitive values', (assert) => {
      assertPrimitiveUsage(assert, setInternalComponentManager);
    });
  });

  module('Helper', () => {
    test('it works', (assert) => {
      class CustomManager implements HelperManager<unknown> {
        capabilities = helperCapabilities('3.23', {
          hasValue: true,
        });

        constructor(public owner: object | undefined) {}

        createHelper() {}
      }

      let factory = (owner?: object) => new CustomManager(owner);
      let definition = setHelperManager(factory, {});

      let instance = getInternalHelperManager(definition) as CustomHelperManager<object>;

      assert.ok(typeof instance === 'object', 'manager is an internal manager');
      assert.ok(typeof instance.helper === 'function', 'manager has a helper function');
      assert.equal(instance['factory'], factory, 'manager has correct delegate factory');
    });

    test('it works with internal helpers', (assert) => {
      let helper = () => {
        return UNDEFINED_REFERENCE;
      };

      let definition = setInternalHelperManager(helper, {});
      let instance1 = getInternalHelperManager(definition)!;

      assert.equal(instance1, helper, 'manager is the internal helper');
    });

    test('throws if multiple helper managers associated with the same definition', (assert) => {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let definition = setInternalHelperManager(() => {
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

      let manager = getInternalHelperManager(definition) as InternalHelperManager<object>;

      assert.throws(() => {
        manager.getDelegateFor({});
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

      let manager = getInternalHelperManager(definition) as InternalHelperManager<object>;

      assert.throws(() => {
        manager.getDelegateFor({});
      }, /Custom helper managers must have a `capabilities` property /);
    });

    test('throws an error if used with primitive values', (assert) => {
      assertPrimitiveUsage(assert, setInternalHelperManager);
    });
  });

  module('Modifier', () => {
    test('it works', (assert) => {
      class CustomManager implements ModifierManager<unknown> {
        capabilities = modifierCapabilities('3.22');

        constructor(public owner: object | undefined) {}

        createModifier() {}
        installModifier() {}
        updateModifier() {}
        destroyModifier() {}
      }

      let factory = (owner: object) => new CustomManager(owner);
      let definition = setModifierManager(factory, {});

      let instance = getInternalModifierManager(definition) as CustomModifierManager<
        object,
        unknown
      >;

      assert.ok(instance instanceof CustomModifierManager, 'internal manager is a custom manager');
      assert.equal(instance['factory'], factory, 'internal manager has custom manager factory');
    });

    test('it works with internal managers', (assert) => {
      class TestInternalModifierManager {
        constructor() {}

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

      let definition = setInternalModifierManager(new TestInternalModifierManager(), {});

      let instance1 = getInternalModifierManager(definition) as TestInternalModifierManager;

      assert.ok(
        instance1 instanceof TestInternalModifierManager,
        'manager is an instance of the custom manager'
      );
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

      let manager = getInternalModifierManager(definition);

      assert.throws(() => {
        manager.create({}, {} as any, {}, {} as any, {} as any, {} as any);
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

      let manager = getInternalModifierManager(definition);

      assert.throws(() => {
        manager.create({}, {} as any, {}, {} as any, {} as any, {} as any);
      }, /Custom modifier managers must have a `capabilities` property /);
    });

    test('throws an error if used with primitive values', (assert) => {
      assertPrimitiveUsage(assert, setModifierManager);
    });
  });

  test('Can set different types of managers', (assert) => {
    let manager = {} as any;
    let definition = {};

    setInternalComponentManager(manager, definition);
    setInternalModifierManager(manager, definition);
    setInternalHelperManager(manager, definition);

    assert.equal(manager, getInternalComponentManager(definition), 'component manager works');
    assert.equal(manager, getInternalModifierManager(definition), 'modifier manager works');
    assert.equal(manager, getInternalHelperManager(definition), 'helper manager works');
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
