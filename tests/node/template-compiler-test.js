/*globals __dirname*/

var path = require('path');
var distPath = path.join(__dirname, '../../dist');
var emberPath = path.join(distPath, 'ember.debug.cjs');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');

var module = QUnit.module;
var ok = QUnit.ok;
var equal = QUnit.equal;

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

test('uses plugins with precompile', function() {
  var templateOutput;
  var templateCompiler = require(path.join(distPath, 'ember-template-compiler'));

  templateOutput = templateCompiler.precompile('{{#each foo in bar}}{{/each}}');
  ok(templateOutput.match(/{"keyword": "foo"}/), 'transform each in to block params');

  templateOutput = templateCompiler.precompile('{{#with foo as bar}}{{/with}}');
  ok(templateOutput.match(/set\(env, context, "bar", blockArguments\[0\]\);/), 'transform with as to block params');
});

test('allows enabling of features', function() {
  var templateOutput;
  var templateCompiler = require(path.join(distPath, 'ember-template-compiler'));

  var featureValue = templateCompiler._Ember.FEATURES['ember-htmlbars-component-generation'];

  if (featureValue || featureValue === null) {
    templateCompiler._Ember.FEATURES['ember-htmlbars-component-generation'] = true;

    templateOutput = templateCompiler.precompile('<some-thing></some-thing>');
    ok(templateOutput.match(/component\(env, morph0, context, "some-thing"/), 'component generation can be enabled');
  } else {
    ok(true, 'cannot test features in feature stripped build');
  }
});
