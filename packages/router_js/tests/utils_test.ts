import { getChangelist } from 'router/utils';
import { module, test } from './test_helpers';

module('utils');

test('getChangelist', function (assert) {
  let result = getChangelist({}, { foo: '123' });
  assert.deepEqual(result, {
    all: { foo: '123' },
    changed: { foo: '123' },
    removed: {},
  });

  result = getChangelist({ foo: '123' }, { foo: '123' });
  assert.notOk(result);

  result = getChangelist({ foo: '123' }, {});
  assert.deepEqual(result, { all: {}, changed: {}, removed: { foo: '123' } });

  result = getChangelist({ foo: '123', bar: '456' }, { foo: '123' });
  assert.deepEqual(result, {
    all: { foo: '123' },
    changed: {},
    removed: { bar: '456' },
  });

  result = getChangelist({ foo: '123', bar: '456' }, { foo: '456' });
  assert.deepEqual(result, {
    all: { foo: '456' },
    changed: { foo: '456' },
    removed: { bar: '456' },
  });
});
