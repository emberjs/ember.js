function injectNodeGlobals({ types: t }) {
  let requireId;
  let importDecl;
  let moduleId;
  return {
    name: 'inject require',
    visitor: {
      Program: {
        enter(path) {
          requireId = path.scope.globals.require;
          moduleId = path.scope.globals.module;

          if (requireId || moduleId) {
            let specifiers = [];
            let source = t.stringLiteral('node-module');

            if (requireId) {
              delete path.scope.globals.require;
              specifiers.push(t.importSpecifier(requireId, t.identifier('require')));
            }

            if (moduleId) {
              delete path.scope.globals.module;
              specifiers.push(t.importSpecifier(moduleId, t.identifier('module')));
            }

            importDecl = t.importDeclaration(specifiers, source);
            path.unshiftContainer('body', importDecl);
          }
        },
        exit(path) {
          if (requireId) {
            path.scope.rename('require');
          }
        },
      },
      ImportDeclaration(path) {
        if (path.node === importDecl) {
          path.scope.registerDeclaration(path);
        }
      },
    },
  };
}

injectNodeGlobals.baseDir = function() {
  return 'babel-plugin-transform-es2015-modules-amd';
};

module.exports = injectNodeGlobals;
