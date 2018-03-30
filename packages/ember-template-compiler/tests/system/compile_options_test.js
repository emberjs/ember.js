import {
  compile,
  compileOptions,
  defaultPlugins,
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

    ['@test has default AST plugins'](assert) {
      assert.expect(defaultPlugins.length);

      let plugins = compileOptions().plugins.ast;

      for (let i = 0; i < defaultPlugins.length; i++) {
        let plugin = defaultPlugins[i];
        assert.ok(plugins.indexOf(plugin) > -1, `includes ${plugin}`);
      }
    }
  }
);

let customTransformCounter = 0;
class CustomTransform {
  constructor(options) {
    customTransformCounter++;
    this.options = options;
    this.syntax = null;
  }

  transform(ast) {
    let walker = new this.syntax.Walker();

    walker.visit(ast, node => {
      if (node.type !== 'ElementNode') {
        return;
      }

      for (var i = 0; i < node.attributes.length; i++) {
        let attribute = node.attributes[i];

        if (attribute.name === 'data-test') {
          node.attributes.splice(i, 1);
        }
      }
    });

    return ast;
  }
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
    this.render('<div>{{#if falsey}}nope{{/if}}</div>');
    assert.equal(customTransformCounter, 1, 'transform should only be instantiated once');
  }
}

moduleFor(
  'ember-template-compiler: registerPlugin with a custom plugins',
  class extends CustomPluginsTests {
    beforeEach() {
      registerPlugin('ast', CustomTransform);
    }

    afterEach() {
      unregisterPlugin('ast', CustomTransform);
      return super.afterEach();
    }

    ['@test custom registered plugins are deduplicated'](assert) {
      registerPlugin('ast', CustomTransform);
      this.registerTemplate(
        'application',
        '<div data-test="foo" data-blah="derp" class="hahaha"></div>'
      );
      assert.equal(customTransformCounter, 1, 'transform should only be instantiated once');
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
          ast: [CustomTransform],
        },
      });
    }
  }
);
