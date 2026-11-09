import { isEmpty } from '@ember/utils';
import ArrayProxy from '@ember/array/proxy';
import ObjectProxy from '@ember/object/proxy';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

const UTILS = DEPRECATIONS.DEPRECATE_EMBER_UTILS;

moduleFor(
  'Ember.isEmpty',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isRemoved || UTILS.isRemoved)} @test Ember.isEmpty ArrayProxy`](
      assert
    ) {
      expectDeprecation(/from `@ember\/utils` is deprecated/, UTILS.isEnabled);

      expectDeprecation(/`ArrayProxy` is deprecated/, DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isEnabled);

      let arrayProxy = ArrayProxy.create({ content: [] });

      assert.equal(true, isEmpty(arrayProxy), 'for an ArrayProxy that has empty content');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isRemoved || UTILS.isRemoved)} @test Ember.isEmpty ObjectProxy ArrayProxy`](
      assert
    ) {
      expectDeprecation(/from `@ember\/utils` is deprecated/, UTILS.isEnabled);

      expectDeprecation(/`ArrayProxy` is deprecated/, DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isEnabled);
      expectDeprecation(
        /`ObjectProxy` is deprecated/,
        DEPRECATIONS.DEPRECATE_OBJECT_PROXY.isEnabled
      );

      let arrayProxy = ArrayProxy.create({ content: [] });
      let objectProxy = ObjectProxy.create({ content: arrayProxy });

      assert.equal(
        true,
        isEmpty(objectProxy),
        'for an ArrayProxy inside ObjectProxy that has empty content'
      );
    }
  }
);
