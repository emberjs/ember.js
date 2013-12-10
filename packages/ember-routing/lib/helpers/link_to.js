/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;

require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  var resolveParams = Ember.Router.resolveParams,
      resolvePaths  = Ember.Router.resolvePaths,
      isSimpleClick = Ember.ViewUtils.isSimpleClick;

  function fullRouteName(router, name) {
    if (!router.hasRoute(name)) {
      name = name + '.index';
    }

    return name;
  }

  function getResolvedPaths(options) {

    var types = options.options.types,
        data = options.options.data;

    return resolvePaths(options.context, options.params, { types: types, data: data });
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

    /**
      By default the `{{link-to}}` helper will bind to the `href` and
      `title` attributes. It's discourage that you override these defaults,
      however you can push onto the array if needed.

      @property attributeBindings
      @type Array | String
      @default ['href', 'title', 'rel']
     **/
    attributeBindings: ['href', 'title', 'rel'],

    /**
      By default the `{{link-to}}` helper will bind to the `active`, `loading`, and
      `disabled` classes. It is discouraged to override these directly.

      @property classNameBindings
      @type Array
      @default ['active', 'loading', 'disabled']
     **/
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

    /**
      An overridable method called when LinkView objects are instantiated.

      Example:

      ```javascript
      App.MyLinkView = Ember.LinkView.extend({
        init: function() {
          this._super();
          Ember.Logger.log('Event is ' + this.get('eventName'));
        }
      });
      ```

      NOTE: If you do override `init` for a framework class like `Ember.View` or
      `Ember.ArrayController`, be sure to call `this._super()` in your
      `init` declaration! If you don't, Ember may not have an opportunity to
      do important setup work, and you'll see strange behavior in your
      application.

      @method init
    */
    init: function() {
      this._super.apply(this, arguments);

      // Map desired event name to invoke function
      var eventName = get(this, 'eventName');
      this.on(eventName, this, this._invoke);

      var helperParameters = this.parameters,
          templateContext = helperParameters.context,
          paths = getResolvedPaths(helperParameters),
          length = paths.length,
          path, i, normalizedPath;

      var linkTextPath = helperParameters.options.linkTextPath;
      if (linkTextPath) {
        normalizedPath = Ember.Handlebars.normalizePath(templateContext, linkTextPath, helperParameters.options.data);
        this.registerObserver(normalizedPath.root, normalizedPath.path, this, this.rerender);
      }

      for(i=0; i < length; i++) {
        path = paths[i];
        if (null === path) {
          // A literal value was provided, not a path, so nothing to observe.
          continue;
        }

        normalizedPath = Ember.Handlebars.normalizePath(templateContext, path, helperParameters.options.data);
        this.registerObserver(normalizedPath.root, normalizedPath.path, this, this._paramsChanged);
      }


      if (Ember.FEATURES.isEnabled("query-params")) {
        var queryParams = get(this, '_potentialQueryParams') || [];

        for(i=0; i < queryParams.length; i++) {
          this.registerObserver(this, queryParams[i], this, this._queryParamsChanged);
        }
      }
    },

    /**
      @private

      This method is invoked by observers installed during `init` that fire
      whenever the params change
      @method _paramsChanged
     */
    _paramsChanged: function() {
      this.notifyPropertyChange('resolvedParams');
    },


    /**
      @private

      This method is invoked by observers installed during `init` that fire
      whenever the query params change
     */
    _queryParamsChanged: function (object, path) {
      this.notifyPropertyChange('queryParams');
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
    disabled: Ember.computed(function computeLinkViewDisabled(key, value) {
      if (value !== undefined) { this.set('_isDisabled', value); }

      return value ? get(this, 'disabledClass') : false;
    }),

    /**
      Accessed as a classname binding to apply the `LinkView`'s `activeClass`
      CSS `class` to the element when the link is active.

      A `LinkView` is considered active when its `currentWhen` property is `true`
      or the application's current route is the route the `LinkView` would trigger
      transitions into.

      @property active
    **/
    active: Ember.computed(function computeLinkViewActive() {
      if (get(this, 'loading')) { return false; }

      var router = get(this, 'router'),
          routeArgs = get(this, 'routeArgs'),
          contexts = routeArgs.slice(1),
          resolvedParams = get(this, 'resolvedParams'),
          currentWhen = this.currentWhen || resolvedParams[0],
          currentWithIndex = currentWhen + '.index',
          isActive = router.isActive.apply(router, [currentWhen].concat(contexts)) ||
                     router.isActive.apply(router, [currentWithIndex].concat(contexts));

      if (isActive) { return get(this, 'activeClass'); }
    }).property('resolvedParams', 'routeArgs', 'router.url'),

    /**
      Accessed as a classname binding to apply the `LinkView`'s `loadingClass`
      CSS `class` to the element when the link is loading.

      A `LinkView` is considered loading when it has at least one
      parameter whose value is currently null or undefined. During
      this time, clicking the link will perform no transition and
      emit a warning that the link is still in a loading state.

      @property loading
    **/
    loading: Ember.computed(function computeLinkViewLoading() {
      if (!get(this, 'routeArgs')) { return get(this, 'loadingClass'); }
    }).property('routeArgs'),

    /**
      @private

      Returns the application's main router from the container.

      @property router
    **/
    router: Ember.computed(function() {
      return get(this, 'controller').container.lookup('router:main');
    }),

    /**
      @private

      Event handler that invokes the link, activating the associated route.

      @method _invoke
      @param {Event} event
    */
    _invoke: function(event) {
      if (!isSimpleClick(event)) { return true; }

      if (this.preventDefault !== false) { event.preventDefault(); }
      if (this.bubbles === false) { event.stopPropagation(); }

      if (get(this, '_isDisabled')) { return false; }

      if (get(this, 'loading')) {
        Ember.Logger.warn("This link-to is in an inactive loading state because at least one of its parameters presently has a null/undefined value, or the provided route name is invalid.");
        return false;
      }

      var router = get(this, 'router'),
          routeArgs = get(this, 'routeArgs');

      if (get(this, 'replace')) {
        router.replaceWith.apply(router, routeArgs);
      } else {
        router.transitionTo.apply(router, routeArgs);
      }
    },

    /**
      @private

      Computed property that returns the resolved parameters.

      @property
      @return {Array}
     */
    resolvedParams: Ember.computed(function() {
      var parameters = this.parameters,
          options = parameters.options,
          types = options.types,
          data = options.data;

      if (Ember.FEATURES.isEnabled("query-params")) {
        if (parameters.params.length === 0) {
          var appController = this.container.lookup('controller:application');
          return [get(appController, 'currentRouteName')];
        } else {
          return resolveParams(parameters.context, parameters.params, { types: types, data: data });
        }
      }

      // Original implementation if query params not enabled
      return resolveParams(parameters.context, parameters.params, { types: types, data: data });
    }).property(),

    /**
      @private

      Computed property that returns the current route name and
      any dynamic segments.

      @property
      @return {Array} An array with the route name and any dynamic segments
     */
    routeArgs: Ember.computed(function computeLinkViewRouteArgs() {
      var resolvedParams = get(this, 'resolvedParams').slice(0),
          router = get(this, 'router'),
          namedRoute = resolvedParams[0];

      if (!namedRoute) { return; }

      namedRoute = fullRouteName(router, namedRoute);
      resolvedParams[0] = namedRoute;

      Ember.assert(fmt("The attempt to link-to route '%@' failed. The router did not find '%@' in its possible routes: '%@'", [namedRoute, namedRoute, Ember.keys(router.router.recognizer.names).join("', '")]), router.hasRoute(namedRoute));

      for (var i = 1, len = resolvedParams.length; i < len; ++i) {
        var param = resolvedParams[i];
        if (param === null || typeof param === 'undefined') {
          // If contexts aren't present, consider the linkView unloaded.
          return;
        }
      }

      if (Ember.FEATURES.isEnabled("query-params")) {
        var queryParams = get(this, 'queryParams');

        if (queryParams || queryParams === false) { resolvedParams.push({queryParams: queryParams}); }
      }

      return resolvedParams;
    }).property('resolvedParams', 'queryParams', 'router.url'),


    _potentialQueryParams: Ember.computed(function () {
      var namedRoute = get(this, 'resolvedParams')[0];
      if (!namedRoute) { return null; }
      var router          = get(this, 'router');

      namedRoute = fullRouteName(router, namedRoute);

      return router.router.queryParamsForHandler(namedRoute);
    }).property('resolvedParams'),

    queryParams: Ember.computed(function () {
      var self              = this,
        queryParams         = null,
        allowedQueryParams  = get(this, '_potentialQueryParams');

      if (!allowedQueryParams) { return null; }
      allowedQueryParams.forEach(function (param) {
        var value = get(self, param);
        if (typeof value !== 'undefined') {
          queryParams = queryParams || {};
          queryParams[param] = value;
        }
      });


      return queryParams;
    }).property('_potentialQueryParams.[]'),

    /**
      Sets the element's `href` attribute to the url for
      the `LinkView`'s targeted route.

      If the `LinkView`'s `tagName` is changed to a value other
      than `a`, this property will be ignored.

      @property href
    **/
    href: Ember.computed(function computeLinkViewHref() {
      if (get(this, 'tagName') !== 'a') { return; }

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
    
    ### Disabling the `link-to` helper
    By default `{{link-to}}` is enabled. 
    any passed value to `disabled` helper property will disable the `link-to` helper.
     
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
    to ensure that only `true` disable the `link-to` helper you can
    override the global behaviour of `Ember.LinkView`.
         
    ```javascript  
    Ember.LinkView.reopen({
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

    ### Supplying an explicit dynamic segment value
    If you don't have a model object available to pass to `{{link-to}}`,
    an optional string or integer argument can be passed for routes whose
    paths contain dynamic segments. This argument will become the value
    of the dynamic segment:

    ```javascript
    App.Router.map(function() {
      this.resource("photoGallery", {path: "hamster-photos/:photo_id"});
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

   By default the `{{link-to}}` helper prevents the default browser action
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
    You can override any given property of the Ember.LinkView
    that is generated by the `{{link-to}}` helper by passing
    key/value pairs, like so:

    ```handlebars
    {{#link-to  aPhoto tagName='li' title='Following this link will change your life' classNames=['pic', 'sweet']}}
      Uh-mazing!
    {{/link-to}}
    ```

    See [Ember.LinkView](/api/classes/Ember.LinkView.html) for a
    complete list of overrideable properties. Be sure to also
    check out inherited properties of `LinkView`.

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
    @param [options] {Object} Handlebars key/value pairs of options, you can override any property of Ember.LinkView
    @return {String} HTML string
    @see {Ember.LinkView}
  */
  Ember.Handlebars.registerHelper('link-to', function(name) {
    var options = [].slice.call(arguments, -1)[0],
        params = [].slice.call(arguments, 0, -1),
        hash = options.hash;

    hash.disabledBinding = hash.disabledWhen;

    if (!options.fn) {
      var linkTitle = params.shift();
      var linkType = options.types.shift();
      var context = this;
      if (linkType === 'ID') {
        options.linkTextPath = linkTitle;
        options.fn = function() {
          return Ember.Handlebars.get(context, linkTitle, options);
        };
      } else {
        options.fn = function() {
          return linkTitle;
        };
      }
    }

    hash.parameters = {
      context: this,
      options: options,
      params: params
    };

    return Ember.Handlebars.helpers.view.call(this, LinkView, options);
  });

  /**
    See [link-to](/api/classes/Ember.Handlebars.helpers.html#method_link-to)

    @method linkTo
    @for Ember.Handlebars.helpers
    @deprecated
    @param {String} routeName
    @param {Object} [context]*
    @return {String} HTML string
  */
  Ember.Handlebars.registerHelper('linkTo', Ember.Handlebars.helpers['link-to']);
});


