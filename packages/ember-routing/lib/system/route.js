/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set,
    classify = Ember.String.classify,
    fmt = Ember.String.fmt;

/**
  The `Ember.Route` class is used to define individual routes. Refer to
  the [routing guide](http://emberjs.com/guides/routing/) for documentation.

  @class Route
  @namespace Ember
  @extends Ember.Object
*/
Ember.Route = Ember.Object.extend({
  /**
    @private

    @method exit
  */
  exit: function() {
    this.deactivate();
    teardownView(this);
  },

  /**
    @private

    @method enter
  */
  enter: function() {
    this.activate();
  },

  /**
    The collection of functions, keyed by name, available on this route as
    action targets.

    These functions will be invoked when a matching `{{action}}` is triggered
    from within a template and the application's current route is this route.

    Events can also be invoked from other parts of your application via `Route#send`
    or `Controller#send`.

    The context of the event will be this route.

    @see {Ember.Route#send}
    @see {Handlebars.helpers.action}

    @property events
    @type Hash
    @default null
  */
  events: null,

  /**
    This hook is executed when the router completely exits this route. It is
    not executed when the model for the route changes.

    @method deactivate
  */
  deactivate: Ember.K,

  /**
    This hook is executed when the router enters the route for the first time.
    It is not executed when the model for the route changes.

    @method activate
  */
  activate: Ember.K,

  /**
    Transition to another route via the `routeTo` event which
    will by default be handled by ApplicationRoute.
   
    @method routeTo
    @param {TransitionEvent} transitionEvent 
   */
  routeTo: function(transitionEvent) {
    this.router.routeTo(transitionEvent);
  },

  /**
    Transition into another route. Optionally supply a model for the
    route in question. The model will be serialized into the URL
    using the `serialize` hook.

    @method transitionTo
    @param {String} name the name of the route
    @param {...Object} models the
  */
  transitionTo: function(name, context) {
    var router = this.router;

    // If the transition is a no-op, just bail.
    if (router.isActive.apply(router, arguments)) {
      return;
    }

    if (this._checkingRedirect) { this._redirected[this._redirectDepth] = true; }
    return router.transitionTo.apply(router, arguments);
  },

  /**
    Transition into another route while replacing the current URL if
    possible. Identical to `transitionTo` in all other respects.

    @method replaceWith
    @param {String} name the name of the route
    @param {...Object} models the
  */
  replaceWith: function() {
    var router = this.router;

    // If the transition is a no-op, just bail.
    if (router.isActive.apply(router, arguments)) {
      return;
    }

    if (this._checkingRedirect) { this._redirected[this._redirectDepth] = true; }
    return this.router.replaceWith.apply(this.router, arguments);
  },

  send: function() {
    return this.router.send.apply(this.router, arguments);
  },

  /**
   @private

   Internal counter for tracking whether a route handler has
   called transitionTo or replaceWith inside its redirect hook.

  */
  _redirectDepth: 0,

  /**
    @private

    This hook is the entry point for router.js

    @method setup
  */
  setup: function(context) {
    // Determine if this is the top-most transition.
    // If so, we'll set up a data structure to track
    // whether `transitionTo` or replaceWith gets called
    // inside our `redirect` hook.
    //
    // This is necessary because we set a flag on the route
    // inside transitionTo/replaceWith to determine afterwards
    // if they were called, but `setup` can be called
    // recursively and we need to disambiguate where in the
    // call stack the redirect happened.

    // Are we the first call to setup? If so, set up the
    // redirect tracking data structure, and remember that
    // we're the top-most so we can clean it up later.
    var isTop;
    if (!this._redirected) {
      isTop = true;
      this._redirected = [];
    }

    // Set a flag on this route saying that we are interested in
    // tracking redirects, and increment the depth count.
    this._checkingRedirect = true;
    var depth = ++this._redirectDepth;

    // Check to see if context is set. This check preserves
    // the correct arguments.length inside the `redirect` hook.
    if (context === undefined) {
      this.redirect();
    } else {
      this.redirect(context);
    }

    // After the call to `redirect` returns, decrement the depth count.
    this._redirectDepth--;
    this._checkingRedirect = false;

    // Save off the data structure so we can reset it on the route but
    // still reference it later in this method.
    var redirected = this._redirected;

    // If this is the top `setup` call in the call stack, clear the
    // redirect tracking data structure.
    if (isTop) { this._redirected = null; }

    // If we were redirected, there is nothing left for us to do.
    // Returning false tells router.js not to continue calling setup
    // on any children route handlers.
    if (redirected[depth]) {
      return false;
    }

    var controller = this.controllerFor(this.routeName, context);

    if (controller) {
      set(this, 'controller', controller);
      set(controller, 'model', context);
    }

    if (this.setupControllers) {
      Ember.deprecate("Ember.Route.setupControllers is deprecated. Please use Ember.Route.setupController(controller, model) instead.");
      this.setupControllers(controller, context);
    } else {
      this.setupController(controller, context);
    }

    if (this.renderTemplates) {
      Ember.deprecate("Ember.Route.renderTemplates is deprecated. Please use Ember.Route.renderTemplate(controller, model) instead.");
      this.renderTemplates(context);
    } else {
      this.renderTemplate(controller, context);
    }
  },

  /**
    A hook you can implement to optionally redirect to another route.

    If you call `this.transitionTo` from inside of this hook, this route
    will not be entered in favor of the other hook.

    @method redirect
    @param {Object} model the model for this route
  */
  redirect: Ember.K,

  /**
    @private

    The hook called by `router.js` to convert parameters into the context
    for this handler. The public Ember hook is `model`.

    @method deserialize
  */
  deserialize: function(params) {
    var model = this.model(params);
    return this.currentModel = model;
  },

  /**
    @private

    Called when the context is changed by router.js.

    @method contextDidChange
  */
  contextDidChange: function() {
    this.currentModel = this.context;
  },

  /**
    A hook you can implement to convert the URL into the model for
    this route.

    ```js
    App.Router.map(function() {
      this.resource('post', {path: '/posts/:post_id'});
    });
    ```

    The model for the `post` route is `App.Post.find(params.post_id)`.

    By default, if your route has a dynamic segment ending in `_id`:

    * The model class is determined from the segment (`post_id`'s
      class is `App.Post`)
    * The find method is called on the model class with the value of
      the dynamic segment.

    Note that for routes with dynamic segments, this hook is only
    executed when entered via the URL. If the route is entered
    through a transition (e.g. when using the `linkTo` Handlebars
    helper), then a model context is already provided and this hook
    is not called. Routes without dynamic segments will always
    execute the model hook.

    @method model
    @param {Object} params the parameters extracted from the URL
  */
  model: function(params) {
    var match, name, sawParams, value;

    for (var prop in params) {
      if (match = prop.match(/^(.*)_id$/)) {
        name = match[1];
        value = params[prop];
      }
      sawParams = true;
    }

    if (!name && sawParams) { return params; }
    else if (!name) { return; }

    var className = classify(name),
        namespace = this.router.namespace,
        modelClass = namespace[className];

    Ember.assert("You used the dynamic segment " + name + "_id in your router, but " + namespace + "." + className + " did not exist and you did not override your route's `model` hook.", modelClass);
    return modelClass.find(value);
  },

  /**
    A hook you can implement to convert the route's model into parameters
    for the URL.

    ```js
    App.Router.map(function() {
      this.resource('post', {path: '/posts/:post_id'});
    });

    App.PostRoute = Ember.Route.extend({
      model: function(params) {
        // the server returns `{ id: 12 }`
        return jQuery.getJSON("/posts/" + params.post_id);
      },

      serialize: function(model) {
        // this will make the URL `/posts/12`
        return { post_id: model.id };
      }
    });
    ```

    The default `serialize` method inserts the model's `id` into the
    route's dynamic segment (in this case, `:post_id`).

    This method is called when `transitionTo` is called with a context
    in order to populate the URL.

    @method serialize
    @param {Object} model the route's model
    @param {Array} params an Array of parameter names for the current
      route (in the example, `['post_id']`.
    @return {Object} the serialized parameters
  */
  serialize: function(model, params) {
    if (params.length !== 1) { return; }

    var name = params[0], object = {};

    if (/_id$/.test(name)) {
      object[name] = get(model, 'id');
    } else {
      object[name] = model;
    }

    return object;
  },

  /**
    A hook you can use to setup the controller for the current route.

    This method is called with the controller for the current route and the
    model supplied by the `model` hook.

    ```js
    App.Router.map(function() {
      this.resource('post', {path: '/posts/:post_id'});
    });
    ```

    For the `post` route, the controller is `App.PostController`.

    By default, the `setupController` hook sets the `content` property of
    the controller to the `model`.

    If no explicit controller is defined, the route will automatically create
    an appropriate controller for the model:

    * if the model is an `Ember.Array` (including record arrays from Ember
      Data), the controller is an `Ember.ArrayController`.
    * otherwise, the controller is an `Ember.ObjectController`.

    This means that your template will get a proxy for the model as its
    context, and you can act as though the model itself was the context.

    @method setupController
  */
  setupController: Ember.K,

  /**
    Returns the controller for a particular route.

    ```js
    App.PostRoute = Ember.Route.extend({
      setupController: function(controller, post) {
        this._super(controller, post);
        this.controllerFor('posts').set('currentPost', post);
      }
    });
    ```

    By default, the controller for `post` is the shared instance of
    `App.PostController`.

    @method controllerFor
    @param {String} name the name of the route
    @param {Object} model the model associated with the route (optional)
    @return {Ember.Controller}
  */
  controllerFor: function(name, model) {
    var container = this.router.container,
        controller = container.lookup('controller:' + name);

    if (!controller) {
      model = model || this.modelFor(name);

      Ember.assert("You are trying to look up a controller that you did not define, and for which Ember does not know the model.\n\nThis is not a controller for a route, so you must explicitly define the controller ("+this.router.namespace.toString() + "." + Ember.String.capitalize(Ember.String.camelize(name))+"Controller) or pass a model as the second parameter to `controllerFor`, so that Ember knows which type of controller to create for you.", model || this.container.lookup('route:' + name));

      controller = Ember.generateController(container, name, model);
    }

    return controller;
  },

  /**
    Returns the current model for a given route.

    This is the object returned by the `model` hook of the route
    in question.

    @method modelFor
    @param {String} name the name of the route
    @return {Object} the model object
  */
  modelFor: function(name) {
    var route = this.container.lookup('route:' + name);
    return route && route.currentModel;
  },

  /**
    A hook you can use to render the template for the current route.

    This method is called with the controller for the current route and the
    model supplied by the `model` hook. By default, it renders the route's
    template, configured with the controller for the route.

    This method can be overridden to set up and render additional or
    alternative templates.

    @method renderTemplate
    @param {Object} controller the route's controller
    @param {Object} model the route's model
  */
  renderTemplate: function(controller, model) {
    this.render();
  },

  /**
    Renders a template into an outlet.

    This method has a number of defaults, based on the name of the
    route specified in the router.

    For example:

    ```js
    App.Router.map(function() {
      this.route('index');
      this.resource('post', {path: '/posts/:post_id'});
    });

    App.PostRoute = App.Route.extend({
      renderTemplate: function() {
        this.render();
      }
    });
    ```

    The name of the `PostRoute`, as defined by the router, is `post`.

    By default, render will:

    * render the `post` template
    * with the `post` view (`PostView`) for event handling, if one exists
    * and the `post` controller (`PostController`), if one exists
    * into the `main` outlet of the `application` template

    You can override this behavior:

    ```js
    App.PostRoute = App.Route.extend({
      renderTemplate: function() {
        this.render('myPost', {   // the template to render
          into: 'index',          // the template to render into
          outlet: 'detail',       // the name of the outlet in that template
          controller: 'blogPost'  // the controller to use for the template
        });
      }
    });
    ```

    Remember that the controller's `content` will be the route's model. In
    this case, the default model will be `App.Post.find(params.post_id)`.

    @method render
    @param {String} name the name of the template to render
    @param {Object} options the options
  */
  render: function(name, options) {
    Ember.assert("The name in the given arguments is undefined", arguments.length > 0 ? !Ember.isNone(arguments[0]) : true);

    if (typeof name === 'object' && !options) {
      options = name;
      name = this.routeName;
    }

    name = name ? name.replace(/\//g, '.') : this.routeName;

    var container = this.container,
        view = container.lookup('view:' + name),
        template = container.lookup('template:' + name);

    if (!view && !template) { return; }

    options = normalizeOptions(this, name, template, options);
    view = setupView(view, container, options);

    if (options.outlet === 'main') { this.lastRenderedTemplate = name; }

    appendView(this, view, options);
  },

  willDestroy: function() {
    teardownView(this);
  }
});

function parentRoute(route) {
  var handlerInfos = route.router.router.targetHandlerInfos;

  var parent, current;

  for (var i=0, l=handlerInfos.length; i<l; i++) {
    current = handlerInfos[i].handler;
    if (current === route) { return parent; }
    parent = current;
  }
}

function parentTemplate(route, isRecursive) {
  var parent = parentRoute(route), template;

  if (!parent) { return; }

  Ember.warn(fmt("The immediate parent route ('%@') did not render into the main outlet and the default 'into' option ('%@') may not be expected", [get(parent, 'routeName'), get(route, 'routeName')]), !isRecursive);

  if (template = parent.lastRenderedTemplate) {
    return template;
  } else {
    return parentTemplate(parent, true);
  }
}

function normalizeOptions(route, name, template, options) {
  options = options || {};
  options.into = options.into ? options.into.replace(/\//g, '.') : parentTemplate(route);
  options.outlet = options.outlet || 'main';
  options.name = name;
  options.template = template;

  Ember.assert("An outlet ("+options.outlet+") was specified but this view will render at the root level.", options.outlet === 'main' || options.into);

  var controller = options.controller, namedController;

  if (options.controller) {
    controller = options.controller;
  } else if (namedController = route.container.lookup('controller:' + name)) {
    controller = namedController;
  } else {
    controller = route.routeName;
  }

  if (typeof controller === 'string') {
    controller = route.container.lookup('controller:' + controller);
  }

  options.controller = controller;

  return options;
}

function setupView(view, container, options) {
  var defaultView = options.into ? 'view:default' : 'view:toplevel';

  view = view || container.lookup(defaultView);

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
    route.teardownView = teardownOutlet(parentView, options.outlet);
    parentView.connectOutlet(options.outlet, view);
  } else {
    var rootElement = get(route, 'router.namespace.rootElement');
    // tear down view if one is already rendered
    if (route.teardownView) {
      route.teardownView();
    }
    route.router._connectActiveView(options.name, view);
    route.teardownView = teardownTopLevel(view);
    view.appendTo(rootElement);
  }
}

function teardownTopLevel(view) {
  return function() { view.destroy(); };
}

function teardownOutlet(parentView, outlet) {
  return function() { parentView.disconnectOutlet(outlet); };
}

function teardownView(route) {
  if (route.teardownView) { route.teardownView(); }

  delete route.teardownView;
  delete route.lastRenderedTemplate;
}
