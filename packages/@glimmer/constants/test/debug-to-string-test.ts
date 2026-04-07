/// <reference types="vite/client" />

import { BLOCK_HEAD } from '@glimmer/constants';

QUnit.module('@glimmer/constants');

QUnit.test('BLOCK_HEAD', (assert) => {
  assert.strictEqual(BLOCK_HEAD, 'Block');
});
