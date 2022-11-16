import type { Container } from '@ember/-internals/container';
import type { RegisterOptions } from '@ember/owner';
/**
@module ember
*/

/**
  Finds a controller instance.

  @for Ember
  @method controllerFor
  @private
*/
export default function controllerFor(
  container: Container,
  controllerName: string,
  lookupOptions: RegisterOptions
) {
  return container.lookup(`controller:${controllerName}`, lookupOptions);
}
