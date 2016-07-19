/*globals __dirname*/

var path = require('path');
var QUnit = require('qunitjs');

var distPath = path.join(__dirname, '../../dist');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');

var module = QUnit.module;
var test = QUnit.test;

var distPath = path.join(__dirname, '../../dist');
var templateCompiler = require(path.join(distPath, 'ember-template-compiler'));

var compile;

module('ember-template-compiler.js', {
  setup: function() {
    compile = require(templateCompilerPath).compile;
  },

  teardown: function() {
    // clear the previously cached version of this module
    delete require.cache[templateCompilerPath + '.js'];
  }
});

test('can be required', function(assert) {
  assert.ok(typeof templateCompiler.precompile === 'function', 'precompile function is present');
  assert.ok(typeof templateCompiler.compile === 'function', 'compile function is present');
});
