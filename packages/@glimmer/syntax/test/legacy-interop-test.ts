/* eslint-disable @typescript-eslint/no-deprecated */
import { builders as b } from '@glimmer/syntax';

QUnit.module('[glimmer-syntax] AST nodes legacy interop');

QUnit.test('path.parts does not include this', (assert) => {
  let path = b.path('this.foo.bar');

  assert.deepEqual(path.original, 'this.foo.bar', 'path.original should include this');
  assert.deepEqual(path.head.type, 'ThisHead', 'path.head should be a ThisHead');
  assert.deepEqual(path.parts, ['foo', 'bar'], 'path.parts should not include this');

  path.parts = ['bar', 'baz'];

  assert.deepEqual(path.original, 'this.bar.baz', 'path.original should include this');
  assert.deepEqual(path.head.type, 'ThisHead', 'path.head should be a ThisHead');
  assert.deepEqual(path.parts, ['bar', 'baz'], 'path.parts should not include this');

  path.head = b.head('@foo');
  assert.deepEqual(path.head.type, 'AtHead', 'path.head should be a AtHead');

  // Inconsistent, but we will allow it
  path.parts = ['this', 'foo', 'bar', 'baz'];

  assert.deepEqual(path.original, 'this.foo.bar.baz', 'path.original should include this');
  assert.deepEqual(path.head.type, 'ThisHead', 'path.head should be a ThisHead');
  assert.deepEqual(path.parts, ['foo', 'bar', 'baz'], 'path.parts should not include this');
});

QUnit.test('path.parts does not include @', (assert) => {
  let path = b.path('@foo.bar');

  assert.deepEqual(path.original, '@foo.bar', 'path.original should include @');
  assert.deepEqual(path.head.type, 'AtHead', 'path.head should be a AtHead');
  assert.deepEqual(path.parts, ['foo', 'bar'], 'path.parts should not include @');

  path.parts = ['bar', 'baz'];

  assert.deepEqual(path.original, '@bar.baz', 'path.original should include @');
  assert.deepEqual(path.head.type, 'AtHead', 'path.head should be a AtHead');
  assert.deepEqual(path.parts, ['bar', 'baz'], 'path.parts should not include @');

  path.head = b.head('this');
  assert.deepEqual(path.head.type, 'ThisHead', 'path.head should be a ThisHead');

  // Inconsistent, but we will allow it
  path.parts = ['@foo', 'bar', 'baz'];

  assert.deepEqual(path.original, '@foo.bar.baz', 'path.original should include @');
  assert.deepEqual(path.head.type, 'AtHead', 'path.head should be a AtHead');
  assert.deepEqual(path.parts, ['foo', 'bar', 'baz'], 'path.parts should not include this');
});
