import { assign, symbol, getOwner } from 'ember-utils';
import {
  get,
  set,
  getProperties,
  setProperties,
  isNone,
  computed,
  run,
  isEmpty
} from 'ember-metal';
import { assert, info, Error as EmberError, isTesting } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import {
  typeOf,
  copy,
  String as StringUtils,
  Object as EmberObject,
  A as emberA,
  Evented,
  ActionHandler,
  deprecateUnderscoreActions
} from 'ember-runtime';
import generateController from './generate_controller';
import {
  stashParamNames,
  normalizeControllerQueryParams,
  calculateCacheKey,
  prefixRouteNameArg
} from '../utils';
const { slice } = Array.prototype;

function K() { return this; }

export function defaultSerialize(model, params) {
  if (params.length < 1 || !model) { return; }

  let name = params[0];
  let object = {};

  if (params.length === 1) {
    if (name in model) {
      object[name] = get(model, name);
    } else if (/_id$/.test(name)) {
      object[name] = get(model, 'id');
    }
  } else {
    object = getProperties(model, params);
  }

  return object;
}

const DEFAULT_SERIALIZE = symbol('DEFAULT_SERIALIZE');

defaultSerialize[DEFAULT_SERIALIZE] = true;

export function hasDefaultSerialize(route) {
  return !!route.serialize[DEFAULT_SERIALIZE];
}

/**
@module ember
@submodule ember-routing
*/

/**
  The `Ember.Route` class is used to define individual routes. Refer to
  the [routing guide](http://emberjs.com/guides/routing/) for documentation.

  @class Route
  @namespace Ember
  @extends Ember.Object
  @uses Ember.ActionHandler
  @uses Ember.Evented
  @since 1.0.0
  @public
*/
let Route = EmberObject.extend(ActionHandler, Evented, {
  /**
    Configuration hash for this route's queryParams. The possible
    configuration options and their defaults are as follows
    (assuming a query param whose controller property is `page`):

    ```javascript
    queryParams: {
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
    }
    ```

    @property queryParams
    @for Ember.Route
    @type Object
    @since 1.6.0
    @public
  */
  queryParams: {},

  /**
    The name of the route, dot-delimited.

    For example, a route found at `app/routes/posts/post.js` will have
    a `routeName` of `posts.post`.

    @property routeName
    @for Ember.Route
    @type String
    @since 1.0.0
    @public
  */

  /**
    Sets the name for this route, including a fully resolved name for routes
    inside engines.

    @private
    @method _setRouteName
    @param {String} name
  */
  _setRouteName(name) {
    this.routeName = name;
    this.fullRouteName = getEngineRouteName(getOwner(this), name);
  },

  /**
    @private

    @property _qp
  */
  _qp: computed(function() {
    let combinedQueryParameterConfiguration;

    let controllerName = this.controllerName || this.routeName;
    let owner = getOwner(this);
    let controller = owner.lookup(`controller:${controllerName}`);
    let queryParameterConfiguraton = get(this, 'queryParams');
    let hasRouterDefinedQueryParams = !!Object.keys(queryParameterConfiguraton).length;

    if (controller) {
      // the developer has authored a controller class in their application for
      // this route find its query params and normalize their object shape them
      // merge in the query params for the route. As a mergedProperty,
      // Route#queryParams is always at least `{}`

      let controllerDefinedQueryParameterConfiguration = get(controller, 'queryParams') || {};
      let normalizedControllerQueryParameterConfiguration = normalizeControllerQueryParams(controllerDefinedQueryParameterConfiguration);
      combinedQueryParameterConfiguration = mergeEachQueryParams(normalizedControllerQueryParameterConfiguration, queryParameterConfiguraton);
    } else if (hasRouterDefinedQueryParams) {
      // the developer has not defined a controller but *has* supplied route query params.
      // Generate a class for them so we can later insert default values
      controller = generateController(getOwner(this), controllerName);
      combinedQueryParameterConfiguration = queryParameterConfiguraton;
    }

    let qps = [];
    let map = {};
    let propertyNames = [];

    for (let propName in combinedQueryParameterConfiguration) {
      if (!combinedQueryParameterConfiguration.hasOwnProperty(propName)) { continue; }

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
      let defaultValue = get(controller, propName);

      if (Array.isArray(defaultValue)) {
        defaultValue = emberA(defaultValue.slice());
      }

      let type = desc.type || typeOf(defaultValue);

      let defaultValueSerialized = this.serializeQueryParam(defaultValue, urlKey, type);
      let scopedPropertyName = `${controllerName}:${propName}`;
      let qp = {
        undecoratedDefaultValue: get(controller, propName),
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
        scope
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
        inactive: (prop, value) => {
          let qp = map[prop];
          this._qpChanged(prop, value, qp);
        },
        /*
          Called when a query parameter changes in the URL, this route cares
          about that query parameter, and the route is currently
          in the active route hierarchy.
        */
        active: (prop, value) => {
          let qp = map[prop];
          this._qpChanged(prop, value, qp);
          return this._activeQPChanged(map[prop], value);
        },
        /*
          Called when a value of a query parameter this route handles changes in a controller
          and the route is currently in the active route hierarchy.
        */
        allowOverrides: (prop, value) => {
          let qp = map[prop];
          this._qpChanged(prop, value, qp);
          return this._updatingQPChanged(map[prop]);
        }
      }
    };
  }),

  /**
    @private

    @property _names
  */
  _names: null,

  /**
    @private

    @method _stashNames
  */
  _stashNames(handlerInfo, dynamicParent) {
    if (this._names) { return; }
    let names = this._names = handlerInfo._names;

    if (!names.length) {
      handlerInfo = dynamicParent;
      names = handlerInfo && handlerInfo._names || [];
    }

    let qps = get(this, '_qp.qps');

    let namePaths = new Array(names.length);
    for (let a = 0; a < names.length; ++a) {
      namePaths[a] = `${handlerInfo.name}.${names[a]}`;
    }

    for (let i = 0; i < qps.length; ++i) {
      let qp = qps[i];
      if (qp.scope === 'model') {
        qp.parts = namePaths;
      }
    }
  },

  /**
    @private

    @property _activeQPChanged
  */
  _activeQPChanged(qp, value) {
    let router = this.router;
    router._activeQPChanged(qp.scopedPropertyName, value);
  },

  /**
    @private
    @method _updatingQPChanged
  */
  _updatingQPChanged(qp) {
    let router = this.router;
    router._updatingQPChanged(qp.urlKey);
  },

  mergedProperties: ['queryParams'],

  /**
    Returns a hash containing the parameters of an ancestor route.

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
    export default Ember.Route.extend({
      queryParams: {
        memberQp: { refreshModel: true }
      }
    });
    ```

    ```app/routes/member/interest.js
    export default Ember.Route.extend({
      queryParams: {
        interestQp: { refreshModel: true }
      },

      model() {
        return this.paramsFor('member');
      }
    });
    ```

    If we visit `/turing/maths?memberQp=member&interestQp=interest` the model for
    the `member.interest` route is hash with:

    * `name`: `turing`
    * `memberQp`: `member`

    @method paramsFor
    @param {String} name
    @return {Object} hash containing the parameters of the route `name`
    @since 1.4.0
    @public
  */
  paramsFor(name) {
    let route = getOwner(this).lookup(`route:${name}`);

    if (!route) {
      return {};
    }

    let transition = this.router._routerMicrolib.activeTransition;
    let state = transition ? transition.state : this.router._routerMicrolib.state;

    let fullName = route.fullRouteName;
    let params = assign({}, state.params[fullName]);
    let queryParams = getQueryParamsFor(route, state);

    return Object.keys(queryParams).reduce((params, key) => {
      assert(`The route '${this.routeName}' has both a dynamic segment and query param with name '${key}'. Please rename one to avoid collisions.`, !params[key]);
      params[key] = queryParams[key];
      return params;
    }, params);
  },

  /**
    Serializes the query parameter key

    @method serializeQueryParamKey
    @param {String} controllerPropertyName
    @private
  */
  serializeQueryParamKey(controllerPropertyName) {
    return controllerPropertyName;
  },

  /**
    Serializes value of the query parameter based on defaultValueType

    @method serializeQueryParam
    @param {Object} value
    @param {String} urlKey
    @param {String} defaultValueType
    @private
  */
  serializeQueryParam(value, urlKey, defaultValueType) {
    // urlKey isn't used here, but anyone overriding
    // can use it to provide serialization specific
    // to a certain query param.
    return this.router._serializeQueryParam(value, defaultValueType);
  },

  /**
    Deserializes value of the query parameter based on defaultValueType

    @method deserializeQueryParam
    @param {Object} value
    @param {String} urlKey
    @param {String} defaultValueType
    @private
  */
  deserializeQueryParam(value, urlKey, defaultValueType) {
    // urlKey isn't used here, but anyone overriding
    // can use it to provide deserialization specific
    // to a certain query param.
    return this.router._deserializeQueryParam(value, defaultValueType);
  },

  /**
    @private

    @property _optionsForQueryParam
  */
  _optionsForQueryParam(qp) {
    return get(this, `queryParams.${qp.urlKey}`) || get(this, `queryParams.${qp.prop}`) || {};
  },

  /**
    A hook you can use to reset controller values either when the model
    changes or the route is exiting.

    ```app/routes/articles.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      resetController(controller, isExiting, transition) {
        if (isExiting) {
          controller.set('page', 1);
        }
      }
    });
    ```

    @method resetController
    @param {Controller} controller instance
    @param {Boolean} isExiting
    @param {Object} transition
    @since 1.7.0
    @public
  */
  resetController: K,

  /**
    @private

    @method exit
  */
  exit() {
    this.deactivate();
    this.trigger('deactivate');
    this.teardownViews();
  },

  /**
    @private

    @method _reset
    @since 1.7.0
  */
  _reset(isExiting, transition) {
    let controller = this.controller;
    controller._qpDelegate = get(this, '_qp.states.inactive');

    this.resetController(controller, isExiting, transition);
  },

  /**
    @private

    @method enter
  */
  enter() {
    this.connections = [];
    this.activate();
    this.trigger('activate');
  },

  /**
    The name of the template to use by default when rendering this routes
    template.

    ```app/routes/posts/list.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      templateName: 'posts/list'
    });
    ```

    ```app/routes/posts/index.js
    import PostsList from '../posts/list';

    export default PostsList.extend();
    ```

    ```app/routes/posts/archived.js
    import PostsList from '../posts/list';

    export default PostsList.extend();
    ```

    @property templateName
    @type String
    @default null
    @since 1.4.0
    @public
  */
  templateName: null,

  /**
    The name of the controller to associate with this route.

    By default, Ember will lookup a route's controller that matches the name
    of the route (i.e. `App.PostController` for `App.PostRoute`). However,
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
  controllerName: null,

  /**
    The `willTransition` action is fired at the beginning of any
    attempted transition with a `Transition` object as the sole
    argument. This action can be used for aborting, redirecting,
    or decorating the transition from the currently active routes.

    A good example is preventing navigation when a form is
    half-filled out:

    ```app/routes/contact-form.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        willTransition(transition) {
          if (this.controller.get('userHasEnteredData')) {
            this.controller.displayNavigationConfirm();
            transition.abort();
          }
        }
      }
    });
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
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        didTransition() {
          this.controller.get('errors.base').clear();
          return true; // Bubble the didTransition event
        }
      }
    });
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
    export default Ember.Route.extend({
      actions: {
        loading(transition, route) {
          let controller = this.controllerFor('foo');
          controller.set('currentlyLoading', true);

          transition.finally(function() {
            controller.set('currentlyLoading', false);
          });
        }
      }
    });
    ```

    @event loading
    @param {Transition} transition
    @param {Ember.Route} route The route that triggered the loading event
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
    import Ember from 'ember';

    export default Ember.Route.extend({
      beforeModel() {
        return Ember.RSVP.reject('bad things!');
      },

      actions: {
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
    });
    ```

    `error` actions that bubble up all the way to `ApplicationRoute`
    will fire a default error handler that logs the error. You can
    specify your own global default error handler by overriding the
    `error` handler on `ApplicationRoute`:

    ```app/routes/application.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        error(error, transition) {
          this.controllerFor('banner').displayError(error.message);
        }
      }
    });
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
    import Ember from 'ember';

    export default Ember.Route.extend({
      collectAnalytics: Ember.on('activate', function(){
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
    import Ember from 'ember';

    export default Ember.Route.extend({
      trackPageLeaveAnalytics: Ember.on('deactivate', function(){
        trackPageLeaveAnalytics();
      })
    });
    ```

    @event deactivate
    @since 1.9.0
    @public
  */

  /**
    The controller associated with this route.

    Example

    ```app/routes/form.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
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
    });
    ```

    @property controller
    @type Ember.Controller
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
    queryParamsDidChange(changed, totalPresent, removed) {
      let qpMap = get(this, '_qp').map;

      let totalChanged = Object.keys(changed).concat(Object.keys(removed));
      for (let i = 0; i < totalChanged.length; ++i) {
        let qp = qpMap[totalChanged[i]];
        if (qp && get(this._optionsForQueryParam(qp), 'refreshModel') && this.router.currentState) {
          this.refresh();
          break;
        }
      }

      return true;
    },

    finalizeQueryParamChange(params, finalParams, transition) {
      if (this.fullRouteName !== 'application') { return true; }

      // Transition object is absent for intermediate transitions.
      if (!transition) { return; }

      let handlerInfos = transition.state.handlerInfos;
      let router = this.router;
      let qpMeta = router._queryParamsFor(handlerInfos);
      let changes = router._qpUpdates;
      let replaceUrl;

      stashParamNames(router, handlerInfos);

      for (let i = 0; i < qpMeta.qps.length; ++i) {
        let qp = qpMeta.qps[i];
        let route = qp.route;
        let controller = route.controller;
        let presentKey = qp.urlKey in params && qp.urlKey;

        // Do a reverse lookup to see if the changed query
        // param URL key corresponds to a QP property on
        // this controller.
        let value, svalue;
        if (changes && qp.urlKey in changes) {
          // Value updated in/before setupController
          value = get(controller, qp.prop);
          svalue = route.serializeQueryParam(value, qp.urlKey, qp.type);
        } else {
          if (presentKey) {
            svalue = params[presentKey];
            value = route.deserializeQueryParam(svalue, qp.urlKey, qp.type);
          } else {
            // No QP provided; use default value.
            svalue = qp.serializedDefaultValue;
            value = copyDefaultValue(qp.defaultValue);
          }
        }


        controller._qpDelegate = get(route, '_qp.states.inactive');

        let thisQueryParamChanged = (svalue !== qp.serializedValue);
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
        }

        // Stash current serialized value of controller.
        qp.serializedValue = svalue;

        let thisQueryParamHasDefaultValue = (qp.serializedDefaultValue === svalue);
        if (!thisQueryParamHasDefaultValue) {
          finalParams.push({
            value: svalue,
            visible: true,
            key: presentKey || qp.urlKey
          });
        }
      }

      if (replaceUrl) {
        transition.method('replace');
      }

      qpMeta.qps.forEach(qp => {
        let routeQpMeta = get(qp.route, '_qp');
        let finalizedController = qp.route.controller;
        finalizedController._qpDelegate = get(routeQpMeta, 'states.active');
      });

      router._qpUpdates = null;
    }
  },

  /**
    This hook is executed when the router completely exits this route. It is
    not executed when the model for the route changes.

    @method deactivate
    @since 1.0.0
    @public
  */
  deactivate: K,

  /**
    This hook is executed when the router enters the route. It is not executed
    when the model for the route changes.

    @method activate
    @since 1.0.0
    @public
  */
  activate: K,

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
    `/`). This is intended for testing and debugging purposes and
    should rarely be used in production code.

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
    import Ember from 'ember':

    export Ember.Route.extend({
      actions: {
        moveToSecret(context) {
          if (authorized()) {
            this.transitionTo('secret', context);
          } else {
            this.transitionTo('fourOhFour');
          }
        }
      }
    });
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
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        transitionToNewArticle() {
          this.transitionTo('articles.new');
        }
      }
    });
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
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        moveToChocolateCereal() {
          let cereal = { cerealId: 'ChocolateYumminess' };
          let breakfast = { breakfastId: 'CerealAndMilk' };

          this.transitionTo('breakfast.cereal', breakfast, cereal);
        }
      }
    });
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
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        transitionToApples() {
          this.transitionTo('fruits.apples', { queryParams: { color: 'red' } });
        }
      }
    });
    ```

    @method transitionTo
    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used while
      transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @return {Transition} the transition object associated with this
      attempted transition
    @since 1.0.0
    @public
  */
  transitionTo(name, context) {
    let router = this.router;
    return router.transitionTo(...prefixRouteNameArg(this, arguments));
  },

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
  intermediateTransitionTo() {
    let router = this.router;
    router.intermediateTransitionTo(...prefixRouteNameArg(this, arguments));
  },

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
    return this.router._routerMicrolib.refresh(this);
  },

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
    import Ember from 'ember';

    export default Ember.Route.extend({
      afterModel() {
        if (!authorized()){
          this.replaceWith('index');
        }
      }
    });
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
    @public
  */
  replaceWith() {
    let router = this.router;
    return router.replaceWith(...prefixRouteNameArg(this, arguments));
  },

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
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        track(arg) {
          console.log(arg, 'was clicked');
        }
      }
    });
    ```

    ```app/routes/index.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      actions: {
        trackIfDebug(arg) {
          if (debug) {
            this.send('track', arg);
          }
        }
      }
    });
    ```

    @method send
    @param {String} name the name of the action to trigger
    @param {...*} args
    @since 1.0.0
    @public
  */
  send(...args) {
    if ((this.router && this.router._routerMicrolib) || !isTesting()) {
      this.router.send(...args);
    } else {
      let name = args[0];
      args = slice.call(args, 1);
      let action = this.actions[name];
      if (action) {
        return this.actions[name].apply(this, args);
      }
    }
  },

  /**
    This hook is the entry point for router.js

    @private
    @method setup
  */
  setup(context, transition) {
    let controller;

    let controllerName = this.controllerName || this.routeName;
    let definedController = this.controllerFor(controllerName, true);

    if (!definedController) {
      controller =  this.generateController(controllerName);
    } else {
      controller = definedController;
    }

    // Assign the route's controller so that it can more easily be
    // referenced in action handlers. Side effects. Side effects everywhere.
    if (!this.controller) {
      let propNames = get(this, '_qp.propertyNames');
      addQueryParamsObservers(controller, propNames);
      this.controller = controller;
    }

    let queryParams = get(this, '_qp');

    let states = queryParams.states;

    controller._qpDelegate = states.allowOverrides;

    if (transition) {
      // Update the model dep values used to calculate cache keys.
      stashParamNames(this.router, transition.state.handlerInfos);

      let params = transition.params;
      let allParams = queryParams.propertyNames;
      let cache = this._bucketCache;

      allParams.forEach(prop => {
        let aQp = queryParams.map[prop];

        aQp.values = params;
        let cacheKey = calculateCacheKey(aQp.route.fullRouteName, aQp.parts, aQp.values);

        if (cache) {
          let value = cache.lookup(cacheKey, prop, aQp.undecoratedDefaultValue);
          set(controller, prop, value);
        }
      });
    }

    if (transition) {
      let qpValues = getQueryParamsFor(this, transition.state);
      setProperties(controller, qpValues);
    }

    this.setupController(controller, context, transition);

    if (this._environment.options.shouldRender) {
      this.renderTemplate(controller, context);
    }
  },

  /*
    Called when a query parameter for this route changes, regardless of whether the route
    is currently part of the active route hierarchy. This will update the query parameter's
    value in the cache so if this route becomes active, the cache value has been updated.
  */
  _qpChanged(prop, value, qp) {
    if (!qp) { return; }

    let cacheKey = calculateCacheKey(qp.route.fullRouteName, qp.parts, qp.values);

    // Update model-dep cache
    let cache = this._bucketCache;
    if (cache) {
      cache.stash(cacheKey, prop, value);
    }
  },

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
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not
      utilized in any way.
    @since 1.0.0
    @public
  */
  beforeModel: K,

  /**
    This hook is called after this route's model has resolved.
    It follows identical async/promise semantics to `beforeModel`
    but is provided the route's resolved model in addition to
    the `transition`, and is therefore suited to performing
    logic that can only take place after the model has already
    resolved.

    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      afterModel(posts, transition) {
        if (posts.get('length') === 1) {
          this.transitionTo('post.show', posts.get('firstObject'));
        }
      }
    });
    ```

    Refer to documentation for `beforeModel` for a description
    of transition-pausing semantics when a promise is returned
    from this hook.

    @method afterModel
    @param {Object} resolvedModel the value returned from `model`,
      or its resolved value if it was a promise
    @param {Transition} transition
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not
      utilized in any way.
    @since 1.0.0
    @public
   */
  afterModel: K,

  /**
    A hook you can implement to optionally redirect to another route.

    If you call `this.transitionTo` from inside of this hook, this route
    will not be entered in favor of the other hook.

    `redirect` and `afterModel` behave very similarly and are
    called almost at the same time, but they have an important
    distinction in the case that, from one of these hooks, a
    redirect into a child route of this route occurs: redirects
    from `afterModel` essentially invalidate the current attempt
    to enter this route, and will result in this route's `beforeModel`,
    `model`, and `afterModel` hooks being fired again within
    the new, redirecting transition. Redirects that occur within
    the `redirect` hook, on the other hand, will _not_ cause
    these hooks to be fired again the second time around; in
    other words, by the time the `redirect` hook has been called,
    both the resolved model and attempted entry into this route
    are considered to be fully validated.

    @method redirect
    @param {Object} model the model for this route
    @param {Transition} transition the transition object associated with the current transition
    @since 1.0.0
    @public
  */
  redirect: K,

  /**
    Called when the context is changed by router.js.

    @private
    @method contextDidChange
  */
  contextDidChange() {
    this.currentModel = this.context;
  },

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
    handled by the `error` hook on `Ember.Route`.

    Example

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
        return this.store.findRecord('post', params.post_id);
      }
    });
    ```

    @method model
    @param {Object} params the parameters extracted from the URL
    @param {Transition} transition
    @return {Object|Promise} the model for this route. If
      a promise is returned, the transition will pause until
      the promise resolves, and the resolved value of the promise
      will be used as the model for this route.
    @since 1.0.0
    @public
  */
  model(params, transition) {
    let name, sawParams, value;
    let queryParams = get(this, '_qp.map');

    for (let prop in params) {
      if (prop === 'queryParams' || (queryParams && prop in queryParams)) {
        continue;
      }

      let match = prop.match(/^(.*)_id$/);
      if (match) {
        name = match[1];
        value = params[prop];
      }
      sawParams = true;
    }

    if (!name && sawParams) {
      return copy(params);
    } else if (!name) {
      if (transition.resolveIndex < 1) { return; }

      return transition.state.handlerInfos[transition.resolveIndex - 1].context;
    }

    return this.findModel(name, value);
  },

  /**
    @private
    @method deserialize
    @param {Object} params the parameters extracted from the URL
    @param {Transition} transition
    @return {Object|Promise} the model for this route.

    Router.js hook.
   */
  deserialize(params, transition) {
    return this.model(this.paramsFor(this.routeName), transition);
  },

  /**

    @method findModel
    @param {String} type the model type
    @param {Object} value the value passed to find
    @private
  */
  findModel() {
    let store = get(this, 'store');
    return store.find(...arguments);
  },

  /**
    Store property provides a hook for data persistence libraries to inject themselves.

    By default, this store property provides the exact same functionality previously
    in the model hook.

    Currently, the required interface is:

    `store.find(modelName, findArguments)`

    @method store
    @param {Object} store
    @private
  */
  store: computed(function() {
    let owner = getOwner(this);
    let routeName = this.routeName;
    let namespace = get(this, 'router.namespace');

    return {
      find(name, value) {
        let modelClass = owner.factoryFor(`model:${name}`);

        assert(
          `You used the dynamic segment ${name}_id in your route ${routeName}, but ${namespace}.${StringUtils.classify(name)} did not exist and you did not override your route's \`model\` hook.`, !!modelClass);

        if (!modelClass) { return; }

        modelClass = modelClass.class;

        assert(`${StringUtils.classify(name)} has no method \`find\`.`, typeof modelClass.find === 'function');

        return modelClass.find(value);
      }
    };
  }),

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
    import Ember from 'ember';

    export default Ember.Route.extend({
      model(params) {
        // the server returns `{ id: 12 }`
        return Ember.$.getJSON('/posts/' + params.post_id);
      },

      serialize(model) {
        // this will make the URL `/posts/12`
        return { post_id: model.id };
      }
    });
    ```

    The default `serialize` method will insert the model's `id` into the
    route's dynamic segment (in this case, `:post_id`) if the segment contains '_id'.
    If the route has multiple dynamic segments or does not contain '_id', `serialize`
    will return `Ember.getProperties(model, params)`

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
  serialize: defaultSerialize,

  /**
    A hook you can use to setup the controller for the current route.

    This method is called with the controller for the current route and the
    model supplied by the `model` hook.

    By default, the `setupController` hook sets the `model` property of
    the controller to the `model`.

    If you implement the `setupController` hook in your Route, it will
    prevent this default behavior. If you want to preserve that behavior
    when implementing your `setupController` function, make sure to call
    `_super`:

    ```app/routes/photos.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model() {
        return this.store.findAll('photo');
      },

      setupController(controller, model) {
        // Call _super for default behavior
        this._super(controller, model);
        // Implement your custom setup after
        this.controllerFor('application').set('showingPhotos', true);
      }
    });
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

    For the `post` route, a controller named `App.PostController` would
    be used if it is defined. If it is not defined, a basic `Ember.Controller`
    instance would be used.

    Example

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      setupController(controller, model) {
        controller.set('model', model);
      }
    });
    ```

    @method setupController
    @param {Controller} controller instance
    @param {Object} model
    @since 1.0.0
    @public
  */
  setupController(controller, context, transition) {
    if (controller && (context !== undefined)) {
      set(controller, 'model', context);
    }
  },

  /**
    Returns the controller of the current route, or a parent (or any ancestor)
    route in a route hierarchy.

    The controller instance must already have been created, either through entering the
    associated route or using `generateController`.

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      setupController(controller, post) {
        this._super(controller, post);
        this.controllerFor('posts').set('currentPost', post);
      }
    });
    ```

    @method controllerFor
    @param {String} name the name of the route or controller
    @return {Ember.Controller}
    @since 1.0.0
    @public
  */
  controllerFor(name, _skipAssert) {
    let owner = getOwner(this);
    let route = owner.lookup(`route:${name}`);
    let controller;

    if (route && route.controllerName) {
      name = route.controllerName;
    }

    controller = owner.lookup(`controller:${name}`);

    // NOTE: We're specifically checking that skipAssert is true, because according
    //   to the old API the second parameter was model. We do not want people who
    //   passed a model to skip the assertion.
    assert(`The controller named '${name}' could not be found. Make sure that this route exists and has already been entered at least once. If you are accessing a controller not associated with a route, make sure the controller class is explicitly defined.`, controller || _skipAssert === true);

    return controller;
  },

  /**
    Generates a controller for a route.

    Example

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      setupController(controller, post) {
        this._super(controller, post);
        this.generateController('posts');
      }
    });
    ```

    @method generateController
    @param {String} name the name of the controller
    @private
  */
  generateController(name) {
    let owner = getOwner(this);

    return generateController(owner, name);
  },

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
    import Ember from 'ember';

    export default Ember.Route.extend({
      model() {
        let post = this.modelFor('post');
        return post.get('comments');
      }
    });
    ```

    @method modelFor
    @param {String} name the name of the route
    @return {Object} the model object
    @since 1.0.0
    @public
  */
  modelFor(_name) {
    let name;
    let owner = getOwner(this);

    // Only change the route name when there is an active transition.
    // Otherwise, use the passed in route name.
    if (owner.routable && this.router && this.router._routerMicrolib.activeTransition) {
      name = getEngineRouteName(owner, _name);
    } else {
      name = _name;
    }

    let route = getOwner(this).lookup(`route:${name}`);
    let transition = this.router ? this.router._routerMicrolib.activeTransition : null;

    // If we are mid-transition, we want to try and look up
    // resolved parent contexts on the current transitionEvent.
    if (transition) {
      let modelLookupName = (route && route.routeName) || name;
      if (transition.resolvedModels.hasOwnProperty(modelLookupName)) {
        return transition.resolvedModels[modelLookupName];
      }
    }

    return route && route.currentModel;
  },

  /**
    A hook you can use to render the template for the current route.

    This method is called with the controller for the current route and the
    model supplied by the `model` hook. By default, it renders the route's
    template, configured with the controller for the route.

    This method can be overridden to set up and render additional or
    alternative templates.

    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      renderTemplate(controller, model) {
        let favController = this.controllerFor('favoritePost');

        // Render the `favoritePost` template into
        // the outlet `posts`, and display the `favoritePost`
        // controller.
        this.render('favoritePost', {
          outlet: 'posts',
          controller: favController
        });
      }
    });
    ```

    If the PostsRoute is a resource, it is important to keep in mind
    that this would only work for the PostsRoute, and not for the
    PostsIndexRoute. The posts/index.hbs has no children routes, and
    thus there is no `{{outlet}}` for the posts/index template.
    Here of an example that **would not** work:

    ```javascript
    App.PostsIndexRoute = Ember.Route.extend({
      renderTemplate: function(controller, model) {
        this.render('posts/index', { controller: 'posts/index' } );

        this.render('favoritePost', {
          into: 'posts/index',
          outlet: 'favorite-post',
        });
      }
    });
    ```

    @method renderTemplate
    @param {Object} controller the route's controller
    @param {Object} model the route's model
    @since 1.0.0
    @public
  */
  renderTemplate(controller, model) {
    this.render();
  },

  /**
    `render` is used to render a template into a region of another template
    (indicated by an `{{outlet}}`). `render` is used both during the entry
    phase of routing (via the `renderTemplate` hook) and later in response to
    user interaction.

    For example, given the following minimal router and templates:

    ```app/router.js
    // ...

    Router.map(function() {
      this.route('photos');
    });

    export default Router;
    ```

    ```handlebars
    <!-- application.hbs -->
    <div class='something-in-the-app-hbs'>
      {{outlet "anOutletName"}}
    </div>
    ```

    ```handlebars
    <!-- photos.hbs -->
    <h1>Photos</h1>
    ```

    You can render `photos.hbs` into the `"anOutletName"` outlet of
    `application.hbs` by calling `render`:

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      renderTemplate() {
        this.render('photos', {
          into: 'application',
          outlet: 'anOutletName'
        })
      }
    });
    ```

    `render` additionally allows you to supply which `controller` and
    `model` objects should be loaded and associated with the rendered template.


    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      renderTemplate(controller, model){
        this.render('posts', {    // the template to render, referenced by name
          into: 'application',    // the template to render into, referenced by name
          outlet: 'anOutletName', // the outlet inside `options.template` to render into.
          controller: 'someControllerName', // the controller to use for this template, referenced by name
          model: model            // the model to set on `options.controller`.
        })
      }
    });
    ```

    The string values provided for the template name, and controller
    will eventually pass through to the resolver for lookup. See
    Ember.Resolver for how these are mapped to JavaScript objects in your
    application. The template to render into needs to be related to  either the
    current route or one of its ancestors.

    Not all options need to be passed to `render`. Default values will be used
    based on the name of the route specified in the router or the Route's
    `controllerName` and `templateName` properties.

    For example:

    ```app/router.js
    // ...

    Router.map(function() {
      this.route('index');
      this.route('post', { path: '/posts/:post_id' });
    });

    export default Router;
    ```

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      renderTemplate() {
        this.render(); // all defaults apply
      }
    });
    ```

    The name of the route, defined by the router, is `post`.

    The following equivalent default options will be applied when
    the Route calls `render`:

    ```javascript
    this.render('post', {  // the template name associated with 'post' Route
      into: 'application', // the parent route to 'post' Route
      outlet: 'main',      // {{outlet}} and {{outlet 'main'}} are synonymous,
      controller: 'post',  // the controller associated with the 'post' Route
    })
    ```

    By default the controller's `model` will be the route's model, so it does not
    need to be passed unless you wish to change which model is being used.

    @method render
    @param {String} name the name of the template to render
    @param {Object} [options] the options
    @param {String} [options.into] the template to render into,
                    referenced by name. Defaults to the parent template
    @param {String} [options.outlet] the outlet inside `options.template` to render into.
                    Defaults to 'main'
    @param {String|Object} [options.controller] the controller to use for this template,
                    referenced by name or as a controller instance. Defaults to the Route's paired controller
    @param {Object} [options.model] the model object to set on `options.controller`.
                    Defaults to the return value of the Route's model hook
    @since 1.0.0
    @public
  */
  render(_name, options) {
    assert('The name in the given arguments is undefined', arguments.length > 0 ? !isNone(arguments[0]) : true);

    let namePassed = typeof _name === 'string' && !!_name;
    let isDefaultRender = arguments.length === 0 || isEmpty(arguments[0]);
    let name;

    if (typeof _name === 'object' && !options) {
      name = this.templateName || this.routeName;
      options = _name;
    } else {
      name = _name;
    }

    let renderOptions = buildRenderOptions(this, namePassed, isDefaultRender, name, options);
    this.connections.push(renderOptions);
    run.once(this.router, '_setOutlets');
  },

  /**
    Disconnects a view that has been rendered into an outlet.

    You may pass any or all of the following options to `disconnectOutlet`:

    * `outlet`: the name of the outlet to clear (default: 'main')
    * `parentView`: the name of the view containing the outlet to clear
       (default: the view rendered by the parent route)

    Example:

    ```app/routes/application.js
    import Ember from 'ember';

    export default App.Route.extend({
      actions: {
        showModal(evt) {
          this.render(evt.modalName, {
            outlet: 'modal',
            into: 'application'
          });
        },
        hideModal(evt) {
          this.disconnectOutlet({
            outlet: 'modal',
            parentView: 'application'
          });
        }
      }
    });
    ```

    Alternatively, you can pass the `outlet` name directly as a string.

    Example:

    ```app/routes/application.js
    import Ember from 'ember';

    export default App.Route.extend({
      actions: {
        showModal(evt) {
          // ...
        },
        hideModal(evt) {
          this.disconnectOutlet('modal');
        }
      }
    });

    @method disconnectOutlet
    @param {Object|String} options the options hash or outlet name
    @since 1.0.0
    @public
  */
  disconnectOutlet(options) {
    let outletName;
    let parentView;
    if (!options || typeof options === 'string') {
      outletName = options;
    } else {
      outletName = options.outlet;
      parentView = options.parentView;

      if (options && Object.keys(options).indexOf('outlet') !== -1 && typeof options.outlet === 'undefined') {
        throw new EmberError('You passed undefined as the outlet name.');
      }
    }
    parentView = parentView && parentView.replace(/\//g, '.');
    outletName = outletName || 'main';
    this._disconnectOutlet(outletName, parentView);
    for (let i = 0; i < this.router._routerMicrolib.currentHandlerInfos.length; i++) {
      // This non-local state munging is sadly necessary to maintain
      // backward compatibility with our existing semantics, which allow
      // any route to disconnectOutlet things originally rendered by any
      // other route. This should all get cut in 2.0.
      this.router._routerMicrolib
        .currentHandlerInfos[i]
        .handler._disconnectOutlet(outletName, parentView);
    }
  },

  _disconnectOutlet(outletName, parentView) {
    let parent = parentRoute(this);
    if (parent && parentView === parent.routeName) {
      parentView = undefined;
    }
    for (let i = 0; i < this.connections.length; i++) {
      let connection = this.connections[i];
      if (connection.outlet === outletName && connection.into === parentView) {
        // This neuters the disconnected outlet such that it doesn't
        // render anything, but it leaves an entry in the outlet
        // hierarchy so that any existing other renders that target it
        // don't suddenly blow up. They will still stick themselves
        // into its outlets, which won't render anywhere. All of this
        // statefulness should get the machete in 2.0.
        this.connections[i] = {
          owner: connection.owner,
          into: connection.into,
          outlet: connection.outlet,
          name: connection.name,
          controller: undefined,
          template: undefined,
          ViewClass: undefined
        };
        run.once(this.router, '_setOutlets');
      }
    }
  },

  willDestroy() {
    this.teardownViews();
  },

  /**
    @private

    @method teardownViews
  */
  teardownViews() {
    if (this.connections && this.connections.length > 0) {
      this.connections = [];
      run.once(this.router, '_setOutlets');
    }
  }
});

deprecateUnderscoreActions(Route);

Route.reopenClass({
  isRouteFactory: true
});

function parentRoute(route) {
  let handlerInfo = handlerInfoFor(route, route.router._routerMicrolib.state.handlerInfos, -1);
  return handlerInfo && handlerInfo.handler;
}

function handlerInfoFor(route, handlerInfos, offset = 0) {
  if (!handlerInfos) { return; }

  let current;
  for (let i = 0; i < handlerInfos.length; i++) {
    current = handlerInfos[i].handler;
    if (current === route) { return handlerInfos[i + offset]; }
  }
}

function buildRenderOptions(route, namePassed, isDefaultRender, _name, options) {
  let into = options && options.into && options.into.replace(/\//g, '.');
  let outlet = (options && options.outlet) || 'main';

  let name, templateName;
  if (_name) {
    name = _name.replace(/\//g, '.');
    templateName = name;
  } else {
    name = route.routeName;
    templateName = route.templateName || name;
  }

  let owner = getOwner(route);
  let controller = options && options.controller;
  if (!controller) {
    if (namePassed) {
      controller = owner.lookup(`controller:${name}`) || route.controllerName || route.routeName;
    } else {
      controller = route.controllerName || owner.lookup(`controller:${name}`);
    }
  }

  if (typeof controller === 'string') {
    let controllerName = controller;
    controller = owner.lookup(`controller:${controllerName}`);
    if (!controller) {
      throw new EmberError(`You passed \`controller: '${controllerName}'\` into the \`render\` method, but no such controller could be found.`);
    }
  }

  if (options && Object.keys(options).indexOf('outlet') !== -1 && typeof options.outlet === 'undefined') {
    throw new EmberError('You passed undefined as the outlet name.');
  }

  if (options && options.model) {
    controller.set('model', options.model);
  }

  let template = owner.lookup(`template:${templateName}`);

  let parent;
  if (into && (parent = parentRoute(route)) && into === parent.routeName) {
    into = undefined;
  }

  let renderOptions = {
    owner,
    into,
    outlet,
    name,
    controller,
    template: template || route._topLevelViewTemplate,
    ViewClass: undefined
  };

  assert(`Could not find "${name}" template, view, or component.`, isDefaultRender || template);

  if (DEBUG) {
    let LOG_VIEW_LOOKUPS = get(route.router, 'namespace.LOG_VIEW_LOOKUPS');
    if (LOG_VIEW_LOOKUPS && !template) {
      info(`Could not find "${name}" template. Nothing will be rendered`, { fullName: `template:${name}` });
    }
  }

  return renderOptions;
}

function getFullQueryParams(router, state) {
  if (state.fullQueryParams) { return state.fullQueryParams; }

  state.fullQueryParams = {};
  assign(state.fullQueryParams, state.queryParams);

  router._deserializeQueryParams(state.handlerInfos, state.fullQueryParams);
  return state.fullQueryParams;
}

function getQueryParamsFor(route, state) {
  state.queryParamsFor = state.queryParamsFor || {};
  let name = route.fullRouteName;

  if (state.queryParamsFor[name]) { return state.queryParamsFor[name]; }

  let fullQueryParams = getFullQueryParams(route.router, state);

  let params = state.queryParamsFor[name] = {};

  // Copy over all the query params for this route/controller into params hash.
  let qpMeta = get(route, '_qp');
  let qps = qpMeta.qps;
  for (let i = 0; i < qps.length; ++i) {
    // Put deserialized qp on params hash.
    let qp = qps[i];

    let qpValueWasPassedIn = (qp.prop in fullQueryParams);
    params[qp.prop] = qpValueWasPassedIn ?
                      fullQueryParams[qp.prop] :
                      copyDefaultValue(qp.defaultValue);
  }

  return params;
}

function copyDefaultValue(value) {
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
function mergeEachQueryParams(controllerQP, routeQP) {
  let keysAlreadyMergedOrSkippable;
  let qps = {};

  keysAlreadyMergedOrSkippable = {
    defaultValue: true,
    type: true,
    scope: true,
    as: true
  };

  // first loop over all controller qps, merging them with any matching route qps
  // into a new empty object to avoid mutating.
  for (let cqpName in controllerQP) {
    if (!controllerQP.hasOwnProperty(cqpName)) { continue; }

    let newControllerParameterConfiguration = {};
    assign(newControllerParameterConfiguration, controllerQP[cqpName]);
    assign(newControllerParameterConfiguration, routeQP[cqpName]);

    qps[cqpName] = newControllerParameterConfiguration;

    // allows us to skip this QP when we check route QPs.
    keysAlreadyMergedOrSkippable[cqpName] = true;
  }

  // loop over all route qps, skipping those that were merged in the first pass
  // because they also appear in controller qps
  for (let rqpName in routeQP) {
    if (!routeQP.hasOwnProperty(rqpName) || keysAlreadyMergedOrSkippable[rqpName]) { continue; }

    let newRouteParameterConfiguration = {};
    assign(newRouteParameterConfiguration, routeQP[rqpName], controllerQP[rqpName]);
    qps[rqpName] = newRouteParameterConfiguration;
  }

  return qps;
}

function addQueryParamsObservers(controller, propNames) {
  propNames.forEach(prop => {
    controller.addObserver(`${prop}.[]`, controller, controller._qpChanged);
  });
}

function getEngineRouteName(engine, routeName) {
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

export default Route;
