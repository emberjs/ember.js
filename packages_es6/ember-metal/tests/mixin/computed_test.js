var get = Ember.get,
    set = Ember.set;

module('Ember.Mixin Computed Properties');

test('overriding computed properties', function() {
  var MixinA, MixinB, MixinC, MixinD;
  var obj;

  MixinA = Ember.Mixin.create({
    aProp: Ember.computed(function() {
      return 'A';
    })
  });

  MixinB = Ember.Mixin.create(MixinA, {
    aProp: Ember.computed(function() {
      return this._super()+'B';
    })
  });

  MixinC = Ember.Mixin.create(MixinA, {
    aProp: Ember.computed(function() {
      return this._super()+'C';
    })
  });

  MixinD = Ember.Mixin.create({
    aProp: Ember.computed(function() {
      return this._super()+'D';
    })
  });

  obj = {};
  MixinB.apply(obj);
  equal(get(obj, 'aProp'), 'AB', "should expose super for B");

  obj = {};
  MixinC.apply(obj);
  equal(get(obj, 'aProp'), 'AC', "should expose super for C");

  obj = {};

  MixinA.apply(obj);
  MixinD.apply(obj);
  equal(get(obj, 'aProp'), 'AD', "should define super for D");

  obj = { };
  Ember.defineProperty(obj, 'aProp', Ember.computed(function(key, value) {
    return 'obj';
  }));
  MixinD.apply(obj);
  equal(get(obj, 'aProp'), "objD", "should preserve original computed property");
});

test('calling set on overridden computed properties', function() {
  var SuperMixin, SubMixin;
  var obj;

  var superGetOccurred = false,
      superSetOccurred = false;

  SuperMixin = Ember.Mixin.create({
    aProp: Ember.computed(function(key, val) {
      if (arguments.length === 1) {
        superGetOccurred = true;
      } else {
        superSetOccurred = true;
      }
      return true;
    })
  });

  SubMixin = Ember.Mixin.create(SuperMixin, {
    aProp: Ember.computed(function(key, val) {
      return this._super.apply(this, arguments);
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

test('setter behavior works properly when overriding computed properties', function() {
  var obj = {};

  var MixinA = Ember.Mixin.create({
    cpWithSetter2: Ember.computed(Ember.K),
    cpWithSetter3: Ember.computed(Ember.K),
    cpWithoutSetter: Ember.computed(Ember.K)
  });

  var cpWasCalled = false;

  var MixinB = Ember.Mixin.create({
    cpWithSetter2: Ember.computed(function(k, v) {
      cpWasCalled = true;
    }),

    cpWithSetter3: Ember.computed(function(k, v) {
      cpWasCalled = true;
    }),

    cpWithoutSetter: Ember.computed(function(k) {
      cpWasCalled = true;
    })
  });

  MixinA.apply(obj);
  MixinB.apply(obj);

  set(obj, 'cpWithSetter2', 'test');
  ok(cpWasCalled, "The computed property setter was called when defined with two args");
  cpWasCalled = false;

  set(obj, 'cpWithSetter3', 'test');
  ok(cpWasCalled, "The computed property setter was called when defined with three args");
  cpWasCalled = false;

  set(obj, 'cpWithoutSetter', 'test');
  equal(Ember.get(obj, 'cpWithoutSetter'), 'test', "The default setter was called, the value is correct");
  ok(!cpWasCalled, "The default setter was called, not the CP itself");
});
