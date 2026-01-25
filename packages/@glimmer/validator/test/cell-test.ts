import { cell } from '@glimmer/validator';

import { module, test } from './-utils';

module('cell', () => {
  test('creates reactive storage', (assert) => {
    const x = cell('hello');
    assert.strictEqual(x.read(), 'hello');
  });

  test('updates when set', (assert) => {
    const x = cell('hello');
    x.set('world');
    assert.strictEqual(x.read(), 'world');
  });

  test('updates when update() is called', (assert) => {
    const x = cell('hello');
    x.update((value) => value + ' world');
    assert.strictEqual(x.read(), 'hello world');
  });

  test('is frozen when freeze() is called', (assert) => {
    const x = cell('hello');
    x.freeze();
    assert.throws(() => x.set('world'));
  });
});
