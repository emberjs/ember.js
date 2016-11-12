var assert = require('assert');

function spaceAfterBrace(arg, braceToken) {
  if (arg) {
    var supportedArgs = arg.type !== 'UnaryExpression' && arg.type !== 'BinaryExpression';

    return supportedArgs && braceToken.value === '(' && braceToken.range[1] + 1 === arg.range[0];
  }

  return false;
}

function spaceBeforeBrace(arg, braceToken) {
  if (arg) {
    var supportedArgs = arg.type !== 'UnaryExpression' && arg.type !== 'BinaryExpression';

    return supportedArgs && braceToken.value === ')' && braceToken.range[0] === arg.range[1] + 1;
  }

  return false;
}

module.exports = function() {};

module.exports.prototype = {
  configure: function(requireSpacesInsideRoundBracesInCallExpression) {
    assert(
      requireSpacesInsideRoundBracesInCallExpression === true,
      'disallowSpacesInsideRoundBracesInCallExpression option requires true value or should be removed'
    );
  },

  getOptionName: function() {
    return 'disallowSpacesInsideRoundBracesInCallExpression';
  },

  check: function(file, errors) {
    file.iterateNodesByType('CallExpression', function(node) {
      var nodeBeforeRoundBrace = node;

      if (node.callee) {
        nodeBeforeRoundBrace = node.callee;
      }

      var roundBraceTokenStart = file.getTokenByRangeStart(nodeBeforeRoundBrace.range[0]);
      var roundBraceTokenEnd   = file.getTokenByRangeStart(nodeBeforeRoundBrace.range[0]);

      do {
        roundBraceTokenStart = file.findNextToken(roundBraceTokenStart, 'Punctuator', '(');
        roundBraceTokenEnd   = file.findNextToken(roundBraceTokenEnd, 'Punctuator', ')');
      } while (roundBraceTokenStart.range[0] < nodeBeforeRoundBrace.range[1]);

      var firstArg = nodeBeforeRoundBrace.parentNode.arguments[0];
      var lastArg  = nodeBeforeRoundBrace.parentNode.arguments[nodeBeforeRoundBrace.parentNode.arguments.length - 1];

      var spaceAfterOpeningRoundBraceExists  = spaceAfterBrace(firstArg, roundBraceTokenStart);
      var spaceBeforeClosingRoundBraceExists = spaceBeforeBrace(lastArg, roundBraceTokenEnd);

      if (spaceAfterOpeningRoundBraceExists) {
        errors.add(
          'Illegal space after opening round brace',
          roundBraceTokenStart.loc.start
        );
      }

      if (spaceBeforeClosingRoundBraceExists) {
        errors.add(
          'Illegal space before closing round brace',
          roundBraceTokenEnd.loc.start
        );
      }
    });
  }
};
