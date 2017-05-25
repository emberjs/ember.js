import { Mixin, get, set, mixin } from './support';
import { computed } from '@glimmer/object';

function K(this: any) { return this; }

QUnit.module('Mixin.create - Computed Properties');

QUnit.test('overriding computed properties', assert => {
  let MixinA, MixinB, MixinC, MixinD;
  let obj;

  MixinA = Mixin.create({
    aProp: computed(function() {
      return 'A';
    })
  });

  MixinB = Mixin.create({
    aProp: computed(function(this: any) {
      return this._super.apply(this, arguments) + 'B';
    })
  });

  MixinC = Mixin.create({
    aProp: computed(function(this: any) {
      return this._super.apply(this, arguments) + 'C';
    })
  });

  MixinD = Mixin.create({
    aProp: computed(function(this: any) {
      return this._super.apply(this, arguments) + 'D';
    })
  });

  obj = {};
  MixinA.apply(obj);
  MixinB.apply(obj);
  assert.equal(get(obj, 'aProp'), 'AB', 'should expose super for B');

  obj = {};
  MixinA.apply(obj);
  MixinC.apply(obj);
  assert.equal(get(obj, 'aProp'), 'AC', 'should expose super for C');

  obj = {};

  MixinA.apply(obj);
  MixinD.apply(obj);
  assert.equal(get(obj, 'aProp'), 'AD', 'should define super for D');

  obj = { };
  mixin(obj, {
    aProp: computed(function() {
      return 'obj';
    })
  });

  MixinD.apply(obj);
  assert.equal(get(obj, 'aProp'), 'objD', 'should preserve original computed property');
});

QUnit.test('calling set on overridden computed properties', assert => {
  let SuperMixin, SubMixin;
  let obj;

  let superGetOccurred = false;
  let superSetOccurred = false;

  SuperMixin = Mixin.create({
    aProp: computed({
      get: function() { superGetOccurred = true; },
      set: function() { superSetOccurred = true; }
    })
  });

  SubMixin = Mixin.create(SuperMixin, {
    aProp: computed({
      get: function() { return this._super.apply(this, arguments); },
      set: function() { return this._super.apply(this, arguments); }
    })
  });

  obj = {};
  SubMixin.apply(obj);

  set(obj, 'aProp', 'set thyself');
  assert.ok(superSetOccurred, 'should pass set to _super');

  superSetOccurred = false; // reset the set assertion

  obj = {};
  SubMixin.apply(obj);

  get(obj, 'aProp');
  assert.ok(superGetOccurred, 'should pass get to _super');

  set(obj, 'aProp', 'set thyself');
  assert.ok(superSetOccurred, 'should pass set to _super after getting');
});

QUnit.test('setter behavior works properly when overriding computed properties', assert => {
  let obj = {};

  let MixinA = Mixin.create({
    cpWithSetter2: computed(K),
    cpWithSetter3: computed(K),
    cpWithoutSetter: computed(K)
  });

  let cpWasCalled = false;

  let MixinB = Mixin.create({
    cpWithSetter2: computed({
      get: K,
      set: function() { cpWasCalled = true; }
    }),

    cpWithSetter3: computed({
      get: K,
      set: function() { cpWasCalled = true; }
    }),

    cpWithoutSetter: computed(function() {
      cpWasCalled = true;
    })
  });

  MixinA.apply(obj);
  MixinB.apply(obj);

  set(obj, 'cpWithSetter2', 'test');
  assert.ok(cpWasCalled, 'The computed property setter was called when defined with two args');
  cpWasCalled = false;

  set(obj, 'cpWithSetter3', 'test');
  assert.ok(cpWasCalled, 'The computed property setter was called when defined with three args');
  cpWasCalled = false;

  set(obj, 'cpWithoutSetter', 'test');
  assert.equal(get(obj, 'cpWithoutSetter'), 'test', 'The default setter was called, the value is correct');
  assert.ok(!cpWasCalled, 'The default setter was called, not the CP itself');
});
