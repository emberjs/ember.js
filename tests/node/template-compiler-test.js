/*globals __dirname*/

var path = require('path');
var QUnit = require('qunitjs');

var distPath = path.join(__dirname, '../../dist');
var emberPath = path.join(distPath, 'ember.debug.cjs');
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

QUnit.test('can be required', function(assert) {
  assert.ok(typeof templateCompiler.precompile === 'function', 'precompile function is present');
  assert.ok(typeof templateCompiler.compile === 'function', 'compile function is present');
  assert.ok(typeof templateCompiler.template === 'function', 'template function is present');
});

QUnit.test('uses plugins with precompile', function(assert) {
  var templateOutput;
  var templateCompiler = require(path.join(distPath, 'ember-template-compiler'));

  templateOutput = templateCompiler.precompile('{{#each foo in bar}}{{/each}}');
  assert.ok(templateOutput.match(/locals: \["foo"\]/), 'transform each in to block params');

  templateOutput = templateCompiler.precompile('{{#with foo as bar}}{{/with}}');
  assert.ok(templateOutput.match(/locals: \["bar"\]/), 'transform with as to block params');
});

QUnit.test('allows enabling of features', function(assert) {
  var templateOutput;
  var templateCompiler = require(path.join(distPath, 'ember-template-compiler'));

  var featureValue = templateCompiler._Ember.FEATURES['ember-htmlbars-component-generation'];

  if (featureValue || featureValue === null) {
    templateCompiler._Ember.FEATURES['ember-htmlbars-component-generation'] = true;

    templateOutput = templateCompiler.precompile('<some-thing></some-thing>');
    assert.ok(templateOutput.indexOf('["component","@<some-thing>",[],0]') > -1, 'component generation can be enabled');
  } else {
    assert.ok(true, 'cannot test features in feature stripped build');
  }
});
