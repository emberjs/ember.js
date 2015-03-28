var assert = require('assert');

module.exports = function() {};

module.exports.prototype = {
  configure: function(options) {
    assert(
      typeof options === 'object',
      'requireSpacesAfterClosingParenthesisInFunctionDeclaration option must be the object'
    );

    assert(
      options.beforeOpeningCurlyBrace || options.beforeOpeningRoundBrace,
      'requireSpacesAfterClosingParenthesisInFunctionDeclaration must have beforeOpeningCurlyBrace or beforeOpeningRoundBrace property'
    );

    this._beforeOpeningRoundBrace = Boolean(options.beforeOpeningRoundBrace);
    this._beforeOpeningCurlyBrace = Boolean(options.beforeOpeningCurlyBrace);
  },

  getOptionName: function() {
    return 'requireSpacesAfterClosingParenthesisInFunctionDeclaration';
  },

  check: function(file, errors) {
    var beforeOpeningRoundBrace = this._beforeOpeningRoundBrace;
    var beforeOpeningCurlyBrace = this._beforeOpeningCurlyBrace;

    file.iterateNodesByType(['FunctionDeclaration'], function(node) {
      var functionToken = file.getFirstNodeToken(node.id || node);
      var nextToken = file.getNextToken(functionToken);

      if (beforeOpeningRoundBrace) {
        if (nextToken) {
          errors.add(
            'Missing space before opening round brace',
            nextToken.loc.start
          );
        }
      } else {
        if (!nextToken) {
          errors.add(
            'Illegal space before opening round brace',
            functionToken.loc.end
          );
        }
      }

      // errors if no token is found unless `includeComments` is passed
      var tokenBeforeBody = file.getPrevToken(node.body, { includeComments: true });

      if (beforeOpeningCurlyBrace) {
        if (tokenBeforeBody) {
          errors.add(
            'Missing space before opening curly brace',
            tokenBeforeBody.loc.start
          );
        }
      } else {
        if (!tokenBeforeBody) {
          errors.add(
            'Illegal space before opening curly brace',
            node.body.loc.end
          );
        }
      }
    });
  }
};
