import type { AST, ASTPluginBuilder, ASTPluginEnvironment, Syntax } from '@glimmer/syntax';
import { preprocess, Walker } from '@glimmer/syntax';
import { expect as expectPresent } from '@glimmer/util';

const { test } = QUnit;

QUnit.module('[glimmer-syntax] Plugins - AST Transforms');

test('function based AST plugins can be provided to the compiler', (assert) => {
  preprocess('<div></div>', {
    plugins: {
      ast: [
        () => ({
          name: 'plugin-a',
          visitor: {
            Program() {
              assert.step('Program');
              assert.ok(true, 'transform was called!');
            },
          },
        }),
      ],
    },
  });

  assert.verifySteps(['Program']);
});

test('plugins are provided the syntax package', (assert) => {
  preprocess('<div></div>', {
    plugins: {
      ast: [
        ({ syntax }) => {
          assert.step('syntax');
          assert.strictEqual(syntax.Walker, Walker);

          return { name: 'plugin-a', visitor: {} };
        },
      ],
    },
  });

  assert.verifySteps(['syntax']);
});

test('can support the legacy AST transform API via ASTPlugin', (assert) => {
  function ensurePlugin(FunctionOrPlugin: any): ASTPluginBuilder {
    if (FunctionOrPlugin.prototype && FunctionOrPlugin.prototype.transform) {
      return (env: ASTPluginEnvironment) => {
        return {
          name: 'plugin-a',

          visitor: {
            Program(node: AST.Program) {
              let plugin = new FunctionOrPlugin(env);

              plugin.syntax = env.syntax;

              return plugin.transform(node);
            },
          },
        };
      };
    } else {
      return FunctionOrPlugin;
    }
  }

  class Plugin {
    declare syntax: Syntax;

    transform(program: AST.Program): AST.Program {
      assert.ok(true, 'transform was called!');
      return program;
    }
  }

  preprocess('<div></div>', {
    plugins: {
      ast: [ensurePlugin(Plugin)],
    },
  });
});

const FIRST_PLUGIN = new WeakMap<AST.Program | AST.Block | AST.Template, boolean>();
const SECOND_PLUGIN = new WeakMap<AST.Program | AST.Block | AST.Template, boolean>();
const THIRD_PLUGIN = new WeakMap<AST.Program | AST.Block | AST.Template, boolean>();

test('AST plugins can be chained', (assert) => {
  let first = () => {
    return {
      name: 'first',
      visitor: {
        Program(program: AST.Program | AST.Template | AST.Block) {
          assert.step('Program first');
          FIRST_PLUGIN.set(program, true);
        },
      },
    };
  };

  let second = () => {
    return {
      name: 'second',
      visitor: {
        Program(node: AST.Program | AST.Block | AST.Template) {
          assert.step('Program second');
          assert.true(FIRST_PLUGIN.get(node), 'AST from first plugin is passed to second');

          SECOND_PLUGIN.set(node, true);
        },
      },
    };
  };

  let third = () => {
    return {
      name: 'third',
      visitor: {
        Program(node: AST.Program | AST.Block | AST.Template) {
          assert.step('Program third');
          assert.true(SECOND_PLUGIN.get(node), 'AST from second plugin is passed to third');

          THIRD_PLUGIN.set(node, true);
        },
      },
    };
  };

  let ast = preprocess('<div></div>', {
    plugins: {
      ast: [first, second, third],
    },
  });

  assert.true(THIRD_PLUGIN.get(ast), 'return value from last AST transform is used');

  assert.verifySteps(['Program first', 'Program second', 'Program third']);
});

test('AST plugins can access meta from environment', (assert) => {
  let hasExposedEnvMeta = (env: ASTPluginEnvironment) => {
    return {
      name: 'exposedMetaTemplateData',
      visitor: {
        Program() {
          assert.step('Program');
          const { meta } = env;
          const { moduleName } = expectPresent(
            meta as { moduleName: 'string' },
            'expected meta to not be null'
          );

          assert.strictEqual(
            moduleName,
            'template/module/name',
            'module was passed in the meta enviornment property'
          );
        },
      },
    };
  };

  preprocess('<div></div>', {
    meta: {
      moduleName: 'template/module/name',
    },
    plugins: {
      ast: [hasExposedEnvMeta],
    },
  });

  assert.verifySteps(['Program']);
});
