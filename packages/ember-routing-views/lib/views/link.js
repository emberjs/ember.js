/**
@module ember
@submodule ember-routing-views
*/

import Ember from "ember-metal/core"; // FEATURES, Logger, assert

import { get } from "ember-metal/property_get";
import merge from "ember-metal/merge";
import run from "ember-metal/run_loop";
import { computed } from "ember-metal/computed";
import { fmt } from "ember-runtime/system/string";
import keys from "ember-metal/keys";
import { isSimpleClick } from "ember-views/system/utils";
import EmberComponent from "ember-views/views/component";
import { routeArgs } from "ember-routing/utils";
import { read, subscribe } from "ember-metal/streams/utils";

var numberOfContextsAcceptedByHandler = function(handler, handlerInfos) {
  var req = 0;
  for (var i = 0, l = handlerInfos.length; i < l; i++) {
    req = req + handlerInfos[i].names.length;
    if (handlerInfos[i].handler === handler) {
      break;
    }
  }

  return req;
};

var linkViewClassNameBindings = ['active', 'loading', 'disabled'];
if (Ember.FEATURES.isEnabled('ember-routing-transitioning-classes')) {
  linkViewClassNameBindings = ['active', 'loading', 'disabled', 'transitioningIn', 'transitioningOut'];
}

/**
  `Ember.LinkView` renders an element whose `click` event triggers a
  transition of the application's instance of `Ember.Router` to
  a supplied route by name.

  Instances of `LinkView` will most likely be created through
  the `link-to` Handlebars helper, but properties of this class
  can be overridden to customize application-wide behavior.

  @class LinkView
  @namespace Ember
  @extends Ember.View
  @see {Handlebars.helpers.link-to}
**/
var LinkView = EmberComponent.extend({
  tagName: 'a',

  /**
    @deprecated Use current-when instead.
    @property currentWhen
  */
  currentWhen: null,

  /**
    Used to determine when this LinkView is active.

    @property currentWhen
  */
  'current-when': null,

  /**
    Sets the `title` attribute of the `LinkView`'s HTML element.

    @property title
    @default null
  **/
  title: null,

  /**
    Sets the `rel` attribute of the `LinkView`'s HTML element.

    @property rel
    @default null
  **/
  rel: null,

  /**
    Sets the `tabindex` attribute of the `LinkView`'s HTML element.

    @property tabindex
    @default null
  **/
  tabindex: null,

  /**
    Sets the `target` attribute of the `LinkView`'s HTML element.

    @since 1.8.0
    @property target
    @default null
  **/
  target: null,

  /**
    The CSS class to apply to `LinkView`'s element when its `active`
    property is `true`.

    @property activeClass
    @type String
    @default active
  **/
  activeClass: 'active',

  /**
    The CSS class to apply to `LinkView`'s element when its `loading`
    property is `true`.

    @property loadingClass
    @type String
    @default loading
  **/
  loadingClass: 'loading',

  /**
    The CSS class to apply to a `LinkView`'s element when its `disabled`
    property is `true`.

    @property disabledClass
    @type String
    @default disabled
  **/
  disabledClass: 'disabled',
  _isDisabled: false,

  /**
    Determines whether the `LinkView` will trigger routing via
    the `replaceWith` routing strategy.

    @property replace
    @type Boolean
    @default false
  **/
  replace: false,

  /**
    By default the `{{link-to}}` helper will bind to the `href` and
    `title` attributes. It's discouraged that you override these defaults,
    however you can push onto the array if needed.

    @property attributeBindings
    @type Array | String
    @default ['href', 'title', 'rel', 'tabindex', 'target']
   **/
  attributeBindings: ['href', 'title', 'rel', 'tabindex', 'target'],

  /**
    By default the `{{link-to}}` helper will bind to the `active`, `loading`, and
    `disabled` classes. It is discouraged to override these directly.

    @property classNameBindings
    @type Array
    @default ['active', 'loading', 'disabled']
   **/
  classNameBindings: linkViewClassNameBindings,

  /**
    By default the `{{link-to}}` helper responds to the `click` event. You
    can override this globally by setting this property to your custom
    event name.

    This is particularly useful on mobile when one wants to avoid the 300ms
    click delay using some sort of custom `tap` event.

    @property eventName
    @type String
    @default click
  */
  eventName: 'click',

  // this is doc'ed here so it shows up in the events
  // section of the API documentation, which is where
  // people will likely go looking for it.
  /**
    Triggers the `LinkView`'s routing behavior. If
    `eventName` is changed to a value other than `click`
    the routing behavior will trigger on that custom event
    instead.

    @event click
  **/

  /**
    An overridable method called when LinkView objects are instantiated.

    Example:

    ```javascript
    App.MyLinkView = Ember.LinkView.extend({
      init: function() {
        this._super.apply(this, arguments);
        Ember.Logger.log('Event is ' + this.get('eventName'));
      }
    });
    ```

    NOTE: If you do override `init` for a framework class like `Ember.View` or
    `Ember.ArrayController`, be sure to call `this._super.apply(this, arguments)` in your
    `init` declaration! If you don't, Ember may not have an opportunity to
    do important setup work, and you'll see strange behavior in your
    application.

    @method init
  */
  init() {
    this._super(...arguments);

    Ember.deprecate('Using currentWhen with {{link-to}} is deprecated in favor of `current-when`.', !this.currentWhen);

    // Map desired event name to invoke function
    var eventName = get(this, 'eventName');
    this.on(eventName, this, this._invoke);
  },

  /**
    This method is invoked by observers installed during `init` that fire
    whenever the params change

    @private
    @method _paramsChanged
    @since 1.3.0
   */
  _paramsChanged() {
    this.notifyPropertyChange('resolvedParams');
  },

  /**
   This is called to setup observers that will trigger a rerender.

   @private
   @method _setupPathObservers
   @since 1.3.0
  **/
  _setupPathObservers() {
    var params = this.params;

    var scheduledParamsChanged = this._wrapAsScheduled(this._paramsChanged);

    for (var i = 0; i < params.length; i++) {
      subscribe(params[i], scheduledParamsChanged, this);
    }

    var queryParamsObject = this.queryParamsObject;
    if (queryParamsObject) {
      var values = queryParamsObject.values;
      for (var k in values) {
        if (!values.hasOwnProperty(k)) {
          continue;
        }

        subscribe(values[k], scheduledParamsChanged, this);
      }
    }
  },

  afterRender() {
    this._super(...arguments);
    this._setupPathObservers();
  },

  /**

    Accessed as a classname binding to apply the `LinkView`'s `disabledClass`
    CSS `class` to the element when the link is disabled.

    When `true` interactions with the element will not trigger route changes.
    @property disabled
  */
  disabled: computed({
    get: function(key, value) {
      return false;
    },
    set: function(key, value) {
      if (value !== undefined) { this.set('_isDisabled', value); }

      return value ? get(this, 'disabledClass') : false;
    }
  }),

  /**
    Accessed as a classname binding to apply the `LinkView`'s `activeClass`
    CSS `class` to the element when the link is active.

    A `LinkView` is considered active when its `currentWhen` property is `true`
    or the application's current route is the route the `LinkView` would trigger
    transitions into.

    The `currentWhen` property can match against multiple routes by separating
    route names using the ` ` (space) character.

    @property active
  **/
  active: computed('loadedParams', function computeLinkViewActive() {
    var router = get(this, 'router');
    if (!router) { return; }
    return computeActive(this, router.currentState);
  }),

  willBeActive: computed('router.targetState', function() {
    var router = get(this, 'router');
    if (!router) { return; }
    var targetState = router.targetState;
    if (router.currentState === targetState) { return; }

    return !!computeActive(this, targetState);
  }),

  transitioningIn: computed('active', 'willBeActive', function() {
    var willBeActive = get(this, 'willBeActive');
    if (typeof willBeActive === 'undefined') { return false; }

    return !get(this, 'active') && willBeActive && 'ember-transitioning-in';
  }),

  transitioningOut: computed('active', 'willBeActive', function() {
    var willBeActive = get(this, 'willBeActive');
    if (typeof willBeActive === 'undefined') { return false; }

    return get(this, 'active') && !willBeActive && 'ember-transitioning-out';
  }),

  /**
    Accessed as a classname binding to apply the `LinkView`'s `loadingClass`
    CSS `class` to the element when the link is loading.

    A `LinkView` is considered loading when it has at least one
    parameter whose value is currently null or undefined. During
    this time, clicking the link will perform no transition and
    emit a warning that the link is still in a loading state.

    @property loading
  **/
  loading: computed('loadedParams', function computeLinkViewLoading() {
    if (!get(this, 'loadedParams')) { return get(this, 'loadingClass'); }
  }),

  /**
    Returns the application's main router from the container.

    @private
    @property router
  **/
  router: computed(function() {
    var controller = get(this, 'controller');
    if (controller && controller.container) {
      return controller.container.lookup('router:main');
    }
  }),

  /**
    Event handler that invokes the link, activating the associated route.

    @private
    @method _invoke
    @param {Event} event
  */
  _invoke(event) {
    if (!isSimpleClick(event)) { return true; }

    if (this.preventDefault !== false) {
      var targetAttribute = get(this, 'target');
      if (!targetAttribute || targetAttribute === '_self') {
        event.preventDefault();
      }
    }

    if (this.bubbles === false) { event.stopPropagation(); }

    if (get(this, '_isDisabled')) { return false; }

    if (get(this, 'loading')) {
      Ember.Logger.warn("This link-to is in an inactive loading state because at least one of its parameters presently has a null/undefined value, or the provided route name is invalid.");
      return false;
    }

    var targetAttribute2 = get(this, 'target');
    if (targetAttribute2 && targetAttribute2 !== '_self') {
      return false;
    }

    var router = get(this, 'router');
    var loadedParams = get(this, 'loadedParams');

    var transition = router._doTransition(loadedParams.targetRouteName, loadedParams.models, loadedParams.queryParams);
    if (get(this, 'replace')) {
      transition.method('replace');
    }

    if (Ember.FEATURES.isEnabled('ember-routing-transitioning-classes')) {
      return;
    }

    // Schedule eager URL update, but after we've given the transition
    // a chance to synchronously redirect.
    // We need to always generate the URL instead of using the href because
    // the href will include any rootURL set, but the router expects a URL
    // without it! Note that we don't use the first level router because it
    // calls location.formatURL(), which also would add the rootURL!
    var args = routeArgs(loadedParams.targetRouteName, loadedParams.models, transition.state.queryParams);
    var url = router.router.generate.apply(router.router, args);

    run.scheduleOnce('routerTransitions', this, this._eagerUpdateUrl, transition, url);
  },

  /**
    @private
    @method _eagerUpdateUrl
    @param transition
    @param href
   */
  _eagerUpdateUrl(transition, href) {
    if (!transition.isActive || !transition.urlMethod) {
      // transition was aborted, already ran to completion,
      // or it has a null url-updated method.
      return;
    }

    if (href.indexOf('#') === 0) {
      href = href.slice(1);
    }

    // Re-use the routerjs hooks set up by the Ember router.
    var routerjs = get(this, 'router.router');
    if (transition.urlMethod === 'update') {
      routerjs.updateURL(href);
    } else if (transition.urlMethod === 'replace') {
      routerjs.replaceURL(href);
    }

    // Prevent later update url refire.
    transition.method(null);
  },

  /**
    Computed property that returns an array of the
    resolved parameters passed to the `link-to` helper,
    e.g.:

    ```hbs
    {{link-to a b '123' c}}
    ```

    will generate a `resolvedParams` of:

    ```js
    [aObject, bObject, '123', cObject]
    ```

    @private
    @property
    @return {Array}
   */
  resolvedParams: computed('router.url', function() {
    var params = this.params;
    var targetRouteName;
    var models = [];
    var onlyQueryParamsSupplied = (params.length === 0);

    if (onlyQueryParamsSupplied) {
      var appController = this.container.lookup('controller:application');
      targetRouteName = get(appController, 'currentRouteName');
    } else {
      targetRouteName = read(params[0]);

      for (var i = 1; i < params.length; i++) {
        models.push(read(params[i]));
      }
    }

    var suppliedQueryParams = getResolvedQueryParams(this, targetRouteName);

    return {
      targetRouteName: targetRouteName,
      models: models,
      queryParams: suppliedQueryParams
    };
  }),

  /**
    Computed property that returns the current route name,
    dynamic segments, and query params. Returns falsy if
    for null/undefined params to indicate that the link view
    is still in a loading state.

    @private
    @property
    @return {Array} An array with the route name and any dynamic segments
  **/
  loadedParams: computed('resolvedParams', function computeLinkViewRouteArgs() {
    var router = get(this, 'router');
    if (!router) { return; }

    var resolvedParams = get(this, 'resolvedParams');
    var namedRoute = resolvedParams.targetRouteName;

    if (!namedRoute) { return; }

    Ember.assert(fmt("The attempt to link-to route '%@' failed. " +
                     "The router did not find '%@' in its possible routes: '%@'",
                     [namedRoute, namedRoute, keys(router.router.recognizer.names).join("', '")]),
                     router.hasRoute(namedRoute));

    if (!paramsAreLoaded(resolvedParams.models)) { return; }

    return resolvedParams;
  }),

  queryParamsObject: null,

  /**
    Sets the element's `href` attribute to the url for
    the `LinkView`'s targeted route.

    If the `LinkView`'s `tagName` is changed to a value other
    than `a`, this property will be ignored.

    @property href
  **/
  href: computed('loadedParams', function computeLinkViewHref() {
    if (get(this, 'tagName') !== 'a') { return; }

    var router = get(this, 'router');
    var loadedParams = get(this, 'loadedParams');

    if (!loadedParams) {
      return get(this, 'loadingHref');
    }

    var visibleQueryParams = {};
    merge(visibleQueryParams, loadedParams.queryParams);
    router._prepareQueryParams(loadedParams.targetRouteName, loadedParams.models, visibleQueryParams);

    var args = routeArgs(loadedParams.targetRouteName, loadedParams.models, visibleQueryParams);
    var result = router.generate.apply(router, args);
    return result;
  }),

  /**
    The default href value to use while a link-to is loading.
    Only applies when tagName is 'a'

    @property loadingHref
    @type String
    @default #
  */
  loadingHref: '#'
});

LinkView.toString = function() { return "LinkView"; };

function getResolvedQueryParams(linkView, targetRouteName) {
  var queryParamsObject = linkView.queryParamsObject;
  var resolvedQueryParams = {};

  if (!queryParamsObject) { return resolvedQueryParams; }

  var values = queryParamsObject.values;
  for (var key in values) {
    if (!values.hasOwnProperty(key)) { continue; }
    resolvedQueryParams[key] = read(values[key]);
  }

  return resolvedQueryParams;
}

function paramsAreLoaded(params) {
  for (var i = 0, len = params.length; i < len; ++i) {
    var param = params[i];
    if (param === null || typeof param === 'undefined') {
      return false;
    }
  }
  return true;
}

function computeActive(route, routerState) {
  if (get(route, 'loading')) { return false; }

  var currentWhen = route['current-when'] || route.currentWhen;
  var isCurrentWhenSpecified = !!currentWhen;
  currentWhen = currentWhen || get(route, 'loadedParams').targetRouteName;
  currentWhen = currentWhen.split(' ');
  for (var i = 0, len = currentWhen.length; i < len; i++) {
    if (isActiveForRoute(route, currentWhen[i], isCurrentWhenSpecified, routerState)) {
      return get(route, 'activeClass');
    }
  }

  return false;
}

function isActiveForRoute(route, routeName, isCurrentWhenSpecified, routerState) {
  var router = get(route, 'router');
  var loadedParams = get(route, 'loadedParams');
  var contexts = loadedParams.models;

  var handlers = router.router.recognizer.handlersFor(routeName);
  var leafName = handlers[handlers.length-1].handler;
  var maximumContexts = numberOfContextsAcceptedByHandler(routeName, handlers);

  // NOTE: any ugliness in the calculation of activeness is largely
  // due to the fact that we support automatic normalizing of
  // `resource` -> `resource.index`, even though there might be
  // dynamic segments / query params defined on `resource.index`
  // which complicates (and makes somewhat ambiguous) the calculation
  // of activeness for links that link to `resource` instead of
  // directly to `resource.index`.

  // if we don't have enough contexts revert back to full route name
  // this is because the leaf route will use one of the contexts
  if (contexts.length > maximumContexts) {
    routeName = leafName;
  }

  return routerState.isActiveIntent(routeName, contexts, loadedParams.queryParams, !isCurrentWhenSpecified);
}

export {
  LinkView
};
