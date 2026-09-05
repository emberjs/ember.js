import EmberObject from '@ember/object';
import Mixin from '@ember/object/mixin';
import { InternalMixin } from '@ember/object/mixin-internal';
import {
  moduleFor,
  AbstractTestCase,
  expectDeprecation,
  expectNoDeprecation,
  testUnless,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '../../../-internals/deprecations';

moduleFor(
  'Mixin deprecation',
  class extends AbstractTestCase {
    [`${testUnless(
      DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test Mixin.create deprecates authoring a mixin`](assert) {
      let MixinA;

      expectDeprecation(
        () => {
          MixinA = Mixin.create({
            foo: 'FOO',
          });
        },
        /Using mixins is deprecated/,
        DEPRECATIONS.DEPRECATE_MIXINS.isEnabled
      );

      let obj = {};
      MixinA.apply(obj);

      assert.equal(obj.foo, 'FOO', 'the mixin still applies while deprecated');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test the internal mixin constructor does not deprecate, so Ember internals can build on mixins`](
      assert
    ) {
      let MixinA;

      expectNoDeprecation(() => {
        MixinA = InternalMixin.create({
          foo: 'FOO',
        });
      });

      let obj = {};
      MixinA.apply(obj);

      assert.equal(obj.foo, 'FOO', 'the internally created mixin applies');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test extending EmberObject does not deprecate`](assert) {
      // EmberObject builds a PrototypeMixin internally for every subclass, so
      // extending must not warn apps that never author a mixin themselves.
      let Subclass;

      expectNoDeprecation(() => {
        Subclass = EmberObject.extend({
          foo: 'FOO',
        });
      });

      let obj = Subclass.create();
      assert.equal(obj.foo, 'FOO', 'the subclass works');
      obj.destroy();
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test reopening an EmberObject subclass does not deprecate`](assert) {
      let Subclass = EmberObject.extend();

      expectNoDeprecation(() => {
        Subclass.reopen({
          foo: 'FOO',
        });
      });

      let obj = Subclass.create();
      assert.equal(obj.foo, 'FOO', 'the reopened property is present');
      obj.destroy();
    }
  }
);
