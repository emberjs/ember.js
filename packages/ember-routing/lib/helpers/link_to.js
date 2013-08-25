/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;

require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  var resolveParams = Ember.Router.resolveParams,
      isSimpleClick = Ember.ViewUtils.isSimpleClick;

  function fullRouteName(router, name) {
    if (!router.hasRoute(name)) {
      name = name + '.index';
    }

    return name;
  }

  function resolvedPaths(options) {
    var types = options.options.types.slice(1),
        data = options.options.data;

    return resolveParams(options.context, options.params, { types: types, data: data });
  }

  function createPath(path) {
    var fullPath = 'paramsContext';
    if (path !== '') {
      fullPath += '.' + path;
    }
    return fullPath;
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
  var LinkView = Ember.LinkView = Ember.View.extend({
    tagName: 'a',
    namedRoute: null,
    currentWhen: null,

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
    attributeBindings: ['href', 'title', 'rel'],
    classNameBindings: ['active', 'loading', 'disabled'],

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

    init: function() {
      this._super.apply(this, arguments);

      // Map desired event name to invoke function
      var eventName = get(this, 'eventName');
      this.on(eventName, this, this._invoke);

      var params = this.parameters.params,
          length = params.length,
          context = this.parameters.context,
          self = this,
          path, paths = Ember.A([]), i;

      set(this, 'paramsContext', context);

      for(i=0; i < length; i++) {
        paths.pushObject(createPath(params[i]));
      }

      var observer = function(object, path) {
        this.notifyPropertyChange('routeArgs');
      };

      for(i=0; i < length; i++) {
        this.registerObserver(this, paths[i], this, observer);
      }
    },

    /**
      @private

      Even though this isn't a virtual view, we want to treat it as if it is
      so that you can access the parent with {{view.prop}}

      @method concreteView
    **/
    concreteView: Ember.computed(function() {
      return get(this, 'parentView');
    }).property('parentView'),

    /**

      Accessed as a classname binding to apply the `LinkView`'s `disabledClass`
      CSS `class` to the element when the link is disabled.

      When `true` interactions with the element will not trigger route changes.
      @property disabled
    */
    disabled: Ember.computed(function(key, value) {
      if (value !== undefined) { this.set('_isDisabled', value); }

      return value ? this.get('disabledClass') : false;
    }),

    /**
      Accessed as a classname binding to apply the `LinkView`'s `activeClass`
      CSS `class` to the element when the link is active.

      A `LinkView` is considered active when its `currentWhen` property is `true`
      or the application's current route is the route the `LinkView` would trigger
      transitions into.

      @property active
    **/
    active: Ember.computed(function() {
      var router = get(this, 'router'),
          params = resolvedPaths(this.parameters),
          currentWhen = this.currentWhen || get(this, 'namedRoute'),
          currentWithIndex = currentWhen + '.index',
          isActive = router.isActive.apply(router, [currentWhen].concat(params)) ||
                     router.isActive.apply(router, [currentWithIndex].concat(params));

      if (isActive) { return get(this, 'activeClass'); }
    }).property('namedRoute', 'router.url'),

    loading: Ember.computed(function() {
      if (!get(this, 'routeArgs')) { return get(this, 'loadingClass'); }
    }).property('routeArgs'),

    /**
      Accessed as a classname binding to apply the `LinkView`'s `activeClass`
      CSS `class` to the element when the link is active.

      A `LinkView` is considered active when its `currentWhen` property is `true`
      or the application's current route is the route the `LinkView` would trigger
      transitions into.

      @property active
    **/

    router: Ember.computed(function() {
      return this.get('controller').container.lookup('router:main');
    }),

    /**
      @private

      Event handler that invokes the link, activating the associated route.

      @method _invoke
      @param {Event} event
    */
    _invoke: function(event) {
      if (!isSimpleClick(event)) { return true; }

      event.preventDefault();
      if (this.bubbles === false) { event.stopPropagation(); }

      if (get(this, '_isDisabled')) { return false; }

      if (get(this, 'loading')) {
        Ember.Logger.warn("This link-to is in an inactive loading state because at least one of its parameters' presently has a null/undefined value, or the provided route name is invalid.");
        return false;
      }

      var router = get(this, 'router'),
          routeArgs = get(this, 'routeArgs');

      if (this.get('replace')) {
        router.replaceWith.apply(router, routeArgs);
      } else {
        router.transitionTo.apply(router, routeArgs);
      }
    },

    routeArgs: Ember.computed(function() {

      var router = get(this, 'router'),
          namedRoute = get(this, 'namedRoute'), routeName;

      if (!namedRoute && this.namedRouteBinding) {
        // The present value of namedRoute is falsy, but since it's a binding
        // and could be valid later, don't treat as error.
        return;
      }
      namedRoute = fullRouteName(router, namedRoute);

      Ember.assert(fmt("The attempt to link-to route '%@' failed. The router did not find '%@' in its possible routes: '%@'", [namedRoute, namedRoute, Ember.keys(router.router.recognizer.names).join("', '")]), router.hasRoute(namedRoute));

      var resolvedContexts = resolvedPaths(this.parameters), paramsPresent = true;
      for (var i = 0, l = resolvedContexts.length; i < l; ++i) {
        var context = resolvedContexts[i];

        // If contexts aren't present, consider the linkView unloaded.
        if (context === null || typeof context === 'undefined') { return; }
      }

      return [ namedRoute ].concat(resolvedContexts);
    }).property('namedRoute'),

    /**
      Sets the element's `href` attribute to the url for
      the `LinkView`'s targeted route.

      If the `LinkView`'s `tagName` is changed to a value other
      than `a`, this property will be ignored.

      @property href
    **/
    href: Ember.computed(function() {
      if (this.get('tagName') !== 'a') { return false; }

      var router = get(this, 'router'),
          routeArgs = get(this, 'routeArgs');

      return routeArgs ? router.generate.apply(router, routeArgs) : get(this, 'loadingHref');
    }).property('routeArgs'),

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

  /**
    The `{{link-to}}` helper renders a link to the supplied
    `routeName` passing an optionally supplied model to the
    route as its `model` context of the route. The block
    for `{{link-to}}` becomes the innerHTML of the rendered
    element:

    ```handlebars
    {{#link-to 'photoGallery'}}
      Great Hamster Photos
    {{/link-to}}
    ```

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

    ### Handling `href`
    `{{link-to}}` will use your application's Router to
    fill the element's `href` property with a url that
    matches the path to the supplied `routeName` for your
    routers's configured `Location` scheme, which defaults
    to Ember.HashLocation.

    ### Handling current route
    `{{link-to}}` will apply a CSS class name of 'active'
    when the application's current route matches
    the supplied routeName. For example, if the application's
    current route is 'photoGallery.recent' the following
    use of `{{link-to}}`:

    ```handlebars
    {{#link-to 'photoGallery.recent'}}
      Great Hamster Photos from the last week
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
      Great Hamster Photos from the last week
    {{/link-to}}
    ```

    ```html
    <a href="/hamster-photos/this-week" class="current-url">
      Great Hamster Photos
    </a>
    ```

    To override this option for your entire application, see
    "Overriding Application-wide Defaults".

    ### Supplying a model
    An optional model argument can be used for routes whose
    paths contain dynamic segments. This argument will become
    the model context of the linked route:

    ```javascript
    App.Router.map(function() {
      this.resource("photoGallery", {path: "hamster-photos/:photo_id"});
    })
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
    App.Router.map(function() {
      this.resource("photoGallery", {path: "hamster-photos/:photo_id"}, function() {
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
    <a href="/hamster-photos/42/comment/718">
      A+++ would snuggle again.
    </a>
    ```

    ### Overriding Application-wide Defaults
    ``{{link-to}}`` creates an instance of Ember.LinkView
    for rendering. To override options for your entire
    application, reopen Ember.LinkView and supply the
    desired values:

    ``` javascript
    Ember.LinkView.reopen({
      activeClass: "is-active",
      tagName: 'li'
    })
    ```

    It is also possible to override the default event in
    this manner:

    ``` javascript
    Ember.LinkView.reopen({
      eventName: 'customEventName'
    });
    ```

    @method link-to
    @for Ember.Handlebars.helpers
    @param {String} routeName
    @param {Object} [context]*
    @return {String} HTML string
  */
  Ember.Handlebars.registerHelper('link-to', function(name) {
    var options = [].slice.call(arguments, -1)[0],
        params = [].slice.call(arguments, 1, -1);

    var hash = options.hash;

    if (options.types[0] === "ID") {
      if (Ember.ENV.HELPER_PARAM_LOOKUPS) {
        hash.namedRouteBinding = name;
      } else {
        Ember.deprecate("You provided a quoteless destination route parameter of " + name + " to the link-to helper. Soon, this will perform a property lookup, rather than be treated as a string. To get rid of this warning, wrap " + name + " in quotes. To opt in to this new behavior, set ENV.HELPER_PARAM_LOOKUPS = true");
        hash.namedRoute = name;
      }
    } else {
      hash.namedRoute = name;
    }

    hash.disabledBinding = hash.disabledWhen;

    hash.parameters = {
      context: this,
      options: options,
      params: params
    };

    return Ember.Handlebars.helpers.view.call(this, LinkView, options);
  });

  /**
    See `link-to`

    @method linkTo
    @for Ember.Handlebars.helpers
    @param {String} routeName
    @param {Object} [context]*
    @return {String} HTML string
  */
  Ember.Handlebars.registerHelper('linkTo', Ember.Handlebars.helpers['link-to']);
});


