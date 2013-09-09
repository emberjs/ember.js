/**
@module ember
@submodule ember-application
*/

var get = Ember.get, set = Ember.set;

function DeprecatedContainer(container) {
  this._container = container;
}

DeprecatedContainer.deprecate = function(method) {
  return function() {
    var container = this._container;

    Ember.deprecate('Using the defaultContainer is no longer supported. [defaultContainer#' + method + '] see: http://git.io/EKPpnA', false);
    return container[method].apply(container, arguments);
  };
};

DeprecatedContainer.prototype = {
  _container: null,
  lookup: DeprecatedContainer.deprecate('lookup'),
  resolve: DeprecatedContainer.deprecate('resolve'),
  register: DeprecatedContainer.deprecate('register')
};

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

  By default, calling `Ember.Application.create()` will automatically initialize
  your application by calling the `Ember.Application.initialize()` method. If
  you need to delay initialization, you can call your app's `deferReadiness()`
  method. When you are ready for your app to be initialized, call its
  `advanceReadiness()` method.

  You can define a `ready` method on the `Ember.Application` instance, which
  will be run by Ember when the application is initialized.

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

  ### Initializers

  Libraries on top of Ember can register additional initializers, like so:

  ```javascript
  Ember.Application.initializer({
    name: "store",

    initialize: function(container, application) {
      container.register('store:main', application.Store);
    }
  });
  ```

  ### Routing

  In addition to creating your application's router, `Ember.Application` is
  also responsible for telling the router when to start routing. Transitions
  between routes can be logged with the `LOG_TRANSITIONS` flag, and more
  detailed intra-transition logging can be logged with
  the `LOG_TRANSITIONS_INTERNAL` flag:

  ```javascript
  window.App = Ember.Application.create({
    LOG_TRANSITIONS: true, // basic logging of successful transitions
    LOG_TRANSITIONS_INTERNAL: true // detailed logging of all routing steps
  });
  ```

  By default, the router will begin trying to translate the current URL into
  application state once the browser emits the `DOMContentReady` event. If you
  need to defer routing, you can call the application's `deferReadiness()`
  method. Once routing can begin, call the `advanceReadiness()` method.

  If there is any setup required before routing begins, you can implement a
  `ready()` method on your app that will be invoked immediately before routing
  begins.
  ```

  @class Application
  @namespace Ember
  @extends Ember.Namespace
*/

var Application = Ember.Application = Ember.Namespace.extend(Ember.DeferredMixin, {

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

  // Start off the number of deferrals at 1. This will be
  // decremented by the Application's own `initialize` method.
  _readinessDeferrals: 1,

  init: function() {
    if (!this.$) { this.$ = Ember.$; }
    this.__container__ = this.buildContainer();

    this.Router = this.Router || this.defaultRouter();
    if (this.Router) { this.Router.namespace = this; }

    this._super();

    this.scheduleInitialize();

    Ember.libraries.registerCoreLibrary('Handlebars', Ember.Handlebars.VERSION);
    Ember.libraries.registerCoreLibrary('jQuery', Ember.$().jquery);

    if ( Ember.LOG_VERSION ) {
      Ember.LOG_VERSION = false; // we only need to see this once per Application#init
      var maxNameLength = Math.max.apply(this, Ember.A(Ember.libraries).mapBy("name.length"));

      Ember.debug('-------------------------------');
      Ember.libraries.each(function(name, version) {
        var spaces = new Array(maxNameLength - name.length + 1).join(" ");
        Ember.debug([name, spaces, ' : ', version].join(""));
      });
      Ember.debug('-------------------------------');
    }
  },

  /**
    @private

    Build the container for the current application.

    Also register a default application view in case the application
    itself does not.

    @method buildContainer
    @return {Ember.Container} the configured container
  */
  buildContainer: function() {
    var container = this.__container__ = Application.buildContainer(this);

    return container;
  },

  /**
    @private

    If the application has not opted out of routing and has not explicitly
    defined a router, supply a default router for the application author
    to configure.

    This allows application developers to do:

    ```javascript
    var App = Ember.Application.create();

    App.Router.map(function() {
      this.resource('posts');
    });
    ```

    @method defaultRouter
    @return {Ember.Router} the default router
  */
  defaultRouter: function() {
    // Create a default App.Router if one was not supplied to make
    // it possible to do App.Router.map(...) without explicitly
    // creating a router first.
    if (this.router === undefined) {
      return Ember.Router.extend();
    }
  },

  /**
    @private

    Automatically initialize the application once the DOM has
    become ready.

    The initialization itself is scheduled on the actions queue
    which ensures that application loading finishes before
    booting.

    If you are asynchronously loading code, you should call
    `deferReadiness()` to defer booting, and then call
    `advanceReadiness()` once all of your code has finished
    loading.

    @method scheduleInitialize
  */
  scheduleInitialize: function() {
    var self = this;

    if (!this.$ || this.$.isReady) {
      Ember.run.schedule('actions', self, '_initialize');
    } else {
      this.$().ready(function() {
        Ember.run(self, '_initialize');
      });
    }
  },

  /**
    Use this to defer readiness until some condition is true.

    Example:

    ```javascript
    App = Ember.Application.create();
    App.deferReadiness();

    jQuery.getJSON("/auth-token", function(token) {
      App.token = token;
      App.advanceReadiness();
    });
    ```

    This allows you to perform asynchronous setup logic and defer
    booting your application until the setup has finished.

    However, if the setup requires a loading UI, it might be better
    to use the router for this purpose.

    @method deferReadiness
  */
  deferReadiness: function() {
    Ember.assert("You must call deferReadiness on an instance of Ember.Application", this instanceof Ember.Application);
    Ember.assert("You cannot defer readiness since the `ready()` hook has already been called.", this._readinessDeferrals > 0);
    this._readinessDeferrals++;
  },

  /**
    Call `advanceReadiness` after any asynchronous setup logic has completed.
    Each call to `deferReadiness` must be matched by a call to `advanceReadiness`
    or the application will never become ready and routing will not begin.
    
    @method advanceReadiness
    @see {Ember.Application#deferReadiness}
  */
  advanceReadiness: function() {
    Ember.assert("You must call advanceReadiness on an instance of Ember.Application", this instanceof Ember.Application);
    this._readinessDeferrals--;

    if (this._readinessDeferrals === 0) {
      Ember.run.once(this, this.didBecomeReady);
    }
  },

  /**
    registers a factory for later injection

    Example:

    ```javascript
    App = Ember.Application.create();

    App.Person = Ember.Object.extend({});
    App.Orange = Ember.Object.extend({});
    App.Email  = Ember.Object.extend({});

    App.register('model:user', App.Person, {singleton: false });
    App.register('fruit:favorite', App.Orange);
    App.register('communication:main', App.Email, {singleton: false});
    ```

    @method register
    @param  fullName {String} type:name (e.g., 'model:user')
    @param  factory {Function} (e.g., App.Person)
    @param  options {String} (optional)
  **/
  register: function() {
    var container = this.__container__;
    container.register.apply(container, arguments);
  },
  /**
    defines an injection or typeInjection

    Example:

    ```javascript
    App.inject(<full_name or type>, <property name>, <full_name>)
    App.inject('model:user', 'email', 'model:email')
    App.inject('model', 'source', 'source:main')
    ```

    @method inject
    @param  factoryNameOrType {String}
    @param  property {String}
    @param  injectionName {String}
  **/
  inject: function() {
    var container = this.__container__;
    container.injection.apply(container, arguments);
  },

  /**
    @private
    @deprecated

    Calling initialize manually is not supported.

    Please see Ember.Application#advanceReadiness and
    Ember.Application#deferReadiness.

    @method initialize
   **/
  initialize: function() {
    Ember.deprecate('Calling initialize manually is not supported. Please see Ember.Application#advanceReadiness and Ember.Application#deferReadiness');
  },
  /**
    @private

    Initialize the application. This happens automatically.

    Run any initializers and run the application load hook. These hooks may
    choose to defer readiness. For example, an authentication hook might want
    to defer readiness until the auth token has been retrieved.

    @method _initialize
  */
  _initialize: function() {
    if (this.isDestroyed) { return; }

    // At this point, the App.Router must already be assigned
    this.register('router:main', this.Router);

    this.runInitializers();
    Ember.runLoadHooks('application', this);

    // At this point, any initializers or load hooks that would have wanted
    // to defer readiness have fired. In general, advancing readiness here
    // will proceed to didBecomeReady.
    this.advanceReadiness();

    return this;
  },

  /**
    Reset the application. This is typically used only in tests. It cleans up
    the application in the following order:

    1. Deactivate existing routes
    2. Destroy all objects in the container
    3. Create a new application container
    4. Re-route to the existing url

    Typical Example:

    ```javascript

    var App;

    Ember.run(function() {
      App = Ember.Application.create();
    });

    module("acceptance test", {
      setup: function() {
        App.reset();
      }
    });

    test("first test", function() {
      // App is freshly reset
    });

    test("first test", function() {
      // App is again freshly reset
    });
    ```

    Advanced Example:

    Occasionally you may want to prevent the app from initializing during
    setup. This could enable extra configuration, or enable asserting prior
    to the app becoming ready.

    ```javascript

    var App;

    Ember.run(function() {
      App = Ember.Application.create();
    });

    module("acceptance test", {
      setup: function() {
        Ember.run(function() {
          App.reset();
          App.deferReadiness();
        });
      }
    });

    test("first test", function() {
      ok(true, 'something before app is initialized');

      Ember.run(function() {
        App.advanceReadiness();
      });
      ok(true, 'something after app is initialized');
    });
    ```

    @method reset
  **/
  reset: function() {
    this._readinessDeferrals = 1;

    function handleReset() {
      var router = this.__container__.lookup('router:main');
      router.reset();

      Ember.run(this.__container__, 'destroy');

      this.buildContainer();

      Ember.run.schedule('actions', this, function() {
        this._initialize();
      });
    }

    Ember.run.join(this, handleReset);
  },

  /**
    @private
    @method runInitializers
  */
  runInitializers: function() {
    var initializers = get(this.constructor, 'initializers'),
        container = this.__container__,
        graph = new Ember.DAG(),
        namespace = this,
        i, initializer;

    for (i=0; i<initializers.length; i++) {
      initializer = initializers[i];
      graph.addEdges(initializer.name, initializer.initialize, initializer.before, initializer.after);
    }

    graph.topsort(function (vertex) {
      var initializer = vertex.value;
      Ember.assert("No application initializer named '"+vertex.name+"'", initializer);
      initializer(container, namespace);
    });
  },

  /**
    @private
    @method didBecomeReady
  */
  didBecomeReady: function() {
    this.setupEventDispatcher();
    this.ready(); // user hook
    this.startRouting();

    if (!Ember.testing) {
      // Eagerly name all classes that are already loaded
      Ember.Namespace.processAll();
      Ember.BOOTED = true;
    }

    this.resolve(this);
  },

  /**
    @private

    Setup up the event dispatcher to receive events on the
    application's `rootElement` with any registered
    `customEvents`.

    @method setupEventDispatcher
  */
  setupEventDispatcher: function() {
    var customEvents = get(this, 'customEvents'),
        rootElement = get(this, 'rootElement'),
        dispatcher = this.__container__.lookup('event_dispatcher:main');

    set(this, 'eventDispatcher', dispatcher);
    dispatcher.setup(customEvents, rootElement);
  },

  /**
    @private

    trigger a new call to `route` whenever the URL changes.
    If the application has a router, use it to route to the current URL, and

    @method startRouting
    @property router {Ember.Router}
  */
  startRouting: function() {
    var router = this.__container__.lookup('router:main');
    if (!router) { return; }

    router.startRouting();
  },

  handleURL: function(url) {
    var router = this.__container__.lookup('router:main');

    router.handleURL(url);
  },

  /**
    Called when the Application has become ready.
    The call will be delayed until the DOM has become ready.

    @event ready
  */
  ready: Ember.K,

  /**
    @deprecated Use 'Resolver' instead
    Set this to provide an alternate class to `Ember.DefaultResolver`


    @property resolver
  */
  resolver: null,

  /**
    Set this to provide an alternate class to `Ember.DefaultResolver`

    @property resolver
  */
  Resolver: null,

  willDestroy: function() {
    Ember.BOOTED = false;

    this.__container__.destroy();
  },

  initializer: function(options) {
    this.constructor.initializer(options);
  }
});

Ember.Application.reopenClass({
  concatenatedProperties: ['initializers'],
  initializers: Ember.A(),
  initializer: function(initializer) {
    var initializers = get(this, 'initializers');

    Ember.assert("The initializer '" + initializer.name + "' has already been registered", !initializers.findBy('name', initializers.name));
    Ember.assert("An initializer cannot be registered with both a before and an after", !(initializer.before && initializer.after));
    Ember.assert("An initializer cannot be registered without an initialize function", Ember.canInvoke(initializer, 'initialize'));

    initializers.push(initializer);
  },

  /**
    @private

    This creates a container with the default Ember naming conventions.

    It also configures the container:

    * registered views are created every time they are looked up (they are
      not singletons)
    * registered templates are not factories; the registered value is
      returned directly.
    * the router receives the application as its `namespace` property
    * all controllers receive the router as their `target` and `controllers`
      properties
    * all controllers receive the application as their `namespace` property
    * the application view receives the application controller as its
      `controller` property
    * the application view receives the application template as its
      `defaultTemplate` property

    @method buildContainer
    @static
    @param {Ember.Application} namespace the application to build the
      container for.
    @return {Ember.Container} the built container
  */
  buildContainer: function(namespace) {
    var container = new Ember.Container();

    Ember.Container.defaultContainer = new DeprecatedContainer(container);

    container.set = Ember.set;
    container.resolver  = resolverFor(namespace);
    container.normalize = container.resolver.normalize;
    container.describe  = container.resolver.describe;
    container.makeToString = container.resolver.makeToString;

    container.optionsForType('component', { singleton: false });
    container.optionsForType('view', { singleton: false });
    container.optionsForType('template', { instantiate: false });
    container.register('application:main', namespace, { instantiate: false });

    container.register('controller:basic', Ember.Controller, { instantiate: false });
    container.register('controller:object', Ember.ObjectController, { instantiate: false });
    container.register('controller:array', Ember.ArrayController, { instantiate: false });
    container.register('route:basic', Ember.Route, { instantiate: false });
    container.register('event_dispatcher:main', Ember.EventDispatcher);

    container.injection('router:main', 'namespace', 'application:main');

    container.injection('controller', 'target', 'router:main');
    container.injection('controller', 'namespace', 'application:main');

    container.injection('route', 'router', 'router:main');

    return container;
  }
});

/**
  @private

  This function defines the default lookup rules for container lookups:

  * templates are looked up on `Ember.TEMPLATES`
  * other names are looked up on the application after classifying the name.
    For example, `controller:post` looks up `App.PostController` by default.
  * if the default lookup fails, look for registered classes on the container

  This allows the application to register default injections in the container
  that could be overridden by the normal naming convention.

  @method resolverFor
  @param {Ember.Namespace} namespace the namespace to look for classes
  @return {*} the resolved value for a given lookup
*/
function resolverFor(namespace) {
  if (namespace.get('resolver')) {
    Ember.deprecate('Application.resolver is deprecated in favor of Application.Resolver', false);
  }

  var ResolverClass = namespace.get('resolver') || namespace.get('Resolver') || Ember.DefaultResolver;
  var resolver = ResolverClass.create({
    namespace: namespace
  });

  function resolve(fullName) {
    return resolver.resolve(fullName);
  }

  resolve.describe = function(fullName) {
    return resolver.lookupDescription(fullName);
  };

  resolve.makeToString = function(factory, fullName) {
    return resolver.makeToString(factory, fullName);
  };

  resolve.normalize = function(fullName) {
    if (resolver.normalize) {
      return resolver.normalize(fullName);
    } else {
      Ember.deprecate('The Resolver should now provide a \'normalize\' function', false);
      return fullName;
    }
  };

  return resolve;
}

Ember.runLoadHooks('Ember.Application', Ember.Application);
