/**
  Classic substate detection for the route manager. Walks the active
  transition's route hierarchy looking for a `*_<state>` or `*.<state>` route
  matching the route currently resolving (or erroring) and returns its name.
  Entering the substate is the manager's job.

  Mirrors the original `defaultActionHandlers.loading` and
  `defaultActionHandlers.error` + `forEachRouteAbove` machinery that lived
  in `router_js`. Moved here because substates are a classic-interop concern,
  not a router_js responsibility.
*/

import { assert } from '@ember/debug';
import type Owner from '@ember/-internals/owner';
import { getOwner } from '@ember/-internals/owner';
import type Route from '@ember/routing/route';
import type { InternalRouteInfo, RouteStateBucket } from 'router_js';
import { STATE_SYMBOL } from 'router_js';
import { ClassicRouteBucket } from './bucket';

// Substates are classic only. A classic route has a `foo.loading`
// sibling, and only it carries the owner and names the lookup needs.
function classicRouteFor(routeInfo: InternalRouteInfo): Route | undefined {
  return routeInfo.bucket instanceof ClassicRouteBucket ? routeInfo.bucket.route : undefined;
}

export type ActiveTransition = {
  isActive: boolean;
  pivotBucket?: unknown;
  trigger?(ignoreFailure: boolean, name: string, ...args: unknown[]): void;
  [STATE_SYMBOL]?: { routeInfos: InternalRouteInfo[] };
};

export function ancestorRouteInfos(
  transition: ActiveTransition,
  bucket: RouteStateBucket | undefined,
  callback: (routeInfo: InternalRouteInfo) => boolean
): void {
  const routeInfos = transition[STATE_SYMBOL]?.routeInfos ?? [];
  const originIndex = bucket
    ? routeInfos.findIndex((candidate) => candidate?.bucket === bucket)
    : routeInfos.length;

  for (let i = originIndex - 1; i >= 0; i--) {
    const routeInfo = routeInfos[i];
    const done = routeInfo && callback(routeInfo);

    if (done) {
      return;
    }
  }
}

/**
  Finds the name of the substate route if it exists for the given route. A
  substate route is of the form `route_state`, such as `foo_loading`.

  @private
  @param {Route} route
  @param {String} state
  @return {String}
*/
function findRouteSubstateName(route: Route, state: string) {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

  let { routeName, fullRouteName, _router: router } = route;

  let substateName = `${routeName}_${state}`;
  let substateNameFull = `${fullRouteName}_${state}`;

  return routeHasBeenDefined(owner, router, substateName, substateNameFull) ? substateNameFull : '';
}

/**
  Finds the name of the state route if it exists for the given route. A state
  route is of the form `route.state`, such as `foo.loading`. Properly Handles
  `application` named routes.

  @private
  @param {Route} route
  @param {String} state
  @return {String}
*/
function findRouteStateName(route: Route, state: string) {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

  let { routeName, fullRouteName, _router: router } = route;

  let stateName = routeName === 'application' ? state : `${routeName}.${state}`;
  let stateNameFull = fullRouteName === 'application' ? state : `${fullRouteName}.${state}`;

  return routeHasBeenDefined(owner, router, stateName, stateNameFull) ? stateNameFull : '';
}

/**
  Determines whether or not a route has been defined by checking that the route
  is in the Router's map and the owner has a registration for that route.

  @private
  @param {Owner} owner
  @param {Router} router
  @param {String} localName
  @param {String} fullName
  @return {Boolean}
*/
function routeHasBeenDefined(owner: Owner, router: any, localName: string, fullName: string) {
  let routerHasRoute = router.hasRoute(fullName);
  let ownerHasRoute =
    owner.factoryFor(`template:${localName}`) || owner.factoryFor(`route:${localName}`);
  return routerHasRoute && ownerHasRoute;
}

/**
  Walk up from the route currently being resolved (or erroring) through the
  transition's route hierarchy, returning the name of the closest matching
  `*_<state>` or `*.<state>` substate, or an empty string if none is
  defined.

  Rules:
  - For the originating route itself, only the substate form
    (`foo_loading` / `foo_error`) is considered. The state form
    (`foo.loading` / `foo.error`) is conceptually a child route and is
    "below" where we are, so it should not be entered.
  - For ancestor routes, both forms are considered.
  - A `loading` walk stops at the transition's pivot route; an `error` walk
    does not. This matches the classic router's asymmetry: loading substates
    never appear above the pivot, but an error can be handled arbitrarily
    far up.

  @private
  @param {RouteStateBucket|undefined} originBucket the bucket of the route
    currently resolving (or erroring); when `undefined` the walk starts at the
    transition's leaf and considers both substate forms everywhere
  @param {Transition} transition the active transition
  @param {String} state the substate to look for, e.g. `loading` or `error`
 */
export function findSubstateName(
  originBucket: RouteStateBucket | undefined,
  transition: ActiveTransition,
  state: 'loading' | 'error'
): string {
  const routeInfos = transition[STATE_SYMBOL]?.routeInfos ?? [];
  const pivotBucket = transition.pivotBucket;
  const originRouteInfo =
    originBucket && routeInfos.find((candidate) => candidate?.bucket === originBucket);

  let found = '';

  const visitRouteInfo = (routeInfo: InternalRouteInfo): boolean => {
    const route = classicRouteFor(routeInfo);

    if (!route) {
      return false;
    }

    const atPivot = pivotBucket && pivotBucket === routeInfo.bucket;

    found =
      (routeInfo === originRouteInfo ? '' : findRouteStateName(route, state)) ||
      findRouteSubstateName(route, state);

    return Boolean(found || (state === 'loading' && atPivot));
  };

  if (originRouteInfo && visitRouteInfo(originRouteInfo)) {
    return found;
  }

  ancestorRouteInfos(transition, originRouteInfo && originBucket, visitRouteInfo);

  return found;
}
