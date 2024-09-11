/**
 * https://astexplorer.net/#/gist/c3f41b75af73006f64476775e73f7daa/e6e3e120df8404b1bff308bec3ed89eaaf0b05f2
 *
 * This plugin exists because, _even when we inline @glimmer/debug_,
 * we cannot get terser to remove/inline/unwrap identity functions.
 *
 * Repro here: https://try.terser.org/
 *
 * ```js
    function x(x) { return x; }
    function y(x, y, z) { return x; };

    function abc(a) { return x(a); }
    function abc2(a) { return y(a); }

    export function example() {
      return `${x(2)} ${y("2")} ${abc(3)} ${abc2("3")}`;
    }
  ```

  With Options:

  {
    module: true,
    compress: {
      passes: 6,
      module: true,
      inline: 3, // default
    },
    mangle: {},
    output: {},
    parse: {},
    rename: {},
  }
 */
export default function (babel) {
  let _removeCheck = removeChecks(babel);

  return {
    name: 'Cleanup local-debug code that terser could not',
    visitor: {
      ImportDeclaration(path, state) {
        _removeCheck.ImportDeclaration(path, state);
      },
      CallExpression(path, state) {
        _removeCheck.CallExpression(path, state);
      },
    },
  };
}

function removeChecks({ template }) {
  let stateKey = Symbol.for('removeChecks');

  const unwrap = ['check'];
  const trueFn = ['CheckInterface', 'wrap', 'CheckOr', 'CheckFunction', 'CheckObject'];
  const removeEntirely = ['recordStackSize'];

  function isToBeRemoved(callPath, state) {
    if (!state) return;

    let ourState = state[stateKey];

    if (!ourState) return;
    /**
     * Do we want to support local aliasing / re-assignment?
     * if so, this would break
     */
    if (!ourState?.names?.has(callPath.node.callee.name)) return;

    return true;
  }

  return {
    ImportDeclaration(path, state) {
      let node = path.node;

      if (!node.source) return;
      if (node.source.value !== '@glimmer/debug') return;

      state[stateKey] ??= { names: new Set(), nodes: [] };

      node.specifiers.forEach((specifier) => {
        let name = specifier.local.name;
        let relevant =
          unwrap.includes(name) || removeEntirely.includes(name) || trueFn.includes(name);
        if (!relevant) return;

        state[stateKey].names.add(name);
        state[stateKey].nodes.push(specifier.local);
      });
    },
    CallExpression(path, state) {
      if (isToBeRemoved(path, state)) {
        let name = path.node.callee.name;
        if (removeEntirely.includes(name)) {
          path.remove();
          return;
        }

        if (trueFn.includes(name)) {
          path.replaceWith(template(`() => true`)());
          return;
        }

        path.replaceWith(path.node.arguments[0]);
      }
    },
  };
}
