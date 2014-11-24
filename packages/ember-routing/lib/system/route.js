import Ember from "ember-metal/core"; // FEATURES, A, deprecate, assert, Logger
import EmberError from "ember-metal/error";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import getProperties from "ember-metal/get_properties";
import {
  forEach,
  replace
}from "ember-metal/enumerable_utils";
import isNone from "ember-metal/is_none";
import { computed } from "ember-metal/computed";
import merge from "ember-metal/merge";
import {
  isArray,
  typeOf
} from "ember-metal/utils";
import run from "ember-metal/run_loop";
import keys from "ember-metal/keys";
import copy from "ember-runtime/copy";
import {
  classify
} from "ember-runtime/system/string";
import EmberObject from "ember-runtime/system/object";
import Evented from "ember-runtime/mixins/evented";
import ActionHandler from "ember-runtime/mixins/action_handler";
import generateController from "ember-routing/system/generate_controller";
import { stashParamNames } from "ember-routing/utils";

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
*/
var Route = EmberObject.extend(ActionHandler, {
  /**
    Configuration hash for this route's queryParams. The possible
    configuration options and their defaults are as follows
    (assuming a query param whose URL key is `page`):

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
        replace: false
      }
    }
    ```

    @property queryParams
    @for Ember.Route
    @type Hash
  */
  queryParams: {},

  /**
    @private

    @property _qp
  */
  _qp: computed(function() {
    var controllerName = this.controllerName || this.routeName;
    var controllerClass = this.container.lookupFactory('controller:' + controllerName);

    if (!controllerClass) {
      return defaultQPMeta;
    }

    var controllerProto = controllerClass.proto();
    var qpProps = get(controllerProto, '_normalizedQueryParams');
    var cacheMeta = get(controllerProto, '_cacheMeta');

    var qps = [], map = {}, self = this;
    for (var propName in qpProps) {
      if (!qpProps.hasOwnProperty(propName)) { continue; }

      var desc = qpProps[propName];
      var urlKey = desc.as || this.serializeQueryParamKey(propName);
      var defaultValue = get(controllerProto, propName);

      if (isArray(defaultValue)) {
        defaultValue = Ember.A(defaultValue.slice());
      }

      var type = typeOf(defaultValue);
      var defaultValueSerialized = this.serializeQueryParam(defaultValue, urlKey, type);
      var fprop = controllerName + ':' + propName;
      var qp = {
        def: defaultValue,
        sdef: defaultValueSerialized,
        type: type,
        urlKey: urlKey,
        prop: propName,
        fprop: fprop,
        ctrl: controllerName,
        cProto: controllerProto,
        svalue: defaultValueSerialized,
        cacheType: desc.scope,
        route: this,
        cacheMeta: cacheMeta[propName]
      };

      map[propName] = map[urlKey] = map[fprop] = qp;
      qps.push(qp);
    }

    return {
      qps: qps,
      map: map,
      states: {
        active: function(controller, prop) {
          return self._activeQPChanged(controller, map[prop]);
        },
        allowOverrides: function(controller, prop) {
          return self._updatingQPChanged(controller, map[prop]);
        },
        changingKeys: function(controller, prop) {
          return self._updateSerializedQPValue(controller, map[prop]);
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
  _stashNames: function(_handlerInfo, dynamicParent) {
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
      namePaths[a] = handlerInfo.name + '.' + names[a];
    }

    for (var i = 0; i < len; ++i) {
      var qp = qps[i];
      var cacheMeta = qp.cacheMeta;
      if (cacheMeta.scope === 'model') {
        cacheMeta.parts = namePaths;
      }
      cacheMeta.prefix = qp.ctrl;
    }
  },

  /**
    @private

    @property _updateSerializedQPValue
  */
  _updateSerializedQPValue: function(controller, qp) {
    var value = get(controller, qp.prop);
    qp.svalue = this.serializeQueryParam(value, qp.urlKey, qp.type);
  },

  /**
    @private

    @property _activeQPChanged
  */
  _activeQPChanged: function(controller, qp) {
    var value = get(controller, qp.prop);
    this.router._queuedQPChanges[qp.fprop] = value;
    run.once(this, this._fireQueryParamTransition);
  },

  /**
    @private
    @method _updatingQPChanged
  */
  _updatingQPChanged: function(controller, qp) {
    var router = this.router;
    if (!router._qpUpdates) {
      router._qpUpdates = {};
    }
    router._qpUpdates[qp.urlKey] = true;
  },

  mergedProperties: ['events', 'queryParams'],

  /**
    Retrieves parameters, for current route using the state.params
    variable and getQueryParamsFor, using the supplied routeName.

    @method paramsFor
    @param {String} routename

  */
  paramsFor: function(name) {
    var route = this.container.lookup('route:' + name);

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
  */
  serializeQueryParamKey: function(controllerPropertyName) {
    return controllerPropertyName;
  },

  /**
    Serializes value of the query parameter based on defaultValueType

    @method serializeQueryParam
    @param {Object} value
    @param {String} urlKey
    @param {String} defaultValueType
  */
  serializeQueryParam: function(value, urlKey, defaultValueType) {
    // urlKey isn't used here, but anyone overriding
    // can use it to provide serialization specific
    // to a certain query param.
    if (defaultValueType === 'array') {
      return JSON.stringify(value);
    }
    return '' + value;
  },

  /**
    Deserializes value of the query parameter based on defaultValueType

    @method deserializeQueryParam
    @param {Object} value
    @param {String} urlKey
    @param {String} defaultValueType
  */
  deserializeQueryParam: function(value, urlKey, defaultValueType) {
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
    @property _fireQueryParamTransition
  */
  _fireQueryParamTransition: function() {
    this.transitionTo({ queryParams: this.router._queuedQPChanges });
    this.router._queuedQPChanges = {};
  },

  /**
    @private

    @property _optionsForQueryParam
  */
  _optionsForQueryParam: function(qp) {
    return get(this, 'queryParams.' + qp.urlKey) || get(this, 'queryParams.' + qp.prop) || {};
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
  */
  resetController: K,

  /**
    @private

    @method exit
  */
  exit: function() {
    this.deactivate();
    if (Ember.FEATURES.isEnabled("ember-routing-fire-activate-deactivate-events")) {
      this.trigger('deactivate');
    }
    this.teardownViews();
  },

  /**
    @private

    @method _reset
    @since 1.7.0
  */
  _reset: function(isExiting, transition) {
    var controller = this.controller;

    controller._qpDelegate = get(this, '_qp.states.inactive');

    this.resetController(controller, isExiting, transition);
  },

  /**
    @private

    @method enter
  */
  enter: function() {
    this.activate();
    if (Ember.FEATURES.isEnabled("ember-routing-fire-activate-deactivate-events")) {
      this.trigger('activate');
    }
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
  */

  _actions: {

    queryParamsDidChange: function(changed, totalPresent, removed) {
      var qpMap = this.get('_qp').map;

      var totalChanged = keys(changed).concat(keys(removed));
      for (var i = 0, len = totalChanged.length; i < len; ++i) {
        var qp = qpMap[totalChanged[i]];
        if (qp && get(this._optionsForQueryParam(qp), 'refreshModel')) {
          this.refresh();
        }
      }

      return true;
    },

    finalizeQueryParamChange: function(params, finalParams, transition) {
      if (this.routeName !== 'application') { return true; }

      // Transition object is absent for intermediate transitions.
      if (!transition) { return; }

      var handlerInfos = transition.state.handlerInfos;
      var router = this.router;
      var qpMeta = router._queryParamsFor(handlerInfos[handlerInfos.length-1].name);
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
            svalue = qp.sdef;
            value = copyDefaultValue(qp.def);
          }
        }

        controller._qpDelegate = get(this, '_qp.states.inactive');

        var thisQueryParamChanged = (svalue !== qp.svalue);
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
        qp.svalue = svalue;

        var thisQueryParamHasDefaultValue = (qp.sdef === svalue);
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

      forEach(qpMeta.qps, function(qp) {
        var routeQpMeta = get(qp.route, '_qp');
        var finalizedController = qp.route.controller;
        finalizedController._qpDelegate = get(routeQpMeta, 'states.active');
      });

      router._qpUpdates = null;
    }
  },

  /**
    @deprecated

    Please use `actions` instead.
    @method events
  */
  events: null,

  /**
    This hook is executed when the router completely exits this route. It is
    not executed when the model for the route changes.

    @method deactivate
  */
  deactivate: K,

  /**
    This hook is executed when the router enters the route. It is not executed
    when the model for the route changes.

    @method activate
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
    resource tree.

    ```javascript
    App.Router.map(function() {
      this.resource('blogPost', { path:':blogPostId' }, function() {
        this.resource('blogComment', { path: ':blogCommentId' });
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
    ```

    See also 'replaceWith'.

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
      this.resource('articles', { path: '/articles' }, function() {
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

      this.resource('breakfast', { path: ':breakfastId' }, function() {
        this.resource('cereal', { path: ':cerealId' });
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

    @method transitionTo
    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used while
      transitioning to the route.
    @return {Transition} the transition object associated with this
      attempted transition
  */
  transitionTo: function(name, context) {
    var router = this.router;
    return router.transitionTo.apply(router, arguments);
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
   */
  intermediateTransitionTo: function() {
    var router = this.router;
    router.intermediateTransitionTo.apply(router, arguments);
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
   */
  refresh: function() {
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
  */
  replaceWith: function() {
    var router = this.router;
    return router.replaceWith.apply(router, arguments);
  },

  /**
    Sends an action to the router, which will delegate it to the currently
    active route hierarchy per the bubbling rules explained under `actions`.

    Example

    ```javascript
    App.Router.map(function() {
      this.route("index");
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
  */
  send: function() {
    return this.router.send.apply(this.router, arguments);
  },

  /**
    This hook is the entry point for router.js

    @private
    @method setup
  */
  setup: function(context, transition) {
    var controllerName = this.controllerName || this.routeName;
    var controller = this.controllerFor(controllerName, true);

    if (!controller) {
      controller =  this.generateController(controllerName, context);
    }

    // Assign the route's controller so that it can more easily be
    // referenced in action handlers
    this.controller = controller;

    if (this.setupControllers) {
      Ember.deprecate("Ember.Route.setupControllers is deprecated. Please use Ember.Route.setupController(controller, model) instead.");
      this.setupControllers(controller, context);
    } else {
      var states = get(this, '_qp.states');
      if (transition) {
        // Update the model dep values used to calculate cache keys.
        stashParamNames(this.router, transition.state.handlerInfos);
        controller._qpDelegate = states.changingKeys;
        controller._updateCacheParams(transition.params);
      }
      controller._qpDelegate = states.allowOverrides;

      if (transition) {
        var qpValues = getQueryParamsFor(this, transition.state);
        controller.setProperties(qpValues);
      }

      this.setupController(controller, context, transition);
    }

    if (this.renderTemplates) {
      Ember.deprecate("Ember.Route.renderTemplates is deprecated. Please use Ember.Route.renderTemplate(controller, model) instead.");
      this.renderTemplates(context);
    } else {
      this.renderTemplate(controller, context);
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
            // hook, you would have to either
            return Ember.RSVP.reject(e);
          });
        }
      }
    });
    ```

    @method beforeModel
    @param {Transition} transition
    @param {Object} queryParams the active query params for this route
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not
      utilized in any way.
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
    @param {Object} queryParams the active query params for this handler
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not
      utilized in any way.
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
  */
  redirect: K,

  /**
    Called when the context is changed by router.js.

    @private
    @method contextDidChange
  */
  contextDidChange: function() {
    this.currentModel = this.context;
  },

  /**
    A hook you can implement to convert the URL into the model for
    this route.

    ```javascript
    App.Router.map(function() {
      this.resource('post', { path: '/posts/:post_id' });
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
    @param {Object} queryParams the query params for this route
    @return {Object|Promise} the model for this route. If
      a promise is returned, the transition will pause until
      the promise resolves, and the resolved value of the promise
      will be used as the model for this route.
  */
  model: function(params, transition) {
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

    if (!name && sawParams) { return copy(params); }
    else if (!name) {
      if (transition.resolveIndex < 1) { return; }

      var parentModel = transition.state.handlerInfos[transition.resolveIndex-1].context;

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
  deserialize: function(params, transition) {
    return this.model(this.paramsFor(this.routeName), transition);
  },

  /**

    @method findModel
    @param {String} type the model type
    @param {Object} value the value passed to find
  */
  findModel: function(){
    var store = get(this, 'store');
    return store.find.apply(store, arguments);
  },

  /**
    Store property provides a hook for data persistence libraries to inject themselves.

    By default, this store property provides the exact same functionality previously
    in the model hook.

    Currently, the required interface is:

    `store.find(modelName, findArguments)`

    @method store
    @param {Object} store
  */
  store: computed(function(){
    var container = this.container;
    var routeName = this.routeName;
    var namespace = get(this, 'router.namespace');

    return {
      find: function(name, value) {
        var modelClass = container.lookupFactory('model:' + name);

        Ember.assert("You used the dynamic segment " + name + "_id in your route " +
                     routeName + ", but " + namespace + "." + classify(name) +
                     " did not exist and you did not override your route's `model` " +
                     "hook.", !!modelClass);

        if (!modelClass) { return; }

        Ember.assert(classify(name) + ' has no method `find`.', typeof modelClass.find === 'function');

        return modelClass.find(value);
      }
    };
  }),

  /**
    A hook you can implement to convert the route's model into parameters
    for the URL.

    ```javascript
    App.Router.map(function() {
      this.resource('post', { path: '/posts/:post_id' });
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
    @param {Object} model the route's model
    @param {Array} params an Array of parameter names for the current
      route (in the example, `['post_id']`.
    @return {Object} the serialized parameters
  */
  serialize: function(model, params) {
    if (params.length < 1) { return; }
    if (!model) { return; }

    var name = params[0], object = {};

    if (/_id$/.test(name) && params.length === 1) {
      object[name] = get(model, "id");
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

    This means that your template will get a proxy for the model as its
    context, and you can act as though the model itself was the context.

    The provided controller will be one resolved based on the name
    of this route.

    If no explicit controller is defined, Ember will automatically create
    an appropriate controller for the model.

    * if the model is an `Ember.Array` (including record arrays from Ember
      Data), the controller is an `Ember.ArrayController`.
    * otherwise, the controller is an `Ember.ObjectController`.

    As an example, consider the router:

    ```javascript
    App.Router.map(function() {
      this.resource('post', { path: '/posts/:post_id' });
    });
    ```

    For the `post` route, a controller named `App.PostController` would
    be used if it is defined. If it is not defined, an `Ember.ObjectController`
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
  */
  setupController: function(controller, context, transition) {
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
  */
  controllerFor: function(name, _skipAssert) {
    var container = this.container;
    var route = container.lookup('route:'+name);
    var controller;

    if (route && route.controllerName) {
      name = route.controllerName;
    }

    controller = container.lookup('controller:' + name);

    // NOTE: We're specifically checking that skipAssert is true, because according
    //   to the old API the second parameter was model. We do not want people who
    //   passed a model to skip the assertion.
    Ember.assert("The controller named '"+name+"' could not be found. Make sure " +
                 "that this route exists and has already been entered at least " +
                 "once. If you are accessing a controller not associated with a " +
                 "route, make sure the controller class is explicitly defined.",
                 controller || _skipAssert === true);

    return controller;
  },

  /**
    Generates a controller for a route.

    If the optional model is passed then the controller type is determined automatically,
    e.g., an ArrayController for arrays.

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
  */
  generateController: function(name, model) {
    var container = this.container;

    model = model || this.modelFor(name);

    return generateController(container, name, model);
  },

  /**
    Returns the model of a parent (or any ancestor) route
    in a route hierarchy.  During a transition, all routes
    must resolve a model object, and if a route
    needs access to a parent route's model in order to
    resolve a model (or just reuse the model from a parent),
    it can call `this.modelFor(theNameOfParentRoute)` to
    retrieve it.

    Example

    ```javascript
    App.Router.map(function() {
        this.resource('post', { path: '/post/:post_id' }, function() {
            this.resource('comments');
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
  */
  modelFor: function(name) {
    var route = this.container.lookup('route:' + name);
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
  */
  renderTemplate: function(controller, model) {
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
      this.resource('photos');
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
      renderTemplate: function(){
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
      this.resource('post', { path: '/posts/:post_id' });
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
    @param {String} [options.controller] the controller to use for this template,
                    referenced by name. Defaults to the Route's paired controller
    @param {String} [options.model] the model object to set on `options.controller`
                    Defaults to the return value of the Route's model hook
  */
  render: function(name, options) {
    Ember.assert("The name in the given arguments is undefined", arguments.length > 0 ? !isNone(arguments[0]) : true);

    var namePassed = typeof name === 'string' && !!name;

    if (typeof name === 'object' && !options) {
      options = name;
      name = this.routeName;
    }

    options = options || {};
    options.namePassed = namePassed;

    var templateName;

    if (name) {
      name = name.replace(/\//g, '.');
      templateName = name;
    } else {
      name = this.routeName;
      templateName = this.templateName || name;
    }

    var viewName = options.view || namePassed && name || this.viewName || name;

    var container = this.container;
    var view = container.lookup('view:' + viewName);
    var template = view ? view.get('template') : null;

    if (!template) {
      template = container.lookup('template:' + templateName);
    }

    if (!view && !template) {
      Ember.assert("Could not find \"" + name + "\" template or view.", Ember.isEmpty(arguments[0]));
      if (get(this.router, 'namespace.LOG_VIEW_LOOKUPS')) {
        Ember.Logger.info("Could not find \"" + name + "\" template or view. Nothing will be rendered", { fullName: 'template:' + name });
      }
      return;
    }

    options = normalizeOptions(this, name, template, options);
    view = setupView(view, container, options);

    if (options.outlet === 'main') { this.lastRenderedTemplate = name; }

    appendView(this, view, options);
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
  */
  disconnectOutlet: function(options) {
    if (!options || typeof options === "string") {
      var outletName = options;
      options = {};
      options.outlet = outletName;
    }
    options.parentView = options.parentView ? options.parentView.replace(/\//g, '.') : parentTemplate(this);
    options.outlet = options.outlet || 'main';

    var parentView = this.router._lookupActiveView(options.parentView);
    if (parentView) { parentView.disconnectOutlet(options.outlet); }
  },

  willDestroy: function() {
    this.teardownViews();
  },

  /**
    @private

    @method teardownViews
  */
  teardownViews: function() {
    // Tear down the top level view
    if (this.teardownTopLevelView) { this.teardownTopLevelView(); }

    // Tear down any outlets rendered with 'into'
    var teardownOutletViews = this.teardownOutletViews || [];
    forEach(teardownOutletViews, function(teardownOutletView) {
      teardownOutletView();
    });

    delete this.teardownTopLevelView;
    delete this.teardownOutletViews;
    delete this.lastRenderedTemplate;
  }
});

if (Ember.FEATURES.isEnabled("ember-routing-fire-activate-deactivate-events")) {
  // TODO add mixin directly to `Route` class definition above, once this
  // feature is merged:
  Route.reopen(Evented);
}

var defaultQPMeta = {
  qps: [],
  map: {},
  states: {}
};

function parentRoute(route) {
  var handlerInfo = handlerInfoFor(route, route.router.router.state.handlerInfos, -1);
  return handlerInfo && handlerInfo.handler;
}

function handlerInfoFor(route, handlerInfos, _offset) {
  if (!handlerInfos) { return; }

  var offset = _offset || 0, current;
  for (var i=0, l=handlerInfos.length; i<l; i++) {
    current = handlerInfos[i].handler;
    if (current === route) { return handlerInfos[i+offset]; }
  }
}

function parentTemplate(route) {
  var parent = parentRoute(route), template;

  if (!parent) { return; }

  if (template = parent.lastRenderedTemplate) {
    return template;
  } else {
    return parentTemplate(parent);
  }
}

function normalizeOptions(route, name, template, options) {
  options = options || {};
  options.into = options.into ? options.into.replace(/\//g, '.') : parentTemplate(route);
  options.outlet = options.outlet || 'main';
  options.name = name;
  options.template = template;
  options.LOG_VIEW_LOOKUPS = get(route.router, 'namespace.LOG_VIEW_LOOKUPS');

  Ember.assert("An outlet ("+options.outlet+") was specified but was not found.", options.outlet === 'main' || options.into);

  var controller = options.controller;
  var model = options.model;

  if (options.controller) {
    controller = options.controller;
  } else if (options.namePassed) {
    controller = route.container.lookup('controller:' + name) || route.controllerName || route.routeName;
  } else {
    controller = route.controllerName || route.container.lookup('controller:' + name);
  }

  if (typeof controller === 'string') {
    var controllerName = controller;
    controller = route.container.lookup('controller:' + controllerName);
    if (!controller) {
      throw new EmberError("You passed `controller: '" + controllerName + "'` into the `render` method, but no such controller could be found.");
    }
  }

  if (model) {
    controller.set('model', model);
  }

  options.controller = controller;

  return options;
}

function setupView(view, container, options) {
  if (view) {
    if (options.LOG_VIEW_LOOKUPS) {
      Ember.Logger.info("Rendering " + options.name + " with " + view, { fullName: 'view:' + options.name });
    }
  } else {
    var defaultView = options.into ? 'view:default' : 'view:toplevel';
    view = container.lookup(defaultView);
    if (options.LOG_VIEW_LOOKUPS) {
      Ember.Logger.info("Rendering " + options.name + " with default view " + view, { fullName: 'view:' + options.name });
    }
  }

  if (!get(view, 'templateName')) {
    set(view, 'template', options.template);

    set(view, '_debugTemplateName', options.name);
  }

  set(view, 'renderedName', options.name);
  set(view, 'controller', options.controller);

  return view;
}

function appendView(route, view, options) {
  if (options.into) {
    var parentView = route.router._lookupActiveView(options.into);
    var teardownOutletView = generateOutletTeardown(parentView, options.outlet);
    if (!route.teardownOutletViews) { route.teardownOutletViews = []; }
    replace(route.teardownOutletViews, 0, 0, [teardownOutletView]);
    parentView.connectOutlet(options.outlet, view);
  } else {
    var rootElement = get(route, 'router.namespace.rootElement');
    // tear down view if one is already rendered
    if (route.teardownTopLevelView) {
      route.teardownTopLevelView();
    }
    route.router._connectActiveView(options.name, view);
    route.teardownTopLevelView = generateTopLevelTeardown(view);
    view.appendTo(rootElement);
  }
}

function generateTopLevelTeardown(view) {
  return function() {
    view.destroy();
  };
}

function generateOutletTeardown(parentView, outlet) {
  return function() {
    parentView.disconnectOutlet(outlet);
  };
}

function getFullQueryParams(router, state) {
  if (state.fullQueryParams) { return state.fullQueryParams; }

  state.fullQueryParams = {};
  merge(state.fullQueryParams, state.queryParams);

  var targetRouteName = state.handlerInfos[state.handlerInfos.length-1].name;
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
                      copyDefaultValue(qp.def);
  }

  return params;
}

function copyDefaultValue(value) {
  if (isArray(value)) {
    return Ember.A(value.slice());
  }
  return value;
}

export default Route;
