import { get } from '@ember/-internals/metal';
import Controller from '@ember/controller';
import { assert, info } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
/**
 @module @ember/routing
*/
/**
  Generates a controller factory

  @for Ember
  @method generateControllerFactory
  @private
*/
export function generateControllerFactory(owner, controllerName) {
  let factoryManager = owner.factoryFor('controller:basic');
  assert('[BUG] unexpectedly missing a factoryManager for `controller:basic`', factoryManager !== undefined);
  // SAFETY: This is *not* safe, and the cast should be removed in favor of the
  // `assert()` below after altering *tests*. It is left in this state for the
  // moment in the interest of keeping type-only changes separate from changes
  // to the runtime behavior of the system, even for tests.
  let Factory = factoryManager.class;
  // assert(
  //   '[BUG] factory for `controller:main` is unexpectedly not a Controller',
  //   ((factory): factory is typeof Controller => factory === Controller)(Factory)
  // );
  Factory = Factory.extend({
    toString() {
      return `(generated ${controllerName} controller)`;
    }
  });
  let fullName = `controller:${controllerName}`;
  owner.register(fullName, Factory);
  return owner.factoryFor(fullName);
}
/**
  Generates and instantiates a controller extending from `controller:basic`
  if present, or `Controller` if not.

  @for Ember
  @method generateController
  @private
  @since 1.3.0
*/
export default function generateController(owner, controllerName) {
  generateControllerFactory(owner, controllerName);
  let fullName = `controller:${controllerName}`;
  let instance = owner.lookup(fullName);
  assert('Expected an instance of controller', instance instanceof Controller);
  if (DEBUG) {
    if (get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
      info(`generated -> ${fullName}`, {
        fullName
      });
    }
  }
  return instance;
}