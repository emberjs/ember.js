// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

require("sproutcore-handlebars/ext");

// Find templates stored in the head tag as script tags and make them available
// to SC.CoreView in the global SC.TEMPLATES object.

SC.$(document).ready(function() {
  SC.$('script[type="text/html"]')
    .each(function() {
    // Get a reference to the script tag
    var script = SC.$(this),
      // Get the name of the script, used by SC.View's templateName property.
      // First look for data-template-name attribute, then fall back to its
      // id if no name is found.
      templateName = script.attr('data-template-name') || script.attr('id'),
      template = SC.Handlebars.compile(script.html()),
      view, viewPath;

    if (templateName) {
      SC.TEMPLATES[templateName] = template;

      // Remove script tag from DOM
      script.remove();
    } else {
      if (script.parents('head').length !== 0) {
        // don't allow inline templates in the head
        throw new SC.Error("Template found in \<head\> without a name specified. " +
                         "Please provide a data-template-name attribute.\n" +
                         script.html());
      }
      viewPath = script.attr('data-view');
      view = viewPath ? SC.getPath(viewPath) : SC.View;

      view = view.create({
        template: template
      });

      view._insertElementLater(function() {
        script.replaceWith(this.$());

        // Avoid memory leak in IE
        script = null;
      });
    }
  });
});
