var get = Ember.get;

/**
@module ember
@submodule ember-routing
*/

Ember.controllerFor = function(container, controllerName, context, lookupOptions) {
  return container.lookup('controller:' + controllerName, lookupOptions) ||
         Ember.generateController(container, controllerName, context);
};
/*
  Generates a controller automatically if none was provided.
  The type of generated controller depends on the context.
  You can customize your generated controllers by defining
  `App.ObjectController` and `App.ArrayController`
*/
Ember.generateController = function(container, controllerName, context) {
  var controller, DefaultController, fullName, instance;

  if (context && Ember.isArray(context)) {
    DefaultController = container.resolve('controller:array');
    controller = DefaultController.extend({
      isGenerated: true
    });
  } else if (context) {
    DefaultController = container.resolve('controller:object');
    controller = DefaultController.extend({
      isGenerated: true
    });
  } else {
    DefaultController = container.resolve('controller:basic');
    controller = DefaultController.extend({
      isGenerated: true
    });
  }

  controller.toString = function() {
    return "(generated " + controllerName + " controller)";
  };

  controller.isGenerated = true;

  fullName = 'controller:' + controllerName;
  container.register(fullName, controller);

  instance = container.lookup(fullName);

  if (get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
    Ember.Logger.info("generated -> " + fullName, { fullName: fullName });
  }

  return instance;
};
