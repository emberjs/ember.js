declare module '@ember/routing/route' {
  import type Owner from '@ember/owner';
  import { BucketCache } from '@ember/routing/-internals';
  import EmberObject from '@ember/object';
  import Evented from '@ember/object/evented';
  import { ActionHandler } from '@ember/-internals/runtime';
  import type { AnyFn } from '@ember/-internals/utility-types';
  import Controller from '@ember/controller';
  import type { RenderState } from '@ember/-internals/glimmer';
  import type { InternalRouteInfo, Route as IRoute, Transition, TransitionState } from 'router_js';
  import type { QueryParam } from '@ember/routing/router';
  import EmberRouter from '@ember/routing/router';
  import type { NamedRouteArgs } from '@ember/routing/lib/utils';
  export interface ExtendedInternalRouteInfo<R extends Route> extends InternalRouteInfo<R> {
    _names?: unknown[];
  }
  export type QueryParamMeta = {
    qps: QueryParam[];
    map: Record<string, QueryParam>;
    propertyNames: string[];
    states: {
      inactive(prop: string, value: unknown): void;
      active(prop: string, value: unknown): any;
      allowOverrides(prop: string, value: unknown): any;
    };
  };
  type RouteTransitionState = TransitionState<Route> & {
    fullQueryParams?: Record<string, unknown>;
    queryParamsFor?: Record<string, Record<string, unknown>>;
  };
  type MaybeParameters<T> = T extends AnyFn ? Parameters<T> : unknown[];
  type MaybeReturnType<T> = T extends AnyFn ? ReturnType<T> : unknown;
  const RENDER: unique symbol;
  const RENDER_STATE: unique symbol;
  /**
    @module @ember/routing/route
    */
  /**
      The `Route` class is used to define individual routes. Refer to
      the [routing guide](https://guides.emberjs.com/release/routing/) for documentation.

      @class Route
      @extends EmberObject
      @uses ActionHandler
      @uses Evented
      @since 1.0.0
      @public
    */
  interface Route<Model = unknown> extends IRoute<Model>, ActionHandler, Evented {
    /**
          The `willTransition` action is fired at the beginning of any
          attempted transition with a `Transition` object as the sole
          argument. This action can be used for aborting, redirecting,
          or decorating the transition from the currently active routes.
      
          A good example is preventing navigation when a form is
          half-filled out:
      
          ```app/routes/contact-form.js
          import Route from '@ember/routing/route';
          import { action } from '@ember/object';
      
          export default class ContactFormRoute extends Route {
            @action
            willTransition(transition) {
              if (this.controller.get('userHasEnteredData')) {
                this.controller.displayNavigationConfirm();
                transition.abort();
              }
            }
          }
          ```
      
          You can also redirect elsewhere by calling
          `this.router.transitionTo('elsewhere')` from within `willTransition`.
          Note that `willTransition` will not be fired for the
          redirecting `transitionTo`, since `willTransition` doesn't
          fire when there is already a transition underway. If you want
          subsequent `willTransition` actions to fire for the redirecting
          transition, you must first explicitly call
          `transition.abort()`.
      
          To allow the `willTransition` event to continue bubbling to the parent
          route, use `return true;`. When the `willTransition` method has a
          return value of `true` then the parent route's `willTransition` method
          will be fired, enabling "bubbling" behavior for the event.
      
          @event willTransition
          @param {Transition} transition
          @since 1.0.0
          @public
        */
    willTransition?(transition: Transition): boolean | void;
    /**
          The `didTransition` action is fired after a transition has
          successfully been completed. This occurs after the normal model
          hooks (`beforeModel`, `model`, `afterModel`, `setupController`)
          have resolved. The `didTransition` action has no arguments,
          however, it can be useful for tracking page views or resetting
          state on the controller.
      
          ```app/routes/login.js
          import Route from '@ember/routing/route';
          import { action } from '@ember/object';
      
          export default class LoginRoute extends Route {
            @action
            didTransition() {
              // your code there
              return true; // Bubble the didTransition event
            }
          }
          ```
      
          @event didTransition
          @since 1.2.0
          @public
        */
    didTransition?(): boolean | void;
    /**
          The `loading` action is fired on the route when a route's `model`
          hook returns a promise that is not already resolved. The current
          `Transition` object is the first parameter and the route that
          triggered the loading event is the second parameter.
      
          ```app/routes/application.js
          import Route from '@ember/routing/route';
          import { action } from '@ember/object';
      
          export default class ApplicationRoute extends Route {
            @action
            loading(transition, route) {
              let controller = this.controllerFor('foo');
      
              // The controller may not be instantiated when initially loading
              if (controller) {
                controller.currentlyLoading = true;
      
                transition.finally(function() {
                  controller.currentlyLoading = false;
                });
              }
            }
          }
          ```
      
          @event loading
          @param {Transition} transition
          @param {Route} route The route that triggered the loading event
          @since 1.2.0
          @public
        */
    loading?(transition: Transition, route: Route): boolean | void;
    /**
          When attempting to transition into a route, any of the hooks
          may return a promise that rejects, at which point an `error`
          action will be fired on the partially-entered routes, allowing
          for per-route error handling logic, or shared error handling
          logic defined on a parent route.
      
          Here is an example of an error handler that will be invoked
          for rejected promises from the various hooks on the route,
          as well as any unhandled errors from child routes:
      
          ```app/routes/admin.js
          import { reject } from 'rsvp';
          import Route from '@ember/routing/route';
          import { action } from '@ember/object';
          import { service } from '@ember/service';
      
          export default class AdminRoute extends Route {
            @service router;
      
            beforeModel() {
              return reject('bad things!');
            }
      
            @action
            error(error, transition) {
              // Assuming we got here due to the error in `beforeModel`,
              // we can expect that error === "bad things!",
              // but a promise model rejecting would also
              // call this hook, as would any errors encountered
              // in `afterModel`.
      
              // The `error` hook is also provided the failed
              // `transition`, which can be stored and later
              // `.retry()`d if desired.
      
              this.router.transitionTo('login');
            }
          }
          ```
      
          `error` actions that bubble up all the way to `ApplicationRoute`
          will fire a default error handler that logs the error. You can
          specify your own global default error handler by overriding the
          `error` handler on `ApplicationRoute`:
      
          ```app/routes/application.js
          import Route from '@ember/routing/route';
          import { action } from '@ember/object';
      
          export default class ApplicationRoute extends Route {
            @action
            error(error, transition) {
              this.controllerFor('banner').displayError(error.message);
            }
          }
          ```
          @event error
          @param {Error} error
          @param {Transition} transition
          @since 1.0.0
          @public
        */
    error?(error: Error, transition: Transition): boolean | void;
  }
  const Route_base: Readonly<typeof EmberObject> &
    (new (owner?: Owner | undefined) => EmberObject) &
    import('@ember/object/mixin').default;
  class Route<Model = unknown> extends Route_base implements IRoute {
    static isRouteFactory: boolean;
    /** @internal */
    context: Model;
    /** @internal */
    currentModel: Model;
    /** @internal */
    _bucketCache: BucketCache;
    /** @internal */
    _internalName: string;
    private _names;
    _router: EmberRouter;
    _topLevelViewTemplate: any;
    _environment: any;
    constructor(owner?: Owner);
    /**
          A hook you can implement to convert the route's model into parameters
          for the URL.
      
          ```app/router.js
          // ...
      
          Router.map(function() {
            this.route('post', { path: '/posts/:post_id' });
          });
      
          ```
      
          ```app/routes/post.js
          import Route from '@ember/routing/route';
      
          export default class PostRoute extends Route {
            model({ post_id }) {
              // the server returns `{ id: 12 }`
              return fetch(`/posts/${post_id}`;
            }
      
            serialize(model) {
              // this will make the URL `/posts/12`
              return { post_id: model.id };
            }
          }
          ```
      
          The default `serialize` method will insert the model's `id` into the
          route's dynamic segment (in this case, `:post_id`) if the segment contains '_id'.
          If the route has multiple dynamic segments or does not contain '_id', `serialize`
          will return `getProperties(model, params)`
      
          This method is called when `transitionTo` is called with a context
          in order to populate the URL.
      
          @method serialize
          @param {Object} model the routes model
          @param {Array} params an Array of parameter names for the current
            route (in the example, `['post_id']`.
          @return {Object} the serialized parameters
          @since 1.0.0
          @public
        */
    serialize(
      model: Model,
      params: string[]
    ):
      | {
          [key: string]: unknown;
        }
      | undefined;
    /**
          Configuration hash for this route's queryParams. The possible
          configuration options and their defaults are as follows
          (assuming a query param whose controller property is `page`):
      
          ```javascript
          queryParams = {
            page: {
              // By default, controller query param properties don't
              // cause a full transition when they are changed, but
              // rather only cause the URL to update. Setting
              // `refreshModel` to true will cause an "in-place"
              // transition to occur, whereby the model hooks for
              // this route (and any child routes) will re-fire, allowing
              // you to reload models (e.g., from the server) using the
              // updated query param values.
              refreshModel: false,
      
              // By default, changes to controller query param properties
              // cause the URL to update via `pushState`, which means an
              // item will be added to the browser's history, allowing
              // you to use the back button to restore the app to the
              // previous state before the query param property was changed.
              // Setting `replace` to true will use `replaceState` (or its
              // hash location equivalent), which causes no browser history
              // item to be added. This options name and default value are
              // the same as the `link-to` helper's `replace` option.
              replace: false,
      
              // By default, the query param URL key is the same name as
              // the controller property name. Use `as` to specify a
              // different URL key.
              as: 'page'
            }
          };
          ```
      
          @property queryParams
          @for Route
          @type Object
          @since 1.6.0
          @public
        */
    queryParams: Record<
      string,
      {
        refreshModel?: boolean;
        replace?: boolean;
        as?: string;
      }
    >;
    /**
          The name of the template to use by default when rendering this route's
          template.
      
          ```app/routes/posts/list.js
          import Route from '@ember/routing/route';
      
          export default class PostsListRoute extends Route {
            templateName = 'posts/list';
          }
          ```
      
          ```app/routes/posts/index.js
          import PostsListRoute from '../posts/list';
      
          export default class PostsIndexRoute extends PostsListRoute {};
          ```
      
          ```app/routes/posts/archived.js
          import PostsListRoute from '../posts/list';
      
          export default class PostsArchivedRoute extends PostsListRoute {};
          ```
      
          @property templateName
          @type String
          @default null
          @since 1.4.0
          @public
        */
    templateName: string | null;
    /**
          The name of the controller to associate with this route.
      
          By default, Ember will lookup a route's controller that matches the name
          of the route (i.e. `posts.new`). However,
          if you would like to define a specific controller to use, you can do so
          using this property.
      
          This is useful in many ways, as the controller specified will be:
      
          * passed to the `setupController` method.
          * used as the controller for the template being rendered by the route.
          * returned from a call to `controllerFor` for the route.
      
          @property controllerName
          @type String
          @default null
          @since 1.4.0
          @public
        */
    controllerName: string | null;
    /**
          The controller associated with this route.
      
          Example
      
          ```app/routes/form.js
          import Route from '@ember/routing/route';
          import { action } from '@ember/object';
      
          export default class FormRoute extends Route {
            @action
            willTransition(transition) {
              if (this.controller.get('userHasEnteredData') &&
                  !confirm('Are you sure you want to abandon progress?')) {
                transition.abort();
              } else {
                // Bubble the `willTransition` action so that
                // parent routes can decide whether or not to abort.
                return true;
              }
            }
          }
          ```
      
          @property controller
          @type Controller
          @since 1.6.0
          @public
        */
    controller: Controller;
    /**
          The name of the route, dot-delimited.
      
          For example, a route found at `app/routes/posts/post.js` will have
          a `routeName` of `posts.post`.
      
          @property routeName
          @for Route
          @type String
          @since 1.0.0
          @public
        */
    routeName: string;
    /**
          The name of the route, dot-delimited, including the engine prefix
          if applicable.
      
          For example, a route found at `addon/routes/posts/post.js` within an
          engine named `admin` will have a `fullRouteName` of `admin.posts.post`.
      
          @property fullRouteName
          @for Route
          @type String
          @since 2.10.0
          @public
        */
    fullRouteName: string;
    /**
          Sets the name for this route, including a fully resolved name for routes
          inside engines.
      
          @private
          @method _setRouteName
          @param {String} name
        */
    _setRouteName(name: string): void;
    /**
          @private
      
          @method _stashNames
        */
    _stashNames(
      routeInfo: ExtendedInternalRouteInfo<this>,
      dynamicParent: ExtendedInternalRouteInfo<this>
    ): void;
    /**
          @private
      
          @property _activeQPChanged
        */
    _activeQPChanged(qp: QueryParam, value: unknown): void;
    /**
          @private
          @method _updatingQPChanged
        */
    _updatingQPChanged(qp: QueryParam): void;
    /**
          Returns a hash containing the parameters of an ancestor route.
      
          You may notice that `this.paramsFor` sometimes works when referring to a
          child route, but this behavior should not be relied upon as only ancestor
          routes are certain to be loaded in time.
      
          Example
      
          ```app/router.js
          // ...
      
          Router.map(function() {
            this.route('member', { path: ':name' }, function() {
              this.route('interest', { path: ':interest' });
            });
          });
          ```
      
          ```app/routes/member.js
          import Route from '@ember/routing/route';
      
          export default class MemberRoute extends Route {
            queryParams = {
              memberQp: { refreshModel: true }
            }
          }
          ```
      
          ```app/routes/member/interest.js
          import Route from '@ember/routing/route';
      
          export default class MemberInterestRoute extends Route {
            queryParams = {
              interestQp: { refreshModel: true }
            }
      
            model() {
              return this.paramsFor('member');
            }
          }
          ```
      
          If we visit `/turing/maths?memberQp=member&interestQp=interest` the model for
          the `member.interest` route is a hash with:
      
          * `name`: `turing`
          * `memberQp`: `member`
      
          @method paramsFor
          @param {String} name
          @return {Object} hash containing the parameters of the route `name`
          @since 1.4.0
          @public
        */
    paramsFor(name: string): Record<string, unknown>;
    /**
          Serializes the query parameter key
      
          @method serializeQueryParamKey
          @param {String} controllerPropertyName
          @private
        */
    serializeQueryParamKey(controllerPropertyName: string): string;
    /**
          Serializes value of the query parameter based on defaultValueType
      
          @method serializeQueryParam
          @param {Object} value
          @param {String} urlKey
          @param {String} defaultValueType
          @private
        */
    serializeQueryParam(
      value: unknown,
      _urlKey: string,
      defaultValueType: string
    ): string | null | undefined;
    /**
          Deserializes value of the query parameter based on defaultValueType
      
          @method deserializeQueryParam
          @param {Object} value
          @param {String} urlKey
          @param {String} defaultValueType
          @private
        */
    deserializeQueryParam(
      value: unknown,
      _urlKey: string,
      defaultValueType: string
    ): {} | null | undefined;
    /**
          @private
      
          @property _optionsForQueryParam
        */
    _optionsForQueryParam(qp: QueryParam): {};
    /**
          A hook you can use to reset controller values either when the model
          changes or the route is exiting.
      
          ```app/routes/articles.js
          import Route from '@ember/routing/route';
      
          export default class ArticlesRoute extends Route {
            resetController(controller, isExiting, transition) {
              if (isExiting && transition.targetName !== 'error') {
                controller.set('page', 1);
              }
            }
          }
          ```
      
          @method resetController
          @param {Controller} controller instance
          @param {Boolean} isExiting
          @param {Object} transition
          @since 1.7.0
          @public
        */
    resetController(_controller: Controller, _isExiting: boolean, _transition: Transition): void;
    /**
          @private
      
          @method exit
        */
    exit(transition?: Transition): void;
    /**
          @private
      
          @method _internalReset
          @since 3.6.0
        */
    _internalReset(isExiting: boolean, transition: Transition): void;
    /**
          @private
      
          @method enter
        */
    enter(transition: Transition): void;
    /**
          This event is triggered when the router enters the route. It is
          not executed when the model for the route changes.
      
          ```app/routes/application.js
          import { on } from '@ember/object/evented';
          import Route from '@ember/routing/route';
      
          export default Route.extend({
            collectAnalytics: on('activate', function(){
              collectAnalytics();
            })
          });
          ```
      
          @event activate
          @since 1.9.0
          @public
        */
    /**
          This event is triggered when the router completely exits this
          route. It is not executed when the model for the route changes.
      
          ```app/routes/index.js
          import { on } from '@ember/object/evented';
          import Route from '@ember/routing/route';
      
          export default Route.extend({
            trackPageLeaveAnalytics: on('deactivate', function(){
              trackPageLeaveAnalytics();
            })
          });
          ```
      
          @event deactivate
          @since 1.9.0
          @public
        */
    /**
          This hook is executed when the router completely exits this route. It is
          not executed when the model for the route changes.
      
          @method deactivate
          @param {Transition} transition
          @since 1.0.0
          @public
        */
    deactivate(_transition?: Transition): void;
    /**
          This hook is executed when the router enters the route. It is not executed
          when the model for the route changes.
      
          @method activate
          @param {Transition} transition
          @since 1.0.0
          @public
        */
    activate(_transition: Transition): void;
    /**
          Perform a synchronous transition into another route without attempting
          to resolve promises, update the URL, or abort any currently active
          asynchronous transitions (i.e. regular transitions caused by
          `transitionTo` or URL changes).
      
          This method is handy for performing intermediate transitions on the
          way to a final destination route, and is called internally by the
          default implementations of the `error` and `loading` handlers.
      
          @method intermediateTransitionTo
          @param {String} name the name of the route
          @param {...Object} models the model(s) to be used while transitioning
          to the route.
          @since 1.2.0
          @public
         */
    intermediateTransitionTo(...args: NamedRouteArgs): void;
    /**
          Refresh the model on this route and any child routes, firing the
          `beforeModel`, `model`, and `afterModel` hooks in a similar fashion
          to how routes are entered when transitioning in from other route.
          The current route params (e.g. `article_id`) will be passed in
          to the respective model hooks, and if a different model is returned,
          `setupController` and associated route hooks will re-fire as well.
      
          An example usage of this method is re-querying the server for the
          latest information using the same parameters as when the route
          was first entered.
      
          Note that this will cause `model` hooks to fire even on routes
          that were provided a model object when the route was initially
          entered.
      
          @method refresh
          @return {Transition} the transition object associated with this
            attempted transition
          @since 1.4.0
          @public
         */
    refresh(): Transition;
    /**
          This hook is the entry point for router.js
      
          @private
          @method setup
        */
    setup(context: Model | undefined, transition: Transition): void;
    _qpChanged(prop: string, value: unknown, qp: QueryParam): void;
    /**
          This hook is the first of the route entry validation hooks
          called when an attempt is made to transition into a route
          or one of its children. It is called before `model` and
          `afterModel`, and is appropriate for cases when:
      
          1) A decision can be made to redirect elsewhere without
             needing to resolve the model first.
          2) Any async operations need to occur first before the
             model is attempted to be resolved.
      
          This hook is provided the current `transition` attempt
          as a parameter, which can be used to `.abort()` the transition,
          save it for a later `.retry()`, or retrieve values set
          on it from a previous hook. You can also just call
          `router.transitionTo` to another route to implicitly
          abort the `transition`.
      
          You can return a promise from this hook to pause the
          transition until the promise resolves (or rejects). This could
          be useful, for instance, for retrieving async code from
          the server that is required to enter a route.
      
          @method beforeModel
          @param {Transition} transition
          @return {any | Promise<any>} if the value returned from this hook is
            a promise, the transition will pause until the transition
            resolves. Otherwise, non-promise return values are not
            utilized in any way.
          @since 1.0.0
          @public
        */
    beforeModel(_transition: Transition): unknown | Promise<unknown>;
    /**
          This hook is called after this route's model has resolved.
          It follows identical async/promise semantics to `beforeModel`
          but is provided the route's resolved model in addition to
          the `transition`, and is therefore suited to performing
          logic that can only take place after the model has already
          resolved.
      
          ```app/routes/posts.js
          import Route from '@ember/routing/route';
          import { service } from '@ember/service';
      
          export default class PostsRoute extends Route {
            @service router;
      
            afterModel(posts, transition) {
              if (posts.get('length') === 1) {
                this.router.transitionTo('post.show', posts.get('firstObject'));
              }
            }
          }
          ```
      
          Refer to documentation for `beforeModel` for a description
          of transition-pausing semantics when a promise is returned
          from this hook.
      
          @method afterModel
          @param {Object} resolvedModel the value returned from `model`,
            or its resolved value if it was a promise
          @param {Transition} transition
          @return {any | Promise<any>} if the value returned from this hook is
            a promise, the transition will pause until the transition
            resolves. Otherwise, non-promise return values are not
            utilized in any way.
          @since 1.0.0
          @public
         */
    afterModel(
      _resolvedModel: Model | undefined,
      _transition: Transition
    ): unknown | Promise<unknown>;
    /**
          A hook you can implement to optionally redirect to another route.
      
          Calling `this.router.transitionTo` from inside of the `redirect` hook will
          abort the current transition (into the route that has implemented `redirect`).
      
          `redirect` and `afterModel` behave very similarly and are
          called almost at the same time, but they have an important
          distinction when calling `this.router.transitionTo` to a child route
          of the current route. From `afterModel`, this new transition
          invalidates the current transition, causing `beforeModel`,
          `model`, and `afterModel` hooks to be called again. But the
          same transition started from `redirect` does _not_ invalidate
          the current transition. In other words, by the time the `redirect`
          hook has been called, both the resolved model and the attempted
          entry into this route are considered fully validated.
      
          @method redirect
          @param {Object} model the model for this route
          @param {Transition} transition the transition object associated with the current transition
          @since 1.0.0
          @public
        */
    redirect(_model: Model, _transition: Transition): void;
    /**
          Called when the context is changed by router.js.
      
          @private
          @method contextDidChange
        */
    contextDidChange(): void;
    /**
          A hook you can implement to convert the URL into the model for
          this route.
      
          ```app/router.js
          // ...
      
          Router.map(function() {
            this.route('post', { path: '/posts/:post_id' });
          });
      
          export default Router;
          ```
      
          Note that for routes with dynamic segments, this hook is not always
          executed. If the route is entered through a transition (e.g. when
          using the `link-to` Handlebars helper or the `transitionTo` method
          of routes), and a model context is already provided this hook
          is not called.
      
          A model context does not include a primitive string or number,
          which does cause the model hook to be called.
      
          Routes without dynamic segments will always execute the model hook.
      
          ```javascript
          // no dynamic segment, model hook always called
          this.router.transitionTo('posts');
      
          // model passed in, so model hook not called
          thePost = store.findRecord('post', 1);
          this.router.transitionTo('post', thePost);
      
          // integer passed in, model hook is called
          this.router.transitionTo('post', 1);
      
          // model id passed in, model hook is called
          // useful for forcing the hook to execute
          thePost = store.findRecord('post', 1);
          this.router.transitionTo('post', thePost.id);
          ```
      
          This hook follows the asynchronous/promise semantics
          described in the documentation for `beforeModel`. In particular,
          if a promise returned from `model` fails, the error will be
          handled by the `error` hook on `Route`.
      
          Note that the legacy behavior of automatically defining a model
          hook when a dynamic segment ending in `_id` is present is
          [deprecated](https://deprecations.emberjs.com/v5.x#toc_deprecate-implicit-route-model).
          You should explicitly define a model hook whenever any segments are
          present.
      
          Example
      
          ```app/routes/post.js
          import Route from '@ember/routing/route';
          import { service } from '@ember/service';
      
          export default class PostRoute extends Route {
            @service store;
      
            model(params) {
              return this.store.findRecord('post', params.post_id);
            }
          }
          ```
      
          @method model
          @param {Object} params the parameters extracted from the URL
          @param {Transition} transition
          @return {any | Promise<any>} the model for this route. If
            a promise is returned, the transition will pause until
            the promise resolves, and the resolved value of the promise
            will be used as the model for this route.
          @since 1.0.0
          @public
        */
    model(
      params: Record<string, unknown>,
      transition: Transition
    ): Model | PromiseLike<Model> | undefined;
    /**
          @private
          @method deserialize
          @param {Object} params the parameters extracted from the URL
          @param {Transition} transition
          @return {any | Promise<any>} the model for this route.
      
          Router.js hook.
         */
    deserialize(
      _params: Record<string, unknown>,
      transition: Transition
    ): Model | PromiseLike<Model> | undefined;
    /**
      
          @method findModel
          @param {String} type the model type
          @param {Object} value the value passed to find
          @private
        */
    findModel(type: string, value: unknown): Model | PromiseLike<Model> | undefined;
    /**
          A hook you can use to setup the controller for the current route.
      
          This method is called with the controller for the current route and the
          model supplied by the `model` hook.
      
          By default, the `setupController` hook sets the `model` property of
          the controller to the specified `model` when it is not `undefined`.
      
          If you implement the `setupController` hook in your Route, it will
          prevent this default behavior. If you want to preserve that behavior
          when implementing your `setupController` function, make sure to call
          `super`:
      
          ```app/routes/photos.js
          import Route from '@ember/routing/route';
          import { service } from '@ember/service';
      
          export default class PhotosRoute extends Route {
            @service store;
      
            model() {
              return this.store.findAll('photo');
            }
      
            setupController(controller, model) {
              super.setupController(controller, model);
      
              this.controllerFor('application').set('showingPhotos', true);
            }
          }
          ```
      
          The provided controller will be one resolved based on the name
          of this route.
      
          If no explicit controller is defined, Ember will automatically create one.
      
          As an example, consider the router:
      
          ```app/router.js
          // ...
      
          Router.map(function() {
            this.route('post', { path: '/posts/:post_id' });
          });
      
          export default Router;
          ```
      
          If you have defined a file for the post controller,
          the framework will use it.
          If it is not defined, a basic `Controller` instance would be used.
      
          @example Behavior of a basic Controller
      
          ```app/routes/post.js
          import Route from '@ember/routing/route';
      
          export default class PostRoute extends Route {
            setupController(controller, model) {
              controller.set('model', model);
            }
          });
          ```
      
          @method setupController
          @param {Controller} controller instance
          @param {Object} model
          @param {Transition} [transition]
          @since 1.0.0
          @public
        */
    setupController(
      controller: Controller,
      context: Model | undefined,
      _transition?: Transition
    ): void;
    /**
          Returns the controller of the current route, or a parent (or any ancestor)
          route in a route hierarchy.
      
          The controller instance must already have been created, either through entering the
          associated route or using `generateController`.
      
          ```app/routes/post.js
          import Route from '@ember/routing/route';
      
          export default class PostRoute extends Route {
            setupController(controller, post) {
              super.setupController(controller, post);
      
              this.controllerFor('posts').set('currentPost', post);
            }
          }
          ```
      
          @method controllerFor
          @param {String} name the name of the route or controller
          @return {Controller | undefined}
          @since 1.0.0
          @public
        */
    controllerFor(name: string, _skipAssert: true): Controller | undefined;
    controllerFor(name: string, _skipAssert?: false): Controller;
    /**
          Generates a controller for a route.
      
          Example
      
          ```app/routes/post.js
          import Route from '@ember/routing/route';
      
          export default class Post extends Route {
            setupController(controller, post) {
              super.setupController(controller, post);
      
              this.generateController('posts');
            }
          }
          ```
      
          @method generateController
          @param {String} name the name of the controller
          @private
        */
    generateController(name: string): Controller<unknown>;
    /**
          Returns the resolved model of a parent (or any ancestor) route
          in a route hierarchy.  During a transition, all routes
          must resolve a model object, and if a route
          needs access to a parent route's model in order to
          resolve a model (or just reuse the model from a parent),
          it can call `this.modelFor(theNameOfParentRoute)` to
          retrieve it. If the ancestor route's model was a promise,
          its resolved result is returned.
      
          Example
      
          ```app/router.js
          // ...
      
          Router.map(function() {
            this.route('post', { path: '/posts/:post_id' }, function() {
              this.route('comments');
            });
          });
      
          export default Router;
          ```
      
          ```app/routes/post/comments.js
          import Route from '@ember/routing/route';
      
          export default class PostCommentsRoute extends Route {
            model() {
              let post = this.modelFor('post');
      
              return post.comments;
            }
          }
          ```
      
          @method modelFor
          @param {String} name the name of the route
          @return {Object} the model object
          @since 1.0.0
          @public
        */
    modelFor(_name: string): unknown | undefined;
    [RENDER_STATE]: RenderState | undefined;
    /**
          `this[RENDER]` is used to set up the rendering option for the outlet state.
          @method this[RENDER]
          @private
         */
    [RENDER](): void;
    willDestroy(): void;
    /**
          @private
      
          @method teardownViews
        */
    teardownViews(): void;
    /**
          Allows you to produce custom metadata for the route.
          The return value of this method will be attached to
          its corresponding RouteInfoWithAttributes object.
      
          Example
      
          ```app/routes/posts/index.js
          import Route from '@ember/routing/route';
      
          export default class PostsIndexRoute extends Route {
            buildRouteInfoMetadata() {
              return { title: 'Posts Page' }
            }
          }
          ```
      
          ```app/routes/application.js
          import Route from '@ember/routing/route';
          import { service } from '@ember/service';
      
          export default class ApplicationRoute extends Route {
            @service router
      
            constructor() {
              super(...arguments);
      
              this.router.on('routeDidChange', transition => {
                document.title = transition.to.metadata.title;
                // would update document's title to "Posts Page"
              });
            }
          }
          ```
          @method buildRouteInfoMetadata
          @return any
          @since 3.10.0
          @public
         */
    buildRouteInfoMetadata(): unknown;
    private _paramsFor;
    /** @deprecated Manually define your own store, such as with `@service store` */
    protected get _store(): {
      find(name: string, value: unknown): any;
    };
    /**
          @private
          @property _qp
          */
    protected get _qp(): QueryParamMeta;
    actions: Record<string, AnyFn>;
    /**
          Sends an action to the router, which will delegate it to the currently
          active route hierarchy per the bubbling rules explained under `actions`.
      
          Example
      
          ```app/router.js
          // ...
      
          Router.map(function() {
            this.route('index');
          });
      
          export default Router;
          ```
      
          ```app/routes/application.js
          import Route from '@ember/routing/route';
          import { action } from '@ember/object';
      
          export default class ApplicationRoute extends Route {
            @action
            track(arg) {
              console.log(arg, 'was clicked');
            }
          }
          ```
      
          ```app/routes/index.js
          import Route from '@ember/routing/route';
          import { action } from '@ember/object';
      
          export default class IndexRoute extends Route {
            @action
            trackIfDebug(arg) {
              if (debug) {
                this.send('track', arg);
              }
            }
          }
          ```
      
          @method send
          @param {String} name the name of the action to trigger
          @param {...*} args
          @since 1.0.0
          @public
        */
    send: <K extends keyof this | keyof this['actions']>(
      name: K,
      ...args: MaybeParameters<
        K extends keyof this
          ? this[K]
          : K extends keyof this['actions']
          ? this['actions'][K]
          : never
      >
    ) => MaybeReturnType<
      K extends keyof this ? this[K] : K extends keyof this['actions'] ? this['actions'][K] : never
    >;
  }
  export function getRenderState(route: Route): RenderState | undefined;
  export function getFullQueryParams(
    router: EmberRouter,
    state: RouteTransitionState
  ): Record<string, unknown>;
  const defaultSerialize: (
    model: any,
    params: string[]
  ) =>
    | {
        [key: string]: unknown;
      }
    | undefined;
  export { defaultSerialize };
  export function hasDefaultSerialize(route: Route): boolean;
  export default Route;
}
