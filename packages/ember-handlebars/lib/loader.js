/*globals Handlebars */

import ComponentLookup from "ember-views/component_lookup";
import jQuery from "ember-views/system/jquery";
import EmberError from "ember-metal/error";
import { onLoad } from "ember-runtime/system/lazy_load";

import EmberHandlebars from "ember-handlebars-compiler";

/**
@module ember
@submodule ember-handlebars
*/

/**
  Find templates stored in the head tag as script tags and make them available
  to `Ember.CoreView` in the global `Ember.TEMPLATES` object. This will be run
  as as jQuery DOM-ready callback.

  Script tags with `text/x-handlebars` will be compiled
  with Ember's Handlebars and are suitable for use as a view's template.
  Those with type `text/x-raw-handlebars` will be compiled with regular
  Handlebars and are suitable for use in views' computed properties.

  @private
  @method bootstrap
  @for Ember.Handlebars
  @static
  @param ctx
*/
function bootstrap(ctx) {
  var selectors = 'script[type="text/x-handlebars"], script[type="text/x-raw-handlebars"]';

  jQuery(selectors, ctx)
    .each(function() {
    // Get a reference to the script tag
    var script = jQuery(this);

    var compile = (script.attr('type') === 'text/x-raw-handlebars') ?
                  jQuery.proxy(Handlebars.compile, Handlebars) :
                  jQuery.proxy(EmberHandlebars.compile, EmberHandlebars);
    // Get the name of the script, used by Ember.View's templateName property.
    // First look for data-template-name attribute, then fall back to its
    // id if no name is found.
    var templateName = script.attr('data-template-name') || script.attr('id') || 'application';
    var template = compile(script.html());

    // Check if template of same name already exists
    if (Ember.TEMPLATES[templateName] !== undefined) {
      throw new EmberError('Template named "' + templateName  + '" already exists.');
    }

    // For templates which have a name, we save them and then remove them from the DOM
    Ember.TEMPLATES[templateName] = template;

    // Remove script tag from DOM
    script.remove();
  });
}

function _bootstrap() {
  bootstrap( jQuery(document) );
}

function registerComponentLookup(container) {
  container.register('component-lookup:main', ComponentLookup);
}

/*
  We tie this to application.load to ensure that we've at least
  attempted to bootstrap at the point that the application is loaded.

  We also tie this to document ready since we're guaranteed that all
  the inline templates are present at this point.

  There's no harm to running this twice, since we remove the templates
  from the DOM after processing.
*/

onLoad('Ember.Application', function(Application) {
  if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {

  Application.initializer({
    name: 'domTemplates',
    initialize: _bootstrap
  });

  Application.initializer({
    name: 'registerComponentLookup',
    after: 'domTemplates',
    initialize: registerComponentLookup
  });

  }
});

export default bootstrap;
