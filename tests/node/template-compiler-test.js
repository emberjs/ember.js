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

    QUnit.test('can access _Ember.ENV (private API used by ember-cli-htmlbars)', function (assert) {
      assert.equal(typeof templateCompiler._Ember.ENV, 'object', '_Ember.ENV is present');
      assert.notEqual(typeof templateCompiler._Ember.ENV, null, '_Ember.ENV is not null');
    });

    QUnit.test(
      'can access _Ember.FEATURES (private API used by ember-cli-htmlbars)',
      function (assert) {
        assert.equal(
          typeof templateCompiler._Ember.FEATURES,
          'object',
          '_Ember.FEATURES is present'
        );
        assert.notEqual(
          typeof templateCompiler._Ember.FEATURES,
          null,
          '_Ember.FEATURES is not null'
        );
      }
    );

    QUnit.test(
      'can access _Ember.VERSION (private API used by ember-cli-htmlbars)',
      function (assert) {
        assert.equal(typeof templateCompiler._Ember.VERSION, 'string', '_Ember.VERSION is present');
      }
    );
  });
});
