/*globals exports */
exports.compileFormat = function(code, context, filename) {
  return "return SC.Handlebars.compile("+JSON.stringify(code)+");";
};

