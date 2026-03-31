import UnrecognizedURLError from '../lib/unrecognized-url-error';

QUnit.module('unrecognized-url-error');

QUnit.test('correct inheritance', function (assert) {
  let error;

  try {
    throw new UnrecognizedURLError('Message');
  } catch (e) {
    error = e;
  }

  assert.ok(error instanceof UnrecognizedURLError);
  assert.ok(error instanceof Error);
});
