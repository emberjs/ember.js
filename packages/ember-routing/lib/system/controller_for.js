var get = Ember.get;

/**
@module ember
@submodule ember-routing
*/

/**

  Finds a controller instance.

  @for Ember
  @method controllerFor
  @private
*/
Ember.controllerFor = function(container, controllerName, lookupOptions) {
  return container.lookup('controller:' + controllerName, lookupOptions);
};

/**
  Generates a controller factory

  The type of the generated controller factory is derived
  from the context. If the context is an array an array controller
  is generated, if an object, an object controller otherwise, a basic
  controller is generated.

  You can customize your generated controllers by defining
  `App.ObjectController` or `App.ArrayController`.

  @for Ember
  @method generateControllerFactory
  @private
*/
Ember.generateControllerFactory = function(container, controllerName, context) {
  var Factory, fullName, instance, name, factoryName, controllerType;

  if (context && Ember.isArray(context)) {
    controllerType = 'array';
  } else if (context) {
    controllerType = 'object';
  } else {
    controllerType = 'basic';
  }

  factoryName = 'controller:' + controllerType;

  Factory = container.lookupFactory(factoryName).extend({
    isGenerated: true,
    toString: function() {
      return "(generated " + controllerName + " controller)";
    }
  });

  fullName = 'controller:' + controllerName;

  container.register(fullName,  Factory);

  return Factory;
};

/**
  Generates and instantiates a controller.

  The type of the generated controller factory is derived
  from the context. If the context is an array an array controller
  is generated, if an object, an object controller otherwise, a basic
  controller is generated.

  @for Ember
  @method generateController
  @private
*/
Ember.generateController = function(container, controllerName, context) {
  Ember.generateControllerFactory(container, controllerName, context);
  var fullName = 'controller:' + controllerName;
  var instance = container.lookup(fullName);

  if (instance && get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
    Ember.Logger.info("generated -> " + fullName, { fullName: fullName });
  }

  return instance;
};
