/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  /**
    Renders the named template in the current context using the singleton
    instance of the same-named controller.

    If a view class with the same name exists, uses the view class.

    If a `model` is specified, it becomes the model for that controller.

    The default target for `{{action}}`s in the rendered template is the
    named controller.

    @method render
    @for Ember.Handlebars.helpers
    @param {String} name
    @param {Object?} contextString
    @param {Hash} options
  */
  Ember.Handlebars.registerHelper('render', function(name, contextString, options) {
    Ember.assert("You must pass a template to render", arguments.length >= 2);
    var container, router, controller, view, context, lookupOptions;

    if (arguments.length === 2) {
      options = contextString;
      contextString = undefined;
    }

    if (typeof contextString === 'string') {
      context = Ember.Handlebars.get(options.contexts[1], contextString, options);
      lookupOptions = { singleton: false };
    }

    if (options.types[0] === "ID") {
      var newName = Ember.Handlebars.get(options.contexts[0], name, options);
      if (newName) {
        Ember.assert("Path must refer to a string to render. The path " + name + " refers to a " + newName.toString(), typeof(newName) === 'string');
        name = newName;
      }
    }

    name = name.replace(/\//g, '.');
    container = options.data.keywords.controller.container;
    router = container.lookup('router:main');

    Ember.assert("You can only use the {{render}} helper once without a model object as its second argument, as in {{render \"post\" post}}.", context || !router || !router._lookupActiveView(name));

    view = container.lookup('view:' + name) || container.lookup('view:default');

    if (controller = options.hash.controller) {
      controller = container.lookup('controller:' + controller, lookupOptions);
    } else {
      controller = Ember.controllerFor(container, name, context, lookupOptions);
    }

    if (controller && context) {
      controller.set('model', context);
    }

    var root = options.contexts[1];

    if (root) {
      view.registerObserver(root, contextString, function() {
        controller.set('model', Ember.Handlebars.get(root, contextString, options));
      });
    }

    controller.set('target', options.data.keywords.controller);

    options.hash.viewName = Ember.String.camelize(name);
    options.hash.template = container.lookup('template:' + name);
    options.hash.controller = controller;

    if (router && !context) {
      router._connectActiveView(name, view);
    }

    Ember.Handlebars.helpers.view.call(this, view, options);
  });

});
