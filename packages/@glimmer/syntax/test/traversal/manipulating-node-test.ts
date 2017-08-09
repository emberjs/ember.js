import { astEqual } from '../support';
import {
  preprocess as parse,
  traverse,
  builders as b,
  AST,
  cannotRemoveNode,
  cannotReplaceNode
} from "@glimmer/syntax";

QUnit.module('[glimmer-syntax] Traversal - manipulating');

(["enter", "exit"] as Array<"enter" | "exit">).forEach((eventName) => {
  QUnit.test(`[${eventName}] Replacing self in a key (returning null)`, assert => {
    let ast = parse(`<x y={{z}} />`);
    let el = ast.body[0] as AST.ElementNode;
    let attr = el.attributes[0];

    assert.throws(() => {
      traverse(ast, {
        MustacheStatement: {
          [eventName]: (node: AST.MustacheStatement) => {
            if (node.path.type === 'PathExpression' && node.path.parts[0] === 'z') {
              return null;
            }
            return;
          }
        }
      });
    }, cannotRemoveNode(attr.value, attr, 'value'));
  });

  QUnit.test(`[${eventName}] Replacing self in a key (returning an empty array)`, assert => {
    let ast = parse(`<x y={{z}} />`);
    let el = ast.body[0] as AST.ElementNode;
    let attr = el.attributes[0];

    assert.throws(() => {
      traverse(ast, {
        MustacheStatement: {
          [eventName](node: AST.MustacheStatement) {
            if (node.path.type === 'PathExpression' && node.path.parts[0] === 'z') {
              return [];
            }
            return;
          }
        }
      });
    }, cannotRemoveNode(attr.value, attr, 'value'));
  });

  QUnit.test(`[${eventName}] Replacing self in a key (returning a node)`, () => {
    let ast = parse(`<x y={{z}} />`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node: AST.MustacheStatement) {
          if (node.path.type === 'PathExpression' && node.path.parts[0] === 'z') {
            return b.mustache('a');
          }
          return;
        }
      }
    });

    astEqual(ast, `<x y={{a}} />`);
  });

  QUnit.test(`[${eventName}] Replacing self in a key (returning an array with a single node)`, () => {
    let ast = parse(`<x y={{z}} />`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node: AST.MustacheStatement) {
          if (node.path.type === 'PathExpression' && node.path.parts[0] === 'z') {
            return [b.mustache('a')];
          }
          return;
        }
      }
    });

    astEqual(ast, `<x y={{a}} />`);
  });

  QUnit.test(`[${eventName}] Replacing self in a key (returning an array with multiple nodes)`, assert => {
    let ast = parse(`<x y={{z}} />`);
    let el = ast.body[0] as AST.ElementNode;
    let attr = el.attributes[0];

    assert.throws(() => {
      traverse(ast, {
        MustacheStatement: {
          [eventName](node: AST.MustacheStatement) {
            if (node.path.type === 'PathExpression' && node.path.parts[0] === 'z') {
              return [
                b.mustache('a'),
                b.mustache('b'),
                b.mustache('c')
              ];
            }
            return;
          }
        }
      });
    }, cannotReplaceNode(attr.value, attr, 'value'));
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning null)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node: AST.MustacheStatement) {
          if (node.path.type === 'PathExpression' && node.path.parts[0] === 'y') {
            return null;
          }
          return;
        }
      }
    });

    astEqual(ast, `{{x}}{{z}}`);
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning an empty array)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node: AST.MustacheStatement) {
          if (node.path.type === 'PathExpression' && node.path.parts[0] === 'y') {
            return [];
          }
          return;
        }
      }
    });

    astEqual(ast, `{{x}}{{z}}`);
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning a node)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node: AST.MustacheStatement) {
          if (node.path.type === 'PathExpression' && node.path.parts[0] === 'y') {
            return b.mustache('a');
          }
          return;
        }
      }
    });

    astEqual(ast, `{{x}}{{a}}{{z}}`);
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning an array with a single node)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node: AST.MustacheStatement) {
          if (node.path.type === 'PathExpression' && node.path.parts[0] === 'y') {
            return [b.mustache('a')];
          }
          return;
        }
      }
    });

    astEqual(ast, `{{x}}{{a}}{{z}}`);
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning an array with multiple nodes)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node: AST.MustacheStatement) {
          if (node.path.type === 'PathExpression' && node.path.parts[0] === 'y') {
            return [
              b.mustache('a'),
              b.mustache('b'),
              b.mustache('c')
            ];
          }
          return;
        }
      }
    });

    astEqual(ast, `{{x}}{{a}}{{b}}{{c}}{{z}}`);
  });
});

QUnit.module('[glimmer-syntax] Traversal - manipulating (edge cases)');

QUnit.test('Inside of a block', () => {
  let ast = parse(`{{y}}{{#w}}{{x}}{{y}}{{z}}{{/w}}`);

  traverse(ast, {
    MustacheStatement(node) {
      if (node.path.type === 'PathExpression' && node.path.parts[0] === 'y') {
        return [
          b.mustache('a'),
          b.mustache('b'),
          b.mustache('c')
        ];
      }
      return;
    }
  });

  astEqual(ast, `{{a}}{{b}}{{c}}{{#w}}{{x}}{{a}}{{b}}{{c}}{{z}}{{/w}}`);
});

QUnit.test('Should recurrsively walk the transformed node', () => {
  let ast = parse(`{{x}}{{y}}{{z}}`);

  traverse(ast, {
    MustacheStatement: function(node) {
      if (node.path.original === 'x') {
        return b.mustache('y');
      } else if (node.path.original === 'y') {
        return b.mustache('z');
      }
      return;
    }
  });

  astEqual(ast, `{{z}}{{z}}{{z}}`);
});

QUnit.test('Should recurrsively walk the keys in the transformed node', () => {
  let ast = parse(`{{#foo}}{{#bar}}{{baz}}{{/bar}}{{else}}{{#bar}}{{bat}}{{/bar}}{{/foo}}`);

  traverse(ast, {
    BlockStatement: function(node) {
      if (node.path.original === 'foo') {
        return b.block(b.path('x-foo'), node.params, node.hash, node.program, node.inverse, node.loc);
      } else if (node.path.original === 'bar') {
        return b.block(b.path('x-bar'), node.params, node.hash, node.program, node.inverse, node.loc);
      }
      return;
    },

    MustacheStatement: function(node) {
      if (node.path.original === 'baz') {
        return b.mustache('x-baz');
      } else if (node.path.original === 'bat') {
        return b.mustache('x-bat');
      }
      return;
    }
  });

  astEqual(ast, `{{#x-foo}}{{#x-bar}}{{x-baz}}{{/x-bar}}{{else}}{{#x-bar}}{{x-bat}}{{/x-bar}}{{/x-foo}}`);
});

QUnit.test('Exit event is not triggered if the node is replaced during the enter event', assert => {
  let ast = parse(`{{x}}`);

  let entered: Array<string | number | boolean | null | undefined> = [];
  let exited: Array<string | number | boolean | null | undefined> = [];

  traverse(ast, {
    MustacheStatement: {
      enter(node) {
        entered.push(node.path.original);
        return b.mustache('y');
      },
      exit(node) {
        exited.push(node.path.original);
      }
    }
  });

  assert.deepEqual(entered, ['x', 'y']);
  assert.deepEqual(exited, ['y']);
});
