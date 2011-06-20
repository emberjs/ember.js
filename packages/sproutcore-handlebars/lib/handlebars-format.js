// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// TODO: should actually compile the template and THEN return that function.
// This way we won't have to compile templates on the fly.  This version just
// makes the compile happen when used.
exports.compileFormat = function(tmpl) {
  return '\nrequire("sproutcore-handlebars");\nreturn SC.Handlebars.compile('+JSON.stringify(tmpl)+');';
};
