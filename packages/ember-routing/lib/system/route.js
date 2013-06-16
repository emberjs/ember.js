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

    ## Bubbling

    By default, an event will stop bubbling once a handler defined
    on the `events` hash handles it. To continue bubbling the event,
    you must return `true` from the handler.

    ## Built-in events

    There are a few built-in events pertaining to transitions that you
    can use to customize transition behavior: `willTransition` and
    `error`.

    ### `willTransition`

    The `willTransition` event is fired at the beginning of any
    attempted transition with a `Transition` object as the sole
    argument. This event can be used for aborting, redirecting,
    or decorating the transition from the currently active routes.

    A good example is preventing navigation when a form is
    half-filled out:

    ```js
    App.ContactFormRoute = Ember.Route.extend({
      events: {
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
    subsequent `willTransition` events to fire for the redirecting
    transition, you must first explicitly call
    `transition.abort()`.

    ### `error`

    When attempting to transition into a route, any of the hooks
    may throw an error, or return a promise that rejects, at which
    point an `error` event will be fired on the partially-entered
    routes, allowing for per-route error handling logic, or shared
    error handling logic defined on a parent route. 
    
    Here is an example of an error handler that will be invoked
    for rejected promises / thrown errors from the various hooks
    on the route, as well as any unhandled errors from child
    routes:

    ```js
    App.AdminRoute = Ember.Route.extend({
      beforeModel: function() {
        throw "bad things!";
        // ...or, equivalently:
        return Ember.RSVP.reject("bad things!");
      },

      events: {
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

    `error` events that bubble up all the way to `ApplicationRoute` 
    will fire a default error handler that logs the error. You can
    specify your own global default error handler by overriding the 
    `error` handler on `ApplicationRoute`:

    ```js
    App.ApplicationRoute = Ember.Route.extend({
      events: {
        error: function(error, transition) {
          this.controllerFor('banner').displayError(error.message);
        }
      }
    });
    ```

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
    Transition into another route. Optionally supply a model for the
    route in question. The model will be serialized into the URL
    using the `serialize` hook.

    @method transitionTo
    @param {String} name the name of the route
    @param {...Object} models the
  */
  transitionTo: function(name, context) {
    var router = this.router;
    return router.transitionTo.apply(router, arguments);
  },

  /**
    Transition into another route while replacing the current URL if
    possible. Identical to `transitionTo` in all other respects.

    Of the bundled location types, only `history` currently supports
    this behavior.

    @method replaceWith
    @param {String} name the name of the route
    @param {...Object} models the
  */
  replaceWith: function() {
    var router = this.router;
    return this.router.replaceWith.apply(this.router, arguments);
  },

  send: function() {
    return this.router.send.apply(this.router, arguments);
  },

  /**
    @private

    This hook is the entry point for router.js

    @method setup
  */
  setup: function(context) {
    var controller = this.controllerFor(this.routeName, context);

    // Assign the route's controller so that it can more easily be
    // referenced in event handlers
    this.controller = controller;

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
    @deprecated

    A hook you can implement to optionally redirect to another route.

    If you call `this.transitionTo` from inside of this hook, this route
    will not be entered in favor of the other hook.

    This hook is deprecated in favor of using the `afterModel` hook
    for performing redirects after the model has resolved.

    @method redirect
    @param {Object} model the model for this route
  */
  redirect: Ember.K,

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

    ```js
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

    ```js
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
            // or
            throw e;
          });
        }
      }
    });
    ```

    @param {Transition} transition 
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not 
      utilized in any way.
  */
  beforeModel: Ember.K,

  /**
    This hook is called after this route's model has resolved.
    It follows identical async/promise semantics to `beforeModel` 
    but is provided the route's resolved model in addition to 
    the `transition`, and is therefore suited to performing
    logic that can only take place after the model has already
    resolved.

    ```js
    App.PostRoute = Ember.Route.extend({
      afterModel: function(posts, transition) {
        if (posts.length === 1) {
          this.transitionTo('post.show', posts[0]);
        }
      }
    });
    ```

    Refer to documentation for `beforeModel` for a description
    of transition-pausing semantics when a promise is returned
    from this hook. 

    @param {Transition} transition 
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not 
      utilized in any way.
   */
  afterModel: function(resolvedModel, transition) {
    this.redirect(resolvedModel, transition);
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

    This hook follows the asynchronous/promise semantics
    described in the documentation for `beforeModel`. In particular,
    if a promise returned from `model` fails, the error will be 
    handled by the `error` hook on `Ember.Route`.

    @method model
    @param {Object} params the parameters extracted from the URL
  */
  model: function(params, resolvedParentModels) {
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

    By default, the `setupController` hook sets the `content` property of
    the controller to the `model`.

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

    ```js
    App.Router.map(function() {
      this.resource('post', {path: '/posts/:post_id'});
    });
    ```

    For the `post` route, a controller named `App.PostController` would
    be used if it is defined. If it is not defined, an `Ember.ObjectController`
    instance would be used.

    @method setupController
  */
  setupController: function(controller, context){
    if (controller && (context !== undefined)) {
      set(controller, 'model', context);
    }
  },

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

    // If we are mid-transition, we want to try and look up
    // resolved parent contexts on the current transitionEvent.
    var transition = this.router.router.activeTransition;
    if (transition) {
      return transition.resolvedModels[name];
    }

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

    if (!view && !template) {
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

  willDestroy: function() {
    teardownView(this);
  }
});

function parentRoute(route) {
  var handlerInfos = route.router.router.targetHandlerInfos;

  if (!handlerInfos) { return; }

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
  options.LOG_VIEW_LOOKUPS = get(route.router, 'namespace.LOG_VIEW_LOOKUPS');

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
