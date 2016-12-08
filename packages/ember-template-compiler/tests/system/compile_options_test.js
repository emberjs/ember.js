import { compileOptions } from '../../index';
import { defaultPlugins } from '../../index';

QUnit.module('ember-template-compiler: default compile options');

QUnit.test('default options are a new copy', function() {
  notEqual(compileOptions(), compileOptions());
});

QUnit.test('has default AST plugins', function(assert) {
  assert.expect(defaultPlugins.length);

  let plugins = compileOptions().plugins.ast;

  for (let i = 0; i < defaultPlugins.length; i++) {
    let plugin = defaultPlugins[i];
    assert.ok(plugins.indexOf(plugin) > -1, `includes ${plugin}`);
  }
});
