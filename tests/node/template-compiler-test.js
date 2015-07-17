/*globals __dirname*/

var path = require('path');
var distPath = path.join(__dirname, '../../dist');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');

var module = QUnit.module;
var ok = QUnit.ok;
var equal = QUnit.equal;
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

test('can be required', function() {

  ok(typeof templateCompiler.precompile === 'function', 'precompile function is present');
  ok(typeof templateCompiler.compile === 'function', 'compile function is present');
  ok(typeof templateCompiler.template === 'function', 'template function is present');
});

test('allows enabling of features', function() {
  var templateOutput;
  var templateCompiler = require(path.join(distPath, 'ember-template-compiler'));

  var featureValue = templateCompiler._Ember.FEATURES['ember-htmlbars-component-generation'];

  if (featureValue || featureValue === null) {
    templateCompiler._Ember.FEATURES['ember-htmlbars-component-generation'] = true;

    templateOutput = templateCompiler.precompile('<some-thing></some-thing>');
    ok(templateOutput.indexOf('["component","@<some-thing>",[],0]') > -1, 'component generation can be enabled');
  } else {
    ok(true, 'cannot test features in feature stripped build');
  }
});
