var get = Ember.get;

/**
@module ember
@submodule ember-routing
*/

Ember.controllerFor = function(container, controllerName, lookupOptions) {
  return container.lookup('controller:' + controllerName, lookupOptions);
};
/*
  Generates a controller automatically if none was provided.
  The type of generated controller depends on the context.
  You can customize your generated controllers by defining
  `App.ObjectController` and `App.ArrayController`
*/
Ember.generateController = function(container, controllerName, context) {
  var ControllerFactory, fullName, instance, name, factoryName, controllerType;

  if (context && Ember.isArray(context)) {
    controllerType = 'array';
  } else if (context) {
    controllerType = 'object';
  } else {
    controllerType = 'basic';
  }

  factoryName = 'controller:' + controllerType;

  ControllerFactory = container.lookupFactory(factoryName).extend({
    isGenerated: true,
    toString: function() {
      return "(generated " + controllerName + " controller)";
    }
  });

  fullName = 'controller:' + controllerName;

  container.register(fullName, ControllerFactory);

  instance = container.lookup(fullName);

  if (get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
    Ember.Logger.info("generated -> " + fullName, { fullName: fullName });
  }

  return instance;
};
