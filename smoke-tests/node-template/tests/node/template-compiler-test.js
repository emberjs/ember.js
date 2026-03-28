import { precompile, _buildCompileOptions } from 'ember-source/ember-template-compiler/index.js';

QUnit.module('ember-template-compiler', function () {
  QUnit.test('precompile is available', function (assert) {
    assert.strictEqual(typeof precompile, 'function', 'precompile function is present');
  });

  QUnit.test('_buildCompileOptions is available', function (assert) {
    assert.strictEqual(
      typeof _buildCompileOptions,
      'function',
      '_buildCompileOptions function is present'
    );
  });

  QUnit.test('precompile produces a valid template spec', function (assert) {
    let result = precompile('<h1>Hello</h1>');
    assert.strictEqual(typeof result, 'string', 'precompile returns a string');

    let parsed = JSON.parse(result);
    assert.strictEqual(typeof parsed, 'object', 'precompile output is valid JSON');
  });
});
