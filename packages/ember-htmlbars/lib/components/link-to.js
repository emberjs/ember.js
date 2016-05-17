/**
@module ember
@submodule ember-templates
*/

/**
  The `{{link-to}}` component renders a link to the supplied
  `routeName` passing an optionally supplied model to the
  route as its `model` context of the route. The block
  for `{{link-to}}` becomes the innerHTML of the rendered
  element:

  ```handlebars
  {{#link-to 'photoGallery'}}
    Great Hamster Photos
  {{/link-to}}
  ```

  You can also use an inline form of `{{link-to}}` component by
  passing the link text as the first argument
  to the component:

  ```handlebars
  {{link-to 'Great Hamster Photos' 'photoGallery'}}
  ```

  Both will result in:

  ```html
  <a href="/hamster-photos">
    Great Hamster Photos
  </a>
  ```

  ### Supplying a tagName
  By default `{{link-to}}` renders an `<a>` element. This can
  be overridden for a single use of `{{link-to}}` by supplying
  a `tagName` option:

  ```handlebars
  {{#link-to 'photoGallery' tagName="li"}}
    Great Hamster Photos
  {{/link-to}}
  ```

  ```html
  <li>
    Great Hamster Photos
  </li>
  ```

  To override this option for your entire application, see
  "Overriding Application-wide Defaults".

  ### Disabling the `link-to` component
  By default `{{link-to}}` is enabled.
  any passed value to the `disabled` component property will disable
  the `link-to` component.

  static use: the `disabled` option:

  ```handlebars
  {{#link-to 'photoGallery' disabled=true}}
    Great Hamster Photos
  {{/link-to}}
  ```

  dynamic use: the `disabledWhen` option:

  ```handlebars
  {{#link-to 'photoGallery' disabledWhen=controller.someProperty}}
    Great Hamster Photos
  {{/link-to}}
  ```

  any passed value to `disabled` will disable it except `undefined`.
  to ensure that only `true` disable the `link-to` component you can
  override the global behaviour of `Ember.LinkComponent`.

  ```javascript
  Ember.LinkComponent.reopen({
    disabled: Ember.computed(function(key, value) {
      if (value !== undefined) {
        this.set('_isDisabled', value === true);
      }
      return value === true ? get(this, 'disabledClass') : false;
    })
  });
  ```

  see "Overriding Application-wide Defaults" for more.

  ### Handling `href`
  `{{link-to}}` will use your application's Router to
  fill the element's `href` property with a url that
  matches the path to the supplied `routeName` for your
  router's configured `Location` scheme, which defaults
  to Ember.HashLocation.

  ### Handling current route
  `{{link-to}}` will apply a CSS class name of 'active'
  when the application's current route matches
  the supplied routeName. For example, if the application's
  current route is 'photoGallery.recent' the following
  use of `{{link-to}}`:

  ```handlebars
  {{#link-to 'photoGallery.recent'}}
    Great Hamster Photos
  {{/link-to}}
  ```

  will result in

  ```html
  <a href="/hamster-photos/this-week" class="active">
    Great Hamster Photos
  </a>
  ```

  The CSS class name used for active classes can be customized
  for a single use of `{{link-to}}` by passing an `activeClass`
  option:

  ```handlebars
  {{#link-to 'photoGallery.recent' activeClass="current-url"}}
    Great Hamster Photos
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos/this-week" class="current-url">
    Great Hamster Photos
  </a>
  ```

  To override this option for your entire application, see
  "Overriding Application-wide Defaults".

  ### Keeping a link active for other routes

  If you need a link to be 'active' even when it doesn't match
  the current route, you can use the `current-when` argument.

  ```handlebars
  {{#link-to 'photoGallery' current-when='photos'}}
    Photo Gallery
  {{/link-to}}
  ```

  This may be helpful for keeping links active for:

  * non-nested routes that are logically related
  * some secondary menu approaches
  * 'top navigation' with 'sub navigation' scenarios

  A link will be active if `current-when` is `true` or the current
  route is the route this link would transition to.

  To match multiple routes 'space-separate' the routes:

  ```handlebars
  {{#link-to 'gallery' current-when='photos drawings paintings'}}
    Art Gallery
  {{/link-to}}
  ```

  ### Supplying a model
  An optional model argument can be used for routes whose
  paths contain dynamic segments. This argument will become
  the model context of the linked route:

  ```javascript
  Router.map(function() {
    this.route("photoGallery", {path: "hamster-photos/:photo_id"});
  });
  ```

  ```handlebars
  {{#link-to 'photoGallery' aPhoto}}
    {{aPhoto.title}}
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos/42">
    Tomster
  </a>
  ```

  ### Supplying multiple models
  For deep-linking to route paths that contain multiple
  dynamic segments, multiple model arguments can be used.
  As the router transitions through the route path, each
  supplied model argument will become the context for the
  route with the dynamic segments:

  ```javascript
  Router.map(function() {
    this.route("photoGallery", { path: "hamster-photos/:photo_id" }, function() {
      this.route("comment", {path: "comments/:comment_id"});
    });
  });
  ```
  This argument will become the model context of the linked route:

  ```handlebars
  {{#link-to 'photoGallery.comment' aPhoto comment}}
    {{comment.body}}
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos/42/comments/718">
    A+++ would snuggle again.
  </a>
  ```

  ### Supplying an explicit dynamic segment value
  If you don't have a model object available to pass to `{{link-to}}`,
  an optional string or integer argument can be passed for routes whose
  paths contain dynamic segments. This argument will become the value
  of the dynamic segment:

  ```javascript
  Router.map(function() {
    this.route("photoGallery", { path: "hamster-photos/:photo_id" });
  });
  ```

  ```handlebars
  {{#link-to 'photoGallery' aPhotoId}}
    {{aPhoto.title}}
  {{/link-to}}
  ```

  ```html
  <a href="/hamster-photos/42">
    Tomster
  </a>
  ```

  When transitioning into the linked route, the `model` hook will
  be triggered with parameters including this passed identifier.

  ### Allowing Default Action

 By default the `{{link-to}}` component prevents the default browser action
 by calling `preventDefault()` as this sort of action bubbling is normally
 handled internally and we do not want to take the browser to a new URL (for
 example).

 If you need to override this behavior specify `preventDefault=false` in
 your template:

  ```handlebars
  {{#link-to 'photoGallery' aPhotoId preventDefault=false}}
    {{aPhotoId.title}}
  {{/link-to}}
  ```

  ### Overriding attributes
  You can override any given property of the `Ember.LinkComponent`
  that is generated by the `{{link-to}}` component by passing
  key/value pairs, like so:

  ```handlebars
  {{#link-to  aPhoto tagName='li' title='Following this link will change your life' classNames='pic sweet'}}
    Uh-mazing!
  {{/link-to}}
  ```

  See [Ember.LinkComponent](/api/classes/Ember.LinkComponent.html) for a
  complete list of overrideable properties. Be sure to also
  check out inherited properties of `LinkComponent`.

  ### Overriding Application-wide Defaults
  ``{{link-to}}`` creates an instance of `Ember.LinkComponent`
  for rendering. To override options for your entire
  application, reopen `Ember.LinkComponent` and supply the
  desired values:

  ``` javascript
  Ember.LinkComponent.reopen({
    activeClass: "is-active",
    tagName: 'li'
  })
  ```

  It is also possible to override the default event in
  this manner:

  ``` javascript
  Ember.LinkComponent.reopen({
    eventName: 'customEventName'
  });
  ```

  @method link-to
  @for Ember.Templates.helpers
  @param {String} routeName
  @param {Object} [context]*
  @param [options] {Object} Handlebars key/value pairs of options, you can override any property of Ember.LinkComponent
  @return {String} HTML string
  @see {Ember.LinkComponent}
  @public
*/

/**
@module ember
@submodule ember-templates
*/

import Logger from 'ember-console';

import { assert, deprecate } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';
import { deprecatingAlias } from 'ember-runtime/computed/computed_macros';
import { isSimpleClick } from 'ember-views/system/utils';
import inject from 'ember-runtime/inject';
import 'ember-runtime/system/service'; // creates inject.service
import ControllerMixin from 'ember-runtime/mixins/controller';
import layout from '../templates/link-to';
import EmberComponent, { HAS_BLOCK } from '../component';

/**
  `Ember.LinkComponent` renders an element whose `click` event triggers a
  transition of the application's instance of `Ember.Router` to
  a supplied route by name.

  `Ember.LinkComponent` components are invoked with {{#link-to}}. Properties
  of this class can be overridden with `reopen` to customize application-wide
  behavior.

  @class LinkComponent
  @namespace Ember
  @extends Ember.Component
  @see {Ember.Templates.helpers.link-to}
  @private
**/
let LinkComponent = EmberComponent.extend({
  layout,

  tagName: 'a',

  /**
    @deprecated Use current-when instead.
    @property currentWhen
    @private
  */
  currentWhen: deprecatingAlias('current-when', { id: 'ember-routing-view.deprecated-current-when', until: '3.0.0' }),

  /**
    Used to determine when this `LinkComponent` is active.

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
    By default the `{{link-to}}` component will bind to the `href` and
    `title` attributes. It's discouraged that you override these defaults,
    however you can push onto the array if needed.

    @property attributeBindings
    @type Array | String
    @default ['title', 'rel', 'tabindex', 'target']
    @public
  */
  attributeBindings: ['href', 'title', 'rel', 'tabindex', 'target'],

  /**
    By default the `{{link-to}}` component will bind to the `active`, `loading`,
    and `disabled` classes. It is discouraged to override these directly.

    @property classNameBindings
    @type Array
    @default ['active', 'loading', 'disabled', 'ember-transitioning-in', 'ember-transitioning-out']
    @public
  */
  classNameBindings: ['active', 'loading', 'disabled', 'transitioningIn', 'transitioningOut'],

  /**
    By default the `{{link-to}}` component responds to the `click` event. You
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
    An overridable method called when `LinkComponent` objects are instantiated.

    Example:

    ```javascript
    App.MyLinkComponent = Ember.LinkComponent.extend({
      init: function() {
        this._super(...arguments);
        Ember.Logger.log('Event is ' + this.get('eventName'));
      }
    });
    ```

    NOTE: If you do override `init` for a framework class like `Ember.View`,
    be sure to call `this._super(...arguments)` in your
    `init` declaration! If you don't, Ember may not have an opportunity to
    do important setup work, and you'll see strange behavior in your
    application.

    @method init
    @private
  */
  init() {
    this._super(...arguments);

    // Map desired event name to invoke function
    let eventName = get(this, 'eventName');
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

  _computeActive(routerState) {
    if (get(this, 'loading')) { return false; }

    let routing = get(this, '_routing');
    let models = get(this, 'models');
    let resolvedQueryParams = get(this, 'resolvedQueryParams');

    let currentWhen = get(this, 'current-when');
    let isCurrentWhenSpecified = !!currentWhen;
    currentWhen = currentWhen || get(this, 'qualifiedRouteName');
    currentWhen = currentWhen.split(' ');

    for (let i = 0; i < currentWhen.length; i++) {
      if (routing.isActiveForRoute(models, resolvedQueryParams, currentWhen[i], routerState, isCurrentWhenSpecified)) {
        return get(this, 'activeClass');
      }
    }

    return false;
  },

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
  active: computed('attrs.params', '_routing.currentState', function computeLinkToComponentActive() {
    let currentState = get(this, '_routing.currentState');
    if (!currentState) { return false; }

    return this._computeActive(currentState);
  }),

  willBeActive: computed('_routing.targetState', function computeLinkToComponentWillBeActive() {
    let routing = get(this, '_routing');
    let targetState = get(routing, 'targetState');
    if (get(routing, 'currentState') === targetState) { return; }

    return !!this._computeActive(targetState);
  }),

  transitioningIn: computed('active', 'willBeActive', function computeLinkToComponentTransitioningIn() {
    let willBeActive = get(this, 'willBeActive');
    if (typeof willBeActive === 'undefined') { return false; }

    return !get(this, 'active') && willBeActive && 'ember-transitioning-in';
  }),

  transitioningOut: computed('active', 'willBeActive', function computeLinkToComponentTransitioningOut() {
    let willBeActive = get(this, 'willBeActive');
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

    let preventDefault = get(this, 'preventDefault');
    let targetAttribute = get(this, 'target');

    if (preventDefault !== false) {
      if (!targetAttribute || targetAttribute === '_self') {
        event.preventDefault();
      }
    }

    if (get(this, 'bubbles') === false) { event.stopPropagation(); }

    if (get(this, '_isDisabled')) { return false; }

    if (get(this, 'loading')) {
      Logger.warn('This link-to is in an inactive loading state because at least one of its parameters presently has a null/undefined value, or the provided route name is invalid.');
      return false;
    }

    if (targetAttribute && targetAttribute !== '_self') {
      return false;
    }

    let routing = get(this, '_routing');
    let qualifiedRouteName = get(this, 'qualifiedRouteName');
    let models = get(this, 'models');
    let queryParamValues = get(this, 'queryParams.values');
    let shouldReplace = get(this, 'replace');

    routing.transitionTo(qualifiedRouteName, models, queryParamValues, shouldReplace);
  },

  queryParams: null,

  qualifiedRouteName: computed('targetRouteName', '_routing.currentState', function computeLinkToComponentQualifiedRouteName() {
    let params = get(this, 'params').slice();
    let lastParam = params[params.length - 1];
    if (lastParam && lastParam.isQueryParams) {
      params.pop();
    }
    let onlyQueryParamsSupplied = (this[HAS_BLOCK] ? params.length === 0 : params.length === 1);
    if (onlyQueryParamsSupplied) {
      return get(this, '_routing.currentRouteName');
    }
    return get(this, 'targetRouteName');
  }),

  resolvedQueryParams: computed('queryParams', function computeLinkToComponentResolvedQueryParams() {
    let resolvedQueryParams = {};
    let queryParams = get(this, 'queryParams');

    if (!queryParams) { return resolvedQueryParams; }

    let values = queryParams.values;
    for (let key in values) {
      if (!values.hasOwnProperty(key)) { continue; }
      resolvedQueryParams[key] = values[key];
    }

    return resolvedQueryParams;
  }),

  /**
    Sets the element's `href` attribute to the url for
    the `LinkComponent`'s targeted route.

    If the `LinkComponent`'s `tagName` is changed to a value other
    than `a`, this property will be ignored.

    @property href
    @private
  */
  href: computed('models', 'qualifiedRouteName', function computeLinkToComponentHref() {
    if (get(this, 'tagName') !== 'a') { return; }

    let qualifiedRouteName = get(this, 'qualifiedRouteName');
    let models = get(this, 'models');

    if (get(this, 'loading')) { return get(this, 'loadingHref'); }

    let routing = get(this, '_routing');
    let queryParams = get(this, 'queryParams.values');
    return routing.generateURL(qualifiedRouteName, models, queryParams);
  }),

  loading: computed('_modelsAreLoaded', 'qualifiedRouteName', function computeLinkToComponentLoading() {
    let qualifiedRouteName = get(this, 'qualifiedRouteName');
    let modelsAreLoaded = get(this, '_modelsAreLoaded');

    if (!modelsAreLoaded || qualifiedRouteName == null) {
      return get(this, 'loadingClass');
    }
  }),

  _modelsAreLoaded: computed('models', function computeLinkToComponentModelsAreLoaded() {
    let models = get(this, 'models');
    for (let i = 0; i < models.length; i++) {
      if (models[i] == null) { return false; }
    }

    return true;
  }),

  _getModels(params) {
    let modelCount = params.length - 1;
    let models = new Array(modelCount);

    for (let i = 0; i < modelCount; i++) {
      let value = params[i + 1];

      while (ControllerMixin.detect(value)) {
        deprecate(
          'Providing `{{link-to}}` with a param that is wrapped in a controller is deprecated. ' +
            (this.parentView ? 'Please update `' + this.parentView + '` to use `{{link-to "post" someController.model}}` instead.' : ''),
          false,
          { id: 'ember-routing-views.controller-wrapped-param', until: '3.0.0' }
        );
        value = value.get('model');
      }

      models[i] = value;
    }

    return models;
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
    let queryParams;

    // Do not mutate params in place
    let params = get(this, 'params').slice();

    assert('You must provide one or more parameters to the link-to component.', params.length);

    let disabledWhen = get(this, 'disabledWhen');
    if (disabledWhen !== undefined) {
      this.set('disabled', disabledWhen);
    }

    // Process the positional arguments, in order.
    // 1. Inline link title comes first, if present.
    if (!this[HAS_BLOCK]) {
      this.set('linkTitle', params.shift());
    }

    // 2. `targetRouteName` is now always at index 0.
    this.set('targetRouteName', params[0]);

    // 3. The last argument (if still remaining) is the `queryParams` object.
    let lastParam = params[params.length - 1];

    if (lastParam && lastParam.isQueryParams) {
      queryParams = params.pop();
    } else {
      queryParams = {};
    }
    this.set('queryParams', queryParams);

    // 4. Any remaining indices (excepting `targetRouteName` at 0) are `models`.
    if (params.length > 1) {
      this.set('models', this._getModels(params));
    } else {
      this.set('models', []);
    }
  }
});

LinkComponent.toString = function() { return 'LinkComponent'; };

LinkComponent.reopenClass({
  positionalParams: 'params'
});

export default LinkComponent;
