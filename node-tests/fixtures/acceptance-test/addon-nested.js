import { test } from 'qunit';
import moduleForAcceptance from '../../../tests/helpers/module-for-acceptance';

moduleForAcceptance('Acceptance | foo/bar');

test('visiting /foo/bar', function(assert) {
  visit('/foo/bar');

  andThen(function() {
    assert.strictEqual(currentURL(), '/foo/bar');
  });
});
