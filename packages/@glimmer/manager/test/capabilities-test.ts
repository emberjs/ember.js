import { InternalComponentCapability } from '@glimmer/interfaces';
import { capabilityFlagsFrom, managerHasCapability } from '@glimmer/manager';

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
    managerHasCapability({} as any, capabilities, InternalComponentCapability.DynamicLayout)
  );
  assert.false(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.DynamicTag)
  );
  assert.true(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.PrepareArgs)
  );
  assert.false(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.CreateArgs)
  );
  assert.false(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.AttributeHook)
  );
  assert.true(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.ElementHook)
  );
  assert.true(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.DynamicScope)
  );
  assert.false(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.CreateCaller)
  );
  assert.true(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.UpdateHook)
  );
  assert.false(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.CreateInstance)
  );
  assert.false(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.WillDestroy)
  );
  assert.false(
    managerHasCapability({} as any, capabilities, InternalComponentCapability.HasSubOwner)
  );
});
