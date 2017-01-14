'use strict';

module.exports = function(context) {
  return {
    VariableDeclaration: function(node) {
      if (node.kind !== 'const') {
        return;
      }

      if (node.parent && node.parent.type === 'Program') {
        // Declaration is in root of module.
        return;
      }

      if (node.parent && node.parent.type === 'ExportNamedDeclaration' &&
        node.parent.parent && node.parent.parent.type === 'Program') {
        // Declaration is a `export const foo = 'asdf'` in root of the module.
        return;
      }

      context.report({
        node: node,
        message: '`const` should only be used in module scope (not inside functions/blocks).'
      });
    }
  };
};

module.exports.schema = []; // no options
