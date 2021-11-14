import {
  compile,
  compileOptions,
  RESOLUTION_MODE_TRANSFORMS,
  STRICT_MODE_TRANSFORMS,
} from '../../index';
import { moduleFor, AbstractTestCase, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: default compile options',
  class extends AbstractTestCase {
    ['@test default options are a new copy'](assert) {
      assert.notEqual(compileOptions(), compileOptions());
    }

    ['@test customizeComponentName asserts name is well formed'](assert) {
      let options = compileOptions({ moduleName: 'test.js' });

      expectAssertion(() => {
        options.customizeComponentName('Foo:Bar');
      }, /You tried to invoke a component named <Foo:Bar \/> in "test.js", but that is not a valid name for a component. Did you mean to use the "::" syntax for nested components\?/);

      assert.ok(options.customizeComponentName('Foo::Bar'));
    }

    ['@test has default AST plugins in resolution mode'](assert) {
      assert.expect(RESOLUTION_MODE_TRANSFORMS.length);

      let plugins = compileOptions().plugins.ast;

      for (let i = 0; i < RESOLUTION_MODE_TRANSFORMS.length; i++) {
        let plugin = RESOLUTION_MODE_TRANSFORMS[i];
        assert.ok(plugins.indexOf(plugin) > -1, `includes ${plugin}`);
      }
    }

    ['@test has default AST plugins in strict mode'](assert) {
      assert.expect(STRICT_MODE_TRANSFORMS.length);

      let plugins = compileOptions({ strictMode: true }).plugins.ast;

      for (let i = 0; i < STRICT_MODE_TRANSFORMS.length; i++) {
        let plugin = STRICT_MODE_TRANSFORMS[i];
        assert.ok(plugins.indexOf(plugin) > -1, `includes ${plugin}`);
      }
    }
  }
);

function customTransform() {
  return {
    name: 'remove-data-test',

    visitor: {
      ElementNode(node) {
        for (let i = 0; i < node.attributes.length; i++) {
          let attribute = node.attributes[i];

          if (attribute.name === 'data-test') {
            node.attributes.splice(i, 1);
          }
        }
      },
    },
  };
}

moduleFor(
  'ember-template-compiler: custom plugins passed to compile',
  class extends RenderingTestCase {
    // override so that we can provide custom AST plugins to compile
    compile(templateString) {
      return compile(templateString, {
        plugins: {
          ast: [customTransform],
        },
      });
    }
  }
);
