/*globals exports */
exports.compileFormat = function(code, context, filename) {
  return "return Ember.Handlebars.compile("+JSON.stringify(code)+");";
};

