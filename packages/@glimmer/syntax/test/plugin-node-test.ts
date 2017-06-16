import {
  preprocess,
  Syntax,
  Walker,
  AST,
  ASTPlugin
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
          visitors: {
            Program() {
              assert.ok(true, 'transform was called!');
            }
          }
        })
      ]
    }
  });
});

test('plugins are provided the syntax package', assert => {
  assert.expect(1);

  preprocess('<div></div>', {
    plugins: {
      ast: [
        ({ syntax }) => {
          assert.equal(syntax.Walker, Walker);

          return { name: 'plugin-a', visitors: {} };
        }
      ]
    }
  });
});

test('can support the legacy AST transform API via ASTPlugin', assert => {
  function ensurePlugin(FunctionOrPlugin: any): ASTPlugin {
    if (FunctionOrPlugin.prototype && FunctionOrPlugin.prototype.transform) {
      return (env) => {
        return {
          name: 'plugin-a',

          visitors: {
            Program(node: AST.Program) {
              let plugin = new FunctionOrPlugin(env);

              plugin.syntax = env.syntax;

              return plugin.transform(node);
            }
          }
        };
      };
    } else {
      return FunctionOrPlugin;
    }
  }

  class Plugin {
    syntax: Syntax;

    transform(program: AST.Program): AST.Program {
      assert.ok(true, 'transform was called!');
      return program;
    }
  }

  preprocess('<div></div>', {
    plugins: {
      ast: [ ensurePlugin(Plugin) ]
    }
  });
});

test('AST plugins can be chained', assert => {
  assert.expect(3);

  let first = () => {
    return {
      name: 'first',
      visitors: {
        Program(program: AST.Program) {
          program['isFromFirstPlugin'] = true;
        }
      }
    };
  };

  let second = () => {
    return {
      name: 'second',
      visitors: {
        Program(node: AST.Program) {
          assert.equal(node['isFromFirstPlugin'], true, 'AST from first plugin is passed to second');

          node['isFromSecondPlugin'] = true;
        }
      }
    };
  };

  let third = () => {
    return {
      name: 'third',
      visitors: {
        Program(node: AST.Program) {
          assert.equal(node['isFromSecondPlugin'], true, 'AST from second plugin is passed to third');

          node['isFromThirdPlugin'] = true;
        }
      }
    };
  };

  let ast = preprocess('<div></div>', {
    plugins: {
      ast: [first, second, third]
    }
  });

  assert.equal(ast['isFromThirdPlugin'], true, 'return value from last AST transform is used');
});
