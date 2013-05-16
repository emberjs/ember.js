/**
@module ember
@submodule ember-old-router
*/

var get = Ember.get, set = Ember.set;

/**
  An instance of `Ember.Application` is the starting point for every Ember
  application. It helps to instantiate, initialize and coordinate the many
  objects that make up your app.

  Each Ember app has one and only one `Ember.Application` object. In fact, the
  very first thing you should do in your application is create the instance:

  ```javascript
  window.App = Ember.Application.create();
  ```

  Typically, the application object is the only global variable. All other
  classes in your app should be properties on the `Ember.Application` instance,
  which highlights its first role: a global namespace.

  For example, if you define a view class, it might look like this:

  ```javascript
  App.MyView = Ember.View.extend();
  ```

  Calling `Ember.Application.create()` will automatically initialize your
  application by calling the `Ember.Application.initialize()` method. If you
  need to delay initialization, you can pass `{autoinit: false}` to the
  `Ember.Application.create()` method, and call `App.initialize()`
  later.

  Because `Ember.Application` inherits from `Ember.Namespace`, any classes
  you create will have useful string representations when calling `toString()`.
  See the `Ember.Namespace` documentation for more information.

  While you can think of your `Ember.Application` as a container that holds the
  other classes in your application, there are several other responsibilities
  going on under-the-hood that you may want to understand.

  ### Event Delegation

  Ember uses a technique called _event delegation_. This allows the framework
  to set up a global, shared event listener instead of requiring each view to
  do it manually. For example, instead of each view registering its own
  `mousedown` listener on its associated element, Ember sets up a `mousedown`
  listener on the `body`.

  If a `mousedown` event occurs, Ember will look at the target of the event and
  start walking up the DOM node tree, finding corresponding views and invoking
  their `mouseDown` method as it goes.

  `Ember.Application` has a number of default events that it listens for, as
  well as a mapping from lowercase events to camel-cased view method names. For
  example, the `keypress` event causes the `keyPress` method on the view to be
  called, the `dblclick` event causes `doubleClick` to be called, and so on.

  If there is a browser event that Ember does not listen for by default, you
  can specify custom events and their corresponding view method names by
  setting the application's `customEvents` property:

  ```javascript
  App = Ember.Application.create({
    customEvents: {
      // add support for the loadedmetadata media
      // player event
      'loadedmetadata': "loadedMetadata"
    }
  });
  ```

  By default, the application sets up these event listeners on the document
  body. However, in cases where you are embedding an Ember application inside
  an existing page, you may want it to set up the listeners on an element
  inside the body.

  For example, if only events inside a DOM element with the ID of `ember-app`
  should be delegated, set your application's `rootElement` property:

  ```javascript
  window.App = Ember.Application.create({
    rootElement: '#ember-app'
  });
  ```

  The `rootElement` can be either a DOM element or a jQuery-compatible selector
  string. Note that *views appended to the DOM outside the root element will
  not receive events.* If you specify a custom root element, make sure you only
  append views inside it!

  To learn more about the advantages of event delegation and the Ember view
  layer, and a list of the event listeners that are setup by default, visit the
  [Ember View Layer guide](http://emberjs.com/guides/understanding-ember/the-view-layer/#toc_event-delegation).

  ### Dependency Injection

  One thing you may have noticed while using Ember is that you define
  *classes*, not *instances*. When your application loads, all of the instances
  are created for you. Creating these instances is the responsibility of
  `Ember.Application`.

  When the `Ember.Application` initializes, it will look for an `Ember.Router`
  class defined on the applications's `Router` property, like this:

  ```javascript
  App.Router = Ember.Router.extend({
  // ...
  });
  ```

  If found, the router is instantiated and saved on the application's `router`
  property (note the lowercase 'r'). While you should *not* reference this
  router instance directly from your application code, having access to
  `App.router` from the console can be useful during debugging.

  After the router is created, the application loops through all of the
  registered _injections_ and invokes them once for each property on the
  `Ember.Application` object.

  An injection is a function that is responsible for instantiating objects from
  classes defined on the application. By default, the only injection registered
  instantiates controllers and makes them available on the router.

  For example, if you define a controller class:

  ```javascript
  App.MyController = Ember.Controller.extend({
    // ...
  });
  ```

  Your router will receive an instance of `App.MyController` saved on its
  `myController` property.

  Libraries on top of Ember can register additional injections. For example,
  if your application is using Ember Data, it registers an injection that
  instantiates `DS.Store`:

  ```javascript
  Ember.Application.registerInjection({
    name: 'store',
    before: 'controllers',

    injection: function(app, router, property) {
      if (property === 'Store') {
        set(router, 'store', app[property].create());
      }
    }
  });
  ```

  ### Routing

  In addition to creating your application's router, `Ember.Application` is
  also responsible for telling the router when to start routing.

  By default, the router will begin trying to translate the current URL into
  application state once the browser emits the `DOMContentReady` event. If you
  need to defer routing, you can call the application's `deferReadiness()`
  method. Once routing can begin, call the `advanceReadiness()` method.

  If there is any setup required before routing begins, you can implement a
  `ready()` method on your app that will be invoked immediately before routing
  begins:

  ```javascript
  window.App = Ember.Application.create({
    ready: function() {
      this.set('router.enableLogging', true);
    }
  });

  To begin routing, you must have at a minimum a top-level controller and view.
  You define these as `App.ApplicationController` and `App.ApplicationView`,
  respectively. Your application will not work if you do not define these two
  mandatory classes. For example:

  ```javascript
  App.ApplicationView = Ember.View.extend({
    templateName: 'application'
  });
  App.ApplicationController = Ember.Controller.extend();
  ```

  @class Application
  @namespace Ember
  @extends Ember.Namespace
*/
Ember.Application = Ember.Namespace.extend(/** @scope Ember.Application.prototype */{

  /**
    The root DOM element of the Application. This can be specified as an
    element or a
    [jQuery-compatible selector string](http://api.jquery.com/category/selectors/).

    This is the element that will be passed to the Application's,
    `eventDispatcher`, which sets up the listeners for event delegation. Every
    view in your application should be a child of the element you specify here.

    @property rootElement
    @type DOMElement
    @default 'body'
  */
  rootElement: 'body',

  /**
    The `Ember.EventDispatcher` responsible for delegating events to this
    application's views.

    The event dispatcher is created by the application at initialization time
    and sets up event listeners on the DOM element described by the
    application's `rootElement` property.

    See the documentation for `Ember.EventDispatcher` for more information.

    @property eventDispatcher
    @type Ember.EventDispatcher
    @default null
  */
  eventDispatcher: null,

  /**
    The DOM events for which the event dispatcher should listen.

    By default, the application's `Ember.EventDispatcher` listens
    for a set of standard DOM events, such as `mousedown` and
    `keyup`, and delegates them to your application's `Ember.View`
    instances.

    If you would like additional events to be delegated to your
    views, set your `Ember.Application`'s `customEvents` property
    to a hash containing the DOM event name as the key and the
    corresponding view method name as the value. For example:

    ```javascript
    App = Ember.Application.create({
      customEvents: {
        // add support for the loadedmetadata media
        // player event
        'loadedmetadata': "loadedMetadata"
      }
    });
    ```

    @property customEvents
    @type Object
    @default null
  */
  customEvents: null,

  /**
    Should the application initialize itself after it's created. You can
    set this to `false` if you'd like to choose when to initialize your
    application. This defaults to `!Ember.testing`

    @property autoinit
    @type Boolean
  */
  autoinit: !Ember.testing,

  isInitialized: false,

  init: function() {
    if (!this.$) { this.$ = Ember.$; }

    this._super();

    this.createEventDispatcher();

    // Start off the number of deferrals at 1. This will be
    // decremented by the Application's own `initialize` method.
    this._readinessDeferrals = 1;

    this.waitForDOMContentLoaded();

    if (this.autoinit) {
      var self = this;
      this.$().ready(function() {
        if (self.isDestroyed || self.isInitialized) return;
        self.initialize();
      });
    }
  },

  /** @private */
  createEventDispatcher: function() {
    var rootElement = get(this, 'rootElement'),
        eventDispatcher = Ember.EventDispatcher.create({
          rootElement: rootElement
        });

    set(this, 'eventDispatcher', eventDispatcher);
  },

  waitForDOMContentLoaded: function() {
    this.deferReadiness();

    var self = this;
    this.$().ready(function() {
      self.advanceReadiness();
    });
  },

  deferReadiness: function() {
    Ember.assert("You cannot defer readiness since the `ready()` hook has already been called.", this._readinessDeferrals > 0);
    this._readinessDeferrals++;
  },

  advanceReadiness: function() {
    this._readinessDeferrals--;

    if (this._readinessDeferrals === 0) {
      Ember.run.once(this, this.didBecomeReady);
    }
  },

  /**
    Instantiate all controllers currently available on the namespace
    and inject them onto a router.

    Example:

    ```javascript
    App.PostsController = Ember.ArrayController.extend();
    App.CommentsController = Ember.ArrayController.extend();

    var router = Ember.Router.create({
      ...
    });

    App.initialize(router);

    router.get('postsController');     // <App.PostsController:ember1234>
    router.get('commentsController');  // <App.CommentsController:ember1235>
    ```

    @method initialize
    @param router {Ember.Router}
  */
  initialize: function(router) {
    Ember.assert("Application initialize may only be called once", !this.isInitialized);
    Ember.assert("Application not destroyed", !this.isDestroyed);

    router = this.setupRouter(router);

    this.runInjections(router);

    Ember.runLoadHooks('application', this);

    this.isInitialized = true;

    // At this point, any injections or load hooks that would have wanted
    // to defer readiness have fired.
    this.advanceReadiness();

    return this;
  },

  /** @private */
  runInjections: function(router) {
    var injections = get(this.constructor, 'injections'),
        graph = new Ember.DAG(),
        namespace = this,
        properties, i, injection;

    for (i=0; i<injections.length; i++) {
      injection = injections[i];
      graph.addEdges(injection.name, injection.injection, injection.before, injection.after);
    }

    graph.topsort(function (vertex) {
      var injection = vertex.value,
          properties = Ember.A(Ember.keys(namespace));
      properties.forEach(function(property) {
        injection(namespace, router, property);
      });
    });
  },

  /** @private */
  setupRouter: function(router) {
    if (!router && Ember.Router.detect(this.Router)) {
      router = this.Router.create();
      this._createdRouter = router;
    }

    if (router) {
      set(this, 'router', router);

      // By default, the router's namespace is the current application.
      //
      // This allows it to find model classes when a state has a
      // route like `/posts/:post_id`. In that case, it would first
      // convert `post_id` into `Post`, and then look it up on its
      // namespace.
      set(router, 'namespace', this);
    }

    return router;
  },

  /** @private */
  didBecomeReady: function() {
    var eventDispatcher = get(this, 'eventDispatcher'),
        customEvents    = get(this, 'customEvents'),
        router;

    eventDispatcher.setup(customEvents);

    this.ready();


    router = get(this, 'router');

    this.createApplicationView(router);

    if (router && router instanceof Ember.Router) {
      this.startRouting(router);
    }

    Ember.BOOTED = true;
  },

  createApplicationView: function (router) {
    var rootElement = get(this, 'rootElement'),
        applicationViewOptions = {},
        applicationViewClass = this.ApplicationView,
        applicationTemplate = Ember.TEMPLATES.application,
        applicationController, applicationView;

    // don't do anything unless there is an ApplicationView or application template
    if (!applicationViewClass && !applicationTemplate) return;

    if (router) {
      applicationController = get(router, 'applicationController');
      if (applicationController) {
        applicationViewOptions.controller = applicationController;
      }
    }

    if (applicationTemplate) {
      applicationViewOptions.template = applicationTemplate;
    }

    if (!applicationViewClass) {
      applicationViewClass = Ember.View;
    }

    applicationView = applicationViewClass.create(applicationViewOptions);

    this._createdApplicationView = applicationView;

    if (router) {
      set(router, 'applicationView', applicationView);
    }

    applicationView.appendTo(rootElement);
  },

  /**
    @private

    If the application has a router, use it to route to the current URL, and
    trigger a new call to `route` whenever the URL changes.

    @method startRouting
    @property router {Ember.Router}
  */
  startRouting: function(router) {
    var location = get(router, 'location');

    Ember.assert("You must have an application template or ApplicationView defined on your application", get(router, 'applicationView') );
    Ember.assert("You must have an ApplicationController defined on your application", get(router, 'applicationController') );

    router.route(location.getURL());
    location.onUpdateURL(function(url) {
      router.route(url);
    });
  },

  /**
    Called when the Application has become ready.
    The call will be delayed until the DOM has become ready.

    @event ready
  */
  ready: Ember.K,

  willDestroy: function() {
    get(this, 'eventDispatcher').destroy();
    if (this._createdRouter)          { this._createdRouter.destroy(); }
    if (this._createdApplicationView) { this._createdApplicationView.destroy(); }
  },

  registerInjection: function(options) {
    this.constructor.registerInjection(options);
  }
});

Ember.Application.reopenClass({
  concatenatedProperties: ['injections'],
  injections: Ember.A(),
  registerInjection: function(injection) {
    var injections = get(this, 'injections');

    Ember.assert("The injection '" + injection.name + "' has already been registered", !injections.findProperty('name', injection.name));
    Ember.assert("An injection cannot be registered with both a before and an after", !(injection.before && injection.after));
    Ember.assert("An injection cannot be registered without an injection function", Ember.canInvoke(injection, 'injection'));

    injections.push(injection);
  }
});

Ember.Application.registerInjection({
  name: 'controllers',
  injection: function(app, router, property) {
    if (!router) { return; }
    if (!/^[A-Z].*Controller$/.test(property)) { return; }

    var name = property.charAt(0).toLowerCase() + property.substr(1),
        controllerClass = app[property], controller;

    if(!Ember.Object.detect(controllerClass)){ return; }
    controller = app[property].create();

    router.set(name, controller);

    controller.setProperties({
      target: router,
      controllers: router,
      namespace: app
    });
  }
});

Ember.runLoadHooks('Ember.Application', Ember.Application);
