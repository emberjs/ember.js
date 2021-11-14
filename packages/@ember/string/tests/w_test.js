/* eslint-disable qunit/no-test-expect-argument */
import { w } from '@ember/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  assert.deepEqual(w(given), expected, description);
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
