import { compileOptions } from '../../index';
import { defaultPlugins } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('ember-template-compiler: default compile options', class extends AbstractTestCase {
  ['@test default options are a new copy'](assert) {
    assert.notEqual(compileOptions(), compileOptions());
  }

  ['@test has default AST plugins'](assert) {
    assert.expect(defaultPlugins.length);

    let plugins = compileOptions().plugins.ast;

    for (let i = 0; i < defaultPlugins.length; i++) {
      let plugin = defaultPlugins[i];
      assert.ok(plugins.indexOf(plugin) > -1, `includes ${plugin}`);
    }
  }
});
