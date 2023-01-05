/* eslint-disable qunit/no-test-expect-argument */
import { w } from '@ember/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  expectDeprecation(() => {
    assert.deepEqual(w(given), expected, description);
  }, 'Importing from `@ember/string` without having the `@ember/string` package in your project is deprecated. Please add `@ember/string` to your `package.json');
}

moduleFor(
  'EmberStringUtils.w',
  class extends AbstractTestCase {
    ['@test String w tests'](assert) {
      test(
        assert,
        'one two three',
        ['one', 'two', 'three'],
        `w('one two three') => ['one','two','three']`
      );
      test(
        assert,
        'one   two  three',
        ['one', 'two', 'three'],
        `w('one    two    three') with extra spaces between words => ['one','two','three']`
      );
      test(assert, 'one\ttwo  three', ['one', 'two', 'three'], `w('one two three') with tabs`);
    }
  }
);
