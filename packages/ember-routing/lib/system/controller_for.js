/**
@module ember
@submodule ember-routing
*/

Ember.controllerFor = function(container, controllerName, context, lookupOptions) {
  return container.lookup('controller:' + controllerName, lookupOptions) ||
         Ember.generateController(container, controllerName, context);
};

Ember.generateController = function(container, controllerName, context) {
  var controller, instance;

  if (context && Ember.isArray(context)) {
    controller = Ember.ArrayController;
  } else if (context) {
    controller = Ember.ObjectController;
  } else {
    controller = Ember.Controller;
  }

  controller.toString = function() {
    return "(generated " + controllerName + " controller)";
  };

  container.register('controller', controllerName, controller);

  instance = container.lookup('controller:' + controllerName);

  if (context) { instance.set('content', context); }

  return instance;
};
