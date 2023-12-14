/**
  @module @ember/routing
*/
/**
  Finds a controller instance.

  @for Ember
  @method controllerFor
  @private
*/
export default function controllerFor(container, controllerName, lookupOptions) {
  return container.lookup(`controller:${controllerName}`, lookupOptions);
}