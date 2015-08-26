import Ember from 'ember-metal/core'; // FEATURES, A, deprecate, assert, Logger
import { assert, deprecate, info } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';
import EmberError from 'ember-metal/error';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import getProperties from 'ember-metal/get_properties';
import isNone from 'ember-metal/is_none';
import { computed } from 'ember-metal/computed';
import merge from 'ember-metal/merge';
import {
  typeOf
} from 'ember-runtime/utils';
import run from 'ember-metal/run_loop';
import copy from 'ember-runtime/copy';
import {
  classify
} from 'ember-runtime/system/string';
import EmberObject from 'ember-runtime/system/object';
import Evented from 'ember-runtime/mixins/evented';
import ActionHandler, { deprecateUnderscoreActions } from 'ember-runtime/mixins/action_handler';
import generateController from 'ember-routing/system/generate_controller';
import {
  generateControllerFactory
} from 'ember-routing/system/generate_controller';
import {
  stashParamNames,
  normalizeControllerQueryParams,
  calculateCacheKey
} from 'ember-routing/utils';

var slice = Array.prototype.slice;

function K() { return this; }

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
  @public
*/
var Route = EmberObject.extend(ActionHandler, Evented, {
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
    @public
  */
  queryParams: {},

  /**
    The name of the route, dot-delimited.

    For example, a route found at `app/routes/posts/post.js` or
    `app/posts/post/route.js` (with pods) will have a `routeName` of
    `posts.post`.

    @property routeName
    @for Ember.Route
    @type String
    @public
  */

  /**
    @private

    @property _qp
  */
  _qp: computed(function() {
    var controllerProto, combinedQueryParameterConfiguration;

    var controllerName = this.controllerName || this.routeName;
    var definedControllerClass = this.container.lookupFactory(`controller:${controllerName}`);
    var queryParameterConfiguraton = get(this, 'queryParams');
    var hasRouterDefinedQueryParams = !!Object.keys(queryParameterConfiguraton).length;

    if (definedControllerClass) {
      // the developer has authored a controller class in their application for this route
      // access the prototype, find its query params and normalize their object shape
      // them merge in the query params for the route. As a mergedProperty, Route#queryParams is always
      // at least `{}`
      controllerProto = definedControllerClass.proto();

      var controllerDefinedQueryParameterConfiguration = get(controllerProto, 'queryParams');
      var normalizedControllerQueryParameterConfiguration = normalizeControllerQueryParams(controllerDefinedQueryParameterConfiguration);
      combinedQueryParameterConfiguration = mergeEachQueryParams(normalizedControllerQueryParameterConfiguration, queryParameterConfiguraton);

      if (isEnabled('ember-routing-route-configured-query-params')) {
        if (controllerDefinedQueryParameterConfiguration.length) {
          deprecate(`Configuring query parameters on a controller is deprecated. Migrate the query parameters configuration from the '${controllerName}' controller to the '${this.routeName}' route: ${combinedQueryParameterConfiguration}`, false, { id: 'ember-routing.controller-configured-query-params', until: '3.0.0' });
        }
      }
    } else if (hasRouterDefinedQueryParams) {
      // the developer has not defined a controller but *has* supplied route query params.
      // Generate a class for them so we can later insert default values
      var generatedControllerClass = generateControllerFactory(this.container, controllerName);
      controllerProto = generatedControllerClass.proto();
      combinedQueryParameterConfiguration = queryParameterConfiguraton;
    }

    var qps = [];
    var map = {};
    var propertyNames = [];

    for (var propName in combinedQueryParameterConfiguration) {
      if (!combinedQueryParameterConfiguration.hasOwnProperty(propName)) { continue; }

      // to support the dubious feature of using unknownProperty
      // on queryParams configuration
      if (propName === 'unknownProperty' || propName === '_super') {
        // possible todo: issue deprecation warning?
        continue;
      }

      var desc = combinedQueryParameterConfiguration[propName];

      if (isEnabled('ember-routing-route-configured-query-params')) {
        // apply default values to controllers
        // detect that default value defined on router config
        if (desc.hasOwnProperty('defaultValue')) {
          // detect that property was not defined on controller
          if (controllerProto[propName] === undefined) {
            controllerProto[propName] = desc.defaultValue;
          } else {
            deprecateQueryParamDefaultValuesSetOnController(controllerName, this.routeName, propName);
          }
        }
      }

      var scope = desc.scope || 'model';
      var parts;

      if (scope === 'controller') {
        parts = [];
      }

      var urlKey = desc.as || this.serializeQueryParamKey(propName);
      var defaultValue = get(controllerProto, propName);

      if (Array.isArray(defaultValue)) {
        defaultValue = Ember.A(defaultValue.slice());
      }

      var type = desc.type || typeOf(defaultValue);

      var defaultValueSerialized = this.serializeQueryParam(defaultValue, urlKey, type);
      var scopedPropertyName = `${controllerName}:${propName}`;
      var qp = {
        undecoratedDefaultValue: get(controllerProto, propName),
        defaultValue: defaultValue,
        serializedDefaultValue: defaultValueSerialized,
        serializedValue: defaultValueSerialized,

        type: type,
        urlKey: urlKey,
        prop: propName,
        scopedPropertyName: scopedPropertyName,
        ctrl: controllerName,
        route: this,
        parts: parts, // provided later when stashNames is called if 'model' scope
        values: null, // provided later when setup is called. no idea why.
        scope: scope,
        prefix: ''
      };

      map[propName] = map[urlKey] = map[scopedPropertyName] = qp;
      qps.push(qp);
      propertyNames.push(propName);
    }

    return {
      qps: qps,
      map: map,
      propertyNames: propertyNames,
      states: {
        /*
          Called when a query parameter changes in the URL, this route cares
          about that query parameter, but the route is not currently
          in the active route hierarchy.
        */
        inactive: (prop, value) => {
          var qp = map[prop];
          this._qpChanged(prop, value, qp);
        },
        /*
          Called when a query parameter changes in the URL, this route cares
          about that query parameter, and the route is currently
          in the active route hierarchy.
        */
        active: (prop, value) => {
          var qp = map[prop];
          this._qpChanged(prop, value, qp);
          return this._activeQPChanged(map[prop], value);
        },
        /*
          Called when a value of a query parameter this route handles changes in a controller
          and the route is currently in the active route hierarchy.
        */
        allowOverrides: (prop, value) => {
          var qp = map[prop];
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
  _stashNames(_handlerInfo, dynamicParent) {
    var handlerInfo = _handlerInfo;
    if (this._names) { return; }
    var names = this._names = handlerInfo._names;

    if (!names.length) {
      handlerInfo = dynamicParent;
      names = handlerInfo && handlerInfo._names || [];
    }

    var qps = get(this, '_qp.qps');
    var len = qps.length;

    var namePaths = new Array(names.length);
    for (var a = 0, nlen = names.length; a < nlen; ++a) {
      namePaths[a] = `${handlerInfo.name}.${names[a]}`;
    }

    for (var i = 0; i < len; ++i) {
      var qp = qps[i];
      if (qp.scope === 'model') {
        qp.parts = namePaths;
      }
      qp.prefix = qp.ctrl;
    }
  },

  /**
    @private

    @property _activeQPChanged
  */
  _activeQPChanged(qp, value) {
    var router = this.router;
    router._activeQPChanged(qp.scopedPropertyName, value);
  },

  /**
    @private
    @method _updatingQPChanged
  */
  _updatingQPChanged(qp) {
    var router = this.router;
    router._updatingQPChanged(qp.urlKey);
  },

  mergedProperties: ['queryParams'],

  /**
    Retrieves parameters, for current route using the state.params
    variable and getQueryParamsFor, using the supplied routeName.

    @method paramsFor
    @param {String} name
    @public
  */
  paramsFor(name) {
    var route = this.container.lookup(`route:${name}`);

    if (!route) {
      return {};
    }

    var transition = this.router.router.activeTransition;
    var state = transition ? transition.state : this.router.router.state;

    var params = {};
    merge(params, state.params[name]);
    merge(params, getQueryParamsFor(route, state));

    return params;
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
    if (defaultValueType === 'array') {
      return JSON.stringify(value);
    }
    return `${value}`;
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

    // Use the defaultValueType of the default value (the initial value assigned to a
    // controller query param property), to intelligently deserialize and cast.
    if (defaultValueType === 'boolean') {
      return (value === 'true') ? true : false;
    } else if (defaultValueType === 'number') {
      return (Number(value)).valueOf();
    } else if (defaultValueType === 'array') {
      return Ember.A(JSON.parse(value));
    }
    return value;
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

    ```javascript
    App.ArticlesRoute = Ember.Route.extend({
      // ...

      resetController: function (controller, isExiting, transition) {
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
    var controller = this.controller;
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
    The name of the view to use by default when rendering this routes template.

    When rendering a template, the route will, by default, determine the
    template and view to use from the name of the route itself. If you need to
    define a specific view, set this property.

    This is useful when multiple routes would benefit from using the same view
    because it doesn't require a custom `renderTemplate` method. For example,
    the following routes will all render using the `App.PostsListView` view:

    ```javascript
    var PostsList = Ember.Route.extend({
      viewName: 'postsList'
    });

    App.PostsIndexRoute = PostsList.extend();
    App.PostsArchivedRoute = PostsList.extend();
    ```

    @property viewName
    @type String
    @default null
    @since 1.4.0
    @public
  */
  viewName: null,

  /**
    The name of the template to use by default when rendering this routes
    template.

    This is similar with `viewName`, but is useful when you just want a custom
    template without a view.

    ```javascript
    var PostsList = Ember.Route.extend({
      templateName: 'posts/list'
    });

    App.PostsIndexRoute = PostsList.extend();
    App.PostsArchivedRoute = PostsList.extend();
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
    * used as the controller for the view being rendered by the route.
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

    ```javascript
    App.ContactFormRoute = Ember.Route.extend({
      actions: {
        willTransition: function(transition) {
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

    @event willTransition
    @param {Transition} transition
    @public
  */

  /**
    The `didTransition` action is fired after a transition has
    successfully been completed. This occurs after the normal model
    hooks (`beforeModel`, `model`, `afterModel`, `setupController`)
    have resolved. The `didTransition` action has no arguments,
    however, it can be useful for tracking page views or resetting
    state on the controller.

    ```javascript
    App.LoginRoute = Ember.Route.extend({
      actions: {
        didTransition: function() {
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

    ```javascript
    App.ApplicationRoute = Ember.Route.extend({
      actions: {
        loading: function(transition, route) {
          var view = Ember.View.create({
            classNames: ['app-loading']
          })
          .append();

          this.router.one('didTransition', function() {
            view.destroy();
          });

          return true; // Bubble the loading event
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

    ```javascript
    App.AdminRoute = Ember.Route.extend({
      beforeModel: function() {
        return Ember.RSVP.reject('bad things!');
      },

      actions: {
        error: function(error, transition) {
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

    ```javascript
    App.ApplicationRoute = Ember.Route.extend({
      actions: {
        error: function(error, transition) {
          this.controllerFor('banner').displayError(error.message);
        }
      }
    });
    ```
    @event error
    @param {Error} error
    @param {Transition} transition
    @public
  */

  /**
    This event is triggered when the router enters the route. It is
    not executed when the model for the route changes.

    ```javascript
    App.ApplicationRoute = Ember.Route.extend({
      collectAnalytics: function(){
        collectAnalytics();
      }.on('activate')
    });
    ```

    @event activate
    @since 1.9.0
    @public
  */

  /**
    This event is triggered when the router completely exits this
    route. It is not executed when the model for the route changes.

    ```javascript
    App.IndexRoute = Ember.Route.extend({
      trackPageLeaveAnalytics: function(){
        trackPageLeaveAnalytics();
      }.on('deactivate')
    });
    ```

    @event deactivate
    @since 1.9.0
    @public
  */

  /**
    The controller associated with this route.

    Example

    ```javascript
    App.FormRoute = Ember.Route.extend({
      actions: {
        willTransition: function(transition) {
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

    queryParamsDidChange(changed, totalPresent, removed) {
      var qpMap = get(this, '_qp').map;

      var totalChanged = Object.keys(changed).concat(Object.keys(removed));
      for (var i = 0, len = totalChanged.length; i < len; ++i) {
        var qp = qpMap[totalChanged[i]];
        if (qp && get(this._optionsForQueryParam(qp), 'refreshModel')) {
          this.refresh();
        }
      }

      return true;
    },

    finalizeQueryParamChange(params, finalParams, transition) {
      if (this.routeName !== 'application') { return true; }

      // Transition object is absent for intermediate transitions.
      if (!transition) { return; }

      var handlerInfos = transition.state.handlerInfos;
      var router = this.router;
      var qpMeta = router._queryParamsFor(handlerInfos[handlerInfos.length - 1].name);
      var changes = router._qpUpdates;
      var replaceUrl;

      stashParamNames(router, handlerInfos);

      for (var i = 0, len = qpMeta.qps.length; i < len; ++i) {
        var qp = qpMeta.qps[i];
        var route = qp.route;
        var controller = route.controller;
        var presentKey = qp.urlKey in params && qp.urlKey;

        // Do a reverse lookup to see if the changed query
        // param URL key corresponds to a QP property on
        // this controller.
        var value, svalue;
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

        var thisQueryParamChanged = (svalue !== qp.serializedValue);
        if (thisQueryParamChanged) {
          if (transition.queryParamsOnly && replaceUrl !== false) {
            var options = route._optionsForQueryParam(qp);
            var replaceConfigValue = get(options, 'replace');
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

        var thisQueryParamHasDefaultValue = (qp.serializedDefaultValue === svalue);
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

      qpMeta.qps.forEach(function(qp) {
        var routeQpMeta = get(qp.route, '_qp');
        var finalizedController = qp.route.controller;
        finalizedController._qpDelegate = get(routeQpMeta, 'states.active');
      });

      router._qpUpdates = null;
    }
  },

  /**
    This hook is executed when the router completely exits this route. It is
    not executed when the model for the route changes.

    @method deactivate
    @public
  */
  deactivate: K,

  /**
    This hook is executed when the router enters the route. It is not executed
    when the model for the route changes.

    @method activate
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

    ```javascript
    App.Router.map(function() {
      this.route('blogPost', { path:':blogPostId' }, function() {
        this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
      });
    });

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
      queryParams: {showComments: 'true'}
    });

    // if you just want to transition the query parameters without changing the route
    this.transitionTo({queryParams: {sort: 'date'}});
    ```

    See also [replaceWith](#method_replaceWith).

    Simple Transition Example

    ```javascript
    App.Router.map(function() {
      this.route('index');
      this.route('secret');
      this.route('fourOhFour', { path: '*:' });
    });

    App.IndexRoute = Ember.Route.extend({
      actions: {
        moveToSecret: function(context) {
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

    ```javascript
    App.Router.map(function() {
      this.route('articles', { path: '/articles' }, function() {
        this.route('new');
      });
    });

    App.IndexRoute = Ember.Route.extend({
      actions: {
        transitionToNewArticle: function() {
          this.transitionTo('articles.new');
        }
      }
    });
    ```

    Multiple Models Example

    ```javascript
    App.Router.map(function() {
      this.route('index');

      this.route('breakfast', { path: ':breakfastId' }, function() {
        this.route('cereal', { path: ':cerealId', resetNamespace: true });
      });
    });

    App.IndexRoute = Ember.Route.extend({
      actions: {
        moveToChocolateCereal: function() {
          var cereal = { cerealId: 'ChocolateYumminess' };
          var breakfast = { breakfastId: 'CerealAndMilk' };

          this.transitionTo('cereal', breakfast, cereal);
        }
      }
    });
    ```

    Nested Route with Query String Example

    ```javascript
    App.Router.map(function() {
      this.route('fruits', function() {
        this.route('apples');
      });
    });

    App.IndexRoute = Ember.Route.extend({
      actions: {
        transitionToApples: function() {
          this.transitionTo('fruits.apples', {queryParams: {color: 'red'}});
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
    @public
  */
  transitionTo(name, context) {
    var router = this.router;
    return router.transitionTo(...arguments);
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
    var router = this.router;
    router.intermediateTransitionTo(...arguments);
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
    return this.router.router.refresh(this);
  },

  /**
    Transition into another route while replacing the current URL, if possible.
    This will replace the current history entry instead of adding a new one.
    Beside that, it is identical to `transitionTo` in all other respects. See
    'transitionTo' for additional information regarding multiple models.

    Example

    ```javascript
    App.Router.map(function() {
      this.route('index');
      this.route('secret');
    });

    App.SecretRoute = Ember.Route.extend({
      afterModel: function() {
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
    @return {Transition} the transition object associated with this
      attempted transition
    @public
  */
  replaceWith() {
    var router = this.router;
    return router.replaceWith(...arguments);
  },

  /**
    Sends an action to the router, which will delegate it to the currently
    active route hierarchy per the bubbling rules explained under `actions`.

    Example

    ```javascript
    App.Router.map(function() {
      this.route('index');
    });

    App.ApplicationRoute = Ember.Route.extend({
      actions: {
        track: function(arg) {
          console.log(arg, 'was clicked');
        }
      }
    });

    App.IndexRoute = Ember.Route.extend({
      actions: {
        trackIfDebug: function(arg) {
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
    @public
  */
  send(...args) {
    if ((this.router && this.router.router) || !Ember.testing) {
      this.router.send(...args);
    } else {
      var name = args[0];
      args = slice.call(args, 1);
      var action = this.actions[name];
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
    var controller;

    var controllerName = this.controllerName || this.routeName;
    var definedController = this.controllerFor(controllerName, true);

    if (!definedController) {
      controller =  this.generateController(controllerName, context);
    } else {
      controller = definedController;
    }

    // Assign the route's controller so that it can more easily be
    // referenced in action handlers. Side effects. Side effects everywhere.
    if (!this.controller) {
      var propNames = get(this, '_qp.propertyNames');
      addQueryParamsObservers(controller, propNames);
      this.controller = controller;
    }

    var queryParams = get(this, '_qp');

    var states = queryParams.states;
    if (transition) {
      // Update the model dep values used to calculate cache keys.
      stashParamNames(this.router, transition.state.handlerInfos);

      var params = transition.params;
      var allParams = queryParams.propertyNames;
      var cache = this._bucketCache;

      allParams.forEach(function(prop) {
        var aQp = queryParams.map[prop];

        aQp.values = params;
        var cacheKey = calculateCacheKey(aQp.prefix, aQp.parts, aQp.values);

        if (cache) {
          var value = cache.lookup(cacheKey, prop, aQp.undecoratedDefaultValue);
          set(controller, prop, value);
        }
      });
    }

    controller._qpDelegate = states.allowOverrides;

    if (transition) {
      var qpValues = getQueryParamsFor(this, transition.state);
      controller.setProperties(qpValues);
    }

    this.setupController(controller, context, transition);

    this.renderTemplate(controller, context);
  },

  /*
    Called when a query parameter for this route changes, regardless of whether the route
    is currently part of the active route hierarchy. This will update the query parameter's
    value in the cache so if this route becomes active, the cache value has been updated.
  */
  _qpChanged(prop, value, qp) {
    if (!qp) { return; }

    var cacheKey = calculateCacheKey(qp.prefix || '', qp.parts, qp.values);

    // Update model-dep cache
    var cache = this._bucketCache;
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

    ```javascript
    App.PostRoute = Ember.Route.extend({
      beforeModel: function(transition) {
        if (!App.Post) {
          return Ember.$.getScript('/models/post.js');
        }
      }
    });
    ```

    If `App.Post` doesn't exist in the above example,
    `beforeModel` will use jQuery's `getScript`, which
    returns a promise that resolves after the server has
    successfully retrieved and executed the code from the
    server. Note that if an error were to occur, it would
    be passed to the `error` hook on `Ember.Route`, but
    it's also possible to handle errors specific to
    `beforeModel` right from within the hook (to distinguish
    from the shared error handling behavior of the `error`
    hook):

    ```javascript
    App.PostRoute = Ember.Route.extend({
      beforeModel: function(transition) {
        if (!App.Post) {
          var self = this;
          return Ember.$.getScript('post.js').then(null, function(e) {
            self.transitionTo('help');

            // Note that the above transitionTo will implicitly
            // halt the transition. If you were to return
            // nothing from this promise reject handler,
            // according to promise semantics, that would
            // convert the reject into a resolve and the
            // transition would continue. To propagate the
            // error so that it'd be handled by the `error`
            // hook, you would have to
            return Ember.RSVP.reject(e);
          });
        }
      }
    });
    ```

    @method beforeModel
    @param {Transition} transition
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not
      utilized in any way.
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

    ```javascript
    App.PostsRoute = Ember.Route.extend({
      afterModel: function(posts, transition) {
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

    ```javascript
    App.Router.map(function() {
      this.route('post', { path: '/posts/:post_id' });
    });
    ```

    The model for the `post` route is `store.find('post', params.post_id)`.

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
    thePost = store.find('post', 1);
    this.transitionTo('post', thePost);

    // integer passed in, model hook is called
    this.transitionTo('post', 1);

    // model id passed in, model hook is called
    // useful for forcing the hook to execute
    thePost = store.find('post', 1);
    this.transitionTo('post', thePost.id);
    ```


    This hook follows the asynchronous/promise semantics
    described in the documentation for `beforeModel`. In particular,
    if a promise returned from `model` fails, the error will be
    handled by the `error` hook on `Ember.Route`.

    Example

    ```javascript
    App.PostRoute = Ember.Route.extend({
      model: function(params) {
        return this.store.find('post', params.post_id);
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
    @public
  */
  model(params, transition) {
    var match, name, sawParams, value;
    var queryParams = get(this, '_qp.map');

    for (var prop in params) {
      if (prop === 'queryParams' || (queryParams && prop in queryParams)) {
        continue;
      }

      if (match = prop.match(/^(.*)_id$/)) {
        name = match[1];
        value = params[prop];
      }
      sawParams = true;
    }

    if (!name && sawParams) {
      return copy(params);
    } else if (!name) {
      if (transition.resolveIndex < 1) { return; }

      var parentModel = transition.state.handlerInfos[transition.resolveIndex - 1].context;

      return parentModel;
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
    var store = get(this, 'store');
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
    var container = this.container;
    var routeName = this.routeName;
    var namespace = get(this, 'router.namespace');

    return {
      find(name, value) {
        var modelClass = container.lookupFactory(`model:${name}`);

        assert(
          `You used the dynamic segment ${name}_id in your route ${routeName}, but ${namespace}.${classify(name)} did not exist and you did not override your route's \`model\` hook.`, !!modelClass);

        if (!modelClass) { return; }

        assert(`${classify(name)} has no method \`find\`.`, typeof modelClass.find === 'function');

        return modelClass.find(value);
      }
    };
  }),

  /**
    A hook you can implement to convert the route's model into parameters
    for the URL.

    ```javascript
    App.Router.map(function() {
      this.route('post', { path: '/posts/:post_id' });
    });

    App.PostRoute = Ember.Route.extend({
      model: function(params) {
        // the server returns `{ id: 12 }`
        return Ember.$.getJSON('/posts/' + params.post_id);
      },

      serialize: function(model) {
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
    @public
  */
  serialize(model, params) {
    if (params.length < 1) { return; }
    if (!model) { return; }

    var name = params[0];
    var object = {};

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
  },

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

    ```javascript
    App.PhotosRoute = Ember.Route.extend({
      model: function() {
        return this.store.find('photo');
      },

      setupController: function (controller, model) {
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

    ```javascript
    App.Router.map(function() {
      this.route('post', { path: '/posts/:post_id' });
    });
    ```

    For the `post` route, a controller named `App.PostController` would
    be used if it is defined. If it is not defined, a basic `Ember.Controller`
    instance would be used.

    Example

    ```javascript
    App.PostRoute = Ember.Route.extend({
      setupController: function(controller, model) {
        controller.set('model', model);
      }
    });
    ```

    @method setupController
    @param {Controller} controller instance
    @param {Object} model
    @public
  */
  setupController(controller, context, transition) {
    if (controller && (context !== undefined)) {
      set(controller, 'model', context);
    }
  },

  /**
    Returns the controller for a particular route or name.

    The controller instance must already have been created, either through entering the
    associated route or using `generateController`.

    ```javascript
    App.PostRoute = Ember.Route.extend({
      setupController: function(controller, post) {
        this._super(controller, post);
        this.controllerFor('posts').set('currentPost', post);
      }
    });
    ```

    @method controllerFor
    @param {String} name the name of the route or controller
    @return {Ember.Controller}
    @public
  */
  controllerFor(name, _skipAssert) {
    var container = this.container;
    var route = container.lookup(`route:${name}`);
    var controller;

    if (route && route.controllerName) {
      name = route.controllerName;
    }

    controller = container.lookup(`controller:${name}`);

    // NOTE: We're specifically checking that skipAssert is true, because according
    //   to the old API the second parameter was model. We do not want people who
    //   passed a model to skip the assertion.
    assert(`The controller named '${name}' could not be found. Make sure that this route exists and has already been entered at least once. If you are accessing a controller not associated with a route, make sure the controller class is explicitly defined.`, controller || _skipAssert === true);

    return controller;
  },

  /**
    Generates a controller for a route.

    Example

    ```javascript
    App.PostRoute = Ember.Route.extend({
      setupController: function(controller, post) {
        this._super(controller, post);
        this.generateController('posts', post);
      }
    });
    ```

    @method generateController
    @param {String} name the name of the controller
    @param {Object} model the model to infer the type of the controller (optional)
    @private
  */
  generateController(name, model) {
    var container = this.container;

    model = model || this.modelFor(name);

    return generateController(container, name, model);
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

    ```javascript
    App.Router.map(function() {
        this.route('post', { path: '/post/:post_id' }, function() {
          this.route('comments', { resetNamespace: true });
        });
    });

    App.CommentsRoute = Ember.Route.extend({
        afterModel: function() {
          this.set('post', this.modelFor('post'));
        }
    });
    ```

    @method modelFor
    @param {String} name the name of the route
    @return {Object} the model object
    @public
  */
  modelFor(name) {
    var route = this.container.lookup(`route:${name}`);
    var transition = this.router ? this.router.router.activeTransition : null;

    // If we are mid-transition, we want to try and look up
    // resolved parent contexts on the current transitionEvent.
    if (transition) {
      var modelLookupName = (route && route.routeName) || name;
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

    ```javascript
    App.PostsRoute = Ember.Route.extend({
      renderTemplate: function(controller, model) {
        var favController = this.controllerFor('favoritePost');

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

    @method renderTemplate
    @param {Object} controller the route's controller
    @param {Object} model the route's model
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

    ```javascript
    Router.map(function() {
      this.route('photos');
    });
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

    ```javascript
    // posts route
    Ember.Route.extend({
      renderTemplate: function() {
        this.render('photos', {
          into: 'application',
          outlet: 'anOutletName'
        })
      }
    });
    ```

    `render` additionally allows you to supply which `view`, `controller`, and
    `model` objects should be loaded and associated with the rendered template.


    ```javascript
    // posts route
    Ember.Route.extend({
      renderTemplate: function(controller, model){
        this.render('posts', {    // the template to render, referenced by name
          into: 'application',    // the template to render into, referenced by name
          outlet: 'anOutletName', // the outlet inside `options.template` to render into.
          view: 'aViewName',      // the view to use for this template, referenced by name
          controller: 'someControllerName', // the controller to use for this template, referenced by name
          model: model            // the model to set on `options.controller`.
        })
      }
    });
    ```

    The string values provided for the template name, view, and controller
    will eventually pass through to the resolver for lookup. See
    Ember.Resolver for how these are mapped to JavaScript objects in your
    application.

    Not all options need to be passed to `render`. Default values will be used
    based on the name of the route specified in the router or the Route's
    `controllerName`, `viewName` and `templateName` properties.

    For example:

    ```javascript
    // router
    Router.map(function() {
      this.route('index');
      this.route('post', { path: '/posts/:post_id' });
    });
    ```

    ```javascript
    // post route
    PostRoute = App.Route.extend({
      renderTemplate: function() {
        this.render(); // all defaults apply
      }
    });
    ```

    The name of the `PostRoute`, defined by the router, is `post`.

    The following equivalent default options will be applied when
    the Route calls `render`:

    ```javascript
    //
    this.render('post', {  // the template name associated with 'post' Route
      into: 'application', // the parent route to 'post' Route
      outlet: 'main',      // {{outlet}} and {{outlet 'main' are synonymous}},
      view: 'post',        // the view associated with the 'post' Route
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
    @public
  */
  render(_name, options) {
    assert('The name in the given arguments is undefined', arguments.length > 0 ? !isNone(arguments[0]) : true);

    var namePassed = typeof _name === 'string' && !!_name;
    var isDefaultRender = arguments.length === 0 || Ember.isEmpty(arguments[0]);
    var name;

    if (typeof _name === 'object' && !options) {
      name = this.routeName;
      options = _name;
    } else {
      name = _name;
    }

    var renderOptions = buildRenderOptions(this, namePassed, isDefaultRender, name, options);
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

    ```javascript
    App.ApplicationRoute = App.Route.extend({
      actions: {
        showModal: function(evt) {
          this.render(evt.modalName, {
            outlet: 'modal',
            into: 'application'
          });
        },
        hideModal: function(evt) {
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

    ```javascript
    hideModal: function(evt) {
      this.disconnectOutlet('modal');
    }
    ```

    @method disconnectOutlet
    @param {Object|String} options the options hash or outlet name
    @private
  */
  disconnectOutlet(options) {
    var outletName;
    var parentView;
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
    for (var i = 0; i < this.router.router.currentHandlerInfos.length; i++) {
      // This non-local state munging is sadly necessary to maintain
      // backward compatibility with our existing semantics, which allow
      // any route to disconnectOutlet things originally rendered by any
      // other route. This should all get cut in 2.0.
      this.router.router.
        currentHandlerInfos[i].handler._disconnectOutlet(outletName, parentView);
    }
  },

  _disconnectOutlet(outletName, parentView) {
    var parent = parentRoute(this);
    if (parent && parentView === parent.routeName) {
      parentView = undefined;
    }
    for (var i = 0; i < this.connections.length; i++) {
      var connection = this.connections[i];
      if (connection.outlet === outletName && connection.into === parentView) {
        // This neuters the disconnected outlet such that it doesn't
        // render anything, but it leaves an entry in the outlet
        // hierarchy so that any existing other renders that target it
        // don't suddenly blow up. They will still stick themselves
        // into its outlets, which won't render anywhere. All of this
        // statefulness should get the machete in 2.0.
        this.connections[i] = {
          into: connection.into,
          outlet: connection.outlet,
          name: connection.name
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
  var handlerInfo = handlerInfoFor(route, route.router.router.state.handlerInfos, -1);
  return handlerInfo && handlerInfo.handler;
}

function handlerInfoFor(route, handlerInfos, _offset) {
  if (!handlerInfos) { return; }

  var offset = _offset || 0;
  var current;
  for (var i = 0, l = handlerInfos.length; i < l; i++) {
    current = handlerInfos[i].handler;
    if (current === route) { return handlerInfos[i + offset]; }
  }
}

function buildRenderOptions(route, namePassed, isDefaultRender, name, options) {
  var controller = options && options.controller;
  var templateName;
  var viewName;
  var ViewClass;
  var template;
  var LOG_VIEW_LOOKUPS = get(route.router, 'namespace.LOG_VIEW_LOOKUPS');
  var into = options && options.into && options.into.replace(/\//g, '.');
  var outlet = (options && options.outlet) || 'main';

  if (name) {
    name = name.replace(/\//g, '.');
    templateName = name;
  } else {
    name = route.routeName;
    templateName = route.templateName || name;
  }

  if (!controller) {
    if (namePassed) {
      controller = route.container.lookup(`controller:${name}`) || route.controllerName || route.routeName;
    } else {
      controller = route.controllerName || route.container.lookup(`controller:${name}`);
    }
  }

  if (typeof controller === 'string') {
    var controllerName = controller;
    controller = route.container.lookup(`controller:${controllerName}`);
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

  viewName = options && options.view || namePassed && name || route.viewName || name;
  ViewClass = route.container.lookupFactory(`view:${viewName}`);
  template = route.container.lookup(`template:${templateName}`);

  var parent;
  if (into && (parent = parentRoute(route)) && into === parentRoute(route).routeName) {
    into = undefined;
  }

  var renderOptions = {
    into: into,
    outlet: outlet,
    name: name,
    controller: controller,
    ViewClass: ViewClass,
    template: template
  };

  let Component;
  if (isEnabled('ember-routing-routable-components')) {
    let componentName = options && options.component || namePassed && name || route.componentName || name;
    let componentLookup = route.container.lookup('component-lookup:main');
    Component = componentLookup.lookupFactory(componentName);
    let isGlimmerComponent = Component && Component.proto().isGlimmerComponent;
    if (!template && !ViewClass && Component && isGlimmerComponent) {
      renderOptions.Component = Component;
      renderOptions.ViewClass = undefined;
      renderOptions.attrs = { model: get(controller, 'model') };
    }
  }

  if (!ViewClass && !template && !Component) {
    assert(`Could not find "${name}" template, view, or component.`, isDefaultRender);
    if (LOG_VIEW_LOOKUPS) {
      var fullName = `template:${name}`;
      info(`Could not find "${name}" template or view. Nothing will be rendered`, { fullName: fullName });
    }
  }

  return renderOptions;
}

function getFullQueryParams(router, state) {
  if (state.fullQueryParams) { return state.fullQueryParams; }

  state.fullQueryParams = {};
  merge(state.fullQueryParams, state.queryParams);

  var targetRouteName = state.handlerInfos[state.handlerInfos.length - 1].name;
  router._deserializeQueryParams(targetRouteName, state.fullQueryParams);
  return state.fullQueryParams;
}

function getQueryParamsFor(route, state) {
  state.queryParamsFor = state.queryParamsFor || {};
  var name = route.routeName;

  if (state.queryParamsFor[name]) { return state.queryParamsFor[name]; }

  var fullQueryParams = getFullQueryParams(route.router, state);

  var params = state.queryParamsFor[name] = {};

  // Copy over all the query params for this route/controller into params hash.
  var qpMeta = get(route, '_qp');
  var qps = qpMeta.qps;
  for (var i = 0, len = qps.length; i < len; ++i) {
    // Put deserialized qp on params hash.
    var qp = qps[i];

    var qpValueWasPassedIn = (qp.prop in fullQueryParams);
    params[qp.prop] = qpValueWasPassedIn ?
                      fullQueryParams[qp.prop] :
                      copyDefaultValue(qp.defaultValue);
  }

  return params;
}

function copyDefaultValue(value) {
  if (Array.isArray(value)) {
    return Ember.A(value.slice());
  }
  return value;
}

/*
  Merges all query parameters from a controller with those from
  a route, returning a new object and avoiding any mutations to
  the existing objects.
*/
function mergeEachQueryParams(controllerQP, routeQP) {
  var keysAlreadyMergedOrSkippable;
  var qps = {};

  if (isEnabled('ember-routing-route-configured-query-params')) {
    keysAlreadyMergedOrSkippable = {};
  } else {
    keysAlreadyMergedOrSkippable = {
      defaultValue: true,
      type: true,
      scope: true,
      as: true
    };
  }

  // first loop over all controller qps, merging them with any matching route qps
  // into a new empty object to avoid mutating.
  for (var cqpName in controllerQP) {
    if (!controllerQP.hasOwnProperty(cqpName)) { continue; }

    var newControllerParameterConfiguration = {};
    merge(newControllerParameterConfiguration, controllerQP[cqpName]);
    merge(newControllerParameterConfiguration, routeQP[cqpName]);

    qps[cqpName] = newControllerParameterConfiguration;

    // allows us to skip this QP when we check route QPs.
    keysAlreadyMergedOrSkippable[cqpName] = true;
  }

  // loop over all route qps, skipping those that were merged in the first pass
  // because they also appear in controller qps
  for (var rqpName in routeQP) {
    if (!routeQP.hasOwnProperty(rqpName) || keysAlreadyMergedOrSkippable[rqpName]) { continue; }

    var newRouteParameterConfiguration = {};
    merge(newRouteParameterConfiguration, routeQP[rqpName], controllerQP[rqpName]);
    qps[rqpName] = newRouteParameterConfiguration;
  }

  return qps;
}

function addQueryParamsObservers(controller, propNames) {
  propNames.forEach(function(prop) {
    controller.addObserver(prop + '.[]', controller, controller._qpChanged);
  });
}

function deprecateQueryParamDefaultValuesSetOnController(controllerName, routeName, propName) {
  deprecate(`Configuring query parameter default values on controllers is deprecated. Please move the value for the property '${propName}' from the '${controllerName}' controller to the '${routeName}' route in the format: {queryParams: ${propName}: {defaultValue: <default value> }}`, false, { id: 'ember-routing.deprecate-query-param-default-values-set-on-controller', until: '3.0.0' });
}

export default Route;
