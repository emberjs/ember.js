import { Container } from '@ember/-internals/container';
import { LookupOptions } from '@ember/-internals/owner';
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
  lookupOptions: LookupOptions
) {
  return container.lookup(`controller:${controllerName}`, lookupOptions);
}
