import { compare, isBlank, isEmpty, isEqual, isNone, isPresent, typeOf } from '@ember/utils';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';

const { isEnabled, isRemoved } = DEPRECATIONS.DEPRECATE_EMBER_UTILS;

function message(name) {
  return new RegExp(`\`${name}\` from \`@ember/utils\` is deprecated`);
}

moduleFor(
  '@ember/utils deprecation',
  class extends AbstractTestCase {
    [`${testUnless(isRemoved)} @test isNone is deprecated`](assert) {
      expectDeprecation(
        () => {
          assert.true(isNone(null));
          assert.false(isNone(''));
        },
        message('isNone'),
        isEnabled
      );
    }

    [`${testUnless(isRemoved)} @test isBlank is deprecated`](assert) {
      expectDeprecation(
        () => {
          assert.true(isBlank('  '));
          assert.false(isBlank('hello'));
        },
        message('isBlank'),
        isEnabled
      );
    }

    [`${testUnless(isRemoved)} @test isEmpty is deprecated`](assert) {
      expectDeprecation(
        () => {
          assert.true(isEmpty([]));
          assert.false(isEmpty([1]));
        },
        message('isEmpty'),
        isEnabled
      );
    }

    [`${testUnless(isRemoved)} @test isPresent is deprecated`](assert) {
      expectDeprecation(
        () => {
          assert.true(isPresent('hello'));
          assert.false(isPresent('  '));
        },
        message('isPresent'),
        isEnabled
      );
    }

    [`${testUnless(isRemoved)} @test isEqual is deprecated`](assert) {
      expectDeprecation(
        () => {
          assert.true(isEqual(new Date(0), new Date(0)));
          assert.false(isEqual([1], [1]));
        },
        message('isEqual'),
        isEnabled
      );
    }

    [`${testUnless(isRemoved)} @test typeOf is deprecated`](assert) {
      expectDeprecation(
        () => {
          assert.strictEqual(typeOf([]), 'array');
          assert.strictEqual(typeOf(null), 'null');
        },
        message('typeOf'),
        isEnabled
      );
    }

    [`${testUnless(isRemoved)} @test compare is deprecated`](assert) {
      expectDeprecation(
        () => {
          assert.strictEqual(compare(1, 2), -1);
          assert.strictEqual(compare('b', 'a'), 1);
        },
        message('compare'),
        isEnabled
      );
    }
  }
);
