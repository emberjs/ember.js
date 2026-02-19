'use strict';

const path = require('path');
const distPath = path.join(__dirname, '../../dist/packages/@ember/instrumentation/index.js');

let mod;

QUnit.module('instrumentation', function (hooks) {
  hooks.beforeEach(async function () {
    if (!mod) mod = await import(distPath);
    mod.reset();
  });

  QUnit.test('it works in FastBoot environment', function (assert) {
    let _originalWindow = global.window;

    global.window = {}; // mock window without `performance` property

    let result = mod.instrument('render', {}, function () {
      return 'hello';
    });

    assert.equal(result, 'hello', 'called block');

    global.window = _originalWindow;
  });
});
