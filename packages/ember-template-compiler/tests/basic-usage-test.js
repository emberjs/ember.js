import {
  _buildCompileOptions,
  _preprocess,
  _print,
  registerPlugin,
  unregisterPlugin,
} from '../index';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

function reverseElementNodeTag() {
  return {
    name: 'reverse-element-node-tag',
    visitor: {
      ElementNode(node) {
        node.tag = node.tag.split('').reverse().join('');
      },
    },
  };
}

function removeDataTest() {
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
  'ember-template-compiler: Embroider-like compilation',
  class extends RenderingTestCase {
    afterEach() {
      unregisterPlugin('ast', removeDataTest);

      return super.afterEach();
    }

    '@test can process a subset of AST plugins and print'(assert) {
      let template = '<div data-test="foo" data-blah="derp" class="hahaha">&nbsp;</div>';

      // build up options including strictMode default values, customizeComponentName, meta.moduleName, etc
      let options = _buildCompileOptions({
        mode: 'codemod',
        moduleName: 'components/foo',
        plugins: { ast: [removeDataTest] },
      });

      let transformedTemplateAST = _preprocess(template, options);

      // print back to a handlebars string
      let result = _print(transformedTemplateAST, { entityEncoding: 'raw' });

      assert.equal(result, '<div data-blah="derp" class="hahaha">&nbsp;</div>');
    }

    '@test registerPlugin based transforms can be avoided'(assert) {
      registerPlugin('ast', removeDataTest);

      let template = '<div data-test="foo" data-blah="derp" class="hahaha">&nbsp;</div>';

      // build up options including strictMode default values, customizeComponentName, meta.moduleName, etc
      let options = _buildCompileOptions({
        mode: 'codemod',
        moduleName: 'components/foo',
        plugins: {
          ast: [reverseElementNodeTag],
        },
      });

      let transformedTemplateAST = _preprocess(template, options);

      // print back to a handlebars string
      let result = _print(transformedTemplateAST, { entityEncoding: 'raw' });

      // only reverseElementNodeTag has ran, **not** removeDataTest
      assert.equal(result, '<vid data-test="foo" data-blah="derp" class="hahaha">&nbsp;</vid>');
    }
  }
);
