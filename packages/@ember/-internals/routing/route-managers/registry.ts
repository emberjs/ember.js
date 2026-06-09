/**
  Registry that associates a `RouteManagerFactory` with a route definition
  (typically a `Route` class).
*/

import { DEBUG } from '@glimmer/env';
import { debugAssert } from '@glimmer/global-context';
import type { RouteManagerFactory } from './api';

const ROUTE_MANAGERS = new WeakMap<object, RouteManagerFactory>();

/**
  Associates a `RouteManagerFactory` with `definition`. The router calls the
  factory the first time it needs a manager for any route whose class extends
  (directly or via prototype chain) `definition`.

  ```ts
  import { setRouteManager } from '@ember/routing';

  class MyRouteManager { ... }

  setRouteManager((owner) => new MyRouteManager(owner), MyRoute);
  ```

  @param factory Factory invoked once per owner with that owner as its only
    argument. Must return an object whose `capabilities` field was produced by
    `routeCapabilities`.
  @param definition The route class or object the manager applies to.
 */
export function setRouteManager<Def extends object>(
  factory: RouteManagerFactory,
  definition: Def
): Def {
  if (DEBUG) {
    debugAssert(
      definition !== null && (typeof definition === 'object' || typeof definition === 'function'),
      `Attempted to set a route manager on a non-object value. Route managers can only be associated with objects or functions. Value was ${definition}`
    );

    debugAssert(
      !ROUTE_MANAGERS.has(definition),
      `Attempted to set a route manager more than once on the same value. Each route definition can only have one manager. Value was ${definition}`
    );
  }

  ROUTE_MANAGERS.set(definition, factory);
  return definition;
}

/**
  Returns the `RouteManagerFactory` registered for `definition`, walking the
  prototype chain. Returns `undefined` if no manager is registered.

  Note that this only returns the factory, the router is responsible for
  invoking it (typically once per owner) and caching the resulting manager
  instance.
 */
export function getRouteManager(definition: object): RouteManagerFactory | undefined {
  let pointer: object | null = definition;
  while (pointer !== null) {
    const factory = ROUTE_MANAGERS.get(pointer);
    if (factory !== undefined) {
      return factory;
    }
    pointer = Object.getPrototypeOf(pointer) as object | null;
  }

  return undefined;
}
