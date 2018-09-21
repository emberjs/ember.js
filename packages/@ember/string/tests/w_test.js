import { ENV } from '@ember/-internals/environment';
import { w } from '@ember/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  assert.deepEqual(w(given), expected, description);
  if (ENV.EXTEND_PROTOTYPES.String) {
    assert.deepEqual(given.w(), expected, description);
  }
}

moduleFor(
  'EmberStringUtils.w',
  class extends AbstractTestCase {
    ['@test String.prototype.w is not available without EXTEND_PROTOTYPES'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.String) {
        assert.ok('undefined' === typeof String.prototype.w, 'String.prototype helper disabled');
      } else {
        assert.expect(0);
      }
    }

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
