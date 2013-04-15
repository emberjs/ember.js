/**
@module ember
@submodule ember-routing
*/

Ember.controllerFor = function(container, controllerName, context, lookupOptions) {
  return container.lookup('controller:' + controllerName, lookupOptions) ||
         Ember.generateController(container, controllerName, context);
};
/**
  Generates a controller automatically if none was provided.
  The type of generated controller depends on the context.
  You can customize your generated controllers by defining
  `App.ObjectController` and `App.ArrayController`
*/
Ember.generateController = function(container, controllerName, context) {
  var controller, DefaultController, fullName;

  if (context && Ember.isArray(context)) {
    DefaultController = container.resolve('controller:array');
    controller = DefaultController.extend({
      content: context
    });
  } else if (context) {
    DefaultController = container.resolve('controller:object');
    controller = DefaultController.extend({
      content: context
    });
  } else {
    DefaultController = container.resolve('controller:basic');
    controller = DefaultController.extend();
  }

  controller.toString = function() {
    return "(generated " + controllerName + " controller)";
  };


  fullName = 'controller:' + controllerName;
  container.register(fullName, controller);
  return container.lookup(fullName);
};
