import UnrecognizedURLError from 'router/unrecognized-url-error';
import { module, test } from './test_helpers';

module('unrecognized-url-error');

test('correct inheritance', function (assert) {
  let error;

  try {
    throw new UnrecognizedURLError('Message');
  } catch (e) {
    error = e;
  }

  assert.ok(error instanceof UnrecognizedURLError);
  assert.ok(error instanceof Error);
});
