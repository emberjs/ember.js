var get = Ember.get, set = Ember.set;

require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  Ember.Handlebars.registerHelper('render', function(name, context, options) {
    Ember.assert("You must pass a template to render", arguments.length >= 2);
    var container, router, controller, view;

    if (arguments.length === 2) {
      options = context;
      context = undefined;
    }

    if (typeof context === 'string') {
      context = Ember.Handlebars.get(options.contexts[1], context, options);
    }

    container = options.data.keywords.controller.container;
    router = container.lookup('router:main');

    Ember.assert("This view is alredy rendered", !router || !router._lookupActiveView(name));

    view = container.lookup('view:' + name) || container.lookup('view:default');

    if (controller = options.hash.controller) {
      controller = container.lookup('controller:' + controller);
    } else {
      controller = Ember.controllerFor(container, name, context);
    }

    if (controller && context) {
      controller.set('context', context);
    }

    options.hash.viewName = name;
    options.hash.template = container.lookup('template:' + name);
    options.hash.controller = controller;

    if (router) {
      router._connectActiveView(name, view);
    }

    Ember.Handlebars.helpers.view.call(this, view, options);
  });

});
