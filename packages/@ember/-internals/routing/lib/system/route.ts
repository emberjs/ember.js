import { privatize as P } from '@ember/-internals/container';
import {
  addObserver,
  computed,
  defineProperty,
  descriptorForProperty,
  flushAsyncObservers,
  get,
  getProperties,
  isEmpty,
  set,
  setProperties,
} from '@ember/-internals/metal';
import { getOwner, Owner } from '@ember/-internals/owner';
import { BucketCache } from '@ember/-internals/routing';
import {
  A as emberA,
  ActionHandler,
  Evented,
  Object as EmberObject,
  typeOf,
} from '@ember/-internals/runtime';
import { isProxy, lookupDescriptor, symbol } from '@ember/-internals/utils';
import Controller from '@ember/controller';
import { assert, info, isTesting } from '@ember/debug';
import { dependentKeyCompat } from '@ember/object/compat';
import { once } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { Template, TemplateFactory } from '@glimmer/interfaces';
import {
  InternalRouteInfo,
  PARAMS_SYMBOL,
  Route as IRoute,
  STATE_SYMBOL,
  Transition,
  TransitionState,
} from 'router_js';
import {
  calculateCacheKey,
  deprecateTransitionMethods,
  normalizeControllerQueryParams,
  prefixRouteNameArg,
  stashParamNames,
} from '../utils';
import generateController from './generate_controller';
import EmberRouter, { QueryParam } from './router';

export const ROUTE_CONNECTIONS = new WeakMap();
const RENDER = (symbol('render') as unknown) as string;

export function defaultSerialize(
  model: {},
  params: string[]
): { [key: string]: unknown } | undefined {
  if (params.length < 1 || !model) {
    return;
  }

  let object = {};
  if (params.length === 1) {
    let [name] = params;
    if (name in model) {
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

export function hasDefaultSerialize(route: Route): boolean {
  return route.serialize === defaultSerialize;
}

/**
@module @ember/routing
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

class Route extends EmberObject.extend(ActionHandler, Evented) implements IRoute, Evented {
  static isRouteFactory = true;

  context: {} = {};
  currentModel: unknown;

  _bucketCache!: BucketCache;
  _internalName!: string;

  private _names: unknown;

  _router!: EmberRouter;
  declare _topLevelViewTemplate: any;
  declare _environment: any;

  constructor(owner: Owner) {
    super(...arguments);

    if (owner) {
      let router = owner.lookup<EmberRouter>('router:main');
      let bucketCache = owner.lookup<BucketCache>(P`-bucket-cache:main`);

      assert(
        'ROUTER BUG: Expected route injections to be defined on the route. This is an internal bug, please open an issue on Github if you see this message!',
        router && bucketCache
      );

      this._router = router;
      this._bucketCache = bucketCache;
      this._topLevelViewTemplate = owner.lookup('template:-outlet');
      this._environment = owner.lookup('-environment:main');
    }
  }

  // Implement Evented
  declare on: (name: string, method: ((...args: any[]) => void) | string) => this;
  declare one: (name: string, method: string | ((...args: any[]) => void)) => this;
  declare trigger: (name: string, ...args: any[]) => any;
  declare off: (name: string, method: string | ((...args: any[]) => void)) => this;
  declare has: (name: string) => boolean;

  serialize!: (
    model: {},
    params: string[]
  ) =>
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
  // Set in reopen so it can be overriden with extend
  declare queryParams: Record<string, unknown>;

  /**
    The name of the template to use by default when rendering this routes
    template.

    ```app/routes/posts/list.js
    import Route from '@ember/routing/route';

    export default class extends Route {
      templateName = 'posts/list'
    });
    ```

    ```app/routes/posts/index.js
    import PostsList from '../posts/list';

    export default class extends PostsList {};
    ```

    ```app/routes/posts/archived.js
    import PostsList from '../posts/list';

    export default class extends PostsList {};
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
    this.fullRouteName = getEngineRouteName(getOwner(this), name)!;
  }

  /**
    @private

    @method _stashNames
  */
  _stashNames(routeInfo: InternalRouteInfo<this>, dynamicParent: InternalRouteInfo<this>) {
    if (this._names) {
      return;
    }
    let names = (this._names = routeInfo['_names']);

    if (!names.length) {
      routeInfo = dynamicParent;
      names = (routeInfo && routeInfo['_names']) || [];
    }

    let qps = get(this, '_qp.qps');

    let namePaths = new Array(names.length);
    for (let a = 0; a < names.length; ++a) {
      namePaths[a] = `${routeInfo.name}.${names[a]}`;
    }

    for (let i = 0; i < qps.length; ++i) {
      let qp = qps[i];
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
  paramsFor(name: string) {
    let route = getOwner(this).lookup<Route>(`route:${name}`);

    if (route === undefined) {
      return {};
    }

    let transition = this._router._routerMicrolib.activeTransition;
    let state = transition ? transition[STATE_SYMBOL] : this._router._routerMicrolib.state;

    let fullName = route.fullRouteName;
    let params = Object.assign({}, state!.params[fullName!]);
    let queryParams = getQueryParamsFor(route, state!);

    return Object.keys(queryParams).reduce((params, key) => {
      assert(
        `The route '${this.routeName}' has both a dynamic segment and query param with name '${key}'. Please rename one to avoid collisions.`,
        !params[key]
      );
      params[key] = queryParams[key];
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
  _optionsForQueryParam(qp: QueryParam) {
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
  resetController(_controller: any, _isExiting: boolean, _transition: Transition) {
    return this;
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
    controller['_qpDelegate'] = get(this, '_qp.states.inactive');

    this.resetController(controller, isExiting, transition);
  }

  /**
    @private

    @method enter
  */
  enter(transition: Transition) {
    ROUTE_CONNECTIONS.set(this, []);
    this.activate(transition);
    this.trigger('activate', transition);
  }

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
    `this.transitionTo('elsewhere')` from within `willTransition`.
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
        this.controller.get('errors.base').clear();
        return true; // Bubble the didTransition event
      }
    }
    ```

    @event didTransition
    @since 1.2.0
    @public
  */

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

    export default class AdminRoute extends Route {
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

        this.transitionTo('login');
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
    Transition the application into another route. The route may
    be either a single route or route path:

    ```javascript
    this.transitionTo('blogPosts');
    this.transitionTo('blogPosts.recentEntries');
    ```

    Optionally supply a model for the route in question. The model
    will be serialized into the URL using the `serialize` hook of
    the route:

    ```javascript
    this.transitionTo('blogPost', aPost);
    ```

    If a literal is passed (such as a number or a string), it will
    be treated as an identifier instead. In this case, the `model`
    hook of the route will be triggered:

    ```javascript
    this.transitionTo('blogPost', 1);
    ```

    Multiple models will be applied last to first recursively up the
    route tree.

    ```app/routes.js
    // ...

    Router.map(function() {
      this.route('blogPost', { path:':blogPostId' }, function() {
        this.route('blogComment', { path: ':blogCommentId' });
      });
    });

    export default Router;
    ```

    ```javascript
    this.transitionTo('blogComment', aPost, aComment);
    this.transitionTo('blogComment', 1, 13);
    ```

    It is also possible to pass a URL (a string that starts with a
    `/`).

    ```javascript
    this.transitionTo('/');
    this.transitionTo('/blog/post/1/comment/13');
    this.transitionTo('/blog/posts?sort=title');
    ```

    An options hash with a `queryParams` property may be provided as
    the final argument to add query parameters to the destination URL.

    ```javascript
    this.transitionTo('blogPost', 1, {
      queryParams: { showComments: 'true' }
    });

    // if you just want to transition the query parameters without changing the route
    this.transitionTo({ queryParams: { sort: 'date' } });
    ```

    See also [replaceWith](#method_replaceWith).

    Simple Transition Example

    ```app/routes.js
    // ...

    Router.map(function() {
      this.route('index');
      this.route('secret');
      this.route('fourOhFour', { path: '*:' });
    });

    export default Router;
    ```

    ```app/routes/index.js
    import Route from '@ember/routing/route';
    import { action } from '@ember/object';

    export default class IndexRoute extends Route {
      @action
      moveToSecret(context) {
        if (authorized()) {
          this.transitionTo('secret', context);
        } else {
          this.transitionTo('fourOhFour');
        }
      }
    }
    ```

    Transition to a nested route

    ```app/router.js
    // ...

    Router.map(function() {
      this.route('articles', { path: '/articles' }, function() {
        this.route('new');
      });
    });

    export default Router;
    ```

    ```app/routes/index.js
    import Route from '@ember/routing/route';
    import { action } from '@ember/object';

    export default class IndexRoute extends Route {
      @action
      transitionToNewArticle() {
        this.transitionTo('articles.new');
      }
    }
    ```

    Multiple Models Example

    ```app/router.js
    // ...

    Router.map(function() {
      this.route('index');

      this.route('breakfast', { path: ':breakfastId' }, function() {
        this.route('cereal', { path: ':cerealId' });
      });
    });

    export default Router;
    ```

    ```app/routes/index.js
    import Route from '@ember/routing/route';
    import { action } from '@ember/object';

    export default class IndexRoute extends Route {
      @action
      moveToChocolateCereal() {
        let cereal = { cerealId: 'ChocolateYumminess' };
        let breakfast = { breakfastId: 'CerealAndMilk' };

        this.transitionTo('breakfast.cereal', breakfast, cereal);
      }
    }
    ```

    Nested Route with Query String Example

    ```app/routes.js
    // ...

    Router.map(function() {
      this.route('fruits', function() {
        this.route('apples');
      });
    });

    export default Router;
    ```

    ```app/routes/index.js
    import Route from '@ember/routing/route';

    export default class IndexRoute extends Route {
      @action
      transitionToApples() {
        this.transitionTo('fruits.apples', { queryParams: { color: 'red' } });
      }
    }
    ```

    @method transitionTo
    @param {String} [name] the name of the route or a URL.
    @param {...Object} [models] the model(s) or identifier(s) to be used while
      transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters. May be supplied as the only
      parameter to trigger a query-parameter-only transition.
    @return {Transition} the transition object associated with this
      attempted transition
    @since 1.0.0
    @deprecated Use transitionTo from the Router service instead.
    @public
  */
  transitionTo(...args: any[]) {
    deprecateTransitionMethods('route', 'transitionTo');
    return this._router.transitionTo(...prefixRouteNameArg(this, args));
  }

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
  intermediateTransitionTo(...args: any[]) {
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
  refresh() {
    return this._router._routerMicrolib.refresh(this);
  }

  /**
    Transition into another route while replacing the current URL, if possible.
    This will replace the current history entry instead of adding a new one.
    Beside that, it is identical to `transitionTo` in all other respects. See
    'transitionTo' for additional information regarding multiple models.

    Example

    ```app/router.js
    // ...

    Router.map(function() {
      this.route('index');
      this.route('secret');
    });

    export default Router;
    ```

    ```app/routes/secret.js
    import Route from '@ember/routing/route';

    export default class SecretRoute Route {
      afterModel() {
        if (!authorized()){
          this.replaceWith('index');
        }
      }
    }
    ```

    @method replaceWith
    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used while
      transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @return {Transition} the transition object associated with this
      attempted transition
    @since 1.0.0
    @deprecated Use replaceWith from the Router service instead.
    @public
  */
  replaceWith(...args: any[]) {
    deprecateTransitionMethods('route', 'replaceWith');
    return this._router.replaceWith(...prefixRouteNameArg(this, args));
  }

  /**
    This hook is the entry point for router.js

    @private
    @method setup
  */
  setup(context: {}, transition: Transition) {
    let controllerName = this.controllerName || this.routeName;
    let definedController = this.controllerFor(controllerName, true);

    let controller: any;
    if (definedController) {
      controller = definedController;
    } else {
      controller = this.generateController(controllerName);
    }

    // Assign the route's controller so that it can more easily be
    // referenced in action handlers. Side effects. Side effects everywhere.
    if (!this.controller) {
      let qp = get(this, '_qp');
      let propNames = qp !== undefined ? get(qp, 'propertyNames') : [];
      addQueryParamsObservers(controller, propNames);
      this.controller = controller;
    }

    let queryParams = get(this, '_qp');

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
    `this.transitionTo` to another route to implicitly
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
  beforeModel() {}

  /**
    This hook is called after this route's model has resolved.
    It follows identical async/promise semantics to `beforeModel`
    but is provided the route's resolved model in addition to
    the `transition`, and is therefore suited to performing
    logic that can only take place after the model has already
    resolved.

    ```app/routes/posts.js
    import Route from '@ember/routing/route';

    export default class PostsRoute extends Route {
      afterModel(posts, transition) {
        if (posts.get('length') === 1) {
          this.transitionTo('post.show', posts.get('firstObject'));
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
  afterModel() {}

  /**
    A hook you can implement to optionally redirect to another route.

    Calling `this.transitionTo` from inside of the `redirect` hook will
    abort the current transition (into the route that has implemented `redirect`).

    `redirect` and `afterModel` behave very similarly and are
    called almost at the same time, but they have an important
    distinction when calling `this.transitionTo` to a child route
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
  redirect() {}

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

    The model for the `post` route is `store.findRecord('post', params.post_id)`.

    By default, if your route has a dynamic segment ending in `_id`:

    * The model class is determined from the segment (`post_id`'s
      class is `App.Post`)
    * The find method is called on the model class with the value of
      the dynamic segment.

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
    this.transitionTo('posts');

    // model passed in, so model hook not called
    thePost = store.findRecord('post', 1);
    this.transitionTo('post', thePost);

    // integer passed in, model hook is called
    this.transitionTo('post', 1);

    // model id passed in, model hook is called
    // useful for forcing the hook to execute
    thePost = store.findRecord('post', 1);
    this.transitionTo('post', thePost.id);
    ```

    This hook follows the asynchronous/promise semantics
    described in the documentation for `beforeModel`. In particular,
    if a promise returned from `model` fails, the error will be
    handled by the `error` hook on `Route`.

    Example

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
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
  model(params: {}, transition: Transition) {
    let name, sawParams, value;
    let queryParams = get(this, '_qp.map');

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
        return Object.assign({}, params);
      } else {
        if (transition.resolveIndex < 1) {
          return;
        }
        return transition[STATE_SYMBOL]!.routeInfos[transition.resolveIndex - 1].context;
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
  deserialize(_params: {}, transition: Transition) {
    return this.model(this._paramsFor(this.routeName, _params), transition);
  }

  /**

    @method findModel
    @param {String} type the model type
    @param {Object} value the value passed to find
    @private
  */
  findModel(...args: any[]) {
    return get(this, 'store').find(...args);
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

    export default class PhotosRoute extends Route {
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
  setupController(controller: Controller, context: {}, _transition?: Transition) {
    // eslint-disable-line no-unused-vars
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
    @return {Controller}
    @since 1.0.0
    @public
  */
  controllerFor(name: string, _skipAssert: boolean): Controller {
    let owner = getOwner(this);
    let route = owner.lookup<Route>(`route:${name}`);

    if (route && route.controllerName) {
      name = route.controllerName;
    }

    let controller = owner.lookup<Controller>(`controller:${name}`);

    // NOTE: We're specifically checking that skipAssert is true, because according
    //   to the old API the second parameter was model. We do not want people who
    //   passed a model to skip the assertion.
    assert(
      `The controller named '${name}' could not be found. Make sure that this route exists and has already been entered at least once. If you are accessing a controller not associated with a route, make sure the controller class is explicitly defined.`,
      controller !== undefined || _skipAssert === true
    );

    return controller!;
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
  modelFor(_name: string) {
    let name;
    let owner = getOwner(this);
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

    let route = owner.lookup<Route>(`route:${name}`);
    // If we are mid-transition, we want to try and look up
    // resolved parent contexts on the current transitionEvent.
    if (transition !== undefined && transition !== null) {
      let modelLookupName = (route && route.routeName) || name;
      if (Object.prototype.hasOwnProperty.call(transition.resolvedModels, modelLookupName!)) {
        return transition.resolvedModels[modelLookupName!];
      }
    }

    return route && route.currentModel;
  }

  /**
    `this[RENDER]` is used to render a template into a region of another template
    (indicated by an `{{outlet}}`).

    @method this[RENDER]
    @param {String} name the name of the template to render
    @param {Object} [options] the options
    @param {String} [options.into] the template to render into,
                    referenced by name. Defaults to the parent template
    @param {String} [options.outlet] the outlet inside `options.into` to render into.
                    Defaults to 'main'
    @param {String|Object} [options.controller] the controller to use for this template,
                    referenced by name or as a controller instance. Defaults to the Route's paired controller
    @param {Object} [options.model] the model object to set on `options.controller`.
                    Defaults to the return value of the Route's model hook
    @private
   */
  [RENDER](name?: string, options?: PartialRenderOptions) {
    let renderOptions = buildRenderOptions(this, name, options);
    ROUTE_CONNECTIONS.get(this).push(renderOptions);
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
    let connections = ROUTE_CONNECTIONS.get(this);
    if (connections !== undefined && connections.length > 0) {
      ROUTE_CONNECTIONS.set(this, []);
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
  buildRouteInfoMetadata() {}

  private _paramsFor(routeName: string, params: {}) {
    let transition = this._router._routerMicrolib.activeTransition;
    if (transition !== undefined) {
      return this.paramsFor(routeName);
    }

    return params;
  }

  /**
    Store property provides a hook for data persistence libraries to inject themselves.

    By default, this store property provides the exact same functionality previously
    in the model hook.

    Currently, the required interface is:

    `store.find(modelName, findArguments)`

    @property store
    @type {Object}
    @private
  */
  @computed
  protected get store() {
    let owner = getOwner(this);
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

  protected set store(value: any) {
    defineProperty(this, 'store', null, value);
  }

  /**
    @private
    @property _qp
    */
  @computed
  protected get _qp() {
    let combinedQueryParameterConfiguration;

    let controllerName = this.controllerName || this.routeName;
    let owner = getOwner(this);
    let controller = owner.lookup<Controller>(`controller:${controllerName}`);
    let queryParameterConfiguraton = get(this, 'queryParams');
    let hasRouterDefinedQueryParams = Object.keys(queryParameterConfiguraton).length > 0;

    if (controller) {
      // the developer has authored a controller class in their application for
      // this route find its query params and normalize their object shape them
      // merge in the query params for the route. As a mergedProperty,
      // Route#queryParams is always at least `{}`

      let controllerDefinedQueryParameterConfiguration = get(controller, 'queryParams') || {};
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

    let qps = [];
    let map = {};
    let propertyNames = [];

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
      let scope = desc.scope || 'model';
      let parts;

      if (scope === 'controller') {
        parts = [];
      }

      let urlKey = desc.as || this.serializeQueryParamKey(propName);
      let defaultValue = get(controller!, propName);

      defaultValue = copyDefaultValue(defaultValue);

      let type = desc.type || typeOf(defaultValue);

      let defaultValueSerialized = this.serializeQueryParam(defaultValue, urlKey, type);
      let scopedPropertyName = `${controllerName}:${propName}`;
      let qp = {
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
          this._qpChanged(prop, value, qp);
        },
        /*
          Called when a query parameter changes in the URL, this route cares
          about that query parameter, and the route is currently
          in the active route hierarchy.
        */
        active: (prop: string, value: unknown) => {
          let qp = map[prop];
          this._qpChanged(prop, value, qp);
          return this._activeQPChanged(qp, value);
        },
        /*
          Called when a value of a query parameter this route handles changes in a controller
          and the route is currently in the active route hierarchy.
        */
        allowOverrides: (prop: string, value: unknown) => {
          let qp = map[prop];
          this._qpChanged(prop, value, qp);
          return this._updatingQPChanged(qp);
        },
      },
    };
  }

  // Set in reopen
  declare actions: Record<string, (...args: any[]) => any>;

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
  declare send: (name: string, ...args: any[]) => unknown;
}

function parentRoute(route: Route) {
  let routeInfo = routeInfoFor(route, route._router._routerMicrolib.state!.routeInfos, -1);
  return routeInfo && routeInfo.route;
}

function routeInfoFor(route: Route, routeInfos: InternalRouteInfo<Route>[], offset = 0) {
  if (!routeInfos) {
    return;
  }

  let current: Route | undefined;
  for (let i = 0; i < routeInfos.length; i++) {
    current = routeInfos[i].route;
    if (current === route) {
      return routeInfos[i + offset];
    }
  }

  return;
}

function buildRenderOptions(
  route: Route,
  nameOrOptions?: string | PartialRenderOptions,
  options?: PartialRenderOptions
): RenderOptions {
  let isDefaultRender = !nameOrOptions && !options;
  let _name;
  if (!isDefaultRender) {
    if (typeof nameOrOptions === 'object' && !options) {
      _name = route.templateName || route.routeName;
      options = nameOrOptions;
    } else {
      assert(
        'The name in the given arguments is undefined or empty string',
        !isEmpty(nameOrOptions)
      );
      _name = nameOrOptions!;
    }
  }
  assert(
    'You passed undefined as the outlet name.',
    isDefaultRender || !(options && 'outlet' in options && options.outlet === undefined)
  );

  let owner = getOwner(route);
  let name, templateName, into, outlet, model;
  let controller: Controller | string | undefined = undefined;

  if (options) {
    into = options.into && options.into.replace(/\//g, '.');
    outlet = options.outlet;
    controller = options.controller;
    model = options.model;
  }
  outlet = outlet || 'main';

  if (isDefaultRender) {
    name = route.routeName;
    templateName = route.templateName || name;
  } else {
    name = _name!.replace(/\//g, '.');
    templateName = name;
  }

  if (controller === undefined) {
    if (isDefaultRender) {
      controller = route.controllerName || owner.lookup<Controller>(`controller:${name}`);
    } else {
      controller =
        owner.lookup<Controller>(`controller:${name}`) || route.controllerName || route.routeName;
    }
  }

  if (typeof controller === 'string') {
    let controllerName = controller;
    controller = owner.lookup<Controller>(`controller:${controllerName}`);
    assert(
      `You passed \`controller: '${controllerName}'\` into the \`render\` method, but no such controller could be found.`,
      isDefaultRender || controller !== undefined
    );
  }

  if (model === undefined) {
    model = route.currentModel;
  } else {
    (controller! as any).set('model', model);
  }

  let template = owner.lookup<TemplateFactory>(`template:${templateName}`);
  assert(
    `Could not find "${templateName}" template, view, or component.`,
    isDefaultRender || template !== undefined
  );

  let parent: any;
  if (into && (parent = parentRoute(route)) && into === parent.routeName) {
    into = undefined;
  }

  let renderOptions: RenderOptions = {
    owner,
    into,
    outlet,
    name,
    controller,
    model,
    template: template !== undefined ? template(owner) : route._topLevelViewTemplate(owner),
  };

  if (DEBUG) {
    let LOG_VIEW_LOOKUPS = get(route._router, 'namespace.LOG_VIEW_LOOKUPS');
    if (LOG_VIEW_LOOKUPS && !template) {
      info(`Could not find "${name}" template. Nothing will be rendered`, {
        fullName: `template:${name}`,
      });
    }
  }

  return renderOptions;
}

export interface RenderOptions {
  owner: Owner;
  into?: string;
  outlet: string;
  name: string;
  controller: Controller | string | undefined;
  model: unknown;
  template: Template;
}

type PartialRenderOptions = Partial<
  Pick<RenderOptions, 'into' | 'outlet' | 'controller' | 'model'>
>;

export function getFullQueryParams(router: EmberRouter, state: TransitionState<Route>) {
  if (state['fullQueryParams']) {
    return state['fullQueryParams'];
  }

  let fullQueryParamsState = {};
  let haveAllRouteInfosResolved = state.routeInfos.every((routeInfo) => routeInfo.route);

  Object.assign(fullQueryParamsState, state.queryParams);

  router._deserializeQueryParams(state.routeInfos, fullQueryParamsState as QueryParam);

  // only cache query params state if all routeinfos have resolved; it's possible
  // for lazy routes to not have resolved when `getFullQueryParams` is called, so
  // we wait until all routes have resolved prior to caching query params state
  if (haveAllRouteInfosResolved) {
    state['fullQueryParams'] = fullQueryParamsState;
  }

  return fullQueryParamsState;
}

function getQueryParamsFor(route: Route, state: TransitionState<Route>) {
  state['queryParamsFor'] = state['queryParamsFor'] || {};
  let name = route.fullRouteName;

  if (state['queryParamsFor'][name]) {
    return state['queryParamsFor'][name];
  }

  let fullQueryParams = getFullQueryParams(route._router, state);

  let params = (state['queryParamsFor'][name] = {});

  // Copy over all the query params for this route/controller into params hash.
  let qps = get(route, '_qp.qps');
  for (let i = 0; i < qps.length; ++i) {
    // Put deserialized qp on params hash.
    let qp = qps[i];

    let qpValueWasPassedIn = qp.prop in fullQueryParams;
    params[qp.prop] = qpValueWasPassedIn
      ? fullQueryParams[qp.prop]
      : copyDefaultValue(qp.defaultValue);
  }

  return params;
}

function copyDefaultValue(value: unknown[]) {
  if (Array.isArray(value)) {
    return emberA(value.slice());
  }
  return value;
}

/*
  Merges all query parameters from a controller with those from
  a route, returning a new object and avoiding any mutations to
  the existing objects.
*/
function mergeEachQueryParams(controllerQP: {}, routeQP: {}) {
  let qps = {};
  let keysAlreadyMergedOrSkippable = {
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

    let newControllerParameterConfiguration = {};
    Object.assign(newControllerParameterConfiguration, controllerQP[cqpName], routeQP[cqpName]);

    qps[cqpName] = newControllerParameterConfiguration;

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

    let newRouteParameterConfiguration = {};
    Object.assign(newRouteParameterConfiguration, routeQP[rqpName], controllerQP[rqpName]);
    qps[rqpName] = newRouteParameterConfiguration;
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

function getEngineRouteName(engine: Owner, routeName: string) {
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
Route.prototype.serialize = defaultSerialize;

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
    queryParamsDidChange(this: Route, changed: {}, _totalPresent: unknown, removed: {}) {
      let qpMap = get(this, '_qp').map;

      let totalChanged = Object.keys(changed).concat(Object.keys(removed));
      for (let i = 0; i < totalChanged.length; ++i) {
        let qp = qpMap[totalChanged[i]];
        if (
          qp &&
          get(this._optionsForQueryParam(qp), 'refreshModel') &&
          this._router.currentState
        ) {
          this.refresh();
          break;
        }
      }

      return true;
    },

    finalizeQueryParamChange(this: Route, params: {}, finalParams: {}[], transition: Transition) {
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

      for (let i = 0; i < qpMeta.qps.length; ++i) {
        let qp = qpMeta.qps[i];
        let route = qp.route;
        let controller = route.controller;
        let presentKey = qp.urlKey in params && qp.urlKey;

        // Do a reverse lookup to see if the changed query
        // param URL key corresponds to a QP property on
        // this controller.
        let value, svalue;
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

        controller._qpDelegate = get(route, '_qp.states.inactive');

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
        if (!thisQueryParamHasDefaultValue || (transition as any)._keepDefaultQueryParamValues) {
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
        let routeQpMeta = get(qp.route, '_qp');
        let finalizedController = qp.route.controller;
        finalizedController['_qpDelegate'] = get(routeQpMeta, 'states.active');
      });

      router._qpUpdates.clear();
      return;
    },
  },
});

export default Route;
