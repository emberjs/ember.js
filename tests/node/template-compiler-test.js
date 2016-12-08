/*globals __dirname*/

var path = require('path');
var QUnit = require('qunitjs');

var distPath = path.join(__dirname, '../../dist');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');

var module = QUnit.module;
var test = QUnit.test;

var templateCompiler;

module('ember-template-compiler.js', {
  setup: function() {
    templateCompiler = require(templateCompilerPath);
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

test('can access _Ember.ENV (private API used by ember-cli-htmlbars)', function(assert) {
  assert.equal(typeof templateCompiler._Ember.ENV, 'object', '_Ember.ENV is present');
  assert.notEqual(typeof templateCompiler._Ember.ENV, null, '_Ember.ENV is not null');
});

test('can access _Ember.FEATURES (private API used by ember-cli-htmlbars)', function(assert) {
  assert.equal(typeof templateCompiler._Ember.FEATURES, 'object', '_Ember.FEATURES is present');
  assert.notEqual(typeof templateCompiler._Ember.FEATURES, null, '_Ember.FEATURES is not null');
});

test('can access _Ember.VERSION (private API used by ember-cli-htmlbars)', function(assert) {
  assert.equal(typeof templateCompiler._Ember.VERSION, 'string', '_Ember.VERSION is present');
});

test('can generate a template with a server side generated `id`', function(assert) {
  var TemplateJSON = JSON.parse(templateCompiler.precompile('<div>simple text</div>'));

  assert.ok(TemplateJSON.id, 'an `id` was generated');
});
