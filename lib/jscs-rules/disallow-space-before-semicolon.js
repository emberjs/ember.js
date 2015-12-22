var assert = require('assert');

module.exports = function() {};

module.exports.prototype = {
  configure: function(disallowSpacesBeforeSemicolons) {
    assert(
      typeof disallowSpacesBeforeSemicolons === 'boolean',
      'disallowSpacesBeforeSemicolons option requires boolean value'
    );
    assert(
      disallowSpacesBeforeSemicolons === true,
      'disallowSpacesBeforeSemicolons option requires true value or should be removed'
    );
  },

  getOptionName: function() {
    return 'disallowSpacesBeforeSemicolons';
  },

  check: function(file, errors) {
    var lines = file.getLines();
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].match(/\s+;$/)) {
        errors.add('Spaces are disallowed before semicolons.', i + 1, lines[i].length - 2);
      }
    }
  }
};
