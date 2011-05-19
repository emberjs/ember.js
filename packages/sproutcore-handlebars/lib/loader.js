// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

require("sproutcore-handlebars/ext");

// Find templates stored in the DOM as script tags and make them available to
// SC.CoreView in the global SC.TEMPLATES object.
SC.$(document).ready(function() {
  SC.$('script[type="text/x-handlebars-template"]').each(function() {
    // Get a reference to the script tag
    var script = SC.$(this);

    // Get the name of the script, used by SC.View's templateName property.
    // First look for data-template-name attribute, then fall back to its
    // id if no name is found.
    var templateName = script.attr('data-template-name') || script.attr('id');

    if (!templateName) {
      throw new SC.Error("Template found without a name specified." +
                         "Please provide a data-template-name attribute.\n" +
                         script.html());
    }

    SC.TEMPLATES[templateName] = SC.Handlebars.compile(script.html());

    // Remove script tag from DOM
    script.remove();
  });
});
