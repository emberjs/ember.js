'use strict';

var path = require('path');
var distPath = path.join(__dirname, '../../dist');
var emberPath = path.join(distPath, 'ember.debug');

QUnit.module('instrumentation', function(hooks) {
  hooks.afterEach(function() {
    delete global.Ember;
    delete require.cache[emberPath + '.js'];
  });

  QUnit.test('it works in FastBoot environment', function(assert) {
    var _originalWindow = global.window;

    global.window = {}; // mock window without `performance` property
    var Ember = require(emberPath);

    var result = Ember.instrument('render', {}, function() {
      return 'hello';
    });

    assert.equal(result, 'hello', 'called block');

    global.window = _originalWindow;
  });
});
