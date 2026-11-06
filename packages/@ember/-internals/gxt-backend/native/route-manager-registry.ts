// gxt NATIVE layer — alias target for
// `@ember/-internals/routing/route-managers/registry`.
//
// Upstream's registry, unchanged except for its DEBUG assertions: upstream
// asserts through `debugAssert` of `@glimmer/global-context`, a Glimmer VM
// package that native leaves out of the app (`scripts/assert-native-dist.mjs`;
// native never sets the global context, so there those assertions were no-ops),
// so here they go through `@ember/debug`'s `assert`, which Ember's global
// context forwards them to anyway.
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { RouteManagerFactory } from '../../routing/route-managers/api';

const ROUTE_MANAGERS = new WeakMap<object, RouteManagerFactory>();

/** Associates a `RouteManagerFactory` with `definition` (upstream's `setRouteManager`). */
export function setRouteManager<Def extends object>(
  factory: RouteManagerFactory,
  definition: Def
): Def {
  if (DEBUG) {
    assert(
      `Attempted to set a route manager on a non-object value. Route managers can only be associated with objects or functions. Value was ${definition}`,
      definition !== null && (typeof definition === 'object' || typeof definition === 'function')
    );

    assert(
      `Attempted to set a route manager more than once on the same value. Each route definition can only have one manager. Value was ${definition}`,
      !ROUTE_MANAGERS.has(definition)
    );
  }

  ROUTE_MANAGERS.set(definition, factory);
  return definition;
}

/**
 * The `RouteManagerFactory` registered for `definition` or a prototype of it
 * (upstream's `getRouteManager`).
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
