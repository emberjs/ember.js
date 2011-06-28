// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

require('sproutcore-handlebars/ext');

var get = SC.get, getPath = SC.getPath;

/**
  `raw` allows you to output a property without binding. *Important:* The 
  output will not be updated if the property changes. Use with caution.

      <div>{{raw somePropertyThatDoesntChange}}</div>

  @name Handlebars.helpers.raw
  @param {String} property
  @returns {String} HTML string
*/
Handlebars.registerHelper('raw', function(property) {
  return getPath(this, property);
});
