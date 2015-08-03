/**
@module ember
@submodule ember-routing-views
*/

import Ember from "ember-metal/core"; // FEATURES, Logger, assert

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";
import { isSimpleClick } from "ember-views/system/utils";
import EmberComponent from "ember-views/views/component";
import inject from "ember-runtime/inject";
import ControllerMixin from "ember-runtime/mixins/controller";

import linkToTemplate from "ember-htmlbars/templates/link-to";
linkToTemplate.meta.revision = 'Ember@VERSION_STRING_PLACEHOLDER';

var linkComponentClassNameBindings = ['active', 'loading', 'disabled'];
if (Ember.FEATURES.isEnabled('ember-routing-transitioning-classes')) {
  linkComponentClassNameBindings = ['active', 'loading', 'disabled', 'transitioningIn', 'transitioningOut'];
}

/**
  `Ember.LinkComponent` renders an element whose `click` event triggers a
  transition of the application's instance of `Ember.Router` to
  a supplied route by name.

  Instances of `LinkComponent` will most likely be created through
  the `link-to` Handlebars helper, but properties of this class
  can be overridden to customize application-wide behavior.

  @class LinkComponent
  @namespace Ember
  @extends Ember.Component
  @see {Handlebars.helpers.link-to}
  @private
**/
var LinkComponent = EmberComponent.extend({
  defaultLayout: linkToTemplate,

  tagName: 'a',

  /**
    @deprecated Use current-when instead.
    @property currentWhen
    @private
  */
  currentWhen: null,

  /**
    Used to determine when this LinkComponent is active.

    @property currentWhen
    @public
  */
  'current-when': null,

  /**
    Sets the `title` attribute of the `LinkComponent`'s HTML element.

    @property title
    @default null
    @public
  **/
  title: null,

  /**
    Sets the `rel` attribute of the `LinkComponent`'s HTML element.

    @property rel
    @default null
    @public
  **/
  rel: null,

  /**
    Sets the `tabindex` attribute of the `LinkComponent`'s HTML element.

    @property tabindex
    @default null
    @public
  **/
  tabindex: null,

  /**
    Sets the `target` attribute of the `LinkComponent`'s HTML element.

    @since 1.8.0
    @property target
    @default null
    @public
  **/
  target: null,

  /**
    The CSS class to apply to `LinkComponent`'s element when its `active`
    property is `true`.

    @property activeClass
    @type String
    @default active
    @private
  **/
  activeClass: 'active',

  /**
    The CSS class to apply to `LinkComponent`'s element when its `loading`
    property is `true`.

    @property loadingClass
    @type String
    @default loading
    @private
  **/
  loadingClass: 'loading',

  /**
    The CSS class to apply to a `LinkComponent`'s element when its `disabled`
    property is `true`.

    @property disabledClass
    @type String
    @default disabled
    @private
  **/
  disabledClass: 'disabled',
  _isDisabled: false,

  /**
    Determines whether the `LinkComponent` will trigger routing via
    the `replaceWith` routing strategy.

    @property replace
    @type Boolean
    @default false
    @public
  **/
  replace: false,

  /**
    By default the `{{link-to}}` helper will bind to the `href` and
    `title` attributes. It's discouraged that you override these defaults,
    however you can push onto the array if needed.

    @property attributeBindings
    @type Array | String
    @default ['title', 'rel', 'tabindex', 'target']
    @public
  */
  attributeBindings: ['href', 'title', 'rel', 'tabindex', 'target'],

  /**
    By default the `{{link-to}}` helper will bind to the `active`, `loading`, and
    `disabled` classes. It is discouraged to override these directly.

    @property classNameBindings
    @type Array
    @default ['active', 'loading', 'disabled']
    @public
  */
  classNameBindings: linkComponentClassNameBindings,

  /**
    By default the `{{link-to}}` helper responds to the `click` event. You
    can override this globally by setting this property to your custom
    event name.

    This is particularly useful on mobile when one wants to avoid the 300ms
    click delay using some sort of custom `tap` event.

    @property eventName
    @type String
    @default click
    @private
  */
  eventName: 'click',

  // this is doc'ed here so it shows up in the events
  // section of the API documentation, which is where
  // people will likely go looking for it.
  /**
    Triggers the `LinkComponent`'s routing behavior. If
    `eventName` is changed to a value other than `click`
    the routing behavior will trigger on that custom event
    instead.

    @event click
    @private
  */

  /**
    An overridable method called when LinkComponent objects are instantiated.

    Example:

    ```javascript
    App.MyLinkComponent = Ember.LinkComponent.extend({
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
    @private
  */
  init() {
    this._super(...arguments);

    Ember.deprecate('Using currentWhen with {{link-to}} is deprecated in favor of `current-when`.', !this.currentWhen);

    // Map desired event name to invoke function
    var eventName = get(this, 'eventName');
    this.on(eventName, this, this._invoke);
  },

  _routing: inject.service('-routing'),

  /**
    Accessed as a classname binding to apply the `LinkComponent`'s `disabledClass`
    CSS `class` to the element when the link is disabled.

    When `true` interactions with the element will not trigger route changes.
    @property disabled
    @private
  */
  disabled: computed({
    get(key, value) {
      return false;
    },
    set(key, value) {
      if (value !== undefined) { this.set('_isDisabled', value); }

      return value ? get(this, 'disabledClass') : false;
    }
  }),

  /**
    Accessed as a classname binding to apply the `LinkComponent`'s `activeClass`
    CSS `class` to the element when the link is active.

    A `LinkComponent` is considered active when its `currentWhen` property is `true`
    or the application's current route is the route the `LinkComponent` would trigger
    transitions into.

    The `currentWhen` property can match against multiple routes by separating
    route names using the ` ` (space) character.

    @property active
    @private
  */
  active: computed('attrs.params', '_routing.currentState', function computeLinkComponentActive() {
    var currentState = get(this, '_routing.currentState');
    if (!currentState) { return false; }

    return computeActive(this, currentState);
  }),

  willBeActive: computed('_routing.targetState', function() {
    var routing = get(this, '_routing');
    var targetState = get(routing, 'targetState');
    if (get(routing, 'currentState') === targetState) { return; }

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
    Event handler that invokes the link, activating the associated route.

    @private
    @method _invoke
    @param {Event} event
    @private
  */
  _invoke(event) {
    if (!isSimpleClick(event)) { return true; }

    if (this.attrs.preventDefault !== false) {
      var targetAttribute = this.attrs.target;
      if (!targetAttribute || targetAttribute === '_self') {
        event.preventDefault();
      }
    }

    if (this.attrs.bubbles === false) { event.stopPropagation(); }

    if (get(this, '_isDisabled')) { return false; }

    if (get(this, 'loading')) {
      Ember.Logger.warn("This link-to is in an inactive loading state because at least one of its parameters presently has a null/undefined value, or the provided route name is invalid.");
      return false;
    }

    var targetAttribute2 = this.attrs.target;
    if (targetAttribute2 && targetAttribute2 !== '_self') {
      return false;
    }

    get(this, '_routing').transitionTo(get(this, 'targetRouteName'), get(this, 'models'), get(this, 'queryParams.values'), get(this, 'attrs.replace'));
  },

  queryParams: null,

  /**
    Sets the element's `href` attribute to the url for
    the `LinkComponent`'s targeted route.

    If the `LinkComponent`'s `tagName` is changed to a value other
    than `a`, this property will be ignored.

    @property href
    @private
  */
  href: computed('models', 'targetRouteName', '_routing.currentState', function computeLinkComponentHref() {

    if (get(this, 'tagName') !== 'a') { return; }

    var targetRouteName = get(this, 'targetRouteName');
    var models = get(this, 'models');

    if (get(this, 'loading')) { return get(this, 'loadingHref'); }

    targetRouteName = this._handleOnlyQueryParamsSupplied(targetRouteName);

    var routing = get(this, '_routing');
    return routing.generateURL(targetRouteName, models, get(this, 'queryParams.values'));
  }),

  loading: computed('models', 'targetRouteName', function() {
    var targetRouteName = get(this, 'targetRouteName');
    var models = get(this, 'models');

    if (!modelsAreLoaded(models) || targetRouteName == null) {
      return get(this, 'loadingClass');
    }
  }),

  _handleOnlyQueryParamsSupplied(route) {
    var params = this.attrs.params.slice();
    var lastParam = params[params.length - 1];
    if (lastParam && lastParam.isQueryParams) {
      params.pop();
    }
    let onlyQueryParamsSupplied = (this.attrs.hasBlock ? params.length === 0 : params.length === 1);
    if (onlyQueryParamsSupplied) {
      var appController = this.container.lookup('controller:application');
      if (appController) {
        return get(appController, 'currentRouteName');
      }
    }
    return route;
  },

  /**
    The default href value to use while a link-to is loading.
    Only applies when tagName is 'a'

    @property loadingHref
    @type String
    @default #
    @private
  */
  loadingHref: '#',

  willRender() {
    var queryParams;

    var attrs = this.attrs;

    // Do not mutate params in place
    var params = attrs.params.slice();

    Ember.assert("You must provide one or more parameters to the link-to helper.", params.length);

    var lastParam = params[params.length - 1];

    if (lastParam && lastParam.isQueryParams) {
      queryParams = params.pop();
    } else {
      queryParams = {};
    }

    if (attrs.disabledClass) {
      this.set('disabledClass', attrs.disabledClass);
    }

    if (attrs.activeClass) {
      this.set('activeClass', attrs.activeClass);
    }

    if (attrs.disabledWhen) {
      this.set('disabled', attrs.disabledWhen);
    }

    var currentWhen = attrs['current-when'];

    if (attrs.currentWhen) {
      Ember.deprecate('Using currentWhen with {{link-to}} is deprecated in favor of `current-when`.', !attrs.currentWhen);
      currentWhen = attrs.currentWhen;
    }

    if (currentWhen) {
      this.set('currentWhen', currentWhen);
    }

    // TODO: Change to built-in hasBlock once it's available
    if (!attrs.hasBlock) {
      this.set('linkTitle', params.shift());
    }

    if (attrs.loadingClass) {
      set(this, 'loadingClass', attrs.loadingClass);
    }

    for (let i = 0; i < params.length; i++) {
      var value = params[i];

      while (ControllerMixin.detect(value)) {
        Ember.deprecate('Providing `{{link-to}}` with a param that is wrapped in a controller is deprecated. Please update `' + attrs.view + '` to use `{{link-to "post" someController.model}}` instead.');
        value = value.get('model');
      }

      params[i] = value;
    }

    let targetRouteName;
    let models = [];
    targetRouteName = this._handleOnlyQueryParamsSupplied(params[0]);

    for (let i = 1; i < params.length; i++) {
      models.push(params[i]);
    }

    let resolvedQueryParams = getResolvedQueryParams(queryParams, targetRouteName);

    this.set('targetRouteName', targetRouteName);
    this.set('models', models);
    this.set('queryParams', queryParams);
    this.set('resolvedQueryParams', resolvedQueryParams);
  }
});

LinkComponent.toString = function() { return "LinkComponent"; };

function computeActive(view, routerState) {
  if (get(view, 'loading')) { return false; }

  var currentWhen = get(view, 'currentWhen');
  var isCurrentWhenSpecified = !!currentWhen;
  currentWhen = currentWhen || get(view, 'targetRouteName');
  currentWhen = currentWhen.split(' ');
  for (var i = 0, len = currentWhen.length; i < len; i++) {
    if (isActiveForRoute(view, currentWhen[i], isCurrentWhenSpecified, routerState)) {
      return get(view, 'activeClass');
    }
  }

  return false;
}

function modelsAreLoaded(models) {
  for (var i=0, l=models.length; i<l; i++) {
    if (models[i] == null) { return false; }
  }

  return true;
}

function isActiveForRoute(view, routeName, isCurrentWhenSpecified, routerState) {
  var service = get(view, '_routing');
  return service.isActiveForRoute(get(view, 'models'), get(view, 'resolvedQueryParams'), routeName, routerState, isCurrentWhenSpecified);
}

function getResolvedQueryParams(queryParamsObject, targetRouteName) {
  var resolvedQueryParams = {};

  if (!queryParamsObject) { return resolvedQueryParams; }

  var values = queryParamsObject.values;
  for (var key in values) {
    if (!values.hasOwnProperty(key)) { continue; }
    resolvedQueryParams[key] = values[key];
  }

  return resolvedQueryParams;
}

/* DeprecatedLinkView - Start: TODO: Delete in Ember 2.0 */
var DeprecatedLinkView = LinkComponent.extend({
  init() {
    Ember.deprecate('Ember.LinkView is deprecated. Please use Ember.LinkComponent.', false);
    this._super.apply(this, arguments);
  }
});

DeprecatedLinkView.reopen = function reopenWithDeprecation() {
  Ember.deprecate('Ember.LinkView is deprecated. Please use Ember.LinkComponent.', false);

  return LinkComponent.reopen.apply(LinkComponent, arguments);
};

DeprecatedLinkView.reopenClass({
  extend: function () {
    Ember.deprecate('Ember.LinkView is deprecated. Please extend from Ember.LinkComponent.', false);
    return this._super.apply(this, arguments);
  }
});

export { DeprecatedLinkView };
/* DeprecatedLinkView - End*/

export default LinkComponent;
