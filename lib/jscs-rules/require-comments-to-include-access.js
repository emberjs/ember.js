var assert = require('assert');

function isDocComment(comment) {
  return comment.value[0] === '*';
}

function isModuleOnlyComment(comment) {
  return comment.value.match(/^\*\r?\n\s*@module.+\r?\n(?:\s*@submodule.+\r?\n)?$/);
}

function accessDeclarationCount(comment) {
  var matched = comment.value.match(/\r?\n\s*(?:@private|@public|@protected)\s/g);
  return matched ? matched.length : 0;
}

function RequireCommentsToIncludeAccess() { }

RequireCommentsToIncludeAccess.prototype = {
  configure: function(value) {
    assert(
      value === true,
      this.getOptionName() + ' option requires a true value or should be removed'
    );
  },

  getOptionName: function() {
    return 'requireCommentsToIncludeAccess';
  },

  check: function(file, errors) {
    file.iterateTokensByType('Block', function(comment) {
      if (isDocComment(comment) && !isModuleOnlyComment(comment)) {
        var declarationCount = accessDeclarationCount(comment);
        if (declarationCount === 0) {
          errors.add('You must supply `@public`, `@private`, or `@protected` for block comments.', comment.loc.end);
        } else if (declarationCount > 1) {
          errors.add('You must supply `@public`, `@private`, or `@protected` for block comments only once.', comment.loc.end);
        }
      }
    });
  }
};

module.exports = RequireCommentsToIncludeAccess;
