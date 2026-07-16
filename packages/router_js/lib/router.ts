/* eslint-disable no-prototype-builtins */
import type { MatchCallback, Params, QueryParams } from 'route-recognizer';
import RouteRecognizer from 'route-recognizer';
import { Promise } from 'rsvp';
import type { Dict, Maybe, Option } from './core';
import type { ModelFor, BaseRoute, RouteInfo, RouteInfoWithAttributes } from './route-info';
import type InternalRouteInfo from './route-info';
import { toReadOnlyRouteInfo } from './route-info';
import type { OpaqueTransition, PublicTransition as Transition } from './transition';
import InternalTransition, { logAbort, QUERY_PARAMS_SYMBOL, STATE_SYMBOL } from './transition';
import type { DidEnterState, DidExitState, ExitState, WillExitState } from './route-manager';
import { hasClassicInterop } from './route-manager';
import type { TransitionIntent } from './transition-intent';
import NamedTransitionIntent from './transition-intent/named-transition-intent';
import URLTransitionIntent from './transition-intent/url-transition-intent';
import type { TransitionError } from './transition-state';
import TransitionState from './transition-state';
import type { ChangeList, ModelsAndQueryParams } from './utils';
import { extractQueryParams, forEach, getChangelist, log, merge, promiseLabel } from './utils';

export interface SerializerFunc<T> {
  (model: T, params: string[]): Dict<unknown>;
}

export interface ParsedHandler {
  handler: string;
  names: string[];
}

export default abstract class Router<R extends BaseRoute> {
  private _lastQueryParams = {};
  log?: (message: string) => void;
  state?: TransitionState<R> = undefined;
  oldState: Maybe<TransitionState<R>> = undefined;
  activeTransition?: InternalTransition<R> = undefined;
  currentRouteInfos?: InternalRouteInfo<R>[] = undefined;
  _changedQueryParams?: Dict<unknown> = undefined;
  currentSequence = 0;
  recognizer: RouteRecognizer;

  constructor(logger?: (message: string) => void) {
    this.log = logger;
    this.recognizer = new RouteRecognizer();
    this.reset();
  }

  abstract getRoute(name: string): R | Promise<R>;
  abstract getSerializer(name: string): SerializerFunc<ModelFor<R>> | undefined;
  abstract updateURL(url: string): void;
  abstract replaceURL(url: string): void;
  abstract willTransition(
    oldRouteInfos: InternalRouteInfo<R>[],
    newRouteInfos: InternalRouteInfo<R>[],
    transition: Transition
  ): void;
  abstract didTransition(routeInfos: InternalRouteInfo<R>[]): void;
  abstract triggerEvent(
    routeInfos: InternalRouteInfo<R>[],
    ignoreFailure: boolean,
    name: string,
    args: unknown[]
  ): void;

  abstract routeWillChange(transition: Transition): void;
  abstract routeDidChange(transition: Transition): void;
  abstract transitionDidError(error: TransitionError, transition: Transition): Transition | Error;

  // -- Manager-driven transition lifecycle -------------------------------------
  //
  // The three `on*` methods below drive the RouteManager lifecycle for every
  // router. Host routers (EmberRouter's microlib, the test router) customize
  // behaviour through the small protected hooks rather than re-implementing
  // the orchestration.

  /**
    Whether the host application is tearing down. A destroyed router skips
    the post-settle lifecycle (didEnter/didExit, URL update, events).
   */
  protected isRouterDestroyed(): boolean {
    return false;
  }

  /**
    Host hook: schedule a render-tree update because `currentRouteInfos`
    changed. EmberRouter renders by scheduling `_setOutlets`; the default is
    a no-op for hosts that don't render.

    Called with `immediate: true` when the update must render right away for
    correctness — the transition settled, or a loading/error substate was
    entered.

    Called with `immediate: false` for the incremental updates fired as each
    route in an in-flight transition becomes ready. These are an optimization
    (render parent routes while a child's model is still loading), and a host
    is free to delay or batch them. Batching matters: each readiness event
    arrives in its own run loop, so rendering one pass per event walks the
    outlet tree once per route — 12 renders for a single 9-route transition,
    measured, where 2 suffice.
   */
  protected scheduleOutletUpdate(_immediate = false): void {}

  /**
    Handles an error thrown synchronously by a `didEnter` hook (classic
    `activate`/`setupController`). The default routes it through
    `transitionDidError` — so it reaches error actions/substates the same way
    `enter` rejections do — and throws the resulting reason so the transition
    promise rejects.
   */
  protected handleDidEnterError(
    error: unknown,
    activeTransition: InternalTransition<R>,
    newState: TransitionState<R>,
    _preTransitionState: TransitionState<R> | undefined
  ): never {
    const errorRoute = newState.routeInfos[newState.routeInfos.length - 1]?.route;
    const reason = this.transitionDidError(
      { error, route: errorRoute, wasAborted: false } as unknown as TransitionError,
      activeTransition
    );
    throw reason;
  }

  // Called once per route in parent-to-child order as each route's
  // `getInvokable` resolves. Writes the route into `currentRouteInfos` at its
  // slot and schedules a render so the outlet tree builds up incrementally
  // instead of waiting for the whole transition to settle.
  onRouteInvokableReady(
    routeInfo: InternalRouteInfo<R>,
    _transition: InternalTransition<R>,
    routeIndex: number
  ): void {
    const currentRouteInfos = this.currentRouteInfos ?? [];
    currentRouteInfos[routeIndex] = routeInfo;
    this.currentRouteInfos = currentRouteInfos;
    this.scheduleOutletUpdate(false);
  }

  // Called when `intermediateTransitionTo` fires (a classic loading or error
  // substate). Splices the substate into `currentRouteInfos` without
  // disturbing already-rendering ancestor routes and fires `didEnter` so
  // classic activate/setup runs. Substates are classic machinery, so the
  // didEnter only goes to classic-interop managers.
  onIntermediateTransition(newState: TransitionState<R>, transition: InternalTransition<R>): void {
    const partition = this.partitionRoutes(this.state!, newState);
    this.currentRouteInfos = [...partition.unchanged, ...partition.entered];

    this.oldState = this.state;
    this.state = newState;

    const navFrom = (transition.from ?? undefined) as RouteInfo | undefined;
    const navTo = transition.to as RouteInfo;

    const fireDidEnter = (routeInfo: InternalRouteInfo<R>) => {
      const { manager, bucket } = routeInfo;
      if (manager === undefined || bucket === undefined || !hasClassicInterop(manager)) {
        return;
      }
      manager.didEnter(bucket, {
        from: navFrom,
        to: navTo,
        transition,
        internalRouteInfo: routeInfo,
        enter: true,
      });
    };

    for (const routeInfo of partition.entered) {
      if (routeInfo.route !== undefined) {
        fireDidEnter(routeInfo);
      } else {
        // Async route (e.g. across an engine boundary): fire once it resolves.
        void routeInfo.routePromise.then(() => fireDidEnter(routeInfo));
      }
    }

    this.scheduleOutletUpdate(true);
  }

  // Called once every route in the transition has resolved. Runs the rest of
  // the lifecycle through the RouteManager API:
  //
  //   1. `willExit` + `exit` on routes leaving the hierarchy
  //   2. classic-interop `willExit(isExiting=false)` on updated routes
  //   3. awaits every entering/updating route's `enterPromise`
  //   4. `didEnter` on entered routes (and, interop-only, updated routes)
  //   5. `didExit` on exited routes
  //   6. query-param finalisation, URL update, didTransition events
  //
  // Resolves the transition's promise with the leaf route, preserving the
  // classic `finalizeTransition` contract.
  onTransitionSettled(
    activeTransition: InternalTransition<R>,
    newState: TransitionState<R>
  ): Promise<unknown> {
    const partition = this.partitionRoutes(this.state!, newState);
    const preTransitionState = this.state;

    this.oldState = this.state;
    this.state = newState;

    const navFrom = (activeTransition.from ?? undefined) as RouteInfo | undefined;
    const navTo = activeTransition.to as RouteInfo;
    const cancel = () => activeTransition.abort();

    // Leaving the hierarchy: willExit + exit, leaf-first.
    for (const exitingRouteInfo of partition.exited) {
      const { manager, bucket } = exitingRouteInfo;
      if (manager !== undefined && bucket !== undefined) {
        const willExitState: WillExitState = { from: navFrom, to: navTo, cancel };
        const exitState: ExitState = { from: navFrom, to: navTo };
        if (hasClassicInterop(manager)) {
          Object.assign(willExitState, {
            transition: activeTransition,
            internalRouteInfo: exitingRouteInfo,
            isExiting: true,
          });
          Object.assign(exitState, { transition: activeTransition });
        }
        manager.willExit(bucket, willExitState);
        manager.exit(bucket, exitState);
      }
    }

    // Filter exited routes out of currentRouteInfos. Truncating to
    // `unchanged.length` would lose entering routes that
    // `onRouteInvokableReady` already wrote at higher indices.
    const exitedRouteObjects = new Set(partition.exited.map((ri) => ri.route));
    if (this.currentRouteInfos) {
      this.currentRouteInfos = this.currentRouteInfos.filter(
        (cri) => !exitedRouteObjects.has(cri.route)
      );
    }

    // "Context updated while staying mounted" is the classic update path; the
    // RFC treats updates as a manager-internal concern, so only interop
    // managers receive this willExit.
    for (const resetRouteInfo of partition.reset) {
      const { manager, bucket } = resetRouteInfo;
      if (manager !== undefined && bucket !== undefined && hasClassicInterop(manager)) {
        manager.willExit(bucket, {
          from: navFrom,
          to: navTo,
          cancel,
          transition: activeTransition,
          internalRouteInfo: resetRouteInfo,
          isExiting: false,
        });
      }
    }

    // Await all entering/updating routes' enter promises. Swallow rejections
    // here: a rejected enterPromise has already been routed through
    // `transitionDidError`; rethrowing would fire the global unhandled
    // rejection handler on subsequent transitions.
    const enteringRouteInfos = [...partition.entered, ...partition.updatedContext];
    const enterPromises = enteringRouteInfos.map((routeInfo) => {
      const p = routeInfo.enterPromise ?? Promise.resolve(undefined);
      return p.catch(() => undefined);
    });

    return Promise.all(enterPromises).then(() => {
      if (this.isRouterDestroyed()) {
        return;
      }
      if (activeTransition.isAborted) {
        return;
      }

      try {
        for (const enteredRouteInfo of partition.entered) {
          const { manager, bucket } = enteredRouteInfo;
          if (manager !== undefined && bucket !== undefined) {
            const didEnterState: DidEnterState = { from: navFrom, to: navTo };
            if (hasClassicInterop(manager)) {
              Object.assign(didEnterState, {
                transition: activeTransition,
                internalRouteInfo: enteredRouteInfo,
                enter: true,
              });
            }
            manager.didEnter(bucket, didEnterState);
          }
        }

        // The `enter: false` didEnter is the classic update path (see the
        // reset loop above); only interop managers receive it.
        for (const updatedRouteInfo of partition.updatedContext) {
          const { manager, bucket } = updatedRouteInfo;
          if (manager !== undefined && bucket !== undefined && hasClassicInterop(manager)) {
            manager.didEnter(bucket, {
              from: navFrom,
              to: navTo,
              transition: activeTransition,
              internalRouteInfo: updatedRouteInfo,
              enter: false,
            });
          }
        }
      } catch (error) {
        return this.handleDidEnterError(error, activeTransition, newState, preTransitionState);
      }

      // A didEnter hook may have redirected (classic `transitionTo` inside
      // `setupController`); reject with the abort so the transition promise
      // settles the way classic callers expect.
      if (activeTransition.isAborted) {
        throw logAbort(activeTransition);
      }

      for (const exitedRouteInfo of partition.exited) {
        const { manager, bucket } = exitedRouteInfo;
        if (manager !== undefined && bucket !== undefined) {
          const didExitState: DidExitState = { from: navFrom, to: navTo };
          if (hasClassicInterop(manager)) {
            Object.assign(didExitState, {
              transition: activeTransition,
              internalRouteInfo: exitedRouteInfo,
            });
          }
          manager.didExit(bucket, didExitState);
        }
      }

      // Snap currentRouteInfos to the authoritative settled list.
      this.currentRouteInfos = newState.routeInfos.slice();

      this.state!.queryParams = this.finalizeQueryParamChange(
        this.currentRouteInfos,
        newState.queryParams,
        activeTransition
      );

      this._updateURL(activeTransition, newState);

      activeTransition.isActive = false;
      // Only clear `activeTransition` if it's still us; a newer transition
      // may already have replaced it.
      if (this.activeTransition === activeTransition) {
        this.activeTransition = undefined;
      }

      this.scheduleOutletUpdate(true);

      this.triggerEvent(this.currentRouteInfos, true, 'didTransition', []);
      this.didTransition(this.currentRouteInfos);
      this.toInfos(activeTransition, newState.routeInfos, true);
      this.routeDidChange(activeTransition);

      // Resolve the transition's promise with the leaf route, preserving the
      // classic finalizeTransition contract.
      return newState.routeInfos[newState.routeInfos.length - 1]?.route;
    });
  }

  /**
    The main entry point into the router. The API is essentially
    the same as the `map` method in `route-recognizer`.

    This method extracts the String handler at the last `.to()`
    call and uses it as the name of the whole route.

    @param {Function} callback
  */
  map(callback: MatchCallback) {
    this.recognizer.map(callback, function (recognizer, routes) {
      for (let i = routes.length - 1, proceed = true; i >= 0 && proceed; --i) {
        let route = routes[i]!;
        let handler = route.handler as string;
        recognizer.add(routes, { as: handler });
        proceed = route.path === '/' || route.path === '' || handler.slice(-6) === '.index';
      }
    });
  }

  hasRoute(route: string) {
    return this.recognizer.hasRoute(route);
  }

  queryParamsTransition(
    changelist: ChangeList,
    wasTransitioning: boolean,
    oldState: TransitionState<R>,
    newState: TransitionState<R>
  ): OpaqueTransition {
    this.fireQueryParamDidChange(newState, changelist);

    if (!wasTransitioning && this.activeTransition) {
      // One of the routes in queryParamsDidChange
      // caused a transition. Just return that transition.
      return this.activeTransition;
    } else {
      // Running queryParamsDidChange didn't change anything.
      // Just update query params and be on our way.

      // We have to return a noop transition that will
      // perform a URL update at the end. This gives
      // the user the ability to set the url update
      // method (default is replaceState).
      let newTransition = new InternalTransition(this, undefined, undefined);
      newTransition.queryParamsOnly = true;

      oldState.queryParams = this.finalizeQueryParamChange(
        newState.routeInfos,
        newState.queryParams,
        newTransition
      );

      newTransition[QUERY_PARAMS_SYMBOL] = newState.queryParams;

      this.toReadOnlyInfos(newTransition, newState);

      this.routeWillChange(newTransition);

      newTransition.promise = newTransition.promise!.then(
        (result: TransitionState<R> | BaseRoute | Error | undefined) => {
          if (!newTransition.isAborted) {
            this._updateURL(newTransition, oldState);
            this.didTransition(this.currentRouteInfos!);
            this.toInfos(newTransition, newState.routeInfos, true);
            this.routeDidChange(newTransition);
          }
          return result;
        },
        null,
        promiseLabel('Transition complete')
      );

      return newTransition;
    }
  }

  transitionByIntent(intent: TransitionIntent<R>, isIntermediate: boolean): InternalTransition<R> {
    try {
      return this.getTransitionByIntent(intent, isIntermediate);
    } catch (e) {
      return new InternalTransition(this, intent, undefined, e, undefined);
    }
  }

  recognize(url: string): Option<RouteInfo> {
    let intent = new URLTransitionIntent<R>(this, url);
    let newState = this.generateNewState(intent);

    if (newState === null) {
      return newState;
    }

    let readonlyInfos = toReadOnlyRouteInfo(newState.routeInfos, newState.queryParams, {
      includeAttributes: false,
      localizeMapUpdates: true,
    });
    return readonlyInfos[readonlyInfos.length - 1] as RouteInfo;
  }

  recognizeAndLoad(url: string): Promise<RouteInfoWithAttributes> {
    let intent = new URLTransitionIntent<R>(this, url);
    let newState = this.generateNewState(intent);

    if (newState === null) {
      return Promise.reject(`URL ${url} was not recognized`);
    }

    let newTransition: OpaqueTransition = new InternalTransition(this, intent, newState, undefined);
    return newTransition.then(() => {
      let routeInfosWithAttributes = toReadOnlyRouteInfo(
        newState!.routeInfos,
        newTransition[QUERY_PARAMS_SYMBOL],
        {
          includeAttributes: true,
          localizeMapUpdates: false,
        }
      ) as RouteInfoWithAttributes[];
      return routeInfosWithAttributes[routeInfosWithAttributes.length - 1]!;
    });
  }

  private generateNewState(intent: TransitionIntent<R>): Option<TransitionState<R>> {
    try {
      return intent.applyToState(this.state!, false);
    } catch (_e) {
      return null;
    }
  }

  private getTransitionByIntent(
    intent: TransitionIntent<R>,
    isIntermediate: boolean
  ): InternalTransition<R> {
    let wasTransitioning = Boolean(this.activeTransition);
    let oldState = wasTransitioning ? this.activeTransition![STATE_SYMBOL] : this.state;
    let newTransition: InternalTransition<R>;

    let newState = intent.applyToState(oldState!, isIntermediate);
    let queryParamChangelist = getChangelist(oldState!.queryParams, newState.queryParams);

    if (routeInfosEqual(newState.routeInfos, oldState!.routeInfos)) {
      // This is a no-op transition. See if query params changed.
      if (queryParamChangelist) {
        if (!wasTransitioning) {
          // Not in an active transition — use the QP-only fast path
          // which updates the URL without re-resolving route hooks.
          let newTransition = this.queryParamsTransition(
            queryParamChangelist,
            wasTransitioning,
            oldState!,
            newState
          );
          newTransition.queryParamsOnly = true;
          // SAFETY: The returned OpaqueTransition should actually be this.
          return newTransition as InternalTransition<R>;
        }
        // When a query-param-only transition is started during an active
        // transition (for example, from beforeModel/afterModel), avoid the
        // QP-only fast path and intentionally fall through to the normal
        // transition path so it can abort and replace the active transition.
      } else {
        // No-op. No need to create a new transition.
        return this.activeTransition || new InternalTransition(this, undefined, undefined);
      }
    }

    if (isIntermediate) {
      let transition = new InternalTransition(this, undefined, newState);
      transition.isIntermediate = true;
      this.toReadOnlyInfos(transition, newState);
      this.onIntermediateTransition(newState, transition);

      this.routeWillChange(transition);
      return this.activeTransition!;
    }

    // Create a new transition to the destination route.
    newTransition = new InternalTransition(
      this,
      intent,
      newState,
      undefined,
      this.activeTransition
    );

    // transition is to same route with same params, only query params differ.
    // not caught above probably because refresh() has been used
    if (routeInfosSameExceptQueryParams(newState.routeInfos, oldState!.routeInfos)) {
      newTransition.queryParamsOnly = true;
    }

    this.toReadOnlyInfos(newTransition, newState);
    // Abort and usurp any previously active transition.
    if (this.activeTransition) {
      this.activeTransition.redirect(newTransition);
    }
    this.activeTransition = newTransition;

    // Transition promises by default resolve with resolved state.
    // For our purposes, swap out the promise to resolve
    // after the transition has been finalized.
    newTransition.promise = newTransition.promise!.then(
      (result: TransitionState<R>) => {
        return this.onTransitionSettled(newTransition, result);
      },
      null,
      promiseLabel('Settle transition promise when transition is finalized')
    );

    if (!wasTransitioning) {
      this.notifyExistingHandlers(newState, newTransition);
    }

    this.fireQueryParamDidChange(newState, queryParamChangelist!);

    return newTransition;
  }

  /**
  @private

  Begins and returns a Transition based on the provided
  arguments. Accepts arguments in the form of both URL
  transitions and named transitions.

  @param {Router} router
  @param {Array[Object]} args arguments passed to transitionTo,
    replaceWith, or handleURL
*/
  private doTransition(
    name?: string,
    modelsArray: [...ModelFor<R>[]] | [...ModelFor<R>[], { queryParams: QueryParams }] = [],
    isIntermediate = false
  ): InternalTransition<R> {
    let lastArg = modelsArray[modelsArray.length - 1];
    let queryParams: Dict<unknown> = {};

    if (lastArg && Object.prototype.hasOwnProperty.call(lastArg, 'queryParams')) {
      // We just checked this.
      // TODO: Use an assertion?
      queryParams = (modelsArray.pop() as { queryParams: QueryParams })
        .queryParams as Dict<unknown>;
    }

    let intent;
    if (name === undefined) {
      log(this, 'Updating query params');

      // A query param update is really just a transition
      // into the route you're already on.
      let { routeInfos } = this.state!;
      intent = new NamedTransitionIntent<R>(
        this,
        routeInfos[routeInfos.length - 1]!.name,
        undefined,
        [],
        queryParams
      );
    } else if (name.charAt(0) === '/') {
      log(this, 'Attempting URL transition to ' + name);
      intent = new URLTransitionIntent<R>(this, name);
    } else {
      log(this, 'Attempting transition to ' + name);
      intent = new NamedTransitionIntent<R>(
        this,
        name,
        undefined,
        // SAFETY: We know this to be the case since we removed the last item if it was QPs
        modelsArray as ModelFor<R>[],
        queryParams
      );
    }

    return this.transitionByIntent(intent, isIntermediate);
  }

  /**
  @private

  Fires queryParamsDidChange event
*/
  private fireQueryParamDidChange(newState: TransitionState<R>, queryParamChangelist: ChangeList) {
    // If queryParams changed trigger event
    if (queryParamChangelist) {
      // This is a little hacky but we need some way of storing
      // changed query params given that no activeTransition
      // is guaranteed to have occurred.
      this._changedQueryParams = queryParamChangelist.all;
      this.triggerEvent(newState.routeInfos, true, 'queryParamsDidChange', [
        queryParamChangelist.changed,
        queryParamChangelist.all,
        queryParamChangelist.removed,
      ]);
      this._changedQueryParams = undefined;
    }
  }

  /**
  @private

  This function is called when transitioning from one URL to
  another to determine which routes are no longer active,
  which routes are newly active, and which routes remain
  active but have their context changed.

  Take a list of old routes and new routes and partition
  them into four buckets:

  * unchanged: the route was active in both the old and
    new URL, and its context remains the same
  * updated context: the route was active in both the
    old and new URL, but its context changed. The route's
    `setup` method, if any, will be called with the new
    context.
  * exited: the route was active in the old URL, but is
    no longer active.
  * entered: the route was not active in the old URL, but
    is now active.

  The PartitionedRoutes structure has four fields:

  * `updatedContext`: a list of `RouteInfo` objects that
    represent routes that remain active but have a changed
    context
  * `entered`: a list of `RouteInfo` objects that represent
    routes that are newly active
  * `exited`: a list of `RouteInfo` objects that are no
    longer active.
  * `unchanged`: a list of `RouteInfo` objects that remain active.

  @param {Array[InternalRouteInfo]} oldRoutes a list of the route
    information for the previous URL (or `[]` if this is the
    first handled transition)
  @param {Array[InternalRouteInfo]} newRoutes a list of the route
    information for the new URL

  @return {Partition}
*/
  // Exposed so manager-driven routers (e.g. EmberRouter) can compute
  // partitions when orchestrating their own lifecycle.
  partitionRoutes(oldState: TransitionState<R>, newState: TransitionState<R>) {
    let oldRouteInfos = oldState.routeInfos;
    let newRouteInfos = newState.routeInfos;

    let routes: RoutePartition<R> = {
      updatedContext: [],
      exited: [],
      entered: [],
      unchanged: [],
      reset: [],
    };

    let routeChanged,
      contextChanged = false,
      i,
      l;

    for (i = 0, l = newRouteInfos.length; i < l; i++) {
      let oldRouteInfo = oldRouteInfos[i]!,
        newRouteInfo = newRouteInfos[i]!;

      if (!oldRouteInfo || oldRouteInfo.route !== newRouteInfo.route) {
        routeChanged = true;
      }

      if (routeChanged) {
        routes.entered.push(newRouteInfo);
        if (oldRouteInfo) {
          routes.exited.unshift(oldRouteInfo);
        }
      } else if (contextChanged || oldRouteInfo.context !== newRouteInfo.context) {
        contextChanged = true;
        routes.updatedContext.push(newRouteInfo);
      } else {
        routes.unchanged.push(oldRouteInfo);
      }
    }

    for (i = newRouteInfos.length, l = oldRouteInfos.length; i < l; i++) {
      routes.exited.unshift(oldRouteInfos[i]!);
    }

    routes.reset = routes.updatedContext.slice();
    routes.reset.reverse();

    return routes;
  }

  // Exposed so manager-driven routers can update the URL after awaiting
  // their async lifecycle.
  _updateURL(transition: OpaqueTransition, state: TransitionState<R>) {
    let urlMethod: string | null = transition.urlMethod;

    if (!urlMethod) {
      return;
    }

    let { routeInfos } = state;
    let { name: routeName } = routeInfos[routeInfos.length - 1]!;
    let params: Dict<unknown> = {};

    for (let i = routeInfos.length - 1; i >= 0; --i) {
      let routeInfo = routeInfos[i]!;
      merge(params, routeInfo.params);
      if (routeInfo.route!.inaccessibleByURL) {
        urlMethod = null;
      }
    }

    if (urlMethod) {
      params['queryParams'] = transition._visibleQueryParams || state.queryParams;
      let url = this.recognizer.generate(routeName, params as Params);

      // transitions during the initial transition must always use replaceURL.
      // When the app boots, you are at a url, e.g. /foo. If some route
      // redirects to bar as part of the initial transition, you don't want to
      // add a history entry for /foo. If you do, pressing back will immediately
      // hit the redirect again and take you back to /bar, thus killing the back
      // button
      let initial = transition.isCausedByInitialTransition;

      // say you are at / and you click a link to route /foo. In /foo's
      // route, the transition is aborted using replaceWith('/bar').
      // Because the current url is still /, the history entry for / is
      // removed from the history. Clicking back will take you to the page
      // you were on before /, which is often not even the app, thus killing
      // the back button. That's why updateURL is always correct for an
      // aborting transition that's not the initial transition
      let replaceAndNotAborting =
        urlMethod === 'replace' && !transition.isCausedByAbortingTransition;

      // because calling refresh causes an aborted transition, this needs to be
      // special cased - if the initial transition is a replace transition, the
      // urlMethod should be honored here.
      let isQueryParamsRefreshTransition = transition.queryParamsOnly && urlMethod === 'replace';

      // say you are at / and you a `replaceWith(/foo)` is called. Then, that
      // transition is aborted with `replaceWith(/bar)`. At the end, we should
      // end up with /bar replacing /. We are replacing the replace. We only
      // will replace the initial route if all subsequent aborts are also
      // replaces. However, there is some ambiguity around the correct behavior
      // here.
      let replacingReplace =
        urlMethod === 'replace' && transition.isCausedByAbortingReplaceTransition;

      if (initial || replaceAndNotAborting || isQueryParamsRefreshTransition || replacingReplace) {
        this.replaceURL!(url);
      } else {
        this.updateURL(url);
      }
    }
  }

  // Exposed so manager-driven routers can finalize QPs as part of their
  // own transition settlement.
  finalizeQueryParamChange(
    resolvedHandlers: InternalRouteInfo<R>[],
    newQueryParams: Dict<unknown>,
    transition: OpaqueTransition
  ) {
    // We fire a finalizeQueryParamChange event which
    // gives the new route hierarchy a chance to tell
    // us which query params it's consuming and what
    // their final values are. If a query param is
    // no longer consumed in the final route hierarchy,
    // its serialized segment will be removed
    // from the URL.

    for (let k in newQueryParams) {
      if (newQueryParams.hasOwnProperty(k) && newQueryParams[k] === null) {
        delete newQueryParams[k];
      }
    }

    let finalQueryParamsArray: {
      key: string;
      value: string;
      visible: boolean;
    }[] = [];

    this.triggerEvent(resolvedHandlers, true, 'finalizeQueryParamChange', [
      newQueryParams,
      finalQueryParamsArray,
      transition,
    ]);

    if (transition) {
      transition._visibleQueryParams = {};
    }

    let finalQueryParams: Dict<unknown> = {};
    for (let i = 0, len = finalQueryParamsArray.length; i < len; ++i) {
      let qp = finalQueryParamsArray[i]!;
      finalQueryParams[qp.key] = qp.value;
      if (transition && qp.visible !== false) {
        transition._visibleQueryParams[qp.key] = qp.value;
      }
    }
    return finalQueryParams;
  }

  private toReadOnlyInfos(newTransition: OpaqueTransition, newState: TransitionState<R>) {
    let oldRouteInfos = this.state!.routeInfos;
    this.fromInfos(newTransition, oldRouteInfos);
    this.toInfos(newTransition, newState.routeInfos);
    this._lastQueryParams = newState.queryParams;
  }

  private fromInfos(newTransition: OpaqueTransition, oldRouteInfos: InternalRouteInfo<R>[]) {
    if (newTransition !== undefined && oldRouteInfos.length > 0) {
      let fromInfos = toReadOnlyRouteInfo(oldRouteInfos, Object.assign({}, this._lastQueryParams), {
        includeAttributes: true,
        localizeMapUpdates: false,
      }) as RouteInfoWithAttributes[];
      newTransition!.from = fromInfos[fromInfos.length - 1] || null;
    }
  }

  public toInfos(
    newTransition: OpaqueTransition,
    newRouteInfos: InternalRouteInfo<R>[],
    includeAttributes = false
  ) {
    if (newTransition !== undefined && newRouteInfos.length > 0) {
      let toInfos = toReadOnlyRouteInfo(
        newRouteInfos,
        Object.assign({}, newTransition[QUERY_PARAMS_SYMBOL]),
        { includeAttributes, localizeMapUpdates: false }
      );
      newTransition!.to = toInfos[toInfos.length - 1]! || null;
    }
  }

  private notifyExistingHandlers(
    newState: TransitionState<R>,
    newTransition: InternalTransition<R>
  ) {
    let oldRouteInfos = this.state!.routeInfos,
      changing = [],
      i,
      oldRouteInfoLen,
      oldHandler,
      newRouteInfo;

    oldRouteInfoLen = oldRouteInfos.length;
    for (i = 0; i < oldRouteInfoLen; i++) {
      oldHandler = oldRouteInfos[i]!;
      newRouteInfo = newState.routeInfos[i];

      if (!newRouteInfo || oldHandler.name !== newRouteInfo.name) {
        break;
      }

      if (!newRouteInfo.isResolved) {
        changing.push(oldHandler);
      }
    }

    this.triggerEvent(oldRouteInfos, true, 'willTransition', [newTransition]);
    this.routeWillChange(newTransition);
    this.willTransition(oldRouteInfos, newState.routeInfos, newTransition);
  }

  /**
    Clears the current and target route routes and triggers exit
    on each of them starting at the leaf and traversing up through
    its ancestors.
  */
  reset() {
    if (this.state) {
      forEach<InternalRouteInfo<R>>(this.state.routeInfos.slice().reverse(), function (routeInfo) {
        let { manager, bucket } = routeInfo;
        if (manager !== undefined && bucket !== undefined) {
          manager.exit(bucket);
        }
        return true;
      });
    }

    this.oldState = undefined;
    this.state = new TransitionState();
    this.currentRouteInfos = undefined;
  }

  /**
    let handler = routeInfo.handler;
    The entry point for handling a change to the URL (usually
    via the back and forward button).

    Returns an Array of handlers and the parameters associated
    with those parameters.

    @param {String} url a URL to process

    @return {Array} an Array of `[handler, parameter]` tuples
  */
  handleURL(url: string) {
    // Perform a URL-based transition, but don't change
    // the URL afterward, since it already happened.
    if (url.charAt(0) !== '/') {
      url = '/' + url;
    }

    return this.doTransition(url)!.method(null);
  }

  /**
    Transition into the specified named route.

    If necessary, trigger the exit callback on any routes
    that are no longer represented by the target route.

    @param {String} name the name of the route
  */
  transitionTo(name: string | { queryParams: Dict<unknown> }, ...contexts: any[]) {
    if (typeof name === 'object') {
      contexts.push(name);
      return this.doTransition(undefined, contexts, false);
    }

    return this.doTransition(name, contexts);
  }

  intermediateTransitionTo(name: string, ...args: any[]) {
    return this.doTransition(name, args, true);
  }

  refresh(pivotRoute?: R) {
    let previousTransition = this.activeTransition;
    let state = previousTransition ? previousTransition[STATE_SYMBOL] : this.state;
    let routeInfos = state!.routeInfos;

    if (pivotRoute === undefined) {
      pivotRoute = routeInfos[0]!.route;
    }

    log(this, 'Starting a refresh transition');
    let name = routeInfos[routeInfos.length - 1]!.name;
    let intent = new NamedTransitionIntent(
      this,
      name,
      pivotRoute,
      [],
      this._changedQueryParams || state!.queryParams
    );

    let newTransition = this.transitionByIntent(intent, false);

    // if the previous transition is a replace transition, that needs to be preserved
    if (previousTransition && previousTransition.urlMethod === 'replace') {
      newTransition.method(previousTransition.urlMethod);
    }

    return newTransition;
  }

  /**
    Identical to `transitionTo` except that the current URL will be replaced
    if possible.

    This method is intended primarily for use with `replaceState`.

    @param {String} name the name of the route
  */
  replaceWith(name: string) {
    return this.doTransition(name).method('replace');
  }

  /**
    Take a named route and context objects and generate a
    URL.

    @param {String} name the name of the route to generate
      a URL for
    @param {...Object} objects a list of objects to serialize

    @return {String} a URL
  */
  generate(routeName: string, ...args: ModelsAndQueryParams<ModelFor<R>>) {
    let partitionedArgs = extractQueryParams(args),
      suppliedParams = partitionedArgs[0],
      queryParams = partitionedArgs[1];

    // Construct a TransitionIntent with the provided params
    // and apply it to the present state of the router.
    let intent = new NamedTransitionIntent(this, routeName, undefined, suppliedParams);
    let state = intent.applyToState(this.state!, false);

    let params: Params = {};
    for (let i = 0, len = state.routeInfos.length; i < len; ++i) {
      let routeInfo = state.routeInfos[i]!;
      let routeParams = routeInfo.serialize();
      merge(params, routeParams);
    }
    params.queryParams = queryParams;

    return this.recognizer.generate(routeName, params);
  }

  applyIntent(routeName: string, contexts: ModelFor<R>[]): TransitionState<R> {
    let intent = new NamedTransitionIntent(this, routeName, undefined, contexts);

    let state = (this.activeTransition && this.activeTransition[STATE_SYMBOL]) || this.state!;

    return intent.applyToState(state, false);
  }

  isActiveIntent(
    routeName: string,
    contexts: ModelFor<R>[],
    queryParams?: Dict<unknown> | null,
    _state?: TransitionState<R>
  ) {
    let state = _state || this.state!,
      targetRouteInfos = state.routeInfos,
      routeInfo,
      len;

    if (!targetRouteInfos.length) {
      return false;
    }

    let targetHandler = targetRouteInfos[targetRouteInfos.length - 1]!.name;
    let recognizerHandlers: ParsedHandler[] = this.recognizer.handlersFor(targetHandler);

    let index = 0;
    for (len = recognizerHandlers.length; index < len; ++index) {
      routeInfo = targetRouteInfos[index]!;
      if (routeInfo.name === routeName) {
        break;
      }
    }

    if (index === recognizerHandlers.length) {
      // The provided route name isn't even in the route hierarchy.
      return false;
    }

    let testState = new TransitionState<R>();
    testState.routeInfos = targetRouteInfos.slice(0, index + 1);
    recognizerHandlers = recognizerHandlers.slice(0, index + 1);

    let intent = new NamedTransitionIntent(this, targetHandler, undefined, contexts);

    let newState = intent.applyToHandlers(testState, recognizerHandlers, targetHandler, true, true);

    let routesEqual = routeInfosEqual(newState.routeInfos, testState.routeInfos);
    if (!queryParams || !routesEqual) {
      return routesEqual;
    }

    // Get a hash of QPs that will still be active on new route
    let activeQPsOnNewHandler: Dict<unknown> = {};
    merge(activeQPsOnNewHandler, queryParams);

    let activeQueryParams = state.queryParams;
    for (let key in activeQueryParams) {
      if (activeQueryParams.hasOwnProperty(key) && activeQPsOnNewHandler.hasOwnProperty(key)) {
        activeQPsOnNewHandler[key] = activeQueryParams[key];
      }
    }

    return routesEqual && !getChangelist(activeQPsOnNewHandler, queryParams);
  }

  isActive(routeName: string, ...args: ModelsAndQueryParams<ModelFor<R>>) {
    let [contexts, queryParams] = extractQueryParams(args);
    return this.isActiveIntent(routeName, contexts, queryParams);
  }

  trigger(name: string, ...args: any[]) {
    this.triggerEvent(this.currentRouteInfos!, false, name, args);
  }
}

function routeInfosEqual<R1 extends BaseRoute, R2 extends BaseRoute>(
  routeInfos: InternalRouteInfo<R1>[],
  otherRouteInfos: InternalRouteInfo<R2>[]
) {
  if (routeInfos.length !== otherRouteInfos.length) {
    return false;
  }

  for (let i = 0, len = routeInfos.length; i < len; ++i) {
    // SAFETY: Just casting for comparison
    if (routeInfos[i] !== (otherRouteInfos[i] as unknown as InternalRouteInfo<R1>)) {
      return false;
    }
  }
  return true;
}

function routeInfosSameExceptQueryParams<R1 extends BaseRoute, R2 extends BaseRoute>(
  routeInfos: InternalRouteInfo<R1>[],
  otherRouteInfos: InternalRouteInfo<R2>[]
) {
  if (routeInfos.length !== otherRouteInfos.length) {
    return false;
  }

  for (let i = 0, len = routeInfos.length; i < len; ++i) {
    if (routeInfos[i]!.name !== otherRouteInfos[i]!.name) {
      return false;
    }

    if (!paramsEqual(routeInfos[i]!.params, otherRouteInfos[i]!.params)) {
      return false;
    }
  }
  return true;
}

function paramsEqual(params: Dict<unknown> | undefined, otherParams: Dict<unknown> | undefined) {
  if (params === otherParams) {
    // Both identical or both undefined
    return true;
  }

  if (!params || !otherParams) {
    // One is falsy but other is not
    return false;
  }

  let keys = Object.keys(params);
  let otherKeys = Object.keys(otherParams);

  if (keys.length !== otherKeys.length) {
    return false;
  }

  for (let i = 0, len = keys.length; i < len; ++i) {
    let key = keys[i]!;

    if (params[key] !== otherParams[key]) {
      return false;
    }
  }

  return true;
}

export interface RoutePartition<R extends BaseRoute> {
  updatedContext: InternalRouteInfo<R>[];
  exited: InternalRouteInfo<R>[];
  entered: InternalRouteInfo<R>[];
  unchanged: InternalRouteInfo<R>[];
  reset: InternalRouteInfo<R>[];
}
