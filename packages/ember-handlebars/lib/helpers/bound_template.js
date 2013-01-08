require('ember-handlebars/ext');

/**
@module ember
@submodule ember-handlebars
*/

/**
  `boundTemplate` same as the `template` helper, except that it takes the path to the template name.

  @method boundTemplate
  @for Ember.Handlebars.helpers
  @param {String} path to templateName
*/

Ember.Handlebars.registerHelper('boundTemplate', function(path, options) {

  var handlebarsGet = Ember.Handlebars.get, 
      context = (options.contexts && options.contexts[0]) || this,
      name =  handlebarsGet(context, path, options),
      template = Ember.TEMPLATES[name];

  Ember.assert("Unable to find template with name '"+name+"'.", !!template);

  Ember.TEMPLATES[name](this, { data: options.data });
});
