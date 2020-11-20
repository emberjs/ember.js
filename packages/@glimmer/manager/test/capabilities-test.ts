import { InternalComponentCapability } from '@glimmer/interfaces';
import { capabilityFlagsFrom, managerHasCapability } from '..';

QUnit.module('Capabilities Bitmaps');

QUnit.test('encodes a capabilities object into a bitmap', (assert) => {
  assert.equal(
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
    }),
    0b000000000000,
    'empty capabilities'
  );

  assert.equal(
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
    }),
    0b111111111111,
    'all capabilities'
  );

  assert.equal(
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
    }),
    0b010100100101,
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
  });

  assert.strictEqual(
    true,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.DynamicLayout)
  );
  assert.strictEqual(
    false,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.DynamicTag)
  );
  assert.strictEqual(
    true,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.PrepareArgs)
  );
  assert.strictEqual(
    false,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.CreateArgs)
  );
  assert.strictEqual(
    false,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.AttributeHook)
  );
  assert.strictEqual(
    true,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.ElementHook)
  );
  assert.strictEqual(
    true,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.DynamicScope)
  );
  assert.strictEqual(
    false,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.CreateCaller)
  );
  assert.strictEqual(
    true,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.UpdateHook)
  );
  assert.strictEqual(
    false,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.CreateInstance)
  );
  assert.strictEqual(
    false,
    managerHasCapability({} as any, capabilities, InternalComponentCapability.WillDestroy)
  );
});
