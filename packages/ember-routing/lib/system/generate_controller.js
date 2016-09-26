import {
  info,
  get
} from 'ember-metal';

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
  let Factory = owner.factoryFor('controller:basic').class.extend({
    isGenerated: true,
    toString() {
      return `(generated ${controllerName} controller)`;
    }
  });

  let fullName = `controller:${controllerName}`;

  owner.register(fullName, Factory);

  return Factory;
}

/**
  Generates and instantiates a controller extending from `controller:basic`
  if present, or `Ember.Controller` if not.

  @for Ember
  @method generateController
  @private
  @since 1.3.0
*/
export default function generateController(owner, controllerName) {
  generateControllerFactory(owner, controllerName);

  let fullName = `controller:${controllerName}`;
  let instance = owner.lookup(fullName);

  if (get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
    info(`generated -> ${fullName}`, { fullName: fullName });
  }

  return instance;
}
