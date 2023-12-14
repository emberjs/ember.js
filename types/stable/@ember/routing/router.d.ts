declare module '@ember/routing/router' {
  import type { OutletView } from '@ember/-internals/glimmer';
  import type { default as Owner } from '@ember/owner';
  import { BucketCache, DSL, RouterState } from '@ember/routing/-internals';
  import type { DSLCallback } from '@ember/routing/-internals';
  import type { RouteArgs, RouteOptions } from '@ember/routing/lib/utils';
  import type {
    default as EmberLocation,
    Registry as LocationRegistry,
  } from '@ember/routing/location';
  import type RouterService from '@ember/routing/router-service';
  import EmberObject from '@ember/object';
  import Evented from '@ember/object/evented';
  import type { QueryParamMeta } from '@ember/routing/route';
  import type Route from '@ember/routing/route';
  import type {
    InternalRouteInfo,
    ModelFor,
    RouteInfo,
    RouteInfoWithAttributes,
    Transition,
    TransitionState,
  } from 'router_js';
  import Router from 'router_js';
  import type { Timer } from 'backburner.js';
  import EngineInstance from '@ember/engine/instance';
  import type { QueryParams } from 'route-recognizer';
  import type { MethodNamesOf, OmitFirst } from '@ember/-internals/utility-types';
  /**
    @module @ember/routing/router
    */
  function defaultDidTransition(this: EmberRouter, infos: InternalRouteInfo<Route>[]): void;
  function defaultWillTransition(
    this: EmberRouter,
    oldInfos: InternalRouteInfo<Route>[],
    newInfos: InternalRouteInfo<Route>[]
  ): void;
  export interface QueryParam {
    prop: string;
    urlKey: string;
    type: string;
    route: Route;
    parts?: string[];
    values: {} | null;
    scopedPropertyName: string;
    scope: string;
    defaultValue: unknown;
    undecoratedDefaultValue: unknown;
    serializedValue: string | null | undefined;
    serializedDefaultValue: string | null | undefined;
    controllerName: string;
  }
  const EmberRouter_base: Readonly<typeof EmberObject> &
    (new (owner?: Owner | undefined) => EmberObject) &
    import('@ember/object/mixin').default;
  /**
      The `EmberRouter` class manages the application state and URLs. Refer to
      the [routing guide](https://guides.emberjs.com/release/routing/) for documentation.

      @class EmberRouter
      @extends EmberObject
      @uses Evented
      @public
    */
  class EmberRouter extends EmberRouter_base implements Evented {
    /**
         Represents the URL of the root of the application, often '/'. This prefix is
          assumed on all routes defined on this router.
      
          @property rootURL
          @default '/'
          @public
        */
    rootURL: string;
    /**
         The `location` property determines the type of URL's that your
          application will use.
      
          The following location types are currently available:
      
          * `history` - use the browser's history API to make the URLs look just like any standard URL
          * `hash` - use `#` to separate the server part of the URL from the Ember part: `/blog/#/posts/new`
          * `none` - do not store the Ember URL in the actual browser URL (mainly used for testing)
          * `auto` - use the best option based on browser capabilities: `history` if possible, then `hash` if possible, otherwise `none`
      
          This value is defaulted to `history` by the `locationType` setting of `/config/environment.js`
      
          @property location
          @default 'hash'
          @see {Location}
          @public
        */
    location: (keyof LocationRegistry & string) | EmberLocation;
    _routerMicrolib: Router<Route>;
    _didSetupRouter: boolean;
    _initialTransitionStarted: boolean;
    currentURL: string | null;
    currentRouteName: string | null;
    currentPath: string | null;
    currentRoute: RouteInfo | RouteInfoWithAttributes | null;
    _qpCache: Record<
      string,
      {
        qps: QueryParam[];
        map: QueryParamMeta['map'];
      }
    >;
    _qpUpdates: Set<string>;
    _queuedQPChanges: Record<string, unknown>;
    _bucketCache: BucketCache;
    _toplevelView: OutletView | null;
    _handledErrors: Set<unknown>;
    _engineInstances: Record<string, Record<string, EngineInstance>>;
    _engineInfoByRoute: any;
    _routerService: RouterService;
    _slowTransitionTimer: Timer | null;
    private namespace;
    on: (name: string, method: ((...args: any[]) => void) | string) => this;
    one: (name: string, method: string | ((...args: any[]) => void)) => this;
    trigger: (name: string, ...args: any[]) => unknown;
    off: (name: string, method: string | ((...args: any[]) => void)) => this;
    has: (name: string) => boolean;
    private static dslCallbacks?;
    /**
          The `Router.map` function allows you to define mappings from URLs to routes
          in your application. These mappings are defined within the
          supplied callback function using `this.route`.
      
          The first parameter is the name of the route which is used by default as the
          path name as well.
      
          The second parameter is the optional options hash. Available options are:
      
            * `path`: allows you to provide your own path as well as mark dynamic
              segments.
            * `resetNamespace`: false by default; when nesting routes, ember will
              combine the route names to form the fully-qualified route name, which is
              used with `{{link-to}}` or manually transitioning to routes. Setting
              `resetNamespace: true` will cause the route not to inherit from its
              parent route's names. This is handy for preventing extremely long route names.
              Keep in mind that the actual URL path behavior is still retained.
      
          The third parameter is a function, which can be used to nest routes.
          Nested routes, by default, will have the parent route tree's route name and
          path prepended to it's own.
      
          ```app/router.js
          Router.map(function(){
            this.route('post', { path: '/post/:post_id' }, function() {
              this.route('edit');
              this.route('comments', { resetNamespace: true }, function() {
                this.route('new');
              });
            });
          });
          ```
      
          @method map
          @param callback
          @public
        */
    static map(callback: DSLCallback): typeof EmberRouter;
    static _routePath(routeInfos: InternalRouteInfo<Route>[]): string;
    constructor(owner?: Owner);
    _initRouterJs(): void;
    _buildDSL(): DSL;
    _resetQueuedQueryParameterChanges(): void;
    _hasModuleBasedResolver(): boolean;
    /**
          Initializes the current router instance and sets up the change handling
          event listeners used by the instances `location` implementation.
      
          A property named `initialURL` will be used to determine the initial URL.
          If no value is found `/` will be used.
      
          @method startRouting
          @private
        */
    startRouting(): void;
    setupRouter(): boolean;
    _setOutlets(): void;
    handleURL(url: string): import('router_js').InternalTransition<Route<unknown>>;
    _doURLTransition<M extends 'handleURL' | 'transitionTo'>(
      routerJsMethod: M,
      url: string
    ): import('router_js').InternalTransition<Route<unknown>>;
    /**
          Transition the application into another route. The route may
          be either a single route or route path:
      
          @method transitionTo
          @param {String} [name] the name of the route or a URL
          @param {...Object} models the model(s) or identifier(s) to be used while
            transitioning to the route.
          @param {Object} [options] optional hash with a queryParams property
            containing a mapping of query parameters
          @return {Transition} the transition object associated with this
            attempted transition
          @public
        */
    transitionTo(...args: RouteArgs): Transition;
    intermediateTransitionTo(name: string, ...args: any[]): void;
    /**
          Similar to `transitionTo`, but instead of adding the destination to the browser's URL history,
          it replaces the entry for the current route.
          When the user clicks the "back" button in the browser, there will be fewer steps.
          This is most commonly used to manage redirects in a way that does not cause confusing additions
          to the user's browsing history.
      
          @method replaceWith
          @param {String} [name] the name of the route or a URL
          @param {...Object} models the model(s) or identifier(s) to be used while
            transitioning to the route.
          @param {Object} [options] optional hash with a queryParams property
            containing a mapping of query parameters
          @return {Transition} the transition object associated with this
            attempted transition
          @public
        */
    replaceWith(...args: RouteArgs): Transition;
    generate(
      name: string,
      ...args: ModelFor<Route>[] | [...ModelFor<Route>[], RouteOptions]
    ): string;
    /**
          Determines if the supplied route is currently active.
      
          @method isActive
          @param routeName
          @return {Boolean}
          @private
        */
    isActive(routeName: string): boolean;
    /**
          An alternative form of `isActive` that doesn't require
          manual concatenation of the arguments into a single
          array.
      
          @method isActiveIntent
          @param routeName
          @param models
          @param queryParams
          @return {Boolean}
          @private
          @since 1.7.0
        */
    isActiveIntent(
      routeName: string,
      models: ModelFor<Route>[],
      queryParams: Record<string, unknown>
    ): boolean;
    send(name: string, ...args: any[]): void;
    /**
          Does this router instance have the given route.
      
          @method hasRoute
          @return {Boolean}
          @private
        */
    hasRoute(route: string): boolean;
    /**
          Resets the state of the router by clearing the current route
          handlers and deactivating them.
      
          @private
          @method reset
         */
    reset(): void;
    willDestroy(): void;
    _activeQPChanged(queryParameterName: string, newValue: unknown): void;
    _updatingQPChanged(queryParameterName: string): void;
    _fireQueryParamTransition(): void;
    _setupLocation(): void;
    /**
          Serializes the given query params according to their QP meta information.
      
          @private
          @method _serializeQueryParams
          @param {Arrray<RouteInfo>} routeInfos
          @param {Object} queryParams
          @return {Void}
        */
    _serializeQueryParams(
      routeInfos: InternalRouteInfo<Route>[],
      queryParams: Record<string, unknown>
    ): asserts queryParams is Record<string, string | null | undefined>;
    /**
          Serializes the value of a query parameter based on a type
      
          @private
          @method _serializeQueryParam
          @param {Object} value
          @param {String} type
        */
    _serializeQueryParam(value: unknown, type: string): string | null | undefined;
    /**
          Deserializes the given query params according to their QP meta information.
      
          @private
          @method _deserializeQueryParams
          @param {Array<RouteInfo>} routeInfos
          @param {Object} queryParams
          @return {Void}
        */
    _deserializeQueryParams(
      routeInfos: InternalRouteInfo<Route>[],
      queryParams: Record<string, unknown>
    ): void;
    /**
          Deserializes the value of a query parameter based on a default type
      
          @private
          @method _deserializeQueryParam
          @param {Object} value
          @param {String} defaultType
        */
    _deserializeQueryParam(value: unknown, defaultType: string): {} | null | undefined;
    /**
          Removes (prunes) any query params with default values from the given QP
          object. Default values are determined from the QP meta information per key.
      
          @private
          @method _pruneDefaultQueryParamValues
          @param {Array<RouteInfo>} routeInfos
          @param {Object} queryParams
          @return {Void}
        */
    _pruneDefaultQueryParamValues(
      routeInfos: InternalRouteInfo<Route>[],
      queryParams: Record<string, string | null | undefined>
    ): void;
    _doTransition(
      _targetRouteName: string | undefined,
      models: ModelFor<Route>[],
      _queryParams: Record<string, unknown>,
      _fromRouterService?: boolean
    ): Transition;
    _processActiveTransitionQueryParams(
      targetRouteName: string,
      models: ModelFor<Route>[],
      queryParams: Record<string, unknown>,
      _queryParams: {}
    ): void;
    /**
          Prepares the query params for a URL or Transition. Restores any undefined QP
          keys/values, serializes all values, and then prunes any default values.
      
          @private
          @method _prepareQueryParams
          @param {String} targetRouteName
          @param {Array<Object>} models
          @param {Object} queryParams
          @param {boolean} keepDefaultQueryParamValues
          @return {Void}
        */
    _prepareQueryParams(
      targetRouteName: string,
      models: ModelFor<Route>[],
      queryParams: Record<string, unknown>,
      _fromRouterService?: boolean
    ): void;
    /**
          Returns the meta information for the query params of a given route. This
          will be overridden to allow support for lazy routes.
      
          @private
          @method _getQPMeta
          @param {RouteInfo} routeInfo
          @return {Object}
        */
    _getQPMeta(routeInfo: InternalRouteInfo<Route>): QueryParamMeta | undefined;
    /**
          Returns a merged query params meta object for a given set of routeInfos.
          Useful for knowing what query params are available for a given route hierarchy.
      
          @private
          @method _queryParamsFor
          @param {Array<RouteInfo>} routeInfos
          @return {Object}
         */
    _queryParamsFor(routeInfos: InternalRouteInfo<Route>[]): {
      qps: QueryParam[];
      map: Record<string, QueryParam>;
    };
    /**
          Maps all query param keys to their fully scoped property name of the form
          `controllerName:propName`.
      
          @private
          @method _fullyScopeQueryParams
          @param {String} leafRouteName
          @param {Array<Object>} contexts
          @param {Object} queryParams
          @return {Void}
        */
    _fullyScopeQueryParams(
      leafRouteName: string,
      contexts: ModelFor<Route>[],
      queryParams: QueryParams
    ): void;
    /**
          Hydrates (adds/restores) any query params that have pre-existing values into
          the given queryParams hash. This is what allows query params to be "sticky"
          and restore their last known values for their scope.
      
          @private
          @method _hydrateUnsuppliedQueryParams
          @param {TransitionState} state
          @param {Object} queryParams
          @return {Void}
        */
    _hydrateUnsuppliedQueryParams(
      state: TransitionState<Route>,
      queryParams: QueryParams,
      _fromRouterService: boolean
    ): void;
    _scheduleLoadingEvent(transition: Transition, originRoute: Route): void;
    currentState: null | RouterState;
    targetState: null | RouterState;
    _handleSlowTransition(transition: Transition, originRoute: Route): void;
    _cancelSlowTransitionTimer(): void;
    _markErrorAsHandled(error: Error): void;
    _isErrorHandled(error: Error): boolean;
    _clearHandledError(error: Error): void;
    _getEngineInstance({
      name,
      instanceId,
      mountPoint,
    }: {
      name: string;
      instanceId: number;
      mountPoint: string;
    }): EngineInstance;
    /**
          Handles updating the paths and notifying any listeners of the URL
          change.
      
          Triggers the router level `didTransition` hook.
      
          For example, to notify google analytics when the route changes,
          you could use this hook.  (Note: requires also including GA scripts, etc.)
      
          ```javascript
          import config from './config/environment';
          import EmberRouter from '@ember/routing/router';
          import { service } from '@ember/service';
      
          let Router = EmberRouter.extend({
            location: config.locationType,
      
            router: service(),
      
            didTransition: function() {
              this._super(...arguments);
      
              ga('send', 'pageview', {
                page: this.router.currentURL,
                title: this.router.currentRouteName,
              });
            }
          });
          ```
      
          @method didTransition
          @private
          @since 1.2.0
        */
    didTransition: typeof defaultDidTransition;
    /**
          Handles notifying any listeners of an impending URL
          change.
      
          Triggers the router level `willTransition` hook.
      
          @method willTransition
          @private
          @since 1.11.0
        */
    willTransition: typeof defaultWillTransition;
    /**
         Represents the current URL.
      
          @property url
          @type {String}
          @private
        */
    url: string;
  }
  let defaultActionHandlers: {
    willResolveModel<R extends Route<unknown>>(
      this: EmberRouter,
      _routeInfos: InternalRouteInfo<Route>[],
      transition: Transition,
      originRoute: R
    ): void;
    error(
      this: EmberRouter,
      routeInfos: InternalRouteInfo<Route>[],
      error: Error,
      transition: Transition
    ): void;
    loading(
      this: EmberRouter,
      routeInfos: InternalRouteInfo<Route>[],
      transition: Transition
    ): void;
  };
  export function triggerEvent<N extends MethodNamesOf<typeof defaultActionHandlers>>(
    this: EmberRouter,
    routeInfos: InternalRouteInfo<Route>[],
    ignoreFailure: boolean,
    name: N,
    args: OmitFirst<Parameters<(typeof defaultActionHandlers)[N]>>
  ): void;
  export default EmberRouter;
}
