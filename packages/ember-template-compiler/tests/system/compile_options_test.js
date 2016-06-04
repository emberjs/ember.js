import { defaultCompileOptions } from 'ember-template-compiler';
import defaultPlugins from 'ember-template-compiler/plugins';

QUnit.module('ember-template-compiler: default compile options');

QUnit.test('default options are a new copy', function() {
  notEqual(defaultCompileOptions(), defaultCompileOptions());
});

QUnit.test('has default AST plugins', function(assert) {
  assert.expect(defaultPlugins.length);

  let plugins = defaultCompileOptions().plugins.ast;

  for (let i = 0; i < defaultPlugins.length; i++) {
    let plugin = defaultPlugins[i];
    assert.ok(plugins.indexOf(plugin) > -1, `includes ${plugin}`);
  }
});
