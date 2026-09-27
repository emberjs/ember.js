import { instrument } from 'ember-source/@ember/instrumentation/index.js';

QUnit.module('instrumentation', function () {
  QUnit.test('it works in FastBoot environment', function (assert) {
    let _originalWindow = global.window;

    global.window = {}; // mock window without `performance` property

    let result = instrument('render', {}, function () {
      return 'hello';
    });

    assert.equal(result, 'hello', 'called block');

    global.window = _originalWindow;
  });
});
