/**
  Route Manager contract. Defines the interface the router uses to drive route
  base classes, plus the navigation-state shapes and capability helpers.

  This lives in `router_js` (rather than the `@ember` layer) because `router_js`
  is what calls this contract. Keeping it here means the dispatch types
  reference `router_js`'s own `RouteInfo`/`Transition` directly, with no upward
  dependency on `@ember/routing`.

  Apps and addons author managers against the public re-export from
  `@ember/routing`.
*/

import type { RouteInfo, BaseRoute } from './route-info';
import type { default as InternalRouteInfo } from './route-info';
import type { PublicTransition as Transition } from './transition';

// -- RouteStateBucket ---------------------------------------------------------

/**
  Marker interface for the opaque state object a `RouteManager` returns from
  `createRoute`. Its shape and contents are defined entirely by the specific
  manager implementation, the router holds the bucket and passes it back to
  the manager without inspecting it.

  The bucket carries stable identity for a route definition. Per-navigation
  state (e.g. the resolved model, the in-flight enter promise) lives on the
  matching `RouteInfo`, keeping the bucket free to back multiple concurrent
  renders.
 */
export interface RouteStateBucket {
  route: object | undefined;
  invokable: object | undefined;
}

// -- Capabilities -------------------------------------------------------------

/**
  Versioned capability schema for `RouteManager`. New versions can opt routes
  into new behaviour while keeping older managers working.
 */
export interface RouteCapabilitiesVersions {
  '1.0': {
    /**
      When `true`, the router will provide the per-navigation `Transition`
      to manager hooks via the `ClassicInteropArgs` mix-in, and the manager
      must implement the methods on `RouteManagerWithClassicInterop`.

      This capability exists to bridge the classic router to the new manager
      surface. It is not intended to be used by managers outside the
      framework-provided `ClassicRouteManager`.
     */
    classicInterop?: boolean;
  };
}

/**
  The capabilities object stored on a `RouteManager`. Always created
  via `routeCapabilities`.
 */
export interface RouteCapabilities {
  classicInterop: boolean;
}

/**
  Produces a `RouteCapabilities` object for a `RouteManager`. The result must
  be assigned to `manager.capabilities`.

  ```ts
  capabilities = routeCapabilities('1.0', { classicInterop: true });
  ```

  @param _managerAPI The version of the manager API the route manager targets.
  @param options Optional capability flags for that version.
 */
export function routeCapabilities<Version extends keyof RouteCapabilitiesVersions>(
  _managerAPI: Version,
  options: RouteCapabilitiesVersions[Version] = {}
): RouteCapabilities {
  return {
    classicInterop: Boolean(options.classicInterop),
  };
}

// -- Navigation state ---------------------------------------------------------

/**
  Common navigation context passed to every manager hook. `from` is undefined
  on the initial transition.
 */
export interface NavigationState {
  from?: RouteInfo;
  to: RouteInfo;
}

/**
  Actions the router lends to certain hooks. Currently only `cancel`, which
  aborts the active navigation.
 */
export interface NavigationActions {
  /** Cancels the current navigation. */
  cancel(): void;
}

/**
  Extra state available inside `enter`, used to coordinate asynchronous work
  with the active transition.
 */
export interface AsyncNavigationState {
  /**
    Aborts when the navigation is no longer the active one, e.g. because it
    was cancelled or superseded by a newer transition.
   */
  signal: AbortSignal;

  /**
    Returns a promise that resolves with an ancestor route's context once that
    ancestor's `enter` has settled. Resolves with `undefined` if the named
    route is not an ancestor in the active transition.

    A `RouteInfo` for the desired ancestor must always be passed explicitly.
   */
  getAncestorContext(routeInfo: RouteInfo): Promise<unknown>;
}

/**
  Classic-interop additions on the navigation state. Only present when the
  manager declares `classicInterop: true`. Holds the raw `router_js`
  `Transition` so the manager can drive the legacy event system.
 */
export interface ClassicInteropArgs {
  transition: Transition;
  internalRouteInfo: InternalRouteInfo<BaseRoute>;
}

// -- Hook argument shapes -----------------------------------------------------

export interface WillEnterState extends NavigationState, NavigationActions, ClassicInteropArgs {}

export interface EnterState
  extends NavigationState, NavigationActions, AsyncNavigationState, ClassicInteropArgs {}

export interface DidEnterState extends NavigationState, ClassicInteropArgs {
  /**
    `true` if this hook is firing for a fresh entry into the route, `false` if
    the route stayed mounted and only its context changed (a classic
    "update").
   */
  enter: boolean;
}

export interface WillExitState extends NavigationState, NavigationActions, ClassicInteropArgs {
  /**
    `true` if the route is leaving the hierarchy entirely, `false` if it is
    staying mounted but its context is being reset (the classic
    "context updated" path).
   */
  isExiting: boolean;
}

/**
  State for the `exit` hook. A normal exit happens during a navigation and
  provides `to` and (for classic interop) `transition`, but an exit can also
  happen during router teardown (`reset`), where there is no destination or
  active transition. Both are therefore optional.
 */
export interface ExitState {
  from?: RouteInfo;
  to?: RouteInfo;
  transition?: Transition;
}

export interface DidExitState extends NavigationState, ClassicInteropArgs {}

/**
  Arguments object passed to `createRoute`. Wrapped in an object for symmetry
  with the other hooks.
 */
export interface CreateRouteArgs {
  /**
    The dot-separated route name (e.g. `posts.show`). Stable for the lifetime
    of the bucket.
   */
  name: string;
}

// -- RouteManager -------------------------------------------------------------

/**
  The contract every route base class implements via its manager. The router
  drives this interface; nothing else in user code should.

  @template Bucket The shape of the bucket the manager returns from
    `createRoute`. Defaults to the empty marker, override for a concrete
    manager implementation.
 */
export interface RouteManager<Bucket extends RouteStateBucket = RouteStateBucket> {
  /**
    Capability descriptor for this manager. Must be the result of calling
    `routeCapabilities`.
   */
  capabilities: RouteCapabilities;

  /**
    Returns a stable bucket the router will pass back to every other hook on
    this manager. Whether `factory` is instantiated now or later is up to the
    manager.
   */
  createRoute(factory: object, args: CreateRouteArgs): Bucket;

  /**
    Returns the destroyable (if any) associated with the bucket. Used by the
    router to wire the route into Ember's destruction system.
   */
  getDestroyable(bucket: Bucket): object | null;

  /**
    Synchronous hook called when a route is about to be entered, before any
    asynchronous work begins.
   */
  willEnter(bucket: Bucket, state: WillEnterState): void;

  /**
    Asynchronous entry point. The returned promise resolves with the route's
    context. The router stores the promise on the matching `RouteInfo` so
    descendant routes can await it via `getAncestorContext`.
   */
  enter(bucket: Bucket, state: EnterState): Promise<unknown>;

  /**
    Fires once every entering route in the transition has resolved. Classic
    routes use this to run `activate` and `setupController`.
   */
  didEnter(bucket: Bucket, state: DidEnterState): void;

  /**
    Synchronous hook called when the route is about to be exited. May be
    cancelled via `state.cancel()`.
   */
  willExit(bucket: Bucket, state: WillExitState): void;

  /**
    Called when the route is exited. Classic routes run `deactivate` and
    `resetController` here. `state` is omitted during router teardown
    (`reset`), where there is no destination or active transition.
   */
  exit(bucket: Bucket, state?: ExitState): void;

  /**
    Called once every exiting route in the transition has finished its `exit`
    phase. Used for cleanup that depends on the whole branch being gone.
   */
  didExit(bucket: Bucket, state: DidExitState): void;

  /**
    Returns a stable wrapper component the router will curry the
    per-render invokable into. Should return the same value for every call
    with the same bucket so the rendering layer can use identity to detect
    when a fresh wrapper is needed.

    The router curries `@Component` (the invokable), `@model`, and
    `@controller` onto the wrapper at render time.
   */
  getRouteWrapper(bucket: Bucket): object;

  /**
    Returns the renderable for the route. Async to absorb dynamic imports of
    lazy-loaded route modules. The returned promise resolves with the
    component the wrapper should render, or `undefined` to render nothing.

    The router passes the in-flight `enterPromise` so the manager can choose
    whether to await data before resolving.
   */
  getInvokable(bucket: Bucket, enterPromise?: Promise<unknown>): Promise<object | undefined>;

  getRenderState(bucket: Bucket): RenderStateLike;
}

type RenderStateLike = {
  owner: any;
  name: string;
  controller: unknown;
  model: unknown;
  routeInfo?: InternalRouteInfo<BaseRoute<unknown>>;
  bucket: RouteStateBucket | undefined;
  invokable: object | undefined;
  wrapper: object | undefined;
};

/**
  Additional methods a manager must implement when `capabilities.classicInterop`
  is `true`. These cross the manager boundary in ways the new router will not
  need and exist solely to keep the classic router behaviour reachable. They
  will be deprecated together with classic interop.
 */
export interface RouteManagerWithClassicInterop<
  Bucket extends RouteStateBucket = RouteStateBucket,
> extends RouteManager<Bucket> {
  /** Returns the local route name (e.g. `show`). */
  getRouteName(bucket: Bucket): string;

  /** Returns the fully-qualified route name (e.g. `posts.show`). */
  getFullRouteName(bucket: Bucket): string;

  /**
    Returns the query-param meta for the route. Backs the classic protected
    `_qp` getter; the router reads it to assemble the query-param state for a
    route hierarchy. Typed as `unknown` here because the concrete
    `QueryParamMeta` shape is a classic-`@ember` concern that `router_js` never
    inspects; the `@ember` layer narrows the result.
   */
  qp(bucket: Bucket): unknown;

  /**
    Stashes the dynamic-segment names onto the route's query-param meta so
    `model`-scoped query params resolve to the right path. Called by the
    router while walking the active route hierarchy.
   */
  stashNames(
    bucket: Bucket,
    routeInfo: InternalRouteInfo<BaseRoute>,
    dynamicParent: InternalRouteInfo<BaseRoute>
  ): void;

  /**
    Serializes a single query-param value for the URL. Mirrors the classic
    `Route.serializeQueryParam`.
   */
  serializeQueryParam(
    bucket: Bucket,
    value: unknown,
    urlKey: string,
    defaultValueType: string
  ): unknown;

  /**
    Deserializes a single query-param value from the URL. Mirrors the classic
    `Route.deserializeQueryParam`.
   */
  deserializeQueryParam(
    bucket: Bucket,
    value: unknown,
    urlKey: string,
    defaultValueType: string
  ): unknown;

  /**
    Serializes the route's context (model) into the dynamic URL segments.
    Backs the classic `Route.serialize` hook.
   */
  serializeContext(
    bucket: Bucket,
    routeInfo: InternalRouteInfo<BaseRoute>,
    value: unknown
  ): Record<string, unknown> | undefined;

  /**
    Classic `queryParamsDidChange` event handler. Returns `true` to let the
    event keep bubbling through the route hierarchy.
   */
  queryParamsDidChange(
    bucket: Bucket,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    changed: {},
    totalPresent: unknown,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    removed: {}
  ): boolean | void;

  /**
    Classic `finalizeQueryParamChange` event handler. Reconciles controller
    query-param state with the URL at the end of a transition.
   */
  finalizeQueryParamChange(
    bucket: Bucket,
    params: Record<string, string | null | undefined>,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    finalParams: {}[],
    transition: Transition
  ): boolean | void;

  /**
    Resolves the route's context from URL params, backing the classic
    `model`/`deserialize` hooks. Called by the router for param-based
    transitions (not when a model object was supplied to the transition).
   */
  getContext(bucket: Bucket, params: Record<string, unknown>, transition: Transition): unknown;

  /**
    Classic `Route.redirect` hook. Called once the route's context has
    resolved.
   */
  redirect(bucket: Bucket, routeInfo: RouteInfo, context: unknown, transition: Transition): void;

  /**
    Returns the route-provided `RouteInfo` metadata, backing the classic
    `Route.buildRouteInfoMetadata` hook.
   */
  getRouteInfoMetadata(bucket: Bucket): unknown;
}

/**
  Type guard for narrowing a `RouteManager` to its classic-interop shape.
 */
export function hasClassicInterop<Bucket extends RouteStateBucket>(
  manager: RouteManager<Bucket>
): manager is RouteManagerWithClassicInterop<Bucket> {
  return manager.capabilities.classicInterop === true;
}
