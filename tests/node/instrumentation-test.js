'use strict';

const path = require('path');
const distPath = path.join(__dirname, '../../dist');
const emberPath = path.join(distPath, 'tests/ember');

QUnit.module('instrumentation', function(hooks) {
  hooks.afterEach(function() {
    delete global.Ember;
    delete require.cache[emberPath + '.js'];
  });

  QUnit.test('it works in FastBoot environment', function(assert) {
    let _originalWindow = global.window;

    global.window = {}; // mock window without `performance` property
    let Ember = require(emberPath);

    let result = Ember.instrument('render', {}, function() {
      return 'hello';
    });

    assert.equal(result, 'hello', 'called block');

    global.window = _originalWindow;
  });
});
