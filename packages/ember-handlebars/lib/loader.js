// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

require("ember-handlebars/ext");

// Find templates stored in the head tag as script tags and make them available
// to Ember.CoreView in the global Ember.TEMPLATES object. This will be run as as
// jQuery DOM-ready callback.
Ember.Handlebars.bootstrap = function() {
  Ember.$('script[type="text/html"], script[type="text/x-handlebars"]')
    .each(function() {
    // Get a reference to the script tag
    var script = Ember.$(this),
      // Get the name of the script, used by Ember.View's templateName property.
      // First look for data-template-name attribute, then fall back to its
      // id if no name is found.
      templateName = script.attr('data-template-name') || script.attr('id'),
      template = Ember.Handlebars.compile(script.html()),
      view, viewPath;

    if (templateName) {
      // For templates which have a name, we save them and then remove them from the DOM
      Ember.TEMPLATES[templateName] = template;

      // Remove script tag from DOM
      script.remove();
    } else {
      if (script.parents('head').length !== 0) {
        // don't allow inline templates in the head
        throw new Ember.Error("Template found in \<head\> without a name specified. " +
                         "Please provide a data-template-name attribute.\n" +
                         script.html());
      }

      // For templates which will be evaluated inline in the HTML document, instantiates a new
      // view, and replaces the script tag holding the template with the new
      // view's DOM representation.
      //
      // Users can optionally specify a custom view subclass to use by setting the
      // data-view attribute of the script tag.
      viewPath = script.attr('data-view');
      view = viewPath ? Ember.getPath(viewPath) : Ember.View;

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
};

Ember.$(document).ready(Ember.Handlebars.bootstrap);
