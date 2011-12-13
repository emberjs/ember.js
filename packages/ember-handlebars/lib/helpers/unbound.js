// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

require('ember-handlebars/ext');

var getPath = Ember.getPath;

/**
  `unbound` allows you to output a property without binding. *Important:* The 
  output will not be updated if the property changes. Use with caution.

      <div>{{unbound somePropertyThatDoesntChange}}</div>

  @name Handlebars.helpers.unbound
  @param {String} property
  @returns {String} HTML string
*/
Ember.Handlebars.registerHelper('unbound', function(property, fn) {
  var context = (fn.contexts && fn.contexts[0]) || this;
  return getPath(context, property);
});
