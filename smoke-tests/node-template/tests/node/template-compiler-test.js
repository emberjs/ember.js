let templateCompiler;

QUnit.module('ember-template-compiler (ESM)', function () {
  QUnit.module('modern', function (hooks) {
    hooks.beforeEach(async function () {
      templateCompiler = await import('ember-source/ember-template-compiler/index.js');
    });

    QUnit.test('can be imported', function (assert) {
      assert.strictEqual(
        typeof templateCompiler.precompile,
        'function',
        'precompile function is present'
      );
    });

    QUnit.test('has _buildCompileOptions', function (assert) {
      assert.strictEqual(
        typeof templateCompiler._buildCompileOptions,
        'function',
        '_buildCompileOptions function is present'
      );
    });

    QUnit.test('has _preprocess', function (assert) {
      assert.strictEqual(
        typeof templateCompiler._preprocess,
        'function',
        '_preprocess function is present'
      );
    });

    QUnit.test('has _print', function (assert) {
      assert.strictEqual(
        typeof templateCompiler._print,
        'function',
        '_print function is present'
      );
    });
  });
});
