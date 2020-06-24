'use strict';

const { loadEmber, clearEmber } = require('./helpers/load-ember');

const { Ember } = loadEmber();

QUnit.module('instrumentation', function(hooks) {
  hooks.afterEach(function() {
    clearEmber();
  });

  QUnit.test('it works in FastBoot environment', function(assert) {
    let _originalWindow = global.window;

    global.window = {}; // mock window without `performance` property

    let result = Ember.instrument('render', {}, function() {
      return 'hello';
    });

    assert.equal(result, 'hello', 'called block');

    global.window = _originalWindow;
  });
});
