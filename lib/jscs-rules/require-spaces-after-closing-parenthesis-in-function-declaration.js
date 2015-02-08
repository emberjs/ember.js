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
    var tokens = file.getTokens();

    file.iterateNodesByType(['FunctionDeclaration'], function(node) {
      var nodeBeforeRoundBrace = node;
      // named function
      if (node.id) {
        nodeBeforeRoundBrace = node.id;
      }

      var functionTokenPos = file.getTokenPosByRangeStart(nodeBeforeRoundBrace.range[0]);
      var functionToken = tokens[functionTokenPos];

      var nextTokenPos = file.getTokenPosByRangeStart(functionToken.range[1]);
      var nextToken = tokens[nextTokenPos];

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

      var tokenBeforeBodyPos = file.getTokenPosByRangeStart(node.body.range[0] - 1);
      var tokenBeforeBody = tokens[tokenBeforeBodyPos];

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
