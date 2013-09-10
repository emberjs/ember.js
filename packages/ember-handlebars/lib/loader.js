/*globals Handlebars */

require("ember-handlebars/ext");

/**
@module ember
@submodule ember-handlebars
*/

/**
  @private

  Find templates stored in the head tag as script tags and make them available
  to `Ember.CoreView` in the global `Ember.TEMPLATES` object. This will be run
  as as jQuery DOM-ready callback.

  Script tags with `text/x-handlebars` will be compiled
  with Ember's Handlebars and are suitable for use as a view's template.
  Those with type `text/x-raw-handlebars` will be compiled with regular
  Handlebars and are suitable for use in views' computed properties.

  @method bootstrap
  @for Ember.Handlebars
  @static
  @param ctx
*/
Ember.Handlebars.bootstrap = function(ctx) {
  var selectors = 'script[type="text/x-handlebars"], script[type="text/x-raw-handlebars"]';

  Ember.$(selectors, ctx)
    .each(function() {
    // Get a reference to the script tag
    var script = Ember.$(this);

    var compile = (script.attr('type') === 'text/x-raw-handlebars') ?
                  Ember.$.proxy(Handlebars.compile, Handlebars) :
                  Ember.$.proxy(Ember.Handlebars.compile, Ember.Handlebars),
      // Get the name of the script, used by Ember.View's templateName property.
      // First look for data-template-name attribute, then fall back to its
      // id if no name is found.
      templateName = script.attr('data-template-name') || script.attr('id') || 'application',
      template = compile(script.html());

    // Check if template of same name already exists
    if (Ember.TEMPLATES[templateName] !== undefined) {
      throw new Error('Template named "' + templateName  + '" already exists.');
    }

    // For templates which have a name, we save them and then remove them from the DOM
    Ember.TEMPLATES[templateName] = template;

    // Remove script tag from DOM
    script.remove();
  });
};

function bootstrap() {
  Ember.Handlebars.bootstrap( Ember.$(document) );
}

/*
Find templates in the global `Ember.TEMPLATES` object with a name that has the 'components' prefix and try
to register them.
*/
function registerComponents(container) {
  var templates = Ember.TEMPLATES, match;
  if (!templates) { return; }

  for (var prop in templates) {
    if (match = prop.match(/^components\/(.*)$/)) {
      registerComponent(container, match[1]);
    }
  }
}


/*
Auto wire template to the corresponding Component by performing a Component lookup that matches the template's name.
*/
function registerComponent(container, name) {
  Ember.assert("You provided a template named 'components/" + name + "', but custom components must include a '-'", name.match(/-/));

  var fullName = 'component:' + name;

  container.injection(fullName, 'layout', 'template:components/' + name);

  var Component = container.lookupFactory(fullName);

  if (!Component) {
    container.register(fullName, Ember.Component);
    Component = container.lookupFactory(fullName);
  }

  Ember.Handlebars.helper(name, Component);
}

/*
  We tie this to application.load to ensure that we've at least
  attempted to bootstrap at the point that the application is loaded.

  We also tie this to document ready since we're guaranteed that all
  the inline templates are present at this point.

  There's no harm to running this twice, since we remove the templates
  from the DOM after processing.
*/

Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'domTemplates',
    initialize: bootstrap
  });

  Application.initializer({
    name: 'registerComponents',
    after: 'domTemplates',
    initialize: registerComponents
  });
});
