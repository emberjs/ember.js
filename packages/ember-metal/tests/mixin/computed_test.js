import Ember from "ember-metal/core"; // Ember.K
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { Mixin } from "ember-metal/mixin";
import { computed } from "ember-metal/computed";
import { defineProperty } from "ember-metal/properties";

QUnit.module('Mixin Computed Properties');

test('overriding computed properties', function() {
  var MixinA, MixinB, MixinC, MixinD;
  var obj;

  MixinA = Mixin.create({
    aProp: computed(function() {
      return 'A';
    })
  });

  MixinB = Mixin.create(MixinA, {
    aProp: computed(function() {
      return this._super()+'B';
    })
  });

  MixinC = Mixin.create(MixinA, {
    aProp: computed(function() {
      return this._super()+'C';
    })
  });

  MixinD = Mixin.create({
    aProp: computed(function() {
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
  defineProperty(obj, 'aProp', computed(function(key, value) {
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

  SuperMixin = Mixin.create({
    aProp: computed(function(key, val) {
      if (arguments.length === 1) {
        superGetOccurred = true;
      } else {
        superSetOccurred = true;
      }
      return true;
    })
  });

  SubMixin = Mixin.create(SuperMixin, {
    aProp: computed(function(key, val) {
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

  var MixinA = Mixin.create({
    cpWithSetter2: computed(Ember.K),
    cpWithSetter3: computed(Ember.K),
    cpWithoutSetter: computed(Ember.K)
  });

  var cpWasCalled = false;

  var MixinB = Mixin.create({
    cpWithSetter2: computed(function(k, v) {
      cpWasCalled = true;
    }),

    cpWithSetter3: computed(function(k, v) {
      cpWasCalled = true;
    }),

    cpWithoutSetter: computed(function(k) {
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
  equal(get(obj, 'cpWithoutSetter'), 'test', "The default setter was called, the value is correct");
  ok(!cpWasCalled, "The default setter was called, not the CP itself");
});
