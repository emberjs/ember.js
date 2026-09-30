// NOTE: These tests use public and private props, and methods and props, as separate cases.
// The implementation doesn't care much about those differences.
// The cases are kept for test coverage.

import { guidFor } from '@ember/-internals/utils';
import Mixin, { mixin } from '@ember/object/mixin';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../../-internals/deprecations';

moduleFor(
  'Basic introspection',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test Ember.mixins()`](assert) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let PrivateProperty = Mixin.create({
        _foo: '_FOO',
      });
      let PublicProperty = Mixin.create({
        foo: 'FOO',
      });
      let PrivateMethod = Mixin.create({
        _fooMethod() {},
      });
      let PublicMethod = Mixin.create({
        fooMethod() {},
      });
      let BarProperties = Mixin.create({
        _bar: '_BAR',
        bar: 'bar',
      });
      let BarMethods = Mixin.create({
        _barMethod() {},
        barMethod() {},
      });

      let Combined = Mixin.create(BarProperties, BarMethods);

      let obj = {};
      mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);

      function mapGuids(ary) {
        return ary.map((x) => guidFor(x));
      }

      assert.deepEqual(
        mapGuids(Mixin.mixins(obj)),
        mapGuids([
          PrivateProperty,
          PublicProperty,
          PrivateMethod,
          PublicMethod,
          Combined,
          BarProperties,
          BarMethods,
        ]),
        'should return included mixins'
      );
    }
  }
);
