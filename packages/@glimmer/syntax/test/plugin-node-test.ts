import {
  preprocess,
  Syntax,
  Walker,
  AST,
  ASTPluginEnvironment,
  ASTPluginBuilder,
} from '@glimmer/syntax';

const { test } = QUnit;

QUnit.module('[glimmer-syntax] Plugins - AST Transforms');

test('function based AST plugins can be provided to the compiler', assert => {
  assert.expect(1);

  preprocess('<div></div>', {
    plugins: {
      ast: [
        () => ({
          name: 'plugin-a',
          visitor: {
            Program() {
              assert.ok(true, 'transform was called!');
            },
          },
        }),
      ],
    },
  });
});

test('plugins are provided the syntax package', assert => {
  assert.expect(1);

  preprocess('<div></div>', {
    plugins: {
      ast: [
        ({ syntax }) => {
          assert.equal(syntax.Walker, Walker);

          return { name: 'plugin-a', visitor: {} };
        },
      ],
    },
  });
});

test('can support the legacy AST transform API via ASTPlugin', assert => {
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
    syntax!: Syntax;

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

test('AST plugins can be chained', assert => {
  assert.expect(3);

  let first = () => {
    return {
      name: 'first',
      visitor: {
        Program(program: AST.Program | AST.Template | AST.Block) {
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
          assert.equal(FIRST_PLUGIN.get(node), true, 'AST from first plugin is passed to second');

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
          assert.equal(SECOND_PLUGIN.get(node), true, 'AST from second plugin is passed to third');

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

  assert.equal(THIRD_PLUGIN.get(ast), true, 'return value from last AST transform is used');
});
