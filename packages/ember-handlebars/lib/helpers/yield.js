var get = Ember.get, set = Ember.set;

Ember.Handlebars.registerHelper('yield', function(options) {
  var view = options.data.view, template;

  while (view && !get(view, 'layout')) {
    view = get(view, 'parentView');
  }

  ember_assert("You called yield in a template that was not a layout", !!view);

  template = get(view, 'template');

  ember_assert("You called yield on " + view.toString() + " without supplying a template", !!template);
  template(this, options);
});
