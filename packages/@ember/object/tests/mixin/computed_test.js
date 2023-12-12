import { get, set, computed, defineProperty } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function K() {
  return this;
}

moduleFor(
  'Mixin Computed Properties',
  class extends AbstractTestCase {
    ['@test overriding computed properties'](assert) {
      let MixinA, MixinB, MixinC, MixinD;
      let obj;

      window.testStarted = true;

      MixinA = Mixin.create({
        aProp: computed(function () {
          return 'A';
        }),
      });

      MixinB = Mixin.create(MixinA, {
        aProp: computed(function () {
          return this._super(...arguments) + 'B';
        }),
      });

      MixinC = Mixin.create(MixinA, {
        aProp: computed(function () {
          return this._super(...arguments) + 'C';
        }),
      });

      MixinD = Mixin.create({
        aProp: computed(function () {
          return this._super(...arguments) + 'D';
        }),
      });

      obj = {};
      MixinB.apply(obj);
      assert.equal(get(obj, 'aProp'), 'AB', 'should expose super for B');

      obj = {};
      MixinC.apply(obj);
      assert.equal(get(obj, 'aProp'), 'AC', 'should expose super for C');

      obj = {};

      MixinA.apply(obj);
      MixinD.apply(obj);
      assert.equal(get(obj, 'aProp'), 'AD', 'should define super for D');

      obj = {};
      defineProperty(
        obj,
        'aProp',
        computed(function () {
          return 'obj';
        })
      );
      MixinD.apply(obj);
      assert.equal(get(obj, 'aProp'), 'objD', 'should preserve original computed property');
    }

    ['@test calling set on overridden computed properties'](assert) {
      let SuperMixin, SubMixin;
      let obj;

      let superGetOccurred = false;
      let superSetOccurred = false;

      SuperMixin = Mixin.create({
        aProp: computed({
          get() {
            superGetOccurred = true;
          },
          set() {
            superSetOccurred = true;
          },
        }),
      });

      SubMixin = Mixin.create(SuperMixin, {
        aProp: computed({
          get() {
            return this._super(...arguments);
          },
          set() {
            return this._super(...arguments);
          },
        }),
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
    }

    ['@test setter behavior asserts when overriding computed properties'](assert) {
      let obj = {};

      let MixinA = Mixin.create({
        cpWithSetter2: computed(K),
        cpWithSetter3: computed(K),
        cpWithoutSetter: computed(K),
      });

      let cpWasCalled = false;

      let MixinB = Mixin.create({
        cpWithSetter2: computed({
          get: K,
          set() {
            cpWasCalled = true;
          },
        }),

        cpWithSetter3: computed({
          get: K,
          set() {
            cpWasCalled = true;
          },
        }),

        cpWithoutSetter: computed(function () {
          cpWasCalled = true;
        }),
      });

      MixinA.apply(obj);
      MixinB.apply(obj);

      set(obj, 'cpWithSetter2', 'test');
      assert.ok(cpWasCalled, 'The computed property setter was called when defined with two args');
      cpWasCalled = false;

      set(obj, 'cpWithSetter3', 'test');
      assert.ok(
        cpWasCalled,
        'The computed property setter was called when defined with three args'
      );
      cpWasCalled = false;

      expectAssertion(() => {
        set(obj, 'cpWithoutSetter', 'test');
      }, /Cannot override the computed property `cpWithoutSetter` on \[object Object\]./);
    }
  }
);
