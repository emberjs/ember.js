import {
  compile,
  compileOptions,
  RESOLUTION_MODE_TRANSFORMS,
  STRICT_MODE_TRANSFORMS,
  registerPlugin,
  unregisterPlugin,
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

let customTransformCounter = 0;
class LegacyCustomTransform {
  constructor(options) {
    customTransformCounter++;
    this.options = options;
    this.syntax = null;
  }

  transform(ast) {
    let walker = new this.syntax.Walker();

    walker.visit(ast, (node) => {
      if (node.type !== 'ElementNode') {
        return;
      }

      for (let i = 0; i < node.attributes.length; i++) {
        let attribute = node.attributes[i];

        if (attribute.name === 'data-test') {
          node.attributes.splice(i, 1);
        }
      }
    });

    return ast;
  }
}

function customTransform() {
  customTransformCounter++;

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

class CustomPluginsTests extends RenderingTestCase {
  afterEach() {
    customTransformCounter = 0;
    return super.afterEach();
  }

  ['@test custom plugins can be used']() {
    this.render('<div data-test="foo" data-blah="derp" class="hahaha"></div>');
    this.assertElement(this.firstChild, {
      tagName: 'div',
      attrs: { class: 'hahaha', 'data-blah': 'derp' },
      content: '',
    });
  }

  ['@test wrapped plugins are only invoked once per template'](assert) {
    this.render('<div>{{#if this.falsey}}nope{{/if}}</div>');
    assert.equal(customTransformCounter, 1, 'transform should only be instantiated once');
  }
}

moduleFor(
  'ember-template-compiler: [DEPRECATED] registerPlugin with a custom plugins in legacy format',
  class extends CustomPluginsTests {
    beforeEach() {
      expectDeprecation(
        `Using class based template compilation plugins is deprecated, please update to the functional style: ${LegacyCustomTransform.name}`
      );
      expectDeprecation(
        'registerPlugin is deprecated, please pass plugins directly via `compile` and/or `precompile`.'
      );
      registerPlugin('ast', LegacyCustomTransform);
    }

    afterEach() {
      expectDeprecation(() => {
        unregisterPlugin('ast', LegacyCustomTransform);
      }, /unregisterPlugin is deprecated, please pass plugins directly via `compile` and\/or `precompile`/);
      return super.afterEach();
    }

    ['@test custom registered plugins are deduplicated'](assert) {
      expectDeprecation(
        `Using class based template compilation plugins is deprecated, please update to the functional style: ${LegacyCustomTransform.name}`
      );
      expectDeprecation(
        'registerPlugin is deprecated, please pass plugins directly via `compile` and/or `precompile`.'
      );
      registerPlugin('ast', LegacyCustomTransform);

      this.registerTemplate(
        'application',
        '<div data-test="foo" data-blah="derp" class="hahaha"></div>'
      );
      assert.equal(customTransformCounter, 1, 'transform should only be instantiated once');
    }
  }
);

moduleFor(
  'ember-template-compiler: [DEPRECATED] registerPlugin with a custom plugins',
  class extends CustomPluginsTests {
    beforeEach() {
      expectDeprecation(() => {
        registerPlugin('ast', customTransform);
      }, /registerPlugin is deprecated, please pass plugins directly via `compile` and\/or `precompile`/);
    }

    afterEach() {
      expectDeprecation(() => {
        unregisterPlugin('ast', customTransform);
      }, /unregisterPlugin is deprecated, please pass plugins directly via `compile` and\/or `precompile`/);

      return super.afterEach();
    }

    ['@test custom registered plugins are deduplicated'](assert) {
      expectDeprecation(() => {
        registerPlugin('ast', customTransform);
      }, /registerPlugin is deprecated, please pass plugins directly via `compile` and\/or `precompile`/);

      this.registerTemplate(
        'application',
        '<div data-test="foo" data-blah="derp" class="hahaha"></div>'
      );
      assert.equal(customTransformCounter, 1, 'transform should only be instantiated once');
    }
  }
);

moduleFor(
  'ember-template-compiler: custom plugins in legacy format passed to compile',
  class extends RenderingTestCase {
    // override so that we can provide custom AST plugins to compile
    compile(templateString) {
      expectDeprecation(
        'Using class based template compilation plugins is deprecated, please update to the functional style: LegacyCustomTransform'
      );
      return compile(templateString, {
        plugins: {
          ast: [LegacyCustomTransform],
        },
      });
    }
  }
);

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
