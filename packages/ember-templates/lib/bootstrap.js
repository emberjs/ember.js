/**
@module ember
@submodule ember-templates
*/

import jQuery from 'ember-views/system/jquery';
import EmberError from 'ember-metal/error';
import { onLoad } from 'ember-runtime/system/lazy_load';
import { compile } from 'ember-template-compiler';
import { environment } from 'ember-environment';
import {
  has as hasTemplate,
  set as registerTemplate
} from 'ember-templates/template_registry';

/**
@module ember
@submodule ember-templates
*/

/**
  Find templates stored in the head tag as script tags and make them available
  to `Ember.CoreView` in the global `Ember.TEMPLATES` object. This will be run
  as a jQuery DOM-ready callback.

  Script tags with `text/x-handlebars` will be compiled
  with Ember's template compiler and are suitable for use as a view's template.

  @private
  @method bootstrap
  @for Ember.HTMLBars
  @static
  @param ctx
*/
function bootstrap(ctx) {
  let selectors = 'script[type="text/x-handlebars"]';

  jQuery(selectors, ctx)
  .each(function() {
    // Get a reference to the script tag.
    let script = jQuery(this);

    // Get the name of the script, used by Ember.View's templateName property.
    // First look for data-template-name attribute, then fall back to its
    // id if no name is found.
    let templateName = script.attr('data-template-name') || script.attr('id') || 'application';
    let template;

    template = compile(script.html(), {
      moduleName: templateName
    });

    // Check if template of same name already exists.
    if (hasTemplate(templateName)) {
      throw new EmberError('Template named "' + templateName  + '" already exists.');
    }

    // For templates which have a name, we save them and then remove them from the DOM.
    registerTemplate(templateName, template);

    // Remove script tag from DOM.
    script.remove();
  });
}

function _bootstrap() {
  bootstrap(jQuery(document));
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
  Application.initializer({
    name: 'domTemplates',
    initialize: environment.hasDOM ? _bootstrap : function() { }
  });
});

export default bootstrap;
