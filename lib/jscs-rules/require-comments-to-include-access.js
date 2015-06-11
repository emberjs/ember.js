var assert = require('assert');

function isDocComment(comment) {
  return comment.value[0] === '*';
}

function isModuleOnlyComment(comment) {
  return comment.value.match(/^\*\n\s*@module.+\n(?:\s*@submodule.+\n)?$/);
}

function includesAccessDeclaration(comment) {
  return comment.value.match(/\n\s*(@private|@public)\s/);
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
      if (isDocComment(comment) && !isModuleOnlyComment(comment) && !includesAccessDeclaration(comment)) {
        errors.add('You must supply `@public` or `@private` for block comments.', comment.loc.end);
      }
    });
  }
};

module.exports = RequireCommentsToIncludeAccess;
