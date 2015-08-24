/**
@module ember
@submodule ember-application
*/
import DAG from 'dag-map';
import Registry from 'container/registry';

import Ember from 'ember-metal'; // Ember.libraries, LOG_VERSION, Namespace, BOOTED
import { assert, deprecate, debug } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import EmptyObject from 'ember-metal/empty_object';
import { runLoadHooks } from 'ember-runtime/system/lazy_load';
import Namespace from 'ember-runtime/system/namespace';
import DefaultResolver from 'ember-application/system/resolver';
import run from 'ember-metal/run_loop';
import { canInvoke } from 'ember-metal/utils';
import Controller from 'ember-runtime/controllers/controller';
import Renderer from 'ember-metal-views/renderer';
import DOMHelper from 'ember-htmlbars/system/dom-helper';
import SelectView from 'ember-views/views/select';
import { OutletView } from 'ember-routing-views/views/outlet';
import EmberView from 'ember-views/views/view';
import EventDispatcher from 'ember-views/system/event_dispatcher';
import jQuery from 'ember-views/system/jquery';
import Route from 'ember-routing/system/route';
import Router from 'ember-routing/system/router';
import HashLocation from 'ember-routing/location/hash_location';
import HistoryLocation from 'ember-routing/location/history_location';
import AutoLocation from 'ember-routing/location/auto_location';
import NoneLocation from 'ember-routing/location/none_location';
import BucketCache from 'ember-routing/system/cache';
import ApplicationInstance from 'ember-application/system/application-instance';
import TextField from 'ember-views/views/text_field';
import TextArea from 'ember-views/views/text_area';
import Checkbox from 'ember-views/views/checkbox';
import LegacyEachView from 'ember-views/views/legacy_each_view';
import LinkToComponent from 'ember-routing-views/components/link-to';
import RoutingService from 'ember-routing/services/routing';
import ContainerDebugAdapter from 'ember-extension-support/container_debug_adapter';
import { _loaded } from 'ember-runtime/system/lazy_load';
import RegistryProxy, { buildFakeRegistryWithDeprecations } from 'ember-runtime/mixins/registry_proxy';
import environment from 'ember-metal/environment';

function props(obj) {
  var properties = [];

  for (var key in obj) {
    properties.push(key);
  }

  return properties;
}

var librariesRegistered = false;

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
  var App = Ember.Application.create({
    customEvents: {
      // add support for the paste event
      paste: 'paste'
    }
  });
  ```

  To prevent Ember from setting up a listener for a default event,
  specify the event name with a `null` value in the `customEvents`
  property:

  ```javascript
  var App = Ember.Application.create({
    customEvents: {
      // prevent listeners for mouseenter/mouseleave events
      mouseenter: null,
      mouseleave: null
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
  var App = Ember.Application.create({
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

    initialize: function(application) {
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
  var App = Ember.Application.create({
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

  @class Application
  @namespace Ember
  @extends Ember.Namespace
  @public
*/

var Application = Namespace.extend(RegistryProxy, {
  _suppressDeferredDeprecation: true,

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
    @public
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
    @public
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
    corresponding view method name as the value. Setting an event to
    a value of `null` will prevent a default event listener from being
    added for that event.

    To add new events to be listened to:

    ```javascript
    var App = Ember.Application.create({
      customEvents: {
        // add support for the paste event
        paste: 'paste'
      }
    });
    ```

    To prevent default events from being listened to:

    ```javascript
    var App = Ember.Application.create({
      customEvents: {
        // remove support for mouseenter / mouseleave events
        mouseenter: null,
        mouseleave: null
      }
    });
    ```
    @property customEvents
    @type Object
    @default null
    @public
  */
  customEvents: null,

  /**
    Whether the application should automatically start routing and render
    templates to the `rootElement` on DOM ready. While default by true,
    other environments such as FastBoot or a testing harness can set this
    property to `false` and control the precise timing and behavior of the boot
    process.

    @property autoboot
    @type Boolean
    @default true
    @private
  */
  autoboot: true,

  init() {
    this._super(...arguments);

    if (!this.$) {
      this.$ = jQuery;
    }

    this.buildRegistry();

    registerLibraries();
    logLibraryVersions();

    // Start off the number of deferrals at 1. This will be
    // decremented by the Application's own `initialize` method.
    this._readinessDeferrals = 1;

    if (isEnabled('ember-application-visit')) {
      if (this.autoboot) {
        // Create subclass of Ember.Router for this Application instance.
        // This is to ensure that someone reopening `App.Router` does not
        // tamper with the default `Ember.Router`.
        // 2.0TODO: Can we move this into a globals-mode-only library?
        this.Router = (this.Router || Router).extend();
        this.buildDefaultInstance();
        this.waitForDOMReady();
      }
    } else {
      this.Router = (this.Router || Router).extend();
      this.buildDefaultInstance();
      this.waitForDOMReady();
    }
  },

  /**
    Build and configure the registry for the current application.

    @private
    @method buildRegistry
    @return {Ember.Registry} the configured registry
  */
  buildRegistry() {
    var registry = this.__registry__ = Application.buildRegistry(this);

    return registry;
  },

  /**
    Create a container for the current application's registry.

    @private
    @method buildInstance
    @return {Ember.Container} the configured container
  */
  buildInstance() {
    return ApplicationInstance.create({
      application: this
    });
  },

  buildDefaultInstance() {
    var instance = this.buildInstance();

    // For the default instance only, set the view registry to the global
    // Ember.View.views hash for backwards-compatibility.
    EmberView.views = instance.lookup('-view-registry:main');

    // TODO2.0: Legacy support for App.__container__
    // and global methods on App that rely on a single,
    // default instance.
    this.__deprecatedInstance__ = instance;
    this.__container__ = instance.__container__;

    return instance;
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
    @method waitForDOMReady
  */
  waitForDOMReady() {
    if (!this.$ || this.$.isReady) {
      run.schedule('actions', this, 'domReady');
    } else {
      this.$().ready(run.bind(this, 'domReady'));
    }
  },

  /**
    Use this to defer readiness until some condition is true.

    Example:

    ```javascript
    var App = Ember.Application.create();

    App.deferReadiness();

    // Ember.$ is a reference to the jQuery object/function
    Ember.$.getJSON('/auth-token', function(token) {
      App.token = token;
      App.advanceReadiness();
    });
    ```

    This allows you to perform asynchronous setup logic and defer
    booting your application until the setup has finished.

    However, if the setup requires a loading UI, it might be better
    to use the router for this purpose.

    @method deferReadiness
    @public
  */
  deferReadiness() {
    assert('You must call deferReadiness on an instance of Ember.Application', this instanceof Application);
    assert('You cannot defer readiness since the `ready()` hook has already been called.', this._readinessDeferrals > 0);
    this._readinessDeferrals++;
  },

  /**
    Call `advanceReadiness` after any asynchronous setup logic has completed.
    Each call to `deferReadiness` must be matched by a call to `advanceReadiness`
    or the application will never become ready and routing will not begin.

    @method advanceReadiness
    @see {Ember.Application#deferReadiness}
    @public
  */
  advanceReadiness() {
    assert('You must call advanceReadiness on an instance of Ember.Application', this instanceof Application);
    this._readinessDeferrals--;

    if (this._readinessDeferrals === 0) {
      run.once(this, this.didBecomeReady);
    }
  },

  /**
    Calling initialize manually is not supported.

    Please see Ember.Application#advanceReadiness and
    Ember.Application#deferReadiness.

    @private
    @deprecated
    @method initialize
   **/
  initialize() {
    deprecate('Calling initialize manually is not supported. Please see Ember.Application#advanceReadiness and Ember.Application#deferReadiness');
  },

  /**
    Initialize the application. This happens automatically.

    Run any initializers and run the application load hook. These hooks may
    choose to defer readiness. For example, an authentication hook might want
    to defer readiness until the auth token has been retrieved.

    @private
    @method domReady
  */
  domReady() {
    if (this.isDestroyed) { return; }

    this.boot();

    return this;
  },

  boot() {
    if (this._bootPromise) { return this._bootPromise; }

    var defer = new Ember.RSVP.defer();
    this._bootPromise = defer.promise;
    this._bootResolver = defer;

    this.runInitializers();
    runLoadHooks('application', this);

    this.advanceReadiness();

    return this._bootPromise;
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

    module('acceptance test', {
      setup: function() {
        App.reset();
      }
    });

    test('first test', function() {
      // App is freshly reset
    });

    test('second test', function() {
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

    module('acceptance test', {
      setup: function() {
        run(function() {
          App.reset();
          App.deferReadiness();
        });
      }
    });

    test('first test', function() {
      ok(true, 'something before app is initialized');

      run(function() {
        App.advanceReadiness();
      });

      ok(true, 'something after app is initialized');
    });
    ```

    @method reset
    @public
  **/
  reset() {
    var instance = this.__deprecatedInstance__;

    this._readinessDeferrals = 1;
    this._bootPromise = null;
    this._bootResolver = null;

    function handleReset() {
      run(instance, 'destroy');

      run.schedule('actions', this, 'domReady', this.buildDefaultInstance());
    }

    run.join(this, handleReset);
  },


  /**
    @private
    @method instanceInitializer
  */
  instanceInitializer(options) {
    this.constructor.instanceInitializer(options);
  },

  /**
    @private
    @method runInitializers
  */
  runInitializers() {
    var App = this;
    this._runInitializer('initializers', function(name, initializer) {
      assert('No application initializer named \'' + name + '\'', !!initializer);
      if (initializer.initialize.length === 2) {
        if (isEnabled('ember-registry-container-reform')) {
          deprecate('The `initialize` method for Application initializer \'' + name + '\' should take only one argument - `App`, an instance of an `Application`.',
                          false,
                          { id: 'ember-application.app-initializer-initialize-arguments', until: '3.0.0' });
        }
        initializer.initialize(App.__registry__, App);
      } else {
        initializer.initialize(App);
      }
    });
  },

  runInstanceInitializers(instance) {
    this._runInitializer('instanceInitializers', function(name, initializer) {
      assert('No instance initializer named \'' + name + '\'', !!initializer);
      initializer.initialize(instance);
    });
  },

  _runInitializer(bucketName, cb) {
    var initializersByName = get(this.constructor, bucketName);
    var initializers = props(initializersByName);
    var graph = new DAG();
    var initializer;

    for (var i = 0; i < initializers.length; i++) {
      initializer = initializersByName[initializers[i]];
      graph.addEdges(initializer.name, initializer, initializer.before, initializer.after);
    }

    graph.topsort(function (vertex) {
      cb(vertex.name, vertex.value);
    });
  },

  /**
    @private
    @method didBecomeReady
  */
  didBecomeReady() {
    if (this.autoboot) {
      this.runInstanceInitializers(this.__deprecatedInstance__);

      if (environment.hasDOM) {
        this.__deprecatedInstance__.setupEventDispatcher();
      }

      this.ready(); // user hook
      this.__deprecatedInstance__.startRouting();

      if (!Ember.testing) {
        // Eagerly name all classes that are already loaded
        Ember.Namespace.processAll();
        Ember.BOOTED = true;
      }
    }

    this._bootResolver.resolve();
  },

  /**
    Called when the Application has become ready, immediately before routing
    begins. The call will be delayed until the DOM has become ready.

    @event ready
    @public
  */
  ready() { return this; },

  /**
    Set this to provide an alternate class to `Ember.DefaultResolver`


    @deprecated Use 'Resolver' instead
    @property resolver
    @public
  */
  resolver: null,

  /**
    Set this to provide an alternate class to `Ember.DefaultResolver`

    @property resolver
    @public
  */
  Resolver: null,

  // This method must be moved to the application instance object
  willDestroy() {
    this._super(...arguments);
    Ember.BOOTED = false;
    this._bootPromise = null;
    this._bootResolver = null;

    if (_loaded.application === this) {
      _loaded.application = undefined;
    }

    if (this.__deprecatedInstance__) {
      this.__deprecatedInstance__.destroy();
    }
  },

  initializer(options) {
    this.constructor.initializer(options);
  }
});

if (isEnabled('ember-registry-container-reform')) {
  Object.defineProperty(Application.prototype, 'registry', {
    configurable: true,
    enumerable: false,
    get() {
      return buildFakeRegistryWithDeprecations(this, 'Application');
    }
  });
}

Application.reopenClass({
  /**
    Instance initializers run after all initializers have run. Because
    instance initializers run after the app is fully set up. We have access
    to the store, container, and other items. However, these initializers run
    after code has loaded and are not allowed to defer readiness.

    Instance initializer receives an object which has the following attributes:
    `name`, `before`, `after`, `initialize`. The only required attribute is
    `initialize`, all others are optional.

    * `name` allows you to specify under which name the instanceInitializer is
    registered. This must be a unique name, as trying to register two
    instanceInitializer with the same name will result in an error.

    ```javascript
    Ember.Application.instanceInitializer({
      name: 'namedinstanceInitializer',

      initialize: function(application) {
        Ember.debug('Running namedInitializer!');
      }
    });
    ```

    * `before` and `after` are used to ensure that this initializer is ran prior
    or after the one identified by the value. This value can be a single string
    or an array of strings, referencing the `name` of other initializers.

    * See Ember.Application.initializer for discussion on the usage of before
    and after.

    Example instanceInitializer to preload data into the store.

    ```javascript
    Ember.Application.initializer({
      name: 'preload-data',

      initialize: function(application) {
        var userConfig, userConfigEncoded, store;
        // We have a HTML escaped JSON representation of the user's basic
        // configuration generated server side and stored in the DOM of the main
        // index.html file. This allows the app to have access to a set of data
        // without making any additional remote calls. Good for basic data that is
        // needed for immediate rendering of the page. Keep in mind, this data,
        // like all local models and data can be manipulated by the user, so it
        // should not be relied upon for security or authorization.
        //
        // Grab the encoded data from the meta tag
        userConfigEncoded = Ember.$('head meta[name=app-user-config]').attr('content');
        // Unescape the text, then parse the resulting JSON into a real object
        userConfig = JSON.parse(unescape(userConfigEncoded));
        // Lookup the store
        store = application.lookup('service:store');
        // Push the encoded JSON into the store
        store.pushPayload(userConfig);
      }
    });
    ```

    @method instanceInitializer
    @param instanceInitializer
    @public
  */
  instanceInitializer: buildInitializerMethod('instanceInitializers', 'instance initializer')
});

if (isEnabled('ember-application-visit')) {
  Application.reopen({
    /**
      Creates a new instance of the application and instructs it to route to the
      specified initial URL. This method returns a promise that will be resolved
      once rendering is complete. That promise is resolved with the instance.

      ```js
      App.visit('/users').then(function(instance) {
        var view = instance.view;
        view.appendTo('#qunit-test-fixtures');
      });
     ```

      @method visit
      @private
    */
    visit(url) {
      var instance = this.buildInstance();
      this.runInstanceInitializers(instance);

      var renderPromise = new Ember.RSVP.Promise(function(res, rej) {
        instance.didCreateRootView = function(view) {
          instance.view = view;
          res(instance);
        };
      });

      instance.overrideRouterLocation({ location: 'none' });

      return instance.handleURL(url).then(function() {
        return renderPromise;
      });
    }
  });
}

Application.reopenClass({
  initializers: new EmptyObject(),
  instanceInitializers: new EmptyObject(),

  /**
    The goal of initializers should be to register dependencies and injections.
    This phase runs once. Because these initializers may load code, they are
    allowed to defer application readiness and advance it. If you need to access
    the container or store you should use an InstanceInitializer that will be run
    after all initializers and therefore after all code is loaded and the app is
    ready.

    Initializer receives an object which has the following attributes:
    `name`, `before`, `after`, `initialize`. The only required attribute is
    `initialize`, all others are optional.

    * `name` allows you to specify under which name the initializer is registered.
    This must be a unique name, as trying to register two initializers with the
    same name will result in an error.

    ```javascript
    Ember.Application.initializer({
      name: 'namedInitializer',

      initialize: function(application) {
        Ember.debug('Running namedInitializer!');
      }
    });
    ```

    * `before` and `after` are used to ensure that this initializer is ran prior
    or after the one identified by the value. This value can be a single string
    or an array of strings, referencing the `name` of other initializers.

    An example of ordering initializers, we create an initializer named `first`:

    ```javascript
    Ember.Application.initializer({
      name: 'first',

      initialize: function(application) {
        Ember.debug('First initializer!');
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

      initialize: function(application) {
        Ember.debug('Second initializer!');
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

      initialize: function(application) {
        Ember.debug('Pre initializer!');
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

      initialize: function(application) {
        Ember.debug('Post initializer!');
      }
    });

    // DEBUG: Pre initializer!
    // DEBUG: First initializer!
    // DEBUG: Second initializer!
    // DEBUG: Post initializer!
    ```

    * `initialize` is a callback function that receives one argument,
      `application`, on which you can operate.

    Example of using `application` to register an adapter:

    ```javascript
    Ember.Application.initializer({
      name: 'api-adapter',

      initialize: function(application) {
        application.register('api-adapter:main', ApiAdapter);
      }
    });
    ```

    @method initializer
    @param initializer {Object}
    @public
  */

  initializer: buildInitializerMethod('initializers', 'initializer'),

  /**
    This creates a registry with the default Ember naming conventions.

    It also configures the registry:

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
    @method buildRegistry
    @static
    @param {Ember.Application} namespace the application for which to
      build the registry
    @return {Ember.Registry} the built registry
    @public
  */
  buildRegistry(namespace) {
    var registry = new Registry();

    registry.set = set;
    registry.resolver = resolverFor(namespace);
    registry.normalizeFullName = registry.resolver.normalize;
    registry.describe = registry.resolver.describe;
    registry.makeToString = registry.resolver.makeToString;

    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });

    registry.register('application:main', namespace, { instantiate: false });

    registry.register('controller:basic', Controller, { instantiate: false });

    registry.register('renderer:-dom', { create() { return new Renderer(new DOMHelper()); } });

    registry.injection('view', 'renderer', 'renderer:-dom');
    if (Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
      registry.register('view:select', SelectView);
    }
    registry.register('view:-outlet', OutletView);

    registry.register('-view-registry:main', { create() { return {}; } });

    registry.injection('view', '_viewRegistry', '-view-registry:main');

    registry.register('view:toplevel', EmberView.extend());

    registry.register('route:basic', Route, { instantiate: false });
    registry.register('event_dispatcher:main', EventDispatcher);

    registry.injection('router:main', 'namespace', 'application:main');
    registry.injection('view:-outlet', 'namespace', 'application:main');

    registry.register('location:auto', AutoLocation);
    registry.register('location:hash', HashLocation);
    registry.register('location:history', HistoryLocation);
    registry.register('location:none', NoneLocation);

    registry.injection('controller', 'target', 'router:main');
    registry.injection('controller', 'namespace', 'application:main');

    registry.register('-bucket-cache:main', BucketCache);
    registry.injection('router', '_bucketCache', '-bucket-cache:main');
    registry.injection('route', '_bucketCache', '-bucket-cache:main');
    registry.injection('controller', '_bucketCache', '-bucket-cache:main');

    registry.injection('route', 'router', 'router:main');

    registry.register('component:-text-field', TextField);
    registry.register('component:-text-area', TextArea);
    registry.register('component:-checkbox', Checkbox);
    registry.register('view:-legacy-each', LegacyEachView);
    registry.register('component:link-to', LinkToComponent);

    // Register the routing service...
    registry.register('service:-routing', RoutingService);
    // Then inject the app router into it
    registry.injection('service:-routing', 'router', 'router:main');

    // DEBUGGING
    registry.register('resolver-for-debugging:main', registry.resolver.__resolver__, { instantiate: false });
    registry.injection('container-debug-adapter:main', 'resolver', 'resolver-for-debugging:main');
    registry.injection('data-adapter:main', 'containerDebugAdapter', 'container-debug-adapter:main');
    // Custom resolver authors may want to register their own ContainerDebugAdapter with this key

    registry.register('container-debug-adapter:main', ContainerDebugAdapter);

    return registry;
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
  var ResolverClass = namespace.get('Resolver') || DefaultResolver;
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
    }
  };

  resolve.knownForType = function knownForType(type) {
    if (resolver.knownForType) {
      return resolver.knownForType(type);
    }
  };

  resolve.moduleBasedResolver = resolver.moduleBasedResolver;

  resolve.__resolver__ = resolver;

  return resolve;
}

function registerLibraries() {
  if (!librariesRegistered) {
    librariesRegistered = true;

    if (environment.hasDOM) {
      Ember.libraries.registerCoreLibrary('jQuery', jQuery().jquery);
    }
  }
}

function logLibraryVersions() {
  if (Ember.LOG_VERSION) {
    // we only need to see this once per Application#init
    Ember.LOG_VERSION = false;
    var libs = Ember.libraries._registry;

    var nameLengths = libs.map(function(item) {
      return get(item, 'name.length');
    });

    var maxNameLength = Math.max.apply(this, nameLengths);

    debug('-------------------------------');
    for (var i = 0, l = libs.length; i < l; i++) {
      var lib = libs[i];
      var spaces = new Array(maxNameLength - lib.name.length + 1).join(' ');
      debug([lib.name, spaces, ' : ', lib.version].join(''));
    }
    debug('-------------------------------');
  }
}

function buildInitializerMethod(bucketName, humanName) {
  return function(initializer) {
    // If this is the first initializer being added to a subclass, we are going to reopen the class
    // to make sure we have a new `initializers` object, which extends from the parent class' using
    // prototypal inheritance. Without this, attempting to add initializers to the subclass would
    // pollute the parent class as well as other subclasses.
    if (this.superclass[bucketName] !== undefined && this.superclass[bucketName] === this[bucketName]) {
      var attrs = {};
      attrs[bucketName] = Object.create(this[bucketName]);
      this.reopenClass(attrs);
    }

    assert('The ' + humanName + ' \'' + initializer.name + '\' has already been registered', !this[bucketName][initializer.name]);
    assert('An ' + humanName + ' cannot be registered without an initialize function', canInvoke(initializer, 'initialize'));
    assert('An ' + humanName + ' cannot be registered without a name property', initializer.name !== undefined);

    this[bucketName][initializer.name] = initializer;
  };
}

export default Application;
