const path = require('path');

const distPath = path.join(__dirname, '../../dist');

let templateCompiler;

QUnit.module('ember-template-compiler.js', function () {
  QUnit.module('modern', function (hooks) {
    hooks.beforeEach(function () {
      this.templateCompilerPath = path.resolve(path.join(distPath, 'ember-template-compiler.js'));
      templateCompiler = require(this.templateCompilerPath);
    });

    hooks.afterEach(function () {
      // clear the previously cached version of this module
      delete require.cache[this.templateCompilerPath];
    });

    QUnit.test('can be required', function (assert) {
      assert.strictEqual(
        typeof templateCompiler.precompile,
        'function',
        'precompile function is present'
      );
      assert.strictEqual(
        typeof templateCompiler.compile,
        'function',
        'compile function is present'
      );
    });
  });
});
