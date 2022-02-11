import { get } from '@ember/-internals/metal';
import { Factory, Owner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import { assert, info } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
/**
@module ember
*/

/**
  Generates a controller factory

  @for Ember
  @method generateControllerFactory
  @private
*/

export function generateControllerFactory(owner: Owner, controllerName: string): Factory<{}> {
  let Factory = (owner.factoryFor('controller:basic') as Factory<any, any>).class;

  Factory = Factory.extend({
    toString() {
      return `(generated ${controllerName} controller)`;
    },
  });

  let fullName = `controller:${controllerName}`;

  owner.register(fullName, Factory);

  return owner.factoryFor(fullName) as Factory<{}>;
}

/**
  Generates and instantiates a controller extending from `controller:basic`
  if present, or `Controller` if not.

  @for Ember
  @method generateController
  @private
  @since 1.3.0
*/
export default function generateController(owner: Owner, controllerName: string): Controller {
  generateControllerFactory(owner, controllerName);

  let fullName = `controller:${controllerName}`;
  let instance = owner.lookup(fullName);
  assert('Expected an instance of controller', instance instanceof Controller);

  if (DEBUG) {
    if (get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
      info(`generated -> ${fullName}`, { fullName });
    }
  }

  return instance;
}
