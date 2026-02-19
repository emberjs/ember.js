const path = require('path');

const esmCompilerPath = path.join(
  __dirname,
  '../../dist/packages/ember-template-compiler/index.js'
);

let templateCompiler;

QUnit.module('ember-template-compiler (ESM)', function (hooks) {
  hooks.beforeEach(async function () {
    templateCompiler = await import(esmCompilerPath);
  });

  QUnit.test('exports precompile', function (assert) {
    assert.strictEqual(typeof templateCompiler.precompile, 'function', 'precompile is present');
  });

  QUnit.test('exports _buildCompileOptions', function (assert) {
    assert.strictEqual(
      typeof templateCompiler._buildCompileOptions,
      'function',
      '_buildCompileOptions is present'
    );
  });

  QUnit.test('exports _preprocess', function (assert) {
    assert.strictEqual(typeof templateCompiler._preprocess, 'function', '_preprocess is present');
  });

  QUnit.test('exports _print', function (assert) {
    assert.strictEqual(typeof templateCompiler._print, 'function', '_print is present');
  });

  QUnit.test('precompile produces valid output', function (assert) {
    let result = templateCompiler.precompile('<h1>Hello</h1>');
    assert.strictEqual(typeof result, 'string', 'precompile returns a string');
  });
});
