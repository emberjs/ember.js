import { astEqual } from '../support';
import {
  parse,
  traverse,
  builders as b
} from 'glimmer-syntax';
import {
  cannotRemoveNode,
  cannotReplaceNode,
} from 'glimmer-syntax/lib/traversal/errors';

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

QUnit.test('Exit event is not triggered if the node is replaced during the enter event', assert => {
  let ast = parse(`{{x}}`);
  let didExit = false;

  traverse(ast, {
    MustacheStatement: {
      enter() { return b.mustache('y'); },
      exit() { didExit = true; }
    }
  });

  assert.strictEqual(didExit, false);
});
