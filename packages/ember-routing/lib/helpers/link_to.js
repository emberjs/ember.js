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

  function args(linkView, router, route) {
    var passedRouteName = route || linkView.namedRoute, routeName;

    routeName = fullRouteName(router, passedRouteName);

    Ember.assert(fmt("The attempt to linkTo route '%@' failed. The router did not find '%@' in its possible routes: '%@'", [passedRouteName, passedRouteName, Ember.keys(router.router.recognizer.names).join("', '")]), router.hasRoute(routeName));

    var ret = [ routeName ];
    return ret.concat(resolvedPaths(linkView.parameters));
  }

  /**
    @class LinkView
    @namespace Ember
    @extends Ember.View
  **/
  var LinkView = Ember.LinkView = Ember.View.extend({
    tagName: 'a',
    namedRoute: null,
    currentWhen: null,
    title: null,
    activeClass: 'active',
    disabledClass: 'disabled',
    _isDisabled: false,
    replace: false,
    attributeBindings: ['href', 'title'],
    classNameBindings: ['active', 'disabled'],
    eventName: 'click',

    init: function() {
      this._super();
      // Map desired event name to invoke function
      var eventName = get(this, 'eventName');
      this.on(eventName, this, this._invoke);
    },

    // Even though this isn't a virtual view, we want to treat it as if it is
    // so that you can access the parent with {{view.prop}}
    concreteView: Ember.computed(function() {
      return get(this, 'parentView');
    }).property('parentView'),

    disabled: Ember.computed(function(key, value) {
      if (value !== undefined) { this.set('_isDisabled', value); }
      
      return value ? this.get('disabledClass') : false;
    }),

    active: Ember.computed(function() {
      var router = this.get('router'),
          params = resolvedPaths(this.parameters),
          currentWithIndex = this.currentWhen + '.index',
          isActive = router.isActive.apply(router, [this.currentWhen].concat(params)) ||
                     router.isActive.apply(router, [currentWithIndex].concat(params));

      if (isActive) { return get(this, 'activeClass'); }
    }).property('namedRoute', 'router.url'),

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

      var router = this.get('router');

      if (Ember.ENV.ENABLE_ROUTE_TO) {

        var routeArgs = args(this, router);

        router.routeTo(Ember.TransitionEvent.create({
          transitionMethod: this.get('replace') ? 'replaceWith' : 'transitionTo',
          destinationRouteName: routeArgs[0],
          contexts: routeArgs.slice(1)
        }));
      } else {
        if (this.get('replace')) {
          router.replaceWith.apply(router, args(this, router));
        } else {
          router.transitionTo.apply(router, args(this, router));
        }
      }
    },

    href: Ember.computed(function() {
      if (this.get('tagName') !== 'a') { return false; }

      var router = this.get('router');
      return router.generate.apply(router, args(this, router));
    })
  });

  LinkView.toString = function() { return "LinkView"; };

  /**
    The `{{linkTo}}` helper renders a link to the supplied
    `routeName` passing an optionally supplied model to the
    route as its `model` context of the route. The block
    for `{{linkTo}}` becomes the innerHTML of the rendered
    element:

    ```handlebars
    {{#linkTo photoGallery}}
      Great Hamster Photos
    {{/linkTo}}
    ```

    ```html
    <a href="/hamster-photos">
      Great Hamster Photos
    </a>
    ```

    ### Supplying a tagName
    By default `{{linkTo}}` renders an `<a>` element. This can
    be overridden for a single use of `{{linkTo}}` by supplying
    a `tagName` option:

    ```handlebars
    {{#linkTo photoGallery tagName="li"}}
      Great Hamster Photos
    {{/linkTo}}
    ```

    ```html
    <li>
      Great Hamster Photos
    </li>
    ```

    To override this option for your entire application, see 
    "Overriding Application-wide Defaults".

    ### Handling `href`
    `{{linkTo}}` will use your application's Router to
    fill the element's `href` property with a url that
    matches the path to the supplied `routeName` for your
    routers's configured `Location` scheme, which defaults
    to Ember.HashLocation.

    ### Handling current route
    `{{linkTo}}` will apply a CSS class name of 'active'
    when the application's current route matches
    the supplied routeName. For example, if the application's
    current route is 'photoGallery.recent' the following
    use of `{{linkTo}}`:

    ```handlebars
    {{#linkTo photoGallery.recent}}
      Great Hamster Photos from the last week
    {{/linkTo}}
    ```

    will result in

    ```html
    <a href="/hamster-photos/this-week" class="active">
      Great Hamster Photos
    </a>
    ```

    The CSS class name used for active classes can be customized
    for a single use of `{{linkTo}}` by passing an `activeClass`
    option:

    ```handlebars
    {{#linkTo photoGallery.recent activeClass="current-url"}}
      Great Hamster Photos from the last week
    {{/linkTo}}
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
    App.Router.map(function(){
      this.resource("photoGallery", {path: "hamster-photos/:photo_id"});
    })
    ```

    ```handlebars
    {{#linkTo photoGallery aPhoto}}
      {{aPhoto.title}}
    {{/linkTo}}
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
    App.Router.map(function(){
      this.resource("photoGallery", {path: "hamster-photos/:photo_id"}, function(){
        this.route("comment", {path: "comments/:comment_id"});
      });
    });
    ```
    This argument will become the model context of the linked route:

    ```handlebars
    {{#linkTo photoGallery.comment aPhoto comment}}
      {{comment.body}}
    {{/linkTo}}
    ```

    ```html
    <a href="/hamster-photos/42/comment/718">
      A+++ would snuggle again.
    </a>
    ```

    ### Overriding Application-wide Defaults
    ``{{linkTo}}`` creates an instance of Ember.LinkView
    for rendering. To override options for your entire
    application, reopen Ember.LinkView and supply the
    desired values:

    ``` javascript
    Ember.LinkView.reopen({
      activeClass: "is-active",
      tagName: 'li'
    })
    ```

    @method linkTo
    @for Ember.Handlebars.helpers
    @param {String} routeName
    @param {Object} [context]*
    @return {String} HTML string
  */
  Ember.Handlebars.registerHelper('linkTo', function(name) {
    var options = [].slice.call(arguments, -1)[0];
    var params = [].slice.call(arguments, 1, -1);

    var hash = options.hash;

    hash.namedRoute = name;
    hash.currentWhen = hash.currentWhen || name;
    hash.disabledBinding = hash.disabledWhen;

    hash.parameters = {
      context: this,
      options: options,
      params: params
    };

    return Ember.Handlebars.helpers.view.call(this, LinkView, options);
  });

});

