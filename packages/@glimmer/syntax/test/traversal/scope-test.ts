import { preprocess, traverse } from '../..';

const { module, test } = QUnit;

module('[glimmer-syntax] Traversal - scope', () => {
  test(`Scope is available in template root`, (assert) => {
    let ast = preprocess(`<x y={{z}} />`, { strictMode: true, locals: ['x', 'y', 'z'] });

    traverse(ast, {
      Template: {
        exit(_node, path) {
          let unusedLocals = path.scope.currentUnusedLocals();

          assert.deepEqual(unusedLocals, ['y'], 'locals marked as used/unused correctly');
          assert.ok(path.scope.isLocal('x'), 'x is a local');
          assert.ok(path.scope.isLocal('y'), 'y is a local');
          assert.ok(path.scope.isLocal('z'), 'z is a local');
        },
      },
    });
  });

  test(`Scope is available in blocks`, (assert) => {
    let ast = preprocess(`<x as |y z|></x>`, { strictMode: true, locals: ['x', 'y'] });

    traverse(ast, {
      ElementNode: {
        exit(_node, path) {
          let unusedLocals = path.scope.currentUnusedLocals();

          assert.deepEqual(unusedLocals, ['z'], 'locals marked as used/unused correctly');
          assert.ok(path.scope.isLocal('x'), 'x is a local');
          assert.ok(path.scope.isLocal('y'), 'y is a local');
          assert.ok(path.scope.isLocal('z'), 'z is a local');
        },
      },
    });
  });

  test(`currentUnusedLocals returns false if all locals are used in the current block, string names otherwise`, (assert) => {
    let ast = preprocess(`<x as |y z|>{{z}}</x>`, { strictMode: true, locals: ['x', 'y'] });

    traverse(ast, {
      ElementNode: {
        exit(_node, path) {
          let unusedLocals = path.scope.currentUnusedLocals();

          assert.deepEqual(unusedLocals, false, 'locals marked as used correctly');
        },
      },

      Template: {
        exit(_node, path) {
          let unusedLocals = path.scope.currentUnusedLocals();

          assert.deepEqual(unusedLocals, ['y'], 'locals marked as used correctly');
        },
      },
    });
  });
});
