import { DEBUG } from '@glimmer/env';
import {
  ComponentManager,
  HelperManager,
  InternalComponentManager,
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

      let definition = setComponentManager((owner) => {
        return new CustomManager(owner);
      }, {});

      let owner1 = {};

      let instance1 = getInternalComponentManager(owner1, definition) as CustomComponentManager<
        unknown
      >;

      assert.ok(
        instance1 instanceof CustomComponentManager,
        'internal manager is a custom manager'
      );
      assert.ok(
        instance1['delegate'] instanceof CustomManager,
        'delegate is an instance of the custom manager'
      );
      assert.equal((instance1['delegate'] as CustomManager).owner, owner1, 'owner is correct');

      let instance2 = getInternalComponentManager(owner1, definition);

      assert.ok(
        instance2 instanceof CustomComponentManager,
        'manager is an instance of the custom manager'
      );
      assert.equal(instance1, instance2, 'same value returned for same owner');

      let owner2 = {};

      let instance3 = getInternalComponentManager(owner2, definition);

      assert.ok(
        instance3 instanceof CustomComponentManager,
        'manager is an instance of the custom manager'
      );
      assert.notEqual(instance1, instance3, 'different manager returned for different owner');

      let instance4 = getInternalComponentManager(undefined, definition);

      assert.ok(
        instance4 instanceof CustomComponentManager,
        'manager is an instance of the custom manager'
      );
      assert.notEqual(instance1, instance4, 'different manager returned for undefined owner');
    });

    test('it works with internal managers', (assert) => {
      class TestInternalComponentManager implements InternalComponentManager {
        constructor(public owner: object) {}

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

      let definition = setInternalComponentManager((owner) => {
        return new TestInternalComponentManager(owner);
      }, {});

      let instance1 = getInternalComponentManager(
        undefined,
        definition
      ) as TestInternalComponentManager;

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

      let definition = setInternalComponentManager(() => {
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
        getInternalComponentManager(undefined, definition);
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
        getInternalComponentManager(undefined, definition);
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

      let definition = setHelperManager((owner) => {
        return new CustomManager(owner);
      }, {});

      let owner1 = {};

      let instance1 = getInternalHelperManager(owner1, definition)!;

      assert.ok(
        instance1.manager instanceof CustomManager,
        'manager is an instance of the custom manager'
      );
      assert.equal((instance1.manager as CustomManager).owner, owner1, 'owner is correct');

      let instance2 = getInternalHelperManager(owner1, definition)!;

      assert.ok(
        instance2.manager instanceof CustomManager,
        'manager is an instance of the custom manager'
      );
      assert.equal(instance1, instance2, 'same value returned for same owner');

      let owner2 = {};

      let instance3 = getInternalHelperManager(owner2, definition)!;

      assert.ok(
        instance3.manager instanceof CustomManager,
        'manager is an instance of the custom manager'
      );
      assert.notEqual(instance1, instance3, 'different manager returned for different owner');

      let instance4 = getInternalHelperManager(undefined, definition)!;

      assert.ok(
        instance4.manager instanceof CustomManager,
        'manager is an instance of the custom manager'
      );
      assert.notEqual(instance1, instance4, 'different manager returned for undefined owner');
    });

    test('it works with internal helpers', (assert) => {
      let helper = () => {
        return UNDEFINED_REFERENCE;
      };

      let definition = setInternalHelperManager(() => ({ helper, manager: null }), {});
      let instance1 = getInternalHelperManager(undefined, definition)!;

      assert.equal(instance1.helper, helper, 'manager is an instance of the custom manager');
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

      assert.throws(() => {
        getInternalHelperManager(undefined, definition);
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
        getInternalHelperManager(undefined, definition);
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

      let definition = setModifierManager((owner) => {
        return new CustomManager(owner);
      }, {});

      let owner1 = {};

      let instance1 = getInternalModifierManager(owner1, definition) as CustomModifierManager<
        unknown
      >;

      assert.ok(instance1 instanceof CustomModifierManager, 'internal manager is a custom manager');
      assert.ok(
        instance1['delegate'] instanceof CustomManager,
        'delegate is an instance of the custom manager'
      );
      assert.equal((instance1['delegate'] as CustomManager).owner, owner1, 'owner is correct');

      let instance2 = getInternalModifierManager(owner1, definition)!;

      assert.ok(
        instance2 instanceof CustomModifierManager,
        'manager is an instance of the custom manager'
      );
      assert.equal(instance1, instance2, 'same value returned for same owner');

      let owner2 = {};

      let instance3 = getInternalModifierManager(owner2, definition);

      assert.ok(
        instance3 instanceof CustomModifierManager,
        'manager is an instance of the custom manager'
      );
      assert.notEqual(instance1, instance3, 'different manager returned for different owner');

      let instance4 = getInternalModifierManager(undefined, definition);

      assert.ok(
        instance4 instanceof CustomModifierManager,
        'manager is an instance of the custom manager'
      );
      assert.notEqual(instance1, instance4, 'different manager returned for undefined owner');
    });

    test('it works with internal managers', (assert) => {
      class TestInternalModifierManager {
        constructor(public owner: object | undefined) {}

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

      let definition = setInternalModifierManager((owner) => {
        return new TestInternalModifierManager(owner);
      }, {});

      let instance1 = getInternalModifierManager(
        undefined,
        definition
      ) as TestInternalModifierManager;

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
        getInternalModifierManager(undefined, definition);
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
        getInternalModifierManager(undefined, definition);
      }, /Custom modifier managers must have a `capabilities` property /);
    });

    test('throws an error if used with primitive values', (assert) => {
      assertPrimitiveUsage(assert, setModifierManager);
    });
  });

  test('Can set different types of managers', (assert) => {
    let manager = {} as any;
    let definition = {};

    setInternalComponentManager(() => manager, definition);
    setInternalModifierManager(() => manager, definition);
    setInternalHelperManager(() => manager, definition);

    assert.equal(
      manager,
      getInternalComponentManager(undefined, definition),
      'component manager works'
    );
    assert.equal(
      manager,
      getInternalModifierManager(undefined, definition),
      'modifier manager works'
    );
    assert.equal(manager, getInternalHelperManager(undefined, definition), 'helper manager works');
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
