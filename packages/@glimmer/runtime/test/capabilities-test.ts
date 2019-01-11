import { capabilityFlagsFrom, hasCapability, Capability } from '..';

QUnit.module('Capabilities Bitmaps');

QUnit.test('encodes a capabilities object into a bitmap', assert => {
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
    }),
    0b0000000000,
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
    }),
    0b1111111111,
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
      createInstance: true,
    }),
    0b1100100101,
    'random sample'
  );
});

QUnit.test('allows querying bitmap for a capability', assert => {
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
  });

  let manager = null as any;

  assert.strictEqual(true, hasCapability(manager, capabilities, Capability.DynamicLayout));
  assert.strictEqual(false, hasCapability(manager, capabilities, Capability.DynamicTag));
  assert.strictEqual(true, hasCapability(manager, capabilities, Capability.PrepareArgs));
  assert.strictEqual(false, hasCapability(manager, capabilities, Capability.CreateArgs));
  assert.strictEqual(false, hasCapability(manager, capabilities, Capability.AttributeHook));
  assert.strictEqual(true, hasCapability(manager, capabilities, Capability.ElementHook));
  assert.strictEqual(true, hasCapability(manager, capabilities, Capability.DynamicScope));
  assert.strictEqual(false, hasCapability(manager, capabilities, Capability.CreateCaller));
  assert.strictEqual(true, hasCapability(manager, capabilities, Capability.UpdateHook));
  assert.strictEqual(false, hasCapability(manager, capabilities, Capability.CreateInstance));
});
