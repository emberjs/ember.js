import type { Route, RouteStateBucket, Transition } from '../index';
import Router from '../index';
import type { Dict } from '../lib/core';
import type { IModel } from '../lib/route-info';
import RouteInfo, { UnresolvedRouteInfoByParam } from '../lib/route-info';
import type { PublicTransition } from '../lib/transition';
import { logAbort } from '../lib/transition';
import type { TransitionError } from '../lib/transition-state';
import type { UnrecognizedURLError } from '../lib/unrecognized-url-error';
import { isTransitionAborted, throwIfAborted } from '../lib/transition-aborted-error';
import { Promise } from 'rsvp';

// A useful function to allow you to ignore transition errors in a testing context
export async function ignoreTransitionError(transition: Transition) {
  try {
    await transition;
  } catch {
    // if it errors we don't do anything
  }
}

function assertAbort(assert: Assert) {
  return function _assertAbort(e: Error) {
    assert.ok(isTransitionAborted(e), 'transition was redirected/aborted');
  };
}

function transitionToWithAbort(assert: Assert, router: Router<Route>, path: string) {
  return router.transitionTo(path).then(shouldNotHappen(assert), assertAbort(assert));
}

function replaceWith(router: Router<Route>, path: string) {
  return router.transitionTo.apply(router, [path]).method('replace');
}

function shouldNotHappen(assert: Assert, _message?: string) {
  let message = _message || 'this .then handler should not be called';
  return function _shouldNotHappen(error: any) {
    console.error(error.stack); // eslint-disable-line
    assert.ok(false, message);
    return error;
  };
}

export function isExiting(route: Route | string, routeInfos: RouteInfo<Route>[]) {
  for (let i = 0, len = routeInfos.length; i < len; ++i) {
    let routeInfo = routeInfos[i];
    if (routeInfo!.name === route || routeInfo!.route === route) {
      return false;
    }
  }
  return true;
}

function stubbedHandlerInfoFactory(name: string, props: Dict<unknown>) {
  let obj = Object.create(props);
  obj._handlerInfoType = name;
  return obj;
}

export {
  transitionToWithAbort,
  replaceWith,
  shouldNotHappen,
  stubbedHandlerInfoFactory,
  assertAbort,
};

// Minimal structural copies of the route manager types. The real interfaces
// live in `@ember/-internals/routing/route-managers/api`; router_js stays
// independent so we redeclare just the surface this manager satisfies.

interface RouteCapabilities {
  classicInterop: boolean;
}

interface NavigationArgs {
  transition: any;
  to: any;
  internalRouteInfo?: any;
  cancel: () => void;
  signal?: AbortSignal;
  getAncestorContext: (routeInfo: any) => Promise<unknown>;
}

interface RouteManagerLike {
  capabilities: RouteCapabilities;
  createRoute(definition: any, args: { name: string }): TestRouteBucket;
  getDestroyable(bucket: TestRouteBucket): unknown;
  willEnter(bucket: TestRouteBucket, args: NavigationArgs): void;
  enter(bucket: TestRouteBucket, args: NavigationArgs): Promise<unknown>;
  didEnter(bucket: TestRouteBucket, args: NavigationArgs & { enter?: boolean }): void;
  willExit(bucket: TestRouteBucket, args: NavigationArgs & { isExiting?: boolean }): void;
  exit(bucket: TestRouteBucket, args?: NavigationArgs): void;
  didExit(bucket: TestRouteBucket, args: NavigationArgs): void;
  getRouteWrapper(bucket: TestRouteBucket): object;
  getInvokable(
    bucket: TestRouteBucket,
    enterPromise: Promise<unknown>
  ): Promise<object | undefined>;
  serializeContext(
    bucket: TestRouteBucket,
    routeInfo: any,
    value: unknown
  ): Dict<unknown> | undefined;
  getContext(bucket: TestRouteBucket, params: Dict<unknown>, transition: any): unknown;
  redirect(bucket: TestRouteBucket, routeInfo: any, context: unknown, transition: any): void;
  getRouteInfoMetadata(bucket: TestRouteBucket): unknown;
}

// Stable per-route state. Per-render data (context, enterPromise) lives on
// the routeInfo, not here.
class TestRouteBucket {
  route: Route;
  args: { name: string };
  invokable: object | undefined = undefined;

  constructor(route: Route, args: { name: string }) {
    this.route = route;
    this.args = args;
  }
}

const isTransitionLike = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  (value as { isTransition?: boolean }).isTransition === true;

/**
  Lightweight route manager used by `router_js`'s own tests. Routes in these
  tests are plain object literals with `model`/`setup`/`enter`/`exit` hooks
  (no EmberObject, no DI container) so the manager dispatches directly.
 */
class TestRouteManager implements RouteManagerLike {
  capabilities: RouteCapabilities = { classicInterop: true };

  createRoute(handler: Route, args: { name: string }): TestRouteBucket {
    const bucket = new TestRouteBucket(handler, args);
    handler.bucket = bucket as unknown as RouteStateBucket;
    handler.manager = this as unknown as Route['manager'];
    return bucket;
  }

  getDestroyable(bucket: TestRouteBucket): unknown {
    return bucket.route;
  }

  willEnter(_bucket: TestRouteBucket, _args: NavigationArgs): void {}

  enter(bucket: TestRouteBucket, args: NavigationArgs): Promise<unknown> {
    const transition = args.transition;
    // `to` is the public RouteInfo, which has no getModel. Classic-interop
    // managers dispatch internal operations through internalRouteInfo.
    const routeInfo = args.internalRouteInfo ?? args.to;
    // routeInfo.route is the authoritative reference for this transition.
    // Tests sometimes attach a handler to the routeInfo via prototype
    // assignment that differs from the one the bucket was created with.
    const route = (routeInfo?.route ?? bucket.route) as Route<any>;

    if (transition && typeof transition.trigger === 'function') {
      transition.trigger(true, 'willResolveModel', transition, route);
    }

    const name: string = routeInfo?.name ?? bucket.args.name;

    const beforeModelResult = route?.beforeModel?.(transition);
    return Promise.resolve(isTransitionLike(beforeModelResult) ? null : beforeModelResult)
      .then(() => {
        throwIfAborted(transition);
        return routeInfo.getModel(transition);
      })
      .then((model: unknown) => {
        throwIfAborted(transition);
        // Stash the model BEFORE afterModel so afterModel can swap it out.
        if (transition) {
          transition.resolvedModels = transition.resolvedModels || {};
          transition.resolvedModels[name] = model;
        }
        const afterModelResult = route?.afterModel?.(model as never, transition);
        const safeAfterModel = isTransitionLike(afterModelResult) ? null : afterModelResult;
        return Promise.resolve(safeAfterModel).then(() => {
          // afterModel may have swapped the model; pick up the new value.
          return transition?.resolvedModels?.[name] ?? model;
        });
      });
  }

  didEnter(bucket: TestRouteBucket, args: NavigationArgs & { enter?: boolean }): void {
    const transition = args.transition;
    const routeInfo = args.to;
    const route = (routeInfo?.route ?? bucket.route) as Route<any>;
    const context = routeInfo?.context;

    if (!route) return;

    // Fire route.enter() on fresh entries (not context updates), mirroring
    // the classic setupContexts gating.
    if (args.enter !== false && route.enter) {
      route.enter(transition);
    }
    // If enter triggered a redirect, the transition is now aborted; bail
    // before calling setup so the outer loop stops too.
    throwIfAborted(transition);
    route.context = context as never;
    if (route.setup) {
      route.setup(context as never, transition);
    }
    throwIfAborted(transition);
  }

  willExit(_bucket: TestRouteBucket, _args: NavigationArgs & { isExiting?: boolean }): void {}

  exit(bucket: TestRouteBucket, args?: NavigationArgs): void {
    const route = bucket.route;
    if (!route) return;
    delete route.context;
    if (route.exit) {
      route.exit(args?.transition);
    }
  }

  didExit(_bucket: TestRouteBucket, _args: NavigationArgs): void {}

  // Classic-interop: serialize the model into the dynamic URL segments. The
  // manager owns serialization, so this reproduces what route-info's default
  // serialize would otherwise do once dispatch crosses the manager boundary:
  // defer to the handler's own `serialize` when present, otherwise fall back
  // to the single dynamic-segment default (the `_id` convention). Param-style
  // models (string/number) are handled upstream before this is reached.
  serializeContext(
    bucket: TestRouteBucket,
    routeInfo: any,
    value: unknown
  ): Dict<unknown> | undefined {
    const route = bucket.route as Route & {
      serialize?(model: unknown, params: string[]): Dict<unknown> | undefined;
    };
    const paramNames: string[] = routeInfo?.paramNames ?? [];

    if (route && typeof route.serialize === 'function') {
      return route.serialize(value, paramNames);
    }

    if (paramNames.length !== 1) {
      return undefined;
    }

    const object: Dict<unknown> = {};
    const name = paramNames[0]!;
    if (/_id$/.test(name)) {
      object[name] = (value as IModel)?.id;
    } else {
      object[name] = value;
    }
    return object;
  }

  // Classic-interop: resolve the handler's context from URL params via its
  // deserialize/model hook.
  getContext(bucket: TestRouteBucket, params: Dict<unknown>, transition: any): unknown {
    const route = bucket.route as Route<any> & {
      deserialize?(params: Dict<unknown>, transition: any): unknown;
      model?(params: Dict<unknown>, transition: any): unknown;
    };
    if (route.deserialize) {
      return route.deserialize(params, transition);
    }
    if (route.model) {
      return route.model(params, transition);
    }
    return undefined;
  }

  // Classic-interop: run the handler's redirect hook after its model resolves.
  redirect(bucket: TestRouteBucket, _routeInfo: any, context: unknown, transition: any): void {
    const route = bucket.route as Route & {
      redirect?(context: unknown, transition: any): void;
    };
    route.redirect?.(context, transition);
  }

  // Classic-interop: surface the handler's route-info metadata.
  getRouteInfoMetadata(bucket: TestRouteBucket): unknown {
    const route = bucket.route as Route & { buildRouteInfoMetadata?(): unknown };
    return route.buildRouteInfoMetadata ? route.buildRouteInfoMetadata() : null;
  }

  // Tests never actually render, so the wrapper identity is unused; we just
  // need a stable reference to satisfy the manager contract.
  getRouteWrapper(_bucket: TestRouteBucket): object {
    return TEST_WRAPPER_SENTINEL;
  }

  // Gate on enterPromise so resolution stays sequential, matching the
  // classic expectation that a parent's model resolves before a child's
  // model starts.
  getInvokable(
    _bucket: TestRouteBucket,
    enterPromise: Promise<unknown>
  ): Promise<object | undefined> {
    return (enterPromise ?? Promise.resolve()).then(() => undefined);
  }
}

const TEST_WRAPPER_SENTINEL = {};
const SHARED_TEST_MANAGER = new TestRouteManager();

export function createHandler<T extends IModel>(name: string, options?: Dict<unknown>): Route<T> {
  const handler = Object.assign(
    { name, routeName: name, context: {}, names: [], handler: name, _internalName: name },
    options
  ) as unknown as Route<T>;
  // Attach the shared test manager + bucket so the resolve path has something
  // to dispatch through.
  SHARED_TEST_MANAGER.createRoute(handler as unknown as Route, { name });
  return handler;
}

type InternalRouteInfoLike = RouteInfo<Route>;

export class TestRouter<R extends Route = Route> extends Router<R> {
  didTransition(_routeInfos?: RouteInfo<R>[]) {}
  willTransition() {}
  updateURL(_url: string): void {}
  replaceURL(_url: string): void {}
  triggerEvent(
    _handlerInfos: RouteInfo<R>[],
    _ignoreFailure: boolean,
    _name: string,
    _args: any[]
  ) {}
  routeDidChange(_transition?: PublicTransition) {}
  routeWillChange() {}
  transitionDidError(error: TransitionError, transition: PublicTransition) {
    if (error.wasAborted || transition.isAborted) {
      return logAbort(transition);
    } else {
      transition.trigger(false, 'error', error.error, this, error.route);
      transition.abort();
      return error.error;
    }
  }
  getRoute(name: string): any {
    return createHandler(name);
  }
  getSerializer(_name: string): any {
    return () => {};
  }

  // As each route's getInvokable resolves, write the resolved routeInfo into
  // currentRouteInfos at its slot. Mirrors EmberRouter.onRouteInvokableReady.
  onRouteInvokableReady(
    routeInfo: InternalRouteInfoLike,
    _transition: any,
    routeIndex: number
  ): void {
    const current = (this.currentRouteInfos as any[]) ?? [];
    current[routeIndex] = routeInfo;
    (this as any).currentRouteInfos = current;
  }

  // Intermediate transition (loading/error substate). Splice the entered
  // routes into currentRouteInfos and synchronously fire didEnter so
  // enter/setup run for the substate, then defer async ones via routePromise.
  onIntermediateTransition(newState: any, transition: any): void {
    const partition = this.partitionRoutes(this.state!, newState);
    const currentRouteInfos = [...partition.unchanged, ...partition.entered];
    (this as any).currentRouteInfos = currentRouteInfos;

    this.oldState = this.state;
    this.state = newState;

    const fireDidEnter = (routeInfo: any, route: any) => {
      if (!route?.manager) return;
      route.manager.didEnter(route.bucket, { transition, to: routeInfo, enter: true });
    };

    for (const routeInfo of partition.entered) {
      const route = (routeInfo as any).route;
      if (route) {
        fireDidEnter(routeInfo, route);
      } else {
        // Async route: wait for the route to resolve before firing didEnter.
        (routeInfo as any).routePromise.then((resolved: any) => {
          fireDidEnter(routeInfo, resolved);
        });
      }
    }
  }

  // Orchestrator for the normal transition flow. Fires the lifecycle in
  // manager-driven order: willExit/exit, await enterPromises, didEnter,
  // didExit, finalize QPs, update URL, didTransition events. Mirrors
  // EmberRouter.onTransitionSettled in shape, dispatching via the manager
  // contract.
  onTransitionSettled(activeTransition: any, newState: any): Promise<unknown> {
    const partition = this.partitionRoutes(this.state!, newState);

    // Snapshot pre-transition state so we can revert on a didEnter throw.
    // The next transition then sees these routes as unentered and re-fires
    // their enter hooks.
    const preTransitionState = this.state;
    this.oldState = this.state;
    this.state = newState;

    // Leaving the hierarchy: willExit + exit, leaf-first.
    for (const exitingRouteInfo of partition.exited) {
      const route = (exitingRouteInfo as any).route;
      if (route?.manager) {
        route.manager.willExit(route.bucket, { transition: activeTransition });
        route.manager.exit(route.bucket, { transition: activeTransition });
      }
    }

    // Filter exited routes out of currentRouteInfos. Truncating to
    // unchanged.length would lose entering routes that
    // onRouteInvokableReady wrote at higher indices.
    const exitedRouteObjects = new Set(partition.exited.map((ri: any) => ri.route));
    if (this.currentRouteInfos) {
      this.currentRouteInfos = this.currentRouteInfos.filter(
        (cri: any) => !exitedRouteObjects.has(cri.route)
      ) as any;
    }

    // Context-changed but staying mounted: willExit with isExiting=false.
    for (const resetRouteInfo of partition.reset) {
      const route = (resetRouteInfo as any).route;
      if (route?.manager && route.bucket !== undefined) {
        route.manager.willExit(route.bucket, {
          transition: activeTransition,
          isExiting: false,
        });
      }
    }

    // Await all entering/updating routes' enter promises before didEnter.
    // Swallow rejections; the transition's outer promise still handles them.
    const enteringRouteInfos = [...partition.entered, ...partition.updatedContext];
    const enterPromises = enteringRouteInfos.map((routeInfo: any) => {
      const p = routeInfo.enterPromise ?? Promise.resolve(undefined);
      return p.catch ? p.catch(() => undefined) : p;
    });

    return Promise.all(enterPromises as any).then(() => {
      if (activeTransition.isAborted) return;

      try {
        for (const enteredRouteInfo of partition.entered) {
          const route = (enteredRouteInfo as any).route;
          if (!route) continue;
          route.manager.didEnter(route.bucket, {
            transition: activeTransition,
            to: enteredRouteInfo,
            enter: true,
          });
        }

        for (const updatedRouteInfo of partition.updatedContext) {
          const route = (updatedRouteInfo as any).route;
          if (!route) continue;
          route.manager.didEnter(route.bucket, {
            transition: activeTransition,
            to: updatedRouteInfo,
            enter: false,
          });
        }
      } catch (error) {
        // Roll back to pre-transition state so the next transition sees
        // these routes as unentered. Copy routeInfos (don't alias) so later
        // mutations don't corrupt the baseline used by partitionRoutes.
        this.state = preTransitionState;
        this.currentRouteInfos = preTransitionState
          ? (preTransitionState.routeInfos.slice() as any)
          : undefined;
        const errorRoute = (newState.routeInfos[newState.routeInfos.length - 1] as any)?.route;
        const reason = this.transitionDidError(
          { error, route: errorRoute, wasAborted: false } as TransitionError,
          activeTransition
        );
        throw reason;
      }

      // If a hook redirected, the transition is aborted; reject so the
      // outer transition promise sees the abort.
      if (activeTransition.isAborted) {
        throw logAbort(activeTransition);
      }

      for (const exitedRouteInfo of partition.exited) {
        const route = (exitedRouteInfo as any).route;
        if (route?.manager) {
          route.manager.didExit(route.bucket, { transition: activeTransition });
        }
      }

      // Snap currentRouteInfos to the authoritative settled list.
      this.currentRouteInfos = newState.routeInfos.slice();

      this.state!.queryParams = this.finalizeQueryParamChange(
        this.currentRouteInfos!,
        newState.queryParams,
        activeTransition
      );

      this._updateURL(activeTransition, newState);

      activeTransition.isActive = false;
      this.activeTransition = undefined;

      this.triggerEvent(this.currentRouteInfos!, true, 'didTransition', []);
      this.didTransition(this.currentRouteInfos!);
      this.toInfos(activeTransition, newState.routeInfos, true);
      this.routeDidChange(activeTransition);

      // Resolve the transition's promise with the leaf route, matching
      // the original finalizeTransition contract that tests rely on.
      return (newState.routeInfos[newState.routeInfos.length - 1] as any)?.route;
    });
  }
}

export function createHandlerInfo(name: string, options: Dict<unknown> = {}): RouteInfo<Route> {
  class Stub extends RouteInfo<Route> {
    constructor(name: string, router: Router<Route>, handler?: Route) {
      super(router, name, [], handler);
    }
    getModel(_transition: Transition) {
      return {} as any;
    }
    getUnresolved() {
      return new UnresolvedRouteInfoByParam(this.router, 'empty', [], {});
    }
  }

  let handler = (options['handler'] as Route) || createHandler('foo');
  delete options['handler'];

  Object.assign(Stub.prototype, options);
  let stub = new Stub(name, new TestRouter(), handler);
  return stub;
}

export function trigger(
  handlerInfos: RouteInfo<Route>[],
  ignoreFailure: boolean,
  name: string,
  ...args: any[]
) {
  if (!handlerInfos) {
    if (ignoreFailure) {
      return;
    }
    throw new Error("Could not trigger event '" + name + "'. There are no active handlers");
  }

  let eventWasHandled = false;

  for (let i = handlerInfos.length - 1; i >= 0; i--) {
    let currentHandlerInfo = handlerInfos[i]!,
      currentHandler = currentHandlerInfo.route;

    // If there is no handler, it means the handler hasn't resolved yet which
    // means that we should trigger the event later when the handler is available
    if (!currentHandler) {
      currentHandlerInfo.routePromise!.then(function (resolvedHandler) {
        if (resolvedHandler.events?.[name]) {
          resolvedHandler.events[name].apply(resolvedHandler, args);
        }
      });
      continue;
    }

    if (currentHandler.events && currentHandler.events[name]) {
      if (currentHandler.events[name].apply(currentHandler, args) === true) {
        eventWasHandled = true;
      } else {
        return;
      }
    }
  }

  // In the case that we got an UnrecognizedURLError as an event with no handler,
  // let it bubble up
  if (name === 'error' && (args[0] as UnrecognizedURLError)!.name === 'UnrecognizedURLError') {
    throw args[0];
  } else if (!eventWasHandled && !ignoreFailure) {
    throw new Error("Nothing handled the event '" + name + "'.");
  }
}
