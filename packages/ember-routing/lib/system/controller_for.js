import Ember from "ember-metal/core"; // Logger
import { get } from "ember-metal/property_get";
import { isArray } from "ember-metal/utils";

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
export function controllerFor(container, controllerName, lookupOptions) {
  return container.lookup('controller:' + controllerName, lookupOptions);
}

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

export { generateControllerFactory };
function generateControllerFactory(container, controllerName, context) {
  var Factory, fullName, instance, name, factoryName, controllerType;

  if (context && isArray(context)) {
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
}

/**
  Generates and instantiates a controller.

  The type of the generated controller factory is derived
  from the context. If the context is an array an array controller
  is generated, if an object, an object controller otherwise, a basic
  controller is generated.

  @for Ember
  @method generateController
  @private
  @since 1.3.0
*/
export function generateController(container, controllerName, context) {
  generateControllerFactory(container, controllerName, context);
  var fullName = 'controller:' + controllerName;
  var instance = container.lookup(fullName);

  if (get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
    Ember.Logger.info("generated -> " + fullName, { fullName: fullName });
  }

  return instance;
}
