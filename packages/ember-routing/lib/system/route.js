var get = Ember.get, set = Ember.set,
    classify = Ember.String.classify,
    decamelize = Ember.String.decamelize;


Ember.Route = Ember.Object.extend({
  /**
    Transition into another route. Optionally supply a model for the
    route in question. The model will be serialized into the URL
    using the `serialize` hook.

    @method transitionTo
    @param {String} name the name of the route
    @param {...Object} models the
  */
  transitionTo: function() {
    this.transitioned = true;
    return this.router.transitionTo.apply(this.router, arguments);
  },

  /**
    @private

    This hook is the entry point for router.js

    @method setup
  */
  setup: function(context) {
    var container = this.container;

    this.transitioned = false;
    this.redirect(context);

    if (this.transitioned) { return; }

    var templateName = this.templateName,
        controller = container.lookup('controller:' + templateName);

    if (!controller) {
      if (context && Ember.isArray(context)) {
        controller = Ember.ArrayController.extend({ content: context });
      } else if (context) {
        controller = Ember.ObjectController.extend({ content: context });
      } else {
        controller = Ember.Controller.extend();
      }

      container.register('controller', templateName, controller);
      controller = container.lookup('controller:' + templateName);
    }

    this.setupControllers(controller, context);
    this.renderTemplates(context);
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
    A hook you can implement to convert the URL into the model for
    this route.

    ```js
    App.Route.map(function(match) {
      match("/posts/:post_id").to("post");
    });
    ```

    The model for the `post` route is `App.Post.find(params.post_id)`.

    By default, if your route has a dynamic segment ending in `_id`:

    * The model class is determined from the segment (`post_id`'s
      class is `App.Post`)
    * The find method is called on the model class with the value of
      the dynamic segment.

    @method model
    @param {Object} params the parameters extracted from the URL
  */
  model: function(params) {
    var match, name, value;

    for (var prop in params) {
      if (match = prop.match(/^(.*)_id$/)) {
        name = match[1];
        value = params[prop];
      }
    }

    if (!name) { return; }

    var className = classify(name),
        namespace = this.router.namespace,
        modelClass = namespace[className];

    Ember.assert("You used the dynamic segment " + name + "_id in your router, but " + namespace + "." + className + " did not exist and you did not override your state's `model` hook.", modelClass);
    return modelClass.find(value);
  },

  /**
    A hook you can implement to convert the route's model into parameters
    for the URL.

    ```js
    App.Route.map(function(match) {
      match("/posts/:post_id").to("post");
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
    object[name] = get(model, 'id');

    return object;
  },

  /**
    A hook you can use to setup the necessary controllers for the current
    route.

    This method is called with the controller for the current route and the
    model supplied by the `model` hook.

    ```js
    App.Route.map(function(match) {
      match("/posts/:post_id").to("post");
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

    @method setupControllers
  */
  setupControllers: function(controller, model) {
    if (controller) {
      controller.set('content', model);
    }
  },

  /**
    Returns the controller for a particular route.

    ```js
    App.PostRoute = Ember.Route.extend({
      setupControllers: function(controller, post) {
        this._super(controller, post);
        this.controllerFor('posts').set('currentPost', post);
      }
    });
    ```

    By default, the controller for `post` is the shared instance of
    `App.PostController`.

    @method controllerFor
    @param {String} name the name of the route
    @return {Ember.Controller}
  */
  controllerFor: function(name) {
    return this.container.lookup('controller:' + name);
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
    return this.container.lookup('route:' + name).currentModel;
  },

  renderTemplates: function(context) {
    this.render();
  },

  /**
    Renders a template into an outlet.

    This method has a number of defaults, based on the name of the
    route specified in the router.

    For example:

    ```js
    App.Router.map(function(match) {
      match("/").to("index");
      match("/posts/:post_id").to("post");
    });

    App.PostRoute = App.Route.extend({
      renderTemplates: function() {
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
      renderTemplates: function() {
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
    if (typeof name === 'object' && !options) {
      options = name;
      name = this.templateName;
    }

    name = name || this.templateName;

    var container = this.container,
        view = container.lookup('view:' + name),
        template = container.lookup('template:' + name);

    if (!view && !template) { return; }

    options = normalizeOptions(this, name, template, options);
    view = setupView(view, container, options);

    if (name === 'application') {
      appendApplicationView(this, view);
    } else {
      appendView(this, view, options);
    }
  }
});

function normalizeOptions(route, name, template, options) {
  options = options || {};
  options.into = options.into || 'application';
  options.outlet = options.outlet || 'main';
  options.name = name;
  options.template = template;

  var controller = options.controller || route.templateName;

  if (typeof controller === 'string') {
    controller = route.container.lookup('controller:' + controller);
  }

  options.controller = controller;

  return options;
}

function setupView(view, container, options) {
  var containerView;

  view = view || container.lookup('view:default');

  set(view, 'template', options.template);
  set(view, 'viewName', options.name);
  set(view, 'controller', options.controller);

  return view;
}

function appendApplicationView(route, view) {
  var rootElement = get(route, 'router.namespace.rootElement');
  route.router._connectActiveView('application', view);
  view.appendTo(rootElement);
}

function appendView(route, view, options) {
  var parentView = route.router._lookupActiveView(options.into);
  parentView.connectOutlet(options.outlet, view);
}
