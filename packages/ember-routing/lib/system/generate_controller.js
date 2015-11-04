import { info } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';

/**
@module ember
@submodule ember-routing
*/

/**
  Generates a controller factory

  @for Ember
  @method generateControllerFactory
  @private
*/

export function generateControllerFactory(owner, controllerName, context) {
  var Factory, fullName;

  Factory = owner._lookupFactory('controller:basic').extend({
    isGenerated: true,
    toString() {
      return `(generated ${controllerName} controller)`;
    }
  });

  fullName = `controller:${controllerName}`;

  owner.register(fullName, Factory);

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
export default function generateController(owner, controllerName, context) {
  generateControllerFactory(owner, controllerName, context);

  var fullName = `controller:${controllerName}`;
  var instance = owner.lookup(fullName);

  if (get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
    info(`generated -> ${fullName}`, { fullName: fullName });
  }

  return instance;
}
