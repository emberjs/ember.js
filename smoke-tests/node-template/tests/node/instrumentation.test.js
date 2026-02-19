import test from 'node:test';
import assert from 'node:assert/strict';
import { instrument } from 'ember-source/@ember/instrumentation/index.js';

test('instrumentation works in FastBoot environment', async () => {
  let _originalWindow = globalThis.window;

  globalThis.window = {}; // mock window without `performance` property

  try {
    let result = instrument('render', {}, function () {
      return 'hello';
    });

    assert.equal(result, 'hello', 'called block');
  } finally {
    globalThis.window = _originalWindow;
  }
});
