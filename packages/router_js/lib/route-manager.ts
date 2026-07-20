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
export type RouteStateBucket = object;

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

// -- Route-management association --------------------------------------------------

const ROUTE_MANAGEMENT = new WeakMap<object, RouteManagement>();

export interface RouteManagement {
  manager: RouteManager;
  bucket: RouteStateBucket;
}

/**
  Associates a route object with the manager and bucket that produced it.
  Called by the framework router when it resolves a route through a manager;
  `InternalRouteInfo` reads the association back to dispatch lifecycle hooks.
  Managers themselves never need to call this.

  Not to be confused with `setRouteManager`/`getRouteManager` (the registry
  in the `@ember` layer): the registry is keyed by the route **class** and
  holds the manager *factory* route authors registered — configuration. This
  association is keyed by a route **instance** and holds the *instantiated*
  manager plus that instance's bucket — the memoized result of applying the
  registry, kept here so router_js dispatch can reach it without access to
  owners or the registry.
 */
export function associateRouteManagement(
  route: object,
  manager: RouteManager,
  bucket: RouteStateBucket
): void {
  ROUTE_MANAGEMENT.set(route, { manager, bucket });
}

export function getRouteManagement(route: object): RouteManagement | undefined {
  return ROUTE_MANAGEMENT.get(route);
}

// -- Navigation state ---------------------------------------------------------

/**
  Common navigation context passed to the manager lifecycle hooks, as
  specified by the RFC. Both route infos are transition-level: `from` is the
  leaf route info of the state being navigated away from (`undefined` on the
  initial transition) and `to` is the leaf route info of the destination.
  Both are populated from the transition before any lifecycle hook runs.
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
  Classic-interop additions on the navigation state, provided **only** when
  the manager declares the `classicInterop: true` capability. Holds the raw
  `router_js` `Transition` (so the manager can drive the legacy event system)
  and the internal route info the hook fires for (so the manager can reach
  internal operations such as `getModel` and the resolved `context`).
 */
export interface ClassicInteropArgs {
  transition: Transition;
  internalRouteInfo: InternalRouteInfo<BaseRoute>;
}

// -- Hook argument shapes -----------------------------------------------------
//
// The base state interfaces match the RFC: `NavigationState` (+ actions/async
// where specified) and nothing else. Managers with the `classicInterop`
// capability receive the widened `Classic*` shapes below instead — the
// interop fields are genuinely capability-gated at every dispatch site.

export interface WillEnterState extends NavigationState, NavigationActions {}

export interface EnterState extends NavigationState, NavigationActions, AsyncNavigationState {}

export type DidEnterState = NavigationState;

export interface WillExitState extends NavigationState, NavigationActions {}

/**
  State for the `exit` hook. A normal exit happens during a navigation and
  provides `from`/`to`, but an exit can also happen during router teardown
  (`reset`), where there is no navigation at all — hence, unlike the RFC's
  `NavigationState`, everything here is optional.
 */
export interface ExitState {
  from?: RouteInfo;
  to?: RouteInfo;
}

export type DidExitState = NavigationState;

// -- Classic-interop hook argument shapes -------------------------------------
//
// What a `classicInterop: true` manager receives instead of the base shapes.
// Beyond `ClassicInteropArgs`, the enter/exit flags encode the classic
// "update" distinction (re-entering the route you are already on): the RFC
// treats that as a manager-internal concern, so it only exists on the
// interop side. Likewise, the router only dispatches the update-flavoured
// calls (`willExit` with `isExiting: false`, `didEnter` with `enter: false`,
// intermediate-transition `didEnter`) to interop managers at all.

export type ClassicWillEnterState = WillEnterState & ClassicInteropArgs;

export type ClassicEnterState = EnterState & ClassicInteropArgs;

export type ClassicDidEnterState = DidEnterState &
  ClassicInteropArgs & {
    /**
      `true` if this hook is firing for a fresh entry into the route, `false`
      if the route stayed mounted and only its context changed (a classic
      "update").
     */
    enter: boolean;
  };

export type ClassicWillExitState = WillExitState &
  ClassicInteropArgs & {
    /**
      `true` if the route is leaving the hierarchy entirely, `false` if it is
      staying mounted but its context is being reset (the classic
      "context updated" path).
     */
    isExiting: boolean;
  };

export type ClassicExitState = ExitState & {
  /** Absent during router teardown (`reset`). */
  transition?: Transition;
};

export type ClassicDidExitState = DidExitState & ClassicInteropArgs;

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
    Returns a route associated with a bucket
   */
  getRoute(bucket: Bucket): unknown;

  /**
    Returns the destroyable (if any) associated with the bucket. When a
    manager creates route state that is not otherwise owner-managed, the
    framework associates the returned destroyable with the owner so it is
    destroyed at teardown. Return `null` when the state is already managed
    elsewhere (e.g. container-owned), to avoid double management.
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
    Optional. Returns a module-stable wrapper component: the same value for
    every call, across all buckets. The outlet invokes it with `@Component`
    (the per-bucket invokable from the render state), `@context` (the live
    model), and `@bucket`; route identity for the rendering layer's stability
    check is carried by the invokable, so the wrapper itself carries no
    per-route state.

    A wrapper is an argument-forwarding policy, and it costs one extra
    component boundary per outlet level per transition (measured at roughly
    8–10µs per level). Managers whose route components can consume `@context`
    directly should omit it (and leave `wrapper` undefined in their render
    state); the outlet then invokes the invokable directly.
   */
  getRouteWrapper?(): object;

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
  invokable: object | undefined;
  /** Optional argument-forwarding wrapper; see `getRouteWrapper`. */
  wrapper: object | undefined;
  /** Curried onto the wrapper as `@bucket` by the outlet. */
  bucket?: RouteStateBucket;
  produceContext?: (outletRef: any, lastState: any, state: any) => any;
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
  // Lifecycle hooks, widened with the capability-gated interop state. The
  // router narrows via `hasClassicInterop` before dispatching these shapes.
  willEnter(bucket: Bucket, state: ClassicWillEnterState): void;
  enter(bucket: Bucket, state: ClassicEnterState): Promise<unknown>;
  didEnter(bucket: Bucket, state: ClassicDidEnterState): void;
  willExit(bucket: Bucket, state: ClassicWillExitState): void;
  exit(bucket: Bucket, state?: ClassicExitState): void;
  didExit(bucket: Bucket, state: ClassicDidExitState): void;

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
    Enters the classic `loading` substate for a slow transition: looks up
    the nearest `*.loading`/`*_loading` route (stopping at the transition's
    pivot) and intermediate-transitions into it. Called by the router's
    default `loading` action handler once the loading event has bubbled
    unhandled above the application route.

    `originRoute` is the route whose model is slow, or `undefined` when that
    route was never created; typed `unknown` because router_js never
    inspects route shapes.
   */
  enterLoadingSubstate(bucket: Bucket, transition: Transition, originRoute: unknown): void;

  /**
    Enters the classic `error` substate for an error that bubbled unhandled
    above the application route: looks up the nearest `*.error`/`*_error`
    route and intermediate-transitions into it, passing the error as its
    model. Returns `true` when a substate was entered and the error should
    be treated as handled.

    `originRoute` is the route whose `enter` failed, or `undefined` when
    that route was never created (e.g. across an engine's async boundary);
    typed `unknown` because router_js never inspects route shapes.
   */
  enterErrorSubstate(
    bucket: Bucket,
    transition: Transition,
    error: Error,
    originRoute: unknown
  ): boolean;

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
