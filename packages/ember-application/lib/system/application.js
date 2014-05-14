/**
@module ember
@submodule ember-application
*/

import Ember from "ember-metal"; // Ember.FEATURES, Ember.deprecate, Ember.assert, Ember.libraries, LOG_VERSION, Namespace, BOOTED
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { runLoadHooks } from "ember-runtime/system/lazy_load";
import DAG from "ember-application/system/dag";
import Namespace from "ember-runtime/system/namespace";
import DeferredMixin from "ember-runtime/mixins/deferred";
import { DefaultResolver } from "ember-application/system/resolver";
import { create } from "ember-metal/platform";
import run from "ember-metal/run_loop";
import { canInvoke } from "ember-metal/utils";
import Container from 'container/container';
import { Controller } from "ember-runtime/controllers/controller";
import EnumerableUtils from "ember-metal/enumerable_utils";
import ObjectController from "ember-runtime/controllers/object_controller";
import ArrayController from "ember-runtime/controllers/array_controller";
import EventDispatcher from "ember-views/system/event_dispatcher";
//import ContainerDebugAdapter from "ember-extension-support/container_debug_adapter";
import jQuery from "ember-views/system/jquery";
import Route from "ember-routing/system/route";
import Router from "ember-routing/system/router";
import HashLocation from "ember-routing/location/hash_location";
import HistoryLocation from "ember-routing/location/history_location";
import AutoLocation from "ember-routing/location/auto_location";
import NoneLocation from "ember-routing/location/none_location";
import BucketCache from "ember-routing/system/cache";

import EmberHandlebars from "ember-handlebars-compiler";

var K = Ember.K;
var ContainerDebugAdapter;

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

  If there is a bubbling browser event that Ember does not listen for by
  default, you can specify custom events and their corresponding view method
  names by setting the application's `customEvents` property:

  ```javascript
  App = Ember.Application.create({
    customEvents: {
      // add support for the paste event
      paste: "paste"
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

  Libraries on top of Ember can add initializers, like so:

  ```javascript
  Ember.Application.initializer({
    name: 'api-adapter',

    initialize: function(container, application) {
      application.register('api-adapter:main', ApiAdapter);
    }
  });
  ```

  Initializers provide an opportunity to access the container, which
  organizes the different components of an Ember application. Additionally
  they provide a chance to access the instantiated application. Beyond
  being used for libraries, initializers are also a great way to organize
  dependency injection or setup in your own application.

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

var Application = Namespace.extend(DeferredMixin, {

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

    If you would like additional bubbling events to be delegated to your
    views, set your `Ember.Application`'s `customEvents` property
    to a hash containing the DOM event name as the key and the
    corresponding view method name as the value. For example:

    ```javascript
    App = Ember.Application.create({
      customEvents: {
        // add support for the paste event
        paste: "paste"
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
    if (!this.$) { this.$ = jQuery; }
    this.__container__ = this.buildContainer();

    this.Router = this.defaultRouter();

    this._super();

    this.scheduleInitialize();

    Ember.libraries.registerCoreLibrary('Handlebars', EmberHandlebars.VERSION);
    Ember.libraries.registerCoreLibrary('jQuery', jQuery().jquery);

    if ( Ember.LOG_VERSION ) {
      Ember.LOG_VERSION = false; // we only need to see this once per Application#init

      var nameLengths = EnumerableUtils.map(Ember.libraries, function(item) {
        return get(item, "name.length");
      });

      var maxNameLength = Math.max.apply(this, nameLengths);

      Ember.debug('-------------------------------');
      Ember.libraries.each(function(name, version) {
        var spaces = new Array(maxNameLength - name.length + 1).join(" ");
        Ember.debug([name, spaces, ' : ', version].join(""));
      });
      Ember.debug('-------------------------------');
    }
  },

  /**
    Build the container for the current application.

    Also register a default application view in case the application
    itself does not.

    @private
    @method buildContainer
    @return {Ember.Container} the configured container
  */
  buildContainer: function() {
    var container = this.__container__ = Application.buildContainer(this);

    return container;
  },

  /**
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

    @private
    @method defaultRouter
    @return {Ember.Router} the default router
  */

  defaultRouter: function() {
    if (this.Router === false) { return; }
    var container = this.__container__;

    if (this.Router) {
      container.unregister('router:main');
      container.register('router:main', this.Router);
    }

    return container.lookupFactory('router:main');
  },

  /**
    Automatically initialize the application once the DOM has
    become ready.

    The initialization itself is scheduled on the actions queue
    which ensures that application loading finishes before
    booting.

    If you are asynchronously loading code, you should call
    `deferReadiness()` to defer booting, and then call
    `advanceReadiness()` once all of your code has finished
    loading.

    @private
    @method scheduleInitialize
  */
  scheduleInitialize: function() {
    var self = this;

    if (!this.$ || this.$.isReady) {
      run.schedule('actions', self, '_initialize');
    } else {
      this.$().ready(function runInitialize() {
        run(self, '_initialize');
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
    Ember.assert("You must call deferReadiness on an instance of Ember.Application", this instanceof Application);
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
    Ember.assert("You must call advanceReadiness on an instance of Ember.Application", this instanceof Application);
    this._readinessDeferrals--;

    if (this._readinessDeferrals === 0) {
      run.once(this, this.didBecomeReady);
    }
  },

  /**
    Registers a factory that can be used for dependency injection (with
    `App.inject`) or for service lookup. Each factory is registered with
    a full name including two parts: `type:name`.

    A simple example:

    ```javascript
    var App = Ember.Application.create();
    App.Orange  = Ember.Object.extend();
    App.register('fruit:favorite', App.Orange);
    ```

    Ember will resolve factories from the `App` namespace automatically.
    For example `App.CarsController` will be discovered and returned if
    an application requests `controller:cars`.

    An example of registering a controller with a non-standard name:

    ```javascript
    var App = Ember.Application.create(),
        Session  = Ember.Controller.extend();

    App.register('controller:session', Session);

    // The Session controller can now be treated like a normal controller,
    // despite its non-standard name.
    App.ApplicationController = Ember.Controller.extend({
      needs: ['session']
    });
    ```

    Registered factories are **instantiated** by having `create`
    called on them. Additionally they are **singletons**, each time
    they are looked up they return the same instance.

    Some examples modifying that default behavior:

    ```javascript
    var App = Ember.Application.create();

    App.Person  = Ember.Object.extend();
    App.Orange  = Ember.Object.extend();
    App.Email   = Ember.Object.extend();
    App.session = Ember.Object.create();

    App.register('model:user', App.Person, {singleton: false });
    App.register('fruit:favorite', App.Orange);
    App.register('communication:main', App.Email, {singleton: false});
    App.register('session', App.session, {instantiate: false});
    ```

    @method register
    @param  fullName {String} type:name (e.g., 'model:user')
    @param  factory {Function} (e.g., App.Person)
    @param  options {Object} (optional) disable instantiation or singleton usage
  **/
  register: function() {
    var container = this.__container__;
    container.register.apply(container, arguments);
  },

  /**
    Define a dependency injection onto a specific factory or all factories
    of a type.

    When Ember instantiates a controller, view, or other framework component
    it can attach a dependency to that component. This is often used to
    provide services to a set of framework components.

    An example of providing a session object to all controllers:

    ```javascript
    var App = Ember.Application.create(),
        Session = Ember.Object.extend({ isAuthenticated: false });

    // A factory must be registered before it can be injected
    App.register('session:main', Session);

    // Inject 'session:main' onto all factories of the type 'controller'
    // with the name 'session'
    App.inject('controller', 'session', 'session:main');

    App.IndexController = Ember.Controller.extend({
      isLoggedIn: Ember.computed.alias('session.isAuthenticated')
    });
    ```

    Injections can also be performed on specific factories.

    ```javascript
    App.inject(<full_name or type>, <property name>, <full_name>)
    App.inject('route', 'source', 'source:main')
    App.inject('route:application', 'email', 'model:email')
    ```

    It is important to note that injections can only be performed on
    classes that are instantiated by Ember itself. Instantiating a class
    directly (via `create` or `new`) bypasses the dependency injection
    system.

    Ember-Data instantiates its models in a unique manner, and consequently
    injections onto models (or all models) will not work as expected. Injections
    on models can be enabled by setting `Ember.MODEL_FACTORY_INJECTIONS`
    to `true`.

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
    Calling initialize manually is not supported.

    Please see Ember.Application#advanceReadiness and
    Ember.Application#deferReadiness.

    @private
    @deprecated
    @method initialize
   **/
  initialize: function() {
    Ember.deprecate('Calling initialize manually is not supported. Please see Ember.Application#advanceReadiness and Ember.Application#deferReadiness');
  },

  /**
    Initialize the application. This happens automatically.

    Run any initializers and run the application load hook. These hooks may
    choose to defer readiness. For example, an authentication hook might want
    to defer readiness until the auth token has been retrieved.

    @private
    @method _initialize
  */
  _initialize: function() {
    if (this.isDestroyed) { return; }

    // At this point, the App.Router must already be assigned
    if (this.Router) {
      var container = this.__container__;
      container.unregister('router:main');
      container.register('router:main', this.Router);
    }

    this.runInitializers();
    runLoadHooks('application', this);

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

    run(function() {
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

    run(function() {
      App = Ember.Application.create();
    });

    module("acceptance test", {
      setup: function() {
        run(function() {
          App.reset();
          App.deferReadiness();
        });
      }
    });

    test("first test", function() {
      ok(true, 'something before app is initialized');

      run(function() {
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

      run(this.__container__, 'destroy');

      this.buildContainer();

      run.schedule('actions', this, function() {
        this._initialize();
      });
    }

    run.join(this, handleReset);
  },

  /**
    @private
    @method runInitializers
  */
  runInitializers: function() {
    var initializers = get(this.constructor, 'initializers'),
        container = this.__container__,
        graph = new DAG(),
        namespace = this,
        name, initializer;

    for (name in initializers) {
      initializer = initializers[name];
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
    Setup up the event dispatcher to receive events on the
    application's `rootElement` with any registered
    `customEvents`.

    @private
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
    If the application has a router, use it to route to the current URL, and
    trigger a new call to `route` whenever the URL changes.

    @private
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
  ready: K,

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
    // Ensure deactivation of routes before objects are destroyed
    this.__container__.lookup('router:main').reset();

    this.__container__.destroy();
  },

  initializer: function(options) {
    this.constructor.initializer(options);
  }
});

Application.reopenClass({
  initializers: {},

  /**
    Initializer receives an object which has the following attributes:
    `name`, `before`, `after`, `initialize`. The only required attribute is
    `initialize, all others are optional.

    * `name` allows you to specify under which name the initializer is registered.
    This must be a unique name, as trying to register two initializers with the
    same name will result in an error.

    ```javascript
    Ember.Application.initializer({
      name: 'namedInitializer',
      initialize: function(container, application) {
        Ember.debug("Running namedInitializer!");
      }
    });
    ```

    * `before` and `after` are used to ensure that this initializer is ran prior
    or after the one identified by the value. This value can be a single string
    or an array of strings, referencing the `name` of other initializers. Please
    note that you cannot specify both attributes for the same initializer.

    An example of ordering initializers, we create an initializer named `first`:

    ```javascript
    Ember.Application.initializer({
      name: 'first',
      initialize: function(container, application) {
        Ember.debug("First initializer!");
      }
    });

    // DEBUG: First initializer!
    ```

    We add another initializer named `second`, specifying that it should run
    after the initializer named `first`:

    ```javascript
    Ember.Application.initializer({
      name: 'second',
      after: 'first',

      initialize: function(container, application) {
        Ember.debug("Second initializer!");
      }
    });

    // DEBUG: First initializer!
    // DEBUG: Second initializer!
    ```

    Afterwards we add a further initializer named `pre`, this time specifying
    that it should run before the initializer named `first`:

    ```javascript
    Ember.Application.initializer({
      name: 'pre',
      before: 'first',

      initialize: function(container, application) {
        Ember.debug("Pre initializer!");
      }
    });

    // DEBUG: Pre initializer!
    // DEBUG: First initializer!
    // DEBUG: Second initializer!
    ```

    Finally we add an initializer named `post`, specifying it should run after
    both the `first` and the `second` initializers:

    ```javascript
    Ember.Application.initializer({
      name: 'post',
      after: ['first', 'second'],

      initialize: function(container, application) {
        Ember.debug("Post initializer!");
      }
    });

    // DEBUG: Pre initializer!
    // DEBUG: First initializer!
    // DEBUG: Second initializer!
    // DEBUG: Post initializer!
    ```

    * `initialize` is a callback function that receives two arguments, `container`
    and `application` on which you can operate.

    Example of using `container` to preload data into the store:

    ```javascript
    Ember.Application.initializer({
      name: "preload-data",

      initialize: function(container, application) {
        var store = container.lookup('store:main');
        store.pushPayload(preloadedData);
      }
    });
    ```

    Example of using `application` to register an adapter:

    ```javascript
    Ember.Application.initializer({
      name: 'api-adapter',

      initialize: function(container, application) {
        application.register('api-adapter:main', ApiAdapter);
      }
    });
    ```

    @method initializer
    @param initializer {Object}
   */
  initializer: function(initializer) {
    // If this is the first initializer being added to a subclass, we are going to reopen the class
    // to make sure we have a new `initializers` object, which extends from the parent class' using
    // prototypal inheritance. Without this, attempting to add initializers to the subclass would
    // pollute the parent class as well as other subclasses.
    if (this.superclass.initializers !== undefined && this.superclass.initializers === this.initializers) {
      this.reopenClass({
        initializers: create(this.initializers)
      });
    }

    Ember.assert("The initializer '" + initializer.name + "' has already been registered", !this.initializers[initializer.name]);
    Ember.assert("An initializer cannot be registered with both a before and an after", !(initializer.before && initializer.after));
    Ember.assert("An initializer cannot be registered without an initialize function", canInvoke(initializer, 'initialize'));

    this.initializers[initializer.name] = initializer;
  },

  /**
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

    @private
    @method buildContainer
    @static
    @param {Ember.Application} namespace the application to build the
      container for.
    @return {Ember.Container} the built container
  */
  buildContainer: function(namespace) {
    var container = new Container();

    Container.defaultContainer = new DeprecatedContainer(container);

    container.set = set;
    container.resolver  = resolverFor(namespace);
    container.normalize = container.resolver.normalize;
    container.describe  = container.resolver.describe;
    container.makeToString = container.resolver.makeToString;

    container.optionsForType('component', { singleton: false });
    container.optionsForType('view', { singleton: false });
    container.optionsForType('template', { instantiate: false });
    container.optionsForType('helper', { instantiate: false });

    container.register('application:main', namespace, { instantiate: false });

    container.register('controller:basic', Controller, { instantiate: false });
    container.register('controller:object', ObjectController, { instantiate: false });
    container.register('controller:array', ArrayController, { instantiate: false });
    container.register('route:basic', Route, { instantiate: false });
    container.register('event_dispatcher:main', EventDispatcher);

    container.register('router:main',  Router);
    container.injection('router:main', 'namespace', 'application:main');

    container.register('location:auto', AutoLocation);
    container.register('location:hash', HashLocation);
    container.register('location:history', HistoryLocation);
    container.register('location:none', NoneLocation);

    container.injection('controller', 'target', 'router:main');
    container.injection('controller', 'namespace', 'application:main');

    container.register('-bucket-cache:main', BucketCache);
    container.injection('router', '_bucketCache', '-bucket-cache:main');
    container.injection('route',  '_bucketCache', '-bucket-cache:main');
    container.injection('controller',  '_bucketCache', '-bucket-cache:main');

    container.injection('route', 'router', 'router:main');
    container.injection('location', 'rootURL', '-location-setting:root-url');

    // DEBUGGING
    container.register('resolver-for-debugging:main', container.resolver.__resolver__, { instantiate: false });
    container.injection('container-debug-adapter:main', 'resolver', 'resolver-for-debugging:main');
    container.injection('data-adapter:main', 'containerDebugAdapter', 'container-debug-adapter:main');
    // Custom resolver authors may want to register their own ContainerDebugAdapter with this key

    // ES6TODO: resolve this via import once ember-application package is ES6'ed
    if (!ContainerDebugAdapter) { ContainerDebugAdapter = requireModule('ember-extension-support/container_debug_adapter')['default']; }
    container.register('container-debug-adapter:main', ContainerDebugAdapter);

    return container;
  }
});

/**
  This function defines the default lookup rules for container lookups:

  * templates are looked up on `Ember.TEMPLATES`
  * other names are looked up on the application after classifying the name.
    For example, `controller:post` looks up `App.PostController` by default.
  * if the default lookup fails, look for registered classes on the container

  This allows the application to register default injections in the container
  that could be overridden by the normal naming convention.

  @private
  @method resolverFor
  @param {Ember.Namespace} namespace the namespace to look for classes
  @return {*} the resolved value for a given lookup
*/
function resolverFor(namespace) {
  if (namespace.get('resolver')) {
    Ember.deprecate('Application.resolver is deprecated in favor of Application.Resolver', false);
  }

  var ResolverClass = namespace.get('resolver') || namespace.get('Resolver') || DefaultResolver;
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

  resolve.__resolver__ = resolver;

  return resolve;
}

export default Application;
