import { astEqual } from '../support';
import { preprocess as parse, traverse, builders as b } from "@glimmer/syntax";

import {
  cannotRemoveNode,
  cannotReplaceNode,
} from '@glimmer/syntax/lib/traversal/errors';

QUnit.module('[glimmer-syntax] Traversal - manipulating');

['enter', 'exit'].forEach(eventName => {
  QUnit.test(`[${eventName}] Replacing self in a key (returning null)`, assert => {
    let ast = parse(`<x y={{z}} />`);
    let attr = ast.body[0].attributes[0];

    assert.throws(() => {
      traverse(ast, {
        MustacheStatement: {
          [eventName](node) {
            if (node.path.parts[0] === 'z') {
              return null;
            }
          }
        }
      });
    }, cannotRemoveNode(attr.value, attr, 'value'));
  });

  QUnit.test(`[${eventName}] Replacing self in a key (returning an empty array)`, assert => {
    let ast = parse(`<x y={{z}} />`);
    let attr = ast.body[0].attributes[0];

    assert.throws(() => {
      traverse(ast, {
        MustacheStatement: {
          [eventName](node) {
            if (node.path.parts[0] === 'z') {
              return [];
            }
          }
        }
      });
    }, cannotRemoveNode(attr.value, attr, 'value'));
  });

  QUnit.test(`[${eventName}] Replacing self in a key (returning a node)`, () => {
    let ast = parse(`<x y={{z}} />`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node) {
          if (node.path.parts[0] === 'z') {
            return b.mustache('a');
          }
        }
      }
    });

    astEqual(ast, `<x y={{a}} />`);
  });

  QUnit.test(`[${eventName}] Replacing self in a key (returning an array with a single node)`, () => {
    let ast = parse(`<x y={{z}} />`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node) {
          if (node.path.parts[0] === 'z') {
            return [b.mustache('a')];
          }
        }
      }
    });

    astEqual(ast, `<x y={{a}} />`);
  });

  QUnit.test(`[${eventName}] Replacing self in a key (returning an array with multiple nodes)`, assert => {
    let ast = parse(`<x y={{z}} />`);
    let attr = ast.body[0].attributes[0];

    assert.throws(() => {
      traverse(ast, {
        MustacheStatement: {
          [eventName](node) {
            if (node.path.parts[0] === 'z') {
              return [
                b.mustache('a'),
                b.mustache('b'),
                b.mustache('c')
              ];
            }
          }
        }
      });
    }, cannotReplaceNode(attr.value, attr, 'value'));
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning null)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node) {
          if (node.path.parts[0] === 'y') {
            return null;
          }
        }
      }
    });

    astEqual(ast, `{{x}}{{z}}`);
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning an empty array)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node) {
          if (node.path.parts[0] === 'y') {
            return [];
          }
        }
      }
    });

    astEqual(ast, `{{x}}{{z}}`);
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning a node)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node) {
          if (node.path.parts[0] === 'y') {
            return b.mustache('a');
          }
        }
      }
    });

    astEqual(ast, `{{x}}{{a}}{{z}}`);
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning an array with a single node)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node) {
          if (node.path.parts[0] === 'y') {
            return [b.mustache('a')];
          }
        }
      }
    });

    astEqual(ast, `{{x}}{{a}}{{z}}`);
  });

  QUnit.test(`[${eventName}] Replacing self in an array (returning an array with multiple nodes)`, () => {
    let ast = parse(`{{x}}{{y}}{{z}}`);

    traverse(ast, {
      MustacheStatement: {
        [eventName](node) {
          if (node.path.parts[0] === 'y') {
            return [
              b.mustache('a'),
              b.mustache('b'),
              b.mustache('c')
            ];
          }
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
      if (node.path.parts[0] === 'y') {
        return [
          b.mustache('a'),
          b.mustache('b'),
          b.mustache('c')
        ];
      }
    }
  });

  astEqual(ast, `{{a}}{{b}}{{c}}{{#w}}{{x}}{{a}}{{b}}{{c}}{{z}}{{/w}}`);
});

QUnit.test('Should recurrsively walk the transformed node', assert => {
  let ast = parse(`{{x}}{{y}}{{z}}`);

  traverse(ast, {
    MustacheStatement: function(node) {
      if (node.path.original === 'x') {
        return b.mustache('y');
      } else if (node.path.original === 'y') {
        return b.mustache('z');
      }
    }
  });

  astEqual(ast, `{{z}}{{z}}{{z}}`);
});

QUnit.test('Should recurrsively walk the keys in the transformed node', assert => {
  let ast = parse(`{{#foo}}{{#bar}}{{baz}}{{/bar}}{{else}}{{#bar}}{{bat}}{{/bar}}{{/foo}}`);

  traverse(ast, {
    BlockStatement: function(node) {
      if (node.path.original === 'foo') {
        return b.block(b.path('x-foo'), node.params, node.hash, node.program, node.inverse, node.loc);
      } else if (node.path.original === 'bar') {
        return b.block(b.path('x-bar'), node.params, node.hash, node.program, node.inverse, node.loc);
      }
    },

    MustacheStatement: function(node) {
      if (node.path.original === 'baz') {
        return b.mustache('x-baz');
      } else if (node.path.original === 'bat') {
        return b.mustache('x-bat');
      }
    }
  });

  astEqual(ast, `{{#x-foo}}{{#x-bar}}{{x-baz}}{{/x-bar}}{{else}}{{#x-bar}}{{x-bat}}{{/x-bar}}{{/x-foo}}`);
});

QUnit.test('Exit event is not triggered if the node is replaced during the enter event', assert => {
  let ast = parse(`{{x}}`);

  let entered = [];
  let exited  = [];

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
