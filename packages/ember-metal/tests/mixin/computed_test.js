import {
  get,
  set,
  Mixin,
  computed,
  defineProperty
} from '../..';

function K() { return this; }

QUnit.module('Mixin Computed Properties');

QUnit.test('overriding computed properties', function() {
  let MixinA, MixinB, MixinC, MixinD;
  let obj;

  MixinA = Mixin.create({
    aProp: computed(function() {
      return 'A';
    })
  });

  MixinB = Mixin.create(MixinA, {
    aProp: computed(function() {
      return this._super(...arguments) + 'B';
    })
  });

  MixinC = Mixin.create(MixinA, {
    aProp: computed(function() {
      return this._super(...arguments) + 'C';
    })
  });

  MixinD = Mixin.create({
    aProp: computed(function() {
      return this._super(...arguments) + 'D';
    })
  });

  obj = {};
  MixinB.apply(obj);
  equal(get(obj, 'aProp'), 'AB', 'should expose super for B');

  obj = {};
  MixinC.apply(obj);
  equal(get(obj, 'aProp'), 'AC', 'should expose super for C');

  obj = {};

  MixinA.apply(obj);
  MixinD.apply(obj);
  equal(get(obj, 'aProp'), 'AD', 'should define super for D');

  obj = { };
  defineProperty(obj, 'aProp', computed(function(key) {
    return 'obj';
  }));
  MixinD.apply(obj);
  equal(get(obj, 'aProp'), 'objD', 'should preserve original computed property');
});

QUnit.test('calling set on overridden computed properties', function() {
  let SuperMixin, SubMixin;
  let obj;

  let superGetOccurred = false;
  let superSetOccurred = false;

  SuperMixin = Mixin.create({
    aProp: computed({
      get(key) { superGetOccurred = true; },
      set(key, value) { superSetOccurred = true; }
    })
  });

  SubMixin = Mixin.create(SuperMixin, {
    aProp: computed({
      get(key) { return this._super(...arguments); },
      set(key, value) { return this._super(...arguments); }
    })
  });

  obj = {};
  SubMixin.apply(obj);

  set(obj, 'aProp', 'set thyself');
  ok(superSetOccurred, 'should pass set to _super');

  superSetOccurred = false; // reset the set assertion

  obj = {};
  SubMixin.apply(obj);

  get(obj, 'aProp');
  ok(superGetOccurred, 'should pass get to _super');

  set(obj, 'aProp', 'set thyself');
  ok(superSetOccurred, 'should pass set to _super after getting');
});

QUnit.test('setter behavior works properly when overriding computed properties', function() {
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
      set(k, v) { cpWasCalled = true; }
    }),

    cpWithSetter3: computed({
      get: K,
      set(k, v) { cpWasCalled = true; }
    }),

    cpWithoutSetter: computed(function(k) {
      cpWasCalled = true;
    })
  });

  MixinA.apply(obj);
  MixinB.apply(obj);

  set(obj, 'cpWithSetter2', 'test');
  ok(cpWasCalled, 'The computed property setter was called when defined with two args');
  cpWasCalled = false;

  set(obj, 'cpWithSetter3', 'test');
  ok(cpWasCalled, 'The computed property setter was called when defined with three args');
  cpWasCalled = false;

  set(obj, 'cpWithoutSetter', 'test');
  equal(get(obj, 'cpWithoutSetter'), 'test', 'The default setter was called, the value is correct');
  ok(!cpWasCalled, 'The default setter was called, not the CP itself');
});

QUnit.test('calling _super when there is no computed on parent class is deprecated', function() {
  expectDeprecation('Calling `_super` when there is no computed `foo` on the parent class is deprecated.');

  let SuperMixin = Mixin.create({});

  let SubMixin = Mixin.create(SuperMixin, {
    foo: computed({
      get(key) { return this._super(...arguments); }
    })
  });

  SubMixin.get('foo');
});
