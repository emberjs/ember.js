// TODO there are like 3 things that do this

function stripClassCallCheck() {
  let _specifier;
  let decl;
  return {
    name: 'remove classCallCheck',
    visitor: {
      Program: {
        enter(path, state) {
          let { source } = state.opts;
          let body = path.get('body');
          for (const part of body) {
            if (part.isImportDeclaration() && part.node.source.value === 'ember-babel') {
              let specifiers = part.get('specifiers');

              for (const specifier of specifiers) {
                if (specifier.node.imported.name === 'classCallCheck') {
                  _specifier = specifier;
                  decl = part;
                  break;
                }
              }
            }
          }
        },
        exit(path) {
          if (!_specifier) {
            return;
          }

          _specifier.remove();

          let specifiers = decl.get('specifiers');

          if (specifiers.length === 0) {
            decl.remove()
          }

          _specifier = null;
          decl = null;
        }
      },
      CallExpression(path) {
        if (!_specifier) {
          return;
        }

        if (_specifier.node === null) {
          console.log(_specifier);
        }

        if (_specifier && path.node.callee.name === _specifier.node.local.name) {
          path.remove();
        }
      }
    }
  }
}


stripClassCallCheck.baseDir = function() {
  return 'babel-core';
}

module.exports = stripClassCallCheck;