import { Container } from '@ember/-internals/container';
import { TypeOptions } from '@ember/-internals/container/lib/registry';
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
  lookupOptions: TypeOptions
) {
  return container.lookup(`controller:${controllerName}`, lookupOptions);
}
