var assert = require('assert');

module.exports = function() {};

module.exports.prototype = {
  configure: function(disallowMultipleVarDeclWithAssignment) {
    assert(
      typeof disallowMultipleVarDeclWithAssignment === 'boolean',
      'disallowMultipleVarDeclWithAssignment option requires boolean value'
    );
    assert(
      disallowMultipleVarDeclWithAssignment === true,
      'disallowMultipleVarDeclWithAssignment option requires true value or should be removed'
    );
  },

  getOptionName: function() {
    return 'disallowMultipleVarDeclWithAssignment';
  },

  check: function(file, errors) {
    file.iterateNodesByType('VariableDeclaration', function(node) {
      // allow multiple var declarations in for statement
      // for (var i = 0, j = myArray.length; i < j; i++) {}
      if (node.parentNode.type === 'ForStatement') { return; }

      var hasAssignment = false;
      var multiDeclaration = node.declarations.length > 1;

      node.declarations.forEach(function(declaration) {
        if (declaration.init) { hasAssignment = true; }
      });

      if (hasAssignment && multiDeclaration) {
        errors.add('Multiple assigning variable declarations', node.loc.start);
      }
    });
  }
};
