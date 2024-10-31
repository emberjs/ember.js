import type { InternalComponentManager } from '@glimmer/interfaces';
import { capabilityFlagsFrom, managerHasCapability } from '@glimmer/manager';
import { InternalComponentCapabilities } from '@glimmer/vm';

QUnit.module('Capabilities Bitmaps');

QUnit.test('encodes a capabilities object into a bitmap', (assert) => {
  assert.strictEqual(
    capabilityFlagsFrom({
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
    }),
    0b0000000000000,
    'empty capabilities'
  );

  assert.strictEqual(
    capabilityFlagsFrom({
      dynamicLayout: true,
      dynamicTag: true,
      prepareArgs: true,
      createArgs: true,
      attributeHook: true,
      elementHook: true,
      dynamicScope: true,
      createCaller: true,
      updateHook: true,
      createInstance: true,
      wrapped: true,
      willDestroy: true,
      hasSubOwner: true,
    }),
    0b1111111111111,
    'all capabilities'
  );

  assert.strictEqual(
    capabilityFlagsFrom({
      dynamicLayout: true,
      dynamicTag: false,
      prepareArgs: true,
      createArgs: false,
      attributeHook: false,
      elementHook: true,
      dynamicScope: false,
      createCaller: false,
      updateHook: true,
      createInstance: false,
      wrapped: true,
      willDestroy: false,
      hasSubOwner: false,
    }),
    0b0010100100101,
    'random sample'
  );
});

QUnit.test('allows querying bitmap for a capability', (assert) => {
  let capabilities = capabilityFlagsFrom({
    dynamicLayout: true,
    dynamicTag: false,
    prepareArgs: true,
    createArgs: false,
    attributeHook: false,
    elementHook: true,
    dynamicScope: true,
    createCaller: false,
    updateHook: true,
    createInstance: false,
    wrapped: true,
    willDestroy: false,
    hasSubOwner: false,
  });

  assert.true(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.dynamicLayout
    )
  );
  assert.false(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.dynamicTag
    )
  );
  assert.true(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.prepareArgs
    )
  );
  assert.false(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.createArgs
    )
  );
  assert.false(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.attributeHook
    )
  );
  assert.true(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.elementHook
    )
  );
  assert.true(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.dynamicScope
    )
  );
  assert.false(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.createCaller
    )
  );
  assert.true(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.updateHook
    )
  );
  assert.false(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.createInstance
    )
  );
  assert.false(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.willDestroy
    )
  );
  assert.false(
    managerHasCapability(
      {} as InternalComponentManager,
      capabilities,
      InternalComponentCapabilities.hasSubOwner
    )
  );
});
