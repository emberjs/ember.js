import { privatize as P } from '@ember/-internals/container';
import {
  addObserver,
  defineProperty,
  descriptorForProperty,
  flushAsyncObservers,
} from '@ember/-internals/metal';
import type Owner from '@ember/owner';
import { getOwner } from '@ember/-internals/owner';
import { BucketCache } from '@ember/routing/-internals';
import EmberObject, { computed, get, set, getProperties, setProperties } from '@ember/object';
import Evented from '@ember/object/evented';
import { A as emberA } from '@ember/array';
import { ActionHandler } from '@ember/-internals/runtime';
import { typeOf } from '@ember/utils';
import { isProxy, lookupDescriptor } from '@ember/-internals/utils';
import type { AnyFn } from '@ember/-internals/utility-types';
import Controller from '@ember/controller';
import type { ControllerQueryParamType } from '@ember/controller';
import { assert, deprecate, info, isTesting } from '@ember/debug';
import EngineInstance from '@ember/engine/instance';
import { dependentKeyCompat } from '@ember/object/compat';
import { once } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import type { RenderState } from '@ember/-internals/glimmer';
import type { TemplateFactory } from '@glimmer/interfaces';
import type { InternalRouteInfo, Route as IRoute, Transition, TransitionState } from 'router_js';
import { PARAMS_SYMBOL, STATE_SYMBOL } from 'router_js';
import type { QueryParam } from '@ember/routing/router';
import EmberRouter from '@ember/routing/router';
import { generateController } from '@ember/routing/-internals';
import type { ExpandedControllerQueryParam, NamedRouteArgs } from './lib/utils';
import {
  calculateCacheKey,
  normalizeControllerQueryParams,
  prefixRouteNameArg,
  stashParamNames,
} from './lib/utils';

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

interface StoreLike {
  find(type: string, value: unknown): unknown;
}

function isStoreLike(store: unknown): store is StoreLike {
  return (
    typeof store === 'object' && store !== null && typeof (store as StoreLike).find === 'function'
  );
}

const RENDER = Symbol('render');
const RENDER_STATE = Symbol('render-state');

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

class Route<Model = unknown> extends EmberObject.extend(ActionHandler, Evented) implements IRoute {
  static isRouteFactory = true;

  // These properties will end up appearing in the public interface because we
  // `implements IRoute` from `router.js`, which has them as part of *its*
  // public contract. We mark them as `@internal` so they at least signal to
  // people subclassing `Route` that they should not use them.
  /** @internal */
  context = {} as Model;
  /** @internal */
  declare currentModel: Model;

  /** @internal */
  _bucketCache!: BucketCache;
  /** @internal */
  _internalName!: string;

  private _names: unknown;

  _router!: EmberRouter;
  declare _topLevelViewTemplate: any;
  declare _environment: any;

  constructor(owner?: Owner) {
    super(owner);

    if (owner) {
      let router = owner.lookup('router:main');
      let bucketCache = owner.lookup(P`-bucket-cache:main`);

      assert(
        'ROUTER BUG: Expected route injections to be defined on the route. This is an internal bug, please open an issue on Github if you see this message!',
        router instanceof EmberRouter && bucketCache instanceof BucketCache
      );

      this._router = router;
      this._bucketCache = bucketCache;
      this._topLevelViewTemplate = owner.lookup('template:-outlet');
      this._environment = owner.lookup('-environment:main');
    }
  }

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
  serialize(model: Model, params: string[]): { [key: string]: unknown } | undefined {
    if (params.length < 1 || !model) {
      return;
    }

    let object: Record<string, unknown> = {};
    if (params.length === 1) {
      let [name] = params;
      assert('has name', name);
      if (typeof model === 'object' && name in model) {
        object[name] = get(model, name);
      } else if (/_id$/.test(name)) {
        object[name] = get(model, 'id');
      } else if (isProxy(model)) {
        object[name] = get(model, name);
      }
    } else {
      object = getProperties(model, params);
    }

    return object;
  }

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
  // Set in reopen so it can be overriden with extend
  declare queryParams: Record<
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
  // Set in reopen so it can be overriden with extend
  declare templateName: string | null;

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
  // Set in reopen so it can be overriden with extend
  declare controllerName: string | null;

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
  declare controller: Controller;

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
  declare routeName: string;

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
  declare fullRouteName: string;

  /**
    Sets the name for this route, including a fully resolved name for routes
    inside engines.

    @private
    @method _setRouteName
    @param {String} name
  */
  _setRouteName(name: string) {
    this.routeName = name;
    let owner = getOwner(this);
    assert('Expected route to have EngineInstance as owner', owner instanceof EngineInstance);
    this.fullRouteName = getEngineRouteName(owner, name)!;
  }

  /**
    @private

    @method _stashNames
  */
  _stashNames(
    routeInfo: ExtendedInternalRouteInfo<this>,
    dynamicParent: ExtendedInternalRouteInfo<this>
  ) {
    if (this._names) {
      return;
    }
    let names = (this._names = routeInfo['_names'])!;

    if (!names.length) {
      routeInfo = dynamicParent;
      names = (routeInfo && routeInfo['_names']) || [];
    }

    // SAFETY: Since `_qp` is protected we can't infer the type
    let qps = (get(this, '_qp') as Route<Model>['_qp']).qps;

    let namePaths = new Array(names.length);
    for (let a = 0; a < names.length; ++a) {
      namePaths[a] = `${routeInfo.name}.${names[a]}`;
    }

    for (let qp of qps) {
      if (qp.scope === 'model') {
        qp.parts = namePaths;
      }
    }
  }

  /**
    @private

    @property _activeQPChanged
  */
  _activeQPChanged(qp: QueryParam, value: unknown) {
    this._router._activeQPChanged(qp.scopedPropertyName, value);
  }

  /**
    @private
    @method _updatingQPChanged
  */
  _updatingQPChanged(qp: QueryParam) {
    this._router._updatingQPChanged(qp.urlKey);
  }

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
  paramsFor(name: string): Record<string, unknown> {
    let owner = getOwner(this);
    assert('Route is unexpectedly missing an owner', owner);
    let route = owner.lookup(`route:${name}`) as Route;

    if (route === undefined) {
      return {};
    }

    let transition = this._router._routerMicrolib.activeTransition;
    let state = transition ? transition[STATE_SYMBOL] : this._router._routerMicrolib.state;

    let fullName = route.fullRouteName;
    let params = { ...(state!.params[fullName] as Record<string, unknown>) };
    let queryParams = getQueryParamsFor(route, state!);

    return Object.entries(queryParams).reduce((params, [key, value]) => {
      assert(
        `The route '${this.routeName}' has both a dynamic segment and query param with name '${key}'. Please rename one to avoid collisions.`,
        !params[key]
      );
      params[key] = value;
      return params;
    }, params);
  }

  /**
    Serializes the query parameter key

    @method serializeQueryParamKey
    @param {String} controllerPropertyName
    @private
  */
  serializeQueryParamKey(controllerPropertyName: string) {
    return controllerPropertyName;
  }

  /**
    Serializes value of the query parameter based on defaultValueType

    @method serializeQueryParam
    @param {Object} value
    @param {String} urlKey
    @param {String} defaultValueType
    @private
  */
  serializeQueryParam(value: unknown, _urlKey: string, defaultValueType: string) {
    // urlKey isn't used here, but anyone overriding
    // can use it to provide serialization specific
    // to a certain query param.
    return this._router._serializeQueryParam(value, defaultValueType);
  }

  /**
    Deserializes value of the query parameter based on defaultValueType

    @method deserializeQueryParam
    @param {Object} value
    @param {String} urlKey
    @param {String} defaultValueType
    @private
  */
  deserializeQueryParam(value: unknown, _urlKey: string, defaultValueType: string) {
    // urlKey isn't used here, but anyone overriding
    // can use it to provide deserialization specific
    // to a certain query param.
    return this._router._deserializeQueryParam(value, defaultValueType);
  }

  /**
    @private

    @property _optionsForQueryParam
  */
  _optionsForQueryParam(qp: QueryParam): {} {
    const queryParams = get(this, 'queryParams');
    return (
      get(queryParams, qp.urlKey) ||
      get(queryParams, qp.prop) ||
      queryParams[qp.urlKey] ||
      queryParams[qp.prop] ||
      {}
    );
  }

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
  resetController(_controller: Controller, _isExiting: boolean, _transition: Transition): void {
    // We document that subclasses do not have to return *anything* and in fact
    // do not even have to call super, so whiel we *do* return `this`, we need
    // to be explicit in the types that our return type is *effectively* `void`.
    return this as unknown as void;
  }

  /**
    @private

    @method exit
  */
  exit(transition?: Transition) {
    this.deactivate(transition);
    this.trigger('deactivate', transition);
    this.teardownViews();
  }

  /**
    @private

    @method _internalReset
    @since 3.6.0
  */
  _internalReset(isExiting: boolean, transition: Transition) {
    let controller = this.controller;
    // SAFETY: Since `_qp` is protected we can't infer the type
    controller['_qpDelegate'] = (get(this, '_qp') as Route<Model>['_qp']).states.inactive;

    this.resetController(controller, isExiting, transition);
  }

  /**
    @private

    @method enter
  */
  enter(transition: Transition) {
    this[RENDER_STATE] = undefined;
    this.activate(transition);
    this.trigger('activate', transition);
  }

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
  deactivate(_transition?: Transition) {}

  /**
    This hook is executed when the router enters the route. It is not executed
    when the model for the route changes.

    @method activate
    @param {Transition} transition
    @since 1.0.0
    @public
  */
  activate(_transition: Transition) {}

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
  intermediateTransitionTo(...args: NamedRouteArgs): void {
    let [name, ...preparedArgs] = prefixRouteNameArg(this, args);
    this._router.intermediateTransitionTo(name, ...preparedArgs);
  }

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
  refresh(): Transition {
    return this._router._routerMicrolib.refresh(this);
  }

  /**
    This hook is the entry point for router.js

    @private
    @method setup
  */
  setup(context: Model | undefined, transition: Transition) {
    let controllerName = this.controllerName || this.routeName;
    let definedController = this.controllerFor(controllerName, true);
    let controller = definedController ?? this.generateController(controllerName);

    // SAFETY: Since `_qp` is protected we can't infer the type
    let queryParams = get(this, '_qp') as Route<Model>['_qp'];

    // Assign the route's controller so that it can more easily be
    // referenced in action handlers. Side effects. Side effects everywhere.
    if (!this.controller) {
      let propNames = queryParams.propertyNames;
      addQueryParamsObservers(controller, propNames);
      this.controller = controller;
    }

    let states = queryParams.states;

    controller._qpDelegate = states.allowOverrides;

    if (transition) {
      // Update the model dep values used to calculate cache keys.
      stashParamNames(this._router, transition[STATE_SYMBOL]!.routeInfos);

      let cache = this._bucketCache;
      let params = transition[PARAMS_SYMBOL];
      let allParams = queryParams.propertyNames;

      allParams.forEach((prop: string) => {
        let aQp = queryParams.map[prop];
        assert('expected aQp', aQp);
        aQp.values = params;

        let cacheKey = calculateCacheKey(aQp.route.fullRouteName, aQp.parts, aQp.values);
        let value = cache.lookup(cacheKey, prop, aQp.undecoratedDefaultValue);
        set(controller, prop, value);
      });

      let qpValues = getQueryParamsFor(this, transition[STATE_SYMBOL]!);
      setProperties(controller, qpValues);
    }

    this.setupController(controller, context, transition);

    if (this._environment.options.shouldRender) {
      this[RENDER]();
    }

    // Setup can cause changes to QPs which need to be propogated immediately in
    // some situations. Eventually, we should work on making these async somehow.
    flushAsyncObservers(false);
  }

  /*
    Called when a query parameter for this route changes, regardless of whether the route
    is currently part of the active route hierarchy. This will update the query parameter's
    value in the cache so if this route becomes active, the cache value has been updated.
  */
  _qpChanged(prop: string, value: unknown, qp: QueryParam) {
    if (!qp) {
      return;
    }

    // Update model-dep cache
    let cache = this._bucketCache;
    let cacheKey = calculateCacheKey(qp.route.fullRouteName, qp.parts, qp.values);
    cache.stash(cacheKey, prop, value);
  }

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
  beforeModel(_transition: Transition): void {}

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
  afterModel(_resolvedModel: Model | undefined, _transition: Transition): void {}

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
  redirect(_model: Model, _transition: Transition) {}

  /**
    Called when the context is changed by router.js.

    @private
    @method contextDidChange
  */
  contextDidChange() {
    this.currentModel = this.context;
  }

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
  ): Model | PromiseLike<Model> | undefined {
    let name, sawParams, value;
    // SAFETY: Since `_qp` is protected we can't infer the type
    let queryParams = (get(this, '_qp') as Route<Model>['_qp']).map;

    for (let prop in params) {
      if (prop === 'queryParams' || (queryParams && prop in queryParams)) {
        continue;
      }

      let match = prop.match(/^(.*)_id$/);
      if (match !== null) {
        name = match[1];
        value = params[prop];
      }
      sawParams = true;
    }

    if (!name) {
      if (sawParams) {
        // SAFETY: This should be equivalent
        return Object.assign({}, params) as Model;
      } else {
        if (transition.resolveIndex < 1) {
          return;
        }
        // SAFETY: This should be correct, but TS is unable to infer this.
        return transition[STATE_SYMBOL]!.routeInfos[transition.resolveIndex - 1]!.context as
          | Model
          | PromiseLike<Model>
          | undefined;
      }
    }

    return this.findModel(name, value);
  }

  /**
    @private
    @method deserialize
    @param {Object} params the parameters extracted from the URL
    @param {Transition} transition
    @return {any | Promise<any>} the model for this route.

    Router.js hook.
   */
  deserialize(_params: Record<string, unknown>, transition: Transition) {
    return this.model(this._paramsFor(this.routeName, _params), transition);
  }

  /**

    @method findModel
    @param {String} type the model type
    @param {Object} value the value passed to find
    @private
  */
  findModel(type: string, value: unknown) {
    deprecate(
      `The implicit model loading behavior for routes is deprecated. ` +
        `Please define an explicit model hook for ${this.fullRouteName}.`,
      false,
      {
        id: 'deprecate-implicit-route-model',
        for: 'ember-source',
        since: { available: '5.3.0', enabled: '5.3.0' },
        until: '6.0.0',
        url: 'https://deprecations.emberjs.com/v5.x/#toc_deprecate-implicit-route-model',
      }
    );

    const store = 'store' in this ? this.store : get(this, '_store');
    assert('Expected route to have a store with a find method', isStoreLike(store));

    // SAFETY: We don't actually know it will return this, but this code path is also deprecated.
    return store.find(type, value) as Model | PromiseLike<Model> | undefined;
  }

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
  setupController(controller: Controller, context: Model | undefined, _transition?: Transition) {
    if (controller && context !== undefined) {
      set(controller, 'model', context);
    }
  }

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
  controllerFor(name: string, _skipAssert = false): Controller | undefined {
    let owner = getOwner(this);
    assert('Route is unexpectedly missing an owner', owner);
    let route = owner.lookup(`route:${name}`) as Route;

    if (route && route.controllerName) {
      name = route.controllerName;
    }

    let controller = owner.lookup(`controller:${name}`);

    // NOTE: We're specifically checking that skipAssert is true, because according
    //   to the old API the second parameter was model. We do not want people who
    //   passed a model to skip the assertion.
    assert(
      `The controller named '${name}' could not be found. Make sure that this route exists and has already been entered at least once. If you are accessing a controller not associated with a route, make sure the controller class is explicitly defined.`,
      controller !== undefined || _skipAssert === true
    );

    assert(
      `Expected controller:${name} to be an instance of Controller`,
      controller === undefined || controller instanceof Controller
    );

    return controller;
  }

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
  generateController(name: string) {
    let owner = getOwner(this);
    assert('Route is unexpectedly missing an owner', owner);

    return generateController(owner, name);
  }

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
  modelFor(_name: string): unknown | undefined {
    let name;
    let owner = getOwner(this);
    assert('Expected router owner to be an EngineInstance', owner instanceof EngineInstance);
    let transition =
      this._router && this._router._routerMicrolib
        ? this._router._routerMicrolib.activeTransition
        : undefined;

    // Only change the route name when there is an active transition.
    // Otherwise, use the passed in route name.
    if (owner.routable && transition !== undefined) {
      name = getEngineRouteName(owner, _name);
    } else {
      name = _name;
    }

    let route = owner.lookup(`route:${name}`) as Route;
    // If we are mid-transition, we want to try and look up
    // resolved parent contexts on the current transitionEvent.
    if (transition !== undefined && transition !== null) {
      let modelLookupName = (route && route.routeName) || name;
      if (Object.prototype.hasOwnProperty.call(transition.resolvedModels, modelLookupName!)) {
        return transition.resolvedModels[modelLookupName!];
      }
    }

    return route?.currentModel;
  }

  [RENDER_STATE]: RenderState | undefined = undefined;

  /**
    `this[RENDER]` is used to set up the rendering option for the outlet state.
    @method this[RENDER]
    @private
   */
  [RENDER]() {
    this[RENDER_STATE] = buildRenderState(this);
    once(this._router, '_setOutlets');
  }

  willDestroy() {
    this.teardownViews();
  }

  /**
    @private

    @method teardownViews
  */
  teardownViews() {
    if (this[RENDER_STATE]) {
      this[RENDER_STATE] = undefined;
      once(this._router, '_setOutlets');
    }
  }

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
  buildRouteInfoMetadata(): void {}

  private _paramsFor(routeName: string, params: Record<string, unknown>) {
    let transition = this._router._routerMicrolib.activeTransition;
    if (transition !== undefined) {
      return this.paramsFor(routeName);
    }

    return params;
  }

  /** @deprecated Manually define your own store, such as with `@service store` */
  @computed
  protected get _store() {
    const owner = getOwner(this);
    assert('Route is unexpectedly missing an owner', owner);
    let routeName = this.routeName;

    return {
      find(name: string, value: unknown) {
        let modelClass: any = owner.factoryFor(`model:${name}`);

        assert(
          `You used the dynamic segment \`${name}_id\` in your route ` +
            `\`${routeName}\` for which Ember requires you provide a ` +
            `data-loading implementation. Commonly, that is done by ` +
            `adding a model hook implementation on the route ` +
            `(\`model({${name}_id}) {\`) or by injecting an implemention of ` +
            `a data store: \`@service store;\`.`,
          Boolean(modelClass)
        );

        if (!modelClass) {
          return;
        }

        modelClass = modelClass.class;

        assert(
          `You used the dynamic segment \`${name}_id\` in your route ` +
            `\`${routeName}\` for which Ember requires you provide a ` +
            `data-loading implementation. Commonly, that is done by ` +
            `adding a model hook implementation on the route ` +
            `(\`model({${name}_id}) {\`) or by injecting an implemention of ` +
            `a data store: \`@service store;\`.\n\n` +
            `Rarely, applications may attempt to use a legacy behavior where ` +
            `the model class (in this case \`${name}\`) is resolved and the ` +
            `\`find\` method on that class is invoked to load data. In this ` +
            `application, a model of \`${name}\` was found but it did not ` +
            `provide a \`find\` method. You should not add a \`find\` ` +
            `method to your model. Instead, please implement an appropriate ` +
            `\`model\` hook on the \`${routeName}\` route.`,
          typeof modelClass.find === 'function'
        );

        return modelClass.find(value);
      },
    };
  }

  /**
    @private
    @property _qp
    */
  @computed
  protected get _qp(): QueryParamMeta {
    let combinedQueryParameterConfiguration: ReturnType<typeof mergeEachQueryParams> = {};

    let controllerName = this.controllerName || this.routeName;
    let owner = getOwner(this);
    assert('Route is unexpectedly missing an owner', owner);
    let controller = owner.lookup(`controller:${controllerName}`);
    let queryParameterConfiguraton = get(this, 'queryParams');
    let hasRouterDefinedQueryParams = Object.keys(queryParameterConfiguraton).length > 0;

    if (controller) {
      assert('Expected an instance of controller', controller instanceof Controller);

      // the developer has authored a controller class in their application for
      // this route find its query params and normalize their object shape them
      // merge in the query params for the route. As a mergedProperty,
      // Route#queryParams is always at least `{}`

      let controllerDefinedQueryParameterConfiguration =
        (get(controller, 'queryParams') as Controller['queryParams']) || [];
      let normalizedControllerQueryParameterConfiguration = normalizeControllerQueryParams(
        controllerDefinedQueryParameterConfiguration
      );
      combinedQueryParameterConfiguration = mergeEachQueryParams(
        normalizedControllerQueryParameterConfiguration,
        queryParameterConfiguraton
      );
    } else if (hasRouterDefinedQueryParams) {
      // the developer has not defined a controller but *has* supplied route query params.
      // Generate a class for them so we can later insert default values
      controller = generateController(owner, controllerName);
      combinedQueryParameterConfiguration = queryParameterConfiguraton;
    }

    let qps: QueryParam[] = [];
    let map: Record<string, QueryParam> = {};
    let propertyNames: string[] = [];

    for (let propName in combinedQueryParameterConfiguration) {
      if (!Object.prototype.hasOwnProperty.call(combinedQueryParameterConfiguration, propName)) {
        continue;
      }

      // to support the dubious feature of using unknownProperty
      // on queryParams configuration
      if (propName === 'unknownProperty' || propName === '_super') {
        // possible todo: issue deprecation warning?
        continue;
      }

      let desc = combinedQueryParameterConfiguration[propName];
      assert(`[BUG] missing query parameter configuration for ${propName}`, desc);

      let scope = desc.scope || 'model';
      let parts: string[] | undefined = undefined;

      if (scope === 'controller') {
        parts = [];
      }

      let urlKey = desc.as || this.serializeQueryParamKey(propName);
      let defaultValue = get(controller!, propName);

      defaultValue = copyDefaultValue(defaultValue);

      let type = desc.type || typeOf(defaultValue);

      let defaultValueSerialized = this.serializeQueryParam(defaultValue, urlKey, type);
      let scopedPropertyName = `${controllerName}:${propName}`;
      let qp: QueryParam = {
        undecoratedDefaultValue: get(controller!, propName),
        defaultValue,
        serializedDefaultValue: defaultValueSerialized,
        serializedValue: defaultValueSerialized,

        type,
        urlKey,
        prop: propName,
        scopedPropertyName,
        controllerName,
        route: this,
        parts, // provided later when stashNames is called if 'model' scope
        values: null, // provided later when setup is called. no idea why.
        scope,
      };

      map[propName] = map[urlKey] = map[scopedPropertyName] = qp;
      qps.push(qp);
      propertyNames.push(propName);
    }

    return {
      qps,
      map,
      propertyNames,
      states: {
        /*
          Called when a query parameter changes in the URL, this route cares
          about that query parameter, but the route is not currently
          in the active route hierarchy.
        */
        inactive: (prop: string, value: unknown) => {
          let qp = map[prop];
          assert('expected inactive callback to only be called for registered qps', qp);
          this._qpChanged(prop, value, qp);
        },
        /*
          Called when a query parameter changes in the URL, this route cares
          about that query parameter, and the route is currently
          in the active route hierarchy.
        */
        active: (prop: string, value: unknown) => {
          let qp = map[prop];
          assert('expected active callback to only be called for registered qps', qp);
          this._qpChanged(prop, value, qp);
          return this._activeQPChanged(qp, value);
        },
        /*
          Called when a value of a query parameter this route handles changes in a controller
          and the route is currently in the active route hierarchy.
        */
        allowOverrides: (prop: string, value: unknown) => {
          let qp = map[prop];
          assert('expected allowOverrides callback to only be called for registered qps', qp);
          this._qpChanged(prop, value, qp);
          return this._updatingQPChanged(qp);
        },
      },
    };
  }

  // Set in reopen
  declare actions: Record<string, AnyFn>;

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
  // Set with reopen to override parent behavior
  declare send: <K extends keyof this | keyof this['actions']>(
    name: K,
    ...args: MaybeParameters<
      K extends keyof this ? this[K] : K extends keyof this['actions'] ? this['actions'][K] : never
    >
  ) => MaybeReturnType<
    K extends keyof this ? this[K] : K extends keyof this['actions'] ? this['actions'][K] : never
  >;
}

export function getRenderState(route: Route): RenderState | undefined {
  return route[RENDER_STATE];
}

function buildRenderState(route: Route): RenderState {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

  let name = route.routeName;

  let controller = owner.lookup(`controller:${route.controllerName || name}`);
  assert('Expected an instance of controller', controller instanceof Controller);

  let model = route.currentModel;

  let template = owner.lookup(`template:${route.templateName || name}`) as
    | TemplateFactory
    | undefined;

  let render: RenderState = {
    owner,
    into: undefined,
    outlet: 'main',
    name,
    controller,
    model,
    template: template?.(owner) ?? route._topLevelViewTemplate(owner),
  };

  if (DEBUG) {
    let LOG_VIEW_LOOKUPS = get(route._router, 'namespace.LOG_VIEW_LOOKUPS');
    if (LOG_VIEW_LOOKUPS && !template) {
      info(`Could not find "${name}" template. Nothing will be rendered`, {
        fullName: `template:${name}`,
      });
    }
  }

  return render;
}

export function getFullQueryParams(router: EmberRouter, state: RouteTransitionState) {
  if (state.fullQueryParams) {
    return state.fullQueryParams;
  }

  let haveAllRouteInfosResolved = state.routeInfos.every((routeInfo) => routeInfo.route);

  let fullQueryParamsState: Record<string, unknown> = {
    ...state.queryParams,
  };

  router._deserializeQueryParams(state.routeInfos, fullQueryParamsState);

  // only cache query params state if all routeinfos have resolved; it's possible
  // for lazy routes to not have resolved when `getFullQueryParams` is called, so
  // we wait until all routes have resolved prior to caching query params state
  if (haveAllRouteInfosResolved) {
    state.fullQueryParams = fullQueryParamsState;
  }

  return fullQueryParamsState;
}

function getQueryParamsFor(route: Route, state: RouteTransitionState): Record<string, unknown> {
  state.queryParamsFor = state.queryParamsFor || {};
  let name = route.fullRouteName;

  let existing = state.queryParamsFor[name];
  if (existing) {
    return existing;
  }

  let fullQueryParams = getFullQueryParams(route._router, state);

  let params: Record<string, unknown> = (state.queryParamsFor[name] = {});

  // Copy over all the query params for this route/controller into params hash.
  // SAFETY: Since `_qp` is protected we can't infer the type
  let qps = (get(route, '_qp') as Route['_qp']).qps;
  for (let qp of qps) {
    // Put deserialized qp on params hash.
    let qpValueWasPassedIn = qp.prop in fullQueryParams;
    params[qp.prop] = qpValueWasPassedIn
      ? fullQueryParams[qp.prop]
      : copyDefaultValue(qp.defaultValue);
  }

  return params;
}

// FIXME: This should probably actually return a `NativeArray` if the passed in value is an Array.
function copyDefaultValue<T>(value: T): T {
  if (Array.isArray(value)) {
    // SAFETY: We lost the type data about the array if we don't cast.
    return emberA(value.slice()) as unknown as T;
  }
  return value;
}

/*
  Merges all query parameters from a controller with those from
  a route, returning a new object and avoiding any mutations to
  the existing objects.
*/
function mergeEachQueryParams(
  controllerQP: Record<string, ExpandedControllerQueryParam>,
  routeQP: Route['queryParams']
) {
  let qps: Record<
    string,
    {
      type?: ControllerQueryParamType;
      as?: string | null;
      replace?: boolean;
      refreshModel?: boolean;
      scope?: string;
    }
  > = {};
  let keysAlreadyMergedOrSkippable: Record<string, true> = {
    defaultValue: true,
    type: true,
    scope: true,
    as: true,
  };

  // first loop over all controller qps, merging them with any matching route qps
  // into a new empty object to avoid mutating.
  for (let cqpName in controllerQP) {
    if (!Object.prototype.hasOwnProperty.call(controllerQP, cqpName)) {
      continue;
    }

    qps[cqpName] = { ...controllerQP[cqpName], ...routeQP[cqpName] };

    // allows us to skip this QP when we check route QPs.
    keysAlreadyMergedOrSkippable[cqpName] = true;
  }

  // loop over all route qps, skipping those that were merged in the first pass
  // because they also appear in controller qps
  for (let rqpName in routeQP) {
    if (
      !Object.prototype.hasOwnProperty.call(routeQP, rqpName) ||
      keysAlreadyMergedOrSkippable[rqpName]
    ) {
      continue;
    }

    qps[rqpName] = { ...routeQP[rqpName], ...controllerQP[rqpName] };
  }

  return qps;
}

function addQueryParamsObservers(controller: any, propNames: string[]) {
  propNames.forEach((prop) => {
    if (descriptorForProperty(controller, prop) === undefined) {
      let desc = lookupDescriptor(controller, prop);

      if (desc !== null && (typeof desc.get === 'function' || typeof desc.set === 'function')) {
        defineProperty(
          controller,
          prop,
          dependentKeyCompat({
            get: desc.get,
            set: desc.set,
          })
        );
      }
    }

    addObserver(controller, `${prop}.[]`, controller, controller._qpChanged, false);
  });
}

function getEngineRouteName(engine: EngineInstance, routeName: string) {
  if (engine.routable) {
    let prefix = engine.mountPoint;

    if (routeName === 'application') {
      return prefix;
    } else {
      return `${prefix}.${routeName}`;
    }
  }

  return routeName;
}

const defaultSerialize = Route.prototype.serialize;

export { defaultSerialize };

export function hasDefaultSerialize(route: Route): boolean {
  return route.serialize === defaultSerialize;
}

// Set these here so they can be overridden with extend
Route.reopen({
  mergedProperties: ['queryParams'],
  queryParams: {},
  templateName: null,
  controllerName: null,

  send(...args: any[]) {
    assert(
      `Attempted to call .send() with the action '${args[0]}' on the destroyed route '${this.routeName}'.`,
      !this.isDestroying && !this.isDestroyed
    );
    if ((this._router && this._router._routerMicrolib) || !isTesting()) {
      this._router.send(...args);
    } else {
      let name = args.shift();
      let action = this.actions[name];
      if (action) {
        return action.apply(this, args);
      }
    }
  },

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

  actions: {
    /**
    This action is called when one or more query params have changed. Bubbles.

    @method queryParamsDidChange
    @param changed {Object} Keys are names of query params that have changed.
    @param totalPresent {Object} Keys are names of query params that are currently set.
    @param removed {Object} Keys are names of query params that have been removed.
    @returns {boolean}
    @private
   */
    queryParamsDidChange<T>(this: Route<T>, changed: {}, _totalPresent: unknown, removed: {}) {
      // SAFETY: Since `_qp` is protected we can't infer the type
      let qpMap = (get(this, '_qp') as Route<T>['_qp']).map;

      let totalChanged = Object.keys(changed).concat(Object.keys(removed));
      for (let change of totalChanged) {
        let qp = qpMap[change];
        if (qp) {
          let options = this._optionsForQueryParam(qp);
          assert('options exists', options && typeof options === 'object');
          if ((get(options, 'refreshModel') as boolean) && this._router.currentState) {
            this.refresh();
            break;
          }
        }
      }

      return true;
    },

    finalizeQueryParamChange<T>(
      this: Route<T>,
      params: Record<string, string | null | undefined>,
      finalParams: {}[],
      transition: Transition
    ) {
      if (this.fullRouteName !== 'application') {
        return true;
      }

      // Transition object is absent for intermediate transitions.
      if (!transition) {
        return;
      }

      let routeInfos = transition[STATE_SYMBOL]!.routeInfos;
      let router = this._router;
      let qpMeta = router._queryParamsFor(routeInfos);
      let changes = router._qpUpdates;
      let qpUpdated = false;
      let replaceUrl;

      stashParamNames(router, routeInfos);

      for (let qp of qpMeta.qps) {
        let route = qp.route;
        let controller = route.controller;
        let presentKey = qp.urlKey in params && qp.urlKey;

        // Do a reverse lookup to see if the changed query
        // param URL key corresponds to a QP property on
        // this controller.
        let value;
        let svalue: string | null | undefined;
        if (changes.has(qp.urlKey)) {
          // Value updated in/before setupController
          value = get(controller, qp.prop);
          svalue = route.serializeQueryParam(value, qp.urlKey, qp.type);
        } else {
          if (presentKey) {
            svalue = params[presentKey];

            if (svalue !== undefined) {
              value = route.deserializeQueryParam(svalue, qp.urlKey, qp.type);
            }
          } else {
            // No QP provided; use default value.
            svalue = qp.serializedDefaultValue;
            value = copyDefaultValue(qp.defaultValue);
          }
        }

        // SAFETY: Since `_qp` is protected we can't infer the type
        controller._qpDelegate = (get(route, '_qp') as Route<T>['_qp']).states.inactive;

        let thisQueryParamChanged = svalue !== qp.serializedValue;
        if (thisQueryParamChanged) {
          if (transition.queryParamsOnly && replaceUrl !== false) {
            let options = route._optionsForQueryParam(qp);
            let replaceConfigValue = get(options, 'replace');
            if (replaceConfigValue) {
              replaceUrl = true;
            } else if (replaceConfigValue === false) {
              // Explicit pushState wins over any other replaceStates.
              replaceUrl = false;
            }
          }

          set(controller, qp.prop, value);

          qpUpdated = true;
        }

        // Stash current serialized value of controller.
        qp.serializedValue = svalue;

        let thisQueryParamHasDefaultValue = qp.serializedDefaultValue === svalue;
        if (!thisQueryParamHasDefaultValue) {
          finalParams.push({
            value: svalue,
            visible: true,
            key: presentKey || qp.urlKey,
          });
        }
      }

      // Some QPs have been updated, and those changes need to be propogated
      // immediately. Eventually, we should work on making this async somehow.
      if (qpUpdated === true) {
        flushAsyncObservers(false);
      }

      if (replaceUrl) {
        transition.method('replace');
      }

      qpMeta.qps.forEach((qp: QueryParam) => {
        // SAFETY: Since `_qp` is protected we can't infer the type
        let routeQpMeta = get(qp.route, '_qp') as Route<T>['_qp'];
        let finalizedController = qp.route.controller;
        finalizedController['_qpDelegate'] = get(routeQpMeta, 'states.active');
      });

      router._qpUpdates.clear();
      return;
    },
  },
});

export default Route;
