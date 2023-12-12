/**
@module @ember/application
*/

import { getOwner as actualGetOwner, setOwner as actualSetOwner } from '@ember/owner';
import { dictionary } from '@ember/-internals/utils';
import { ENV } from '@ember/-internals/environment';
import { hasDOM } from '@ember/-internals/browser-environment';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { join, once, run, schedule } from '@ember/runloop';
import { libraries } from '@ember/-internals/metal';
import { _loaded, onLoad, runLoadHooks } from './lib/lazy_load';
import { RSVP } from '@ember/-internals/runtime';
import { EventDispatcher } from '@ember/-internals/views';
import Route from '@ember/routing/route';
import Router from '@ember/routing/router';
import HashLocation from '@ember/routing/hash-location';
import HistoryLocation from '@ember/routing/history-location';
import NoneLocation from '@ember/routing/none-location';
import { BucketCache } from '@ember/routing/-internals';
import ApplicationInstance from '@ember/application/instance';
import Engine, { buildInitializerMethod } from '@ember/engine';
import type { BootOptions } from '@ember/engine/instance';
import type { Container, Registry } from '@ember/-internals/container';
import { privatize as P } from '@ember/-internals/container';
import { setupApplicationRegistry } from '@ember/-internals/glimmer';
import RouterService from '@ember/routing/router-service';
import type { EngineInstanceOptions } from '@ember/engine/instance';
import type { SimpleDocument, SimpleElement } from '@simple-dom/interface';

/**
 * @deprecated Use `import { getOwner } from '@ember/owner';` instead.
 */
export const getOwner = actualGetOwner;

/**
 * @deprecated Use `import { setOwner } from '@ember/owner';` instead.
 */
export const setOwner = actualSetOwner;

/**
  An instance of `Application` is the starting point for every Ember
  application. It instantiates, initializes and coordinates the
  objects that make up your app.

  Each Ember app has one and only one `Application` object. Although
  Ember CLI creates this object implicitly, the `Application` class
  is defined in the `app/app.js`. You can define a `ready` method on the
  `Application` class, which will be run by Ember when the application is
  initialized.

  ```app/app.js
  export default class App extends Application {
    ready() {
      // your code here
    }
  }
  ```

  Because `Application` ultimately inherits from `Ember.Namespace`, any classes
  you create will have useful string representations when calling `toString()`.
  See the `Ember.Namespace` documentation for more information.

  While you can think of your `Application` as a container that holds the
  other classes in your application, there are several other responsibilities
  going on under-the-hood that you may want to understand. It is also important
  to understand that an `Application` is different from an `ApplicationInstance`.
  Refer to the Guides to understand the difference between these.

  ### Event Delegation

  Ember uses a technique called _event delegation_. This allows the framework
  to set up a global, shared event listener instead of requiring each view to
  do it manually. For example, instead of each view registering its own
  `mousedown` listener on its associated element, Ember sets up a `mousedown`
  listener on the `body`.

  If a `mousedown` event occurs, Ember will look at the target of the event and
  start walking up the DOM node tree, finding corresponding views and invoking
  their `mouseDown` method as it goes.

  `Application` has a number of default events that it listens for, as
  well as a mapping from lowercase events to camel-cased view method names. For
  example, the `keypress` event causes the `keyPress` method on the view to be
  called, the `dblclick` event causes `doubleClick` to be called, and so on.

  If there is a bubbling browser event that Ember does not listen for by
  default, you can specify custom events and their corresponding view method
  names by setting the application's `customEvents` property:

  ```app/app.js
  import Application from '@ember/application';

  export default class App extends Application {
    customEvents = {
      // add support for the paste event
      paste: 'paste'
    }
  }
  ```

  To prevent Ember from setting up a listener for a default event,
  specify the event name with a `null` value in the `customEvents`
  property:

  ```app/app.js
  import Application from '@ember/application';

  export default class App extends Application {
    customEvents = {
      // prevent listeners for mouseenter/mouseleave events
      mouseenter: null,
      mouseleave: null
    }
  }
  ```

  By default, the application sets up these event listeners on the document
  body. However, in cases where you are embedding an Ember application inside
  an existing page, you may want it to set up the listeners on an element
  inside the body.

  For example, if only events inside a DOM element with the ID of `ember-app`
  should be delegated, set your application's `rootElement` property:

  ```app/app.js
  import Application from '@ember/application';

  export default class App extends Application {
    rootElement = '#ember-app'
  }
  ```

  The `rootElement` can be either a DOM element or a CSS selector
  string. Note that *views appended to the DOM outside the root element will
  not receive events.* If you specify a custom root element, make sure you only
  append views inside it!

  To learn more about the events Ember components use, see

  [components/handling-events](https://guides.emberjs.com/release/components/handling-events/#toc_event-names).

  ### Initializers

  To add behavior to the Application's boot process, you can define initializers in
  the `app/initializers` directory, or with `ember generate initializer` using Ember CLI.
  These files should export a named `initialize` function which will receive the created `application`
  object as its first argument.

  ```javascript
  export function initialize(application) {
    // application.inject('route', 'foo', 'service:foo');
  }
  ```

  Application initializers can be used for a variety of reasons including:

  - setting up external libraries
  - injecting dependencies
  - setting up event listeners in embedded apps
  - deferring the boot process using the `deferReadiness` and `advanceReadiness` APIs.

  ### Routing

  In addition to creating your application's router, `Application` is
  also responsible for telling the router when to start routing. Transitions
  between routes can be logged with the `LOG_TRANSITIONS` flag, and more
  detailed intra-transition logging can be logged with
  the `LOG_TRANSITIONS_INTERNAL` flag:

  ```javascript
  import Application from '@ember/application';

  let App = Application.create({
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
  @extends Engine
  @public
*/

class Application extends Engine {
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

    @method buildRegistry
    @static
    @param {Application} namespace the application for which to
      build the registry
    @return {Ember.Registry} the built registry
    @private
  */
  static buildRegistry(namespace: Application) {
    let registry = super.buildRegistry(namespace);

    commonSetupRegistry(registry);

    setupApplicationRegistry(registry);

    return registry;
  }

  static initializer = buildInitializerMethod<'initializers', Application>(
    'initializers',
    'initializer'
  );

  static instanceInitializer = buildInitializerMethod<'instanceInitializers', ApplicationInstance>(
    'instanceInitializers',
    'instance initializer'
  );

  /**
    The root DOM element of the Application. This can be specified as an
    element or a [selector string](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Selectors#reference_table_of_selectors).

    This is the element that will be passed to the Application's,
    `eventDispatcher`, which sets up the listeners for event delegation. Every
    view in your application should be a child of the element you specify here.

    @property rootElement
    @type DOMElement
    @default 'body'
    @public
  */
  declare rootElement: SimpleElement | Element | string;

  /**

    @property _document
    @type Document | null
    @default 'window.document'
    @private
  */
  declare _document: SimpleDocument | Document | null;

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
  declare eventDispatcher: EventDispatcher | null;

  /**
    The DOM events for which the event dispatcher should listen.

    By default, the application's `Ember.EventDispatcher` listens
    for a set of standard DOM events, such as `mousedown` and
    `keyup`, and delegates them to your application's `Ember.View`
    instances.

    If you would like additional bubbling events to be delegated to your
    views, set your `Application`'s `customEvents` property
    to a hash containing the DOM event name as the key and the
    corresponding view method name as the value. Setting an event to
    a value of `null` will prevent a default event listener from being
    added for that event.

    To add new events to be listened to:

    ```app/app.js
    import Application from '@ember/application';

    let App = Application.extend({
      customEvents: {
        // add support for the paste event
        paste: 'paste'
      }
    });
    ```

    To prevent default events from being listened to:

    ```app/app.js
    import Application from '@ember/application';

    let App = Application.extend({
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
  declare customEvents: Record<string, string | null> | null;

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
  declare autoboot: boolean;

  /**
    Whether the application should be configured for the legacy "globals mode".
    Under this mode, the Application object serves as a global namespace for all
    classes.

    ```javascript
    import Application from '@ember/application';
    import Component from '@ember/component';

    let App = Application.create({
      ...
    });

    App.Router.reopen({
      location: 'none'
    });

    App.Router.map({
      ...
    });

    App.MyComponent = Component.extend({
      ...
    });
    ```

    This flag also exposes other internal APIs that assumes the existence of
    a special "default instance", like `App.__container__.lookup(...)`.

    This option is currently not configurable, its value is derived from
    the `autoboot` flag – disabling `autoboot` also implies opting-out of
    globals mode support, although they are ultimately orthogonal concerns.

    Some of the global modes features are already deprecated in 1.x. The
    existence of this flag is to untangle the globals mode code paths from
    the autoboot code paths, so that these legacy features can be reviewed
    for deprecation/removal separately.

    Forcing the (autoboot=true, _globalsMode=false) here and running the tests
    would reveal all the places where we are still relying on these legacy
    behavior internally (mostly just tests).

    @property _globalsMode
    @type Boolean
    @default true
    @private
  */
  declare _globalsMode: boolean;

  /**
    An array of application instances created by `buildInstance()`. Used
    internally to ensure that all instances get destroyed.

    @property _applicationInstances
    @type Array
    @private
  */
  declare _applicationInstances: Set<ApplicationInstance>;

  declare _readinessDeferrals: number;

  declare _booted: boolean;

  init(properties: object | undefined) {
    super.init(properties);

    this.rootElement ??= 'body';
    this._document ??= null;
    this.eventDispatcher ??= null;
    this.customEvents ??= null;
    this.autoboot ??= true;
    this._document ??= hasDOM ? window.document : null;
    this._globalsMode ??= true;

    if (DEBUG) {
      if (ENV.LOG_VERSION) {
        // we only need to see this once per Application#init
        ENV.LOG_VERSION = false;
        libraries.logVersions?.();
      }
    }

    // Start off the number of deferrals at 1. This will be decremented by
    // the Application's own `boot` method.
    this._readinessDeferrals = 1;
    this._booted = false;
    this._applicationInstances = new Set();

    this.autoboot = this._globalsMode = Boolean(this.autoboot);

    if (this._globalsMode) {
      this._prepareForGlobalsMode();
    }

    if (this.autoboot) {
      this.waitForDOMReady();
    }
  }

  /**
    Create an ApplicationInstance for this application.

    @public
    @method buildInstance
    @return {ApplicationInstance} the application instance
  */
  buildInstance(options: EngineInstanceOptions = {}): ApplicationInstance {
    assert(
      'You cannot build new instances of this application since it has already been destroyed',
      !this.isDestroyed
    );

    assert(
      'You cannot build new instances of this application since it is being destroyed',
      !this.isDestroying
    );

    return ApplicationInstance.create({
      ...options,
      base: this,
      application: this,
    });
  }

  /**
    Start tracking an ApplicationInstance for this application.
    Used when the ApplicationInstance is created.

    @private
    @method _watchInstance
  */
  _watchInstance(instance: ApplicationInstance): void {
    this._applicationInstances.add(instance);
  }

  /**
    Stop tracking an ApplicationInstance for this application.
    Used when the ApplicationInstance is about to be destroyed.

    @private
    @method _unwatchInstance
  */
  _unwatchInstance(instance: ApplicationInstance) {
    return this._applicationInstances.delete(instance);
  }

  Router?: typeof Router;

  /**
    Enable the legacy globals mode by allowing this application to act
    as a global namespace. See the docs on the `_globalsMode` property
    for details.

    Most of these features are already deprecated in 1.x, so we can
    stop using them internally and try to remove them.

    @private
    @method _prepareForGlobalsMode
  */
  _prepareForGlobalsMode(): void {
    // Create subclass of Router for this Application instance.
    // This is to ensure that someone reopening `App.Router` does not
    // tamper with the default `Router`.
    this.Router = (this.Router || Router).extend() as typeof Router;

    this._buildDeprecatedInstance();
  }

  __deprecatedInstance__?: ApplicationInstance;
  __container__?: Container;

  /*
    Build the deprecated instance for legacy globals mode support.
    Called when creating and resetting the application.

    This is orthogonal to autoboot: the deprecated instance needs to
    be created at Application construction (not boot) time to expose
    App.__container__. If autoboot sees that this instance exists,
    it will continue booting it to avoid doing unncessary work (as
    opposed to building a new instance at boot time), but they are
    otherwise unrelated.

    @private
    @method _buildDeprecatedInstance
  */
  _buildDeprecatedInstance(): void {
    // Build a default instance
    let instance = this.buildInstance();

    // Legacy support for App.__container__ and other global methods
    // on App that rely on a single, default instance.
    this.__deprecatedInstance__ = instance;
    this.__container__ = instance.__container__;
  }

  /**
    Automatically kick-off the boot process for the application once the
    DOM has become ready.

    The initialization itself is scheduled on the actions queue which
    ensures that code-loading finishes before booting.

    If you are asynchronously loading code, you should call `deferReadiness()`
    to defer booting, and then call `advanceReadiness()` once all of your code
    has finished loading.

    @private
    @method waitForDOMReady
  */
  waitForDOMReady(): void {
    const document = this._document;

    // SAFETY: Casting as Document should be safe since we're just reading a property.
    // If it's not actually a Document then it will evaluate false which is fine for our
    // purposes.
    if (document === null || (document as Document).readyState !== 'loading') {
      schedule('actions', this, this.domReady);
    } else {
      // Ideally we'd just check `document instanceof Document` but currently some tests pass a fake document.
      assert(
        '[BUG] Called waitForDOMReady with an invalid document',
        (function (d: SimpleDocument | Document): d is Document {
          return typeof (d as Document).removeEventListener === 'function';
        })(document)
      );

      let callback = () => {
        document.removeEventListener('DOMContentLoaded', callback);
        run(this, this.domReady);
      };

      document.addEventListener('DOMContentLoaded', callback);
    }
  }

  /**
    This is the autoboot flow:

    1. Boot the app by calling `this.boot()`
    2. Create an instance (or use the `__deprecatedInstance__` in globals mode)
    3. Boot the instance by calling `instance.boot()`
    4. Invoke the `App.ready()` callback
    5. Kick-off routing on the instance

    Ideally, this is all we would need to do:

    ```javascript
    _autoBoot() {
      this.boot().then(() => {
        let instance = (this._globalsMode) ? this.__deprecatedInstance__ : this.buildInstance();
        return instance.boot();
      }).then((instance) => {
        App.ready();
        instance.startRouting();
      });
    }
    ```

    Unfortunately, we cannot actually write this because we need to participate
    in the "synchronous" boot process. While the code above would work fine on
    the initial boot (i.e. DOM ready), when `App.reset()` is called, we need to
    boot a new instance synchronously (see the documentation on `_bootSync()`
    for details).

    Because of this restriction, the actual logic of this method is located
    inside `didBecomeReady()`.

    @private
    @method domReady
  */
  domReady(): void {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    this._bootSync();

    // Continues to `didBecomeReady`
  }

  /**
    Use this to defer readiness until some condition is true.

    Example:

    ```javascript
    import Application from '@ember/application';

    let App = Application.create();

    App.deferReadiness();

    fetch('/auth-token')
    .then(response => response.json())
    .then(data => {
      App.token = data.token;
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
  deferReadiness(): void {
    assert(
      'You must call deferReadiness on an instance of Application',
      this instanceof Application
    );

    assert('You cannot defer readiness since application has already destroyed', !this.isDestroyed);

    assert(
      'You cannot defer readiness since the application is being destroyed',
      !this.isDestroying
    );

    assert(
      'You cannot defer readiness since the `ready()` hook has already been called',
      this._readinessDeferrals > 0
    );

    this._readinessDeferrals++;
  }

  /**
    Call `advanceReadiness` after any asynchronous setup logic has completed.
    Each call to `deferReadiness` must be matched by a call to `advanceReadiness`
    or the application will never become ready and routing will not begin.

    @method advanceReadiness
    @see {Application#deferReadiness}
    @public
  */
  advanceReadiness() {
    assert(
      'You must call advanceReadiness on an instance of Application',
      this instanceof Application
    );

    assert(
      'You cannot advance readiness since application has already destroyed',
      !this.isDestroyed
    );

    assert(
      'You cannot advance readiness since the application is being destroyed',
      !this.isDestroying
    );

    assert(
      'You cannot advance readiness since the `ready()` hook has already been called',
      this._readinessDeferrals > 0
    );

    this._readinessDeferrals--;

    if (this._readinessDeferrals === 0) {
      once(this, this.didBecomeReady);
    }
  }

  _bootPromise: Promise<this> | null = null;

  /**
    Initialize the application and return a promise that resolves with the `Application`
    object when the boot process is complete.

    Run any application initializers and run the application load hook. These hooks may
    choose to defer readiness. For example, an authentication hook might want to defer
    readiness until the auth token has been retrieved.

    By default, this method is called automatically on "DOM ready"; however, if autoboot
    is disabled, this is automatically called when the first application instance is
    created via `visit`.

    @public
    @method boot
    @return {Promise<Application,Error>}
  */
  boot(): Promise<this> {
    assert(
      'You cannot boot this application since it has already been destroyed',
      !this.isDestroyed
    );

    assert('You cannot boot this application since it is being destroyed', !this.isDestroying);

    if (this._bootPromise) {
      return this._bootPromise;
    }

    try {
      this._bootSync();
    } catch (_) {
      // Ignore the error: in the asynchronous boot path, the error is already reflected
      // in the promise rejection
    }

    assert('has boot promise', this._bootPromise);

    return this._bootPromise;
  }

  _bootResolver: ReturnType<(typeof RSVP)['defer']> | null = null;

  /**
    Unfortunately, a lot of existing code assumes the booting process is
    "synchronous". Specifically, a lot of tests assumes the last call to
    `app.advanceReadiness()` or `app.reset()` will result in the app being
    fully-booted when the current runloop completes.

    We would like new code (like the `visit` API) to stop making this assumption,
    so we created the asynchronous version above that returns a promise. But until
    we have migrated all the code, we would have to expose this method for use
    *internally* in places where we need to boot an app "synchronously".

    @private
  */
  _bootSync() {
    if (this._booted || this.isDestroying || this.isDestroyed) {
      return;
    }

    // Even though this returns synchronously, we still need to make sure the
    // boot promise exists for book-keeping purposes: if anything went wrong in
    // the boot process, we need to store the error as a rejection on the boot
    // promise so that a future caller of `boot()` can tell what failed.
    let defer = (this._bootResolver = RSVP.defer());
    this._bootPromise = defer.promise as Promise<this>;

    try {
      this.runInitializers();
      runLoadHooks('application', this);
      this.advanceReadiness();
      // Continues to `didBecomeReady`
    } catch (error) {
      // For the asynchronous boot path
      defer.reject(error);

      // For the synchronous boot path
      throw error;
    }
  }

  /**
    Reset the application. This is typically used only in tests. It cleans up
    the application in the following order:

    1. Deactivate existing routes
    2. Destroy all objects in the container
    3. Create a new application container
    4. Re-route to the existing url

    Typical Example:

    ```javascript
    import Application from '@ember/application';
    let App;

    run(function() {
      App = Application.create();
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
    import Application from '@ember/application';
    let App;

    run(function() {
      App = Application.create();
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
  */
  reset() {
    assert(
      'You cannot reset this application since it has already been destroyed',
      !this.isDestroyed
    );

    assert('You cannot reset this application since it is being destroyed', !this.isDestroying);

    assert(
      `Calling reset() on instances of \`Application\` is not
            supported when globals mode is disabled; call \`visit()\` to
            create new \`ApplicationInstance\`s and dispose them
            via their \`destroy()\` method instead.`,
      this._globalsMode && this.autoboot
    );

    let instance = this.__deprecatedInstance__;

    this._readinessDeferrals = 1;
    this._bootPromise = null;
    this._bootResolver = null;
    this._booted = false;

    function handleReset(this: Application) {
      assert('expected instance', instance);
      run(instance, 'destroy');
      this._buildDeprecatedInstance();
      schedule('actions', this, '_bootSync');
    }

    join(this, handleReset);
  }

  /**
    @private
    @method didBecomeReady
  */
  didBecomeReady() {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    assert('expected _bootResolver', this._bootResolver);

    try {
      // TODO: Is this still needed for _globalsMode = false?

      // See documentation on `_autoboot()` for details
      if (this.autoboot) {
        let instance;

        if (this._globalsMode) {
          // If we already have the __deprecatedInstance__ lying around, boot it to
          // avoid unnecessary work
          instance = this.__deprecatedInstance__;
          assert('expected instance', instance);
        } else {
          // Otherwise, build an instance and boot it. This is currently unreachable,
          // because we forced _globalsMode to === autoboot; but having this branch
          // allows us to locally toggle that flag for weeding out legacy globals mode
          // dependencies independently
          instance = this.buildInstance();
        }

        instance._bootSync();

        // TODO: App.ready() is not called when autoboot is disabled, is this correct?
        this.ready();

        instance.startRouting();
      }

      // For the asynchronous boot path
      this._bootResolver.resolve(this);

      // For the synchronous boot path
      this._booted = true;
    } catch (error) {
      // For the asynchronous boot path
      this._bootResolver.reject(error);

      // For the synchronous boot path
      throw error;
    }
  }

  /**
    Called when the Application has become ready, immediately before routing
    begins. The call will be delayed until the DOM has become ready.

    @event ready
    @public
  */
  ready() {
    return this;
  }

  // This method must be moved to the application instance object
  willDestroy() {
    super.willDestroy();

    if (_loaded['application'] === this) {
      _loaded['application'] = undefined;
    }

    if (this._applicationInstances.size) {
      this._applicationInstances.forEach((i) => i.destroy());
      this._applicationInstances.clear();
    }
  }

  /**
    Boot a new instance of `ApplicationInstance` for the current
    application and navigate it to the given `url`. Returns a `Promise` that
    resolves with the instance when the initial routing and rendering is
    complete, or rejects with any error that occurred during the boot process.

    When `autoboot` is disabled, calling `visit` would first cause the
    application to boot, which runs the application initializers.

    This method also takes a hash of boot-time configuration options for
    customizing the instance's behavior. See the documentation on
    `ApplicationInstance.BootOptions` for details.

    `ApplicationInstance.BootOptions` is an interface class that exists
    purely to document the available options; you do not need to construct it
    manually. Simply pass a regular JavaScript object containing of the
    desired options:

    ```javascript
    MyApp.visit("/", { location: "none", rootElement: "#container" });
    ```

    ### Supported Scenarios

    While the `BootOptions` class exposes a large number of knobs, not all
    combinations of them are valid; certain incompatible combinations might
    result in unexpected behavior.

    For example, booting the instance in the full browser environment
    while specifying a foreign `document` object (e.g. `{ isBrowser: true,
    document: iframe.contentDocument }`) does not work correctly today,
    largely due to Ember's jQuery dependency.

    Currently, there are three officially supported scenarios/configurations.
    Usages outside of these scenarios are not guaranteed to work, but please
    feel free to file bug reports documenting your experience and any issues
    you encountered to help expand support.

    #### Browser Applications (Manual Boot)

    The setup is largely similar to how Ember works out-of-the-box. Normally,
    Ember will boot a default instance for your Application on "DOM ready".
    However, you can customize this behavior by disabling `autoboot`.

    For example, this allows you to render a miniture demo of your application
    into a specific area on your marketing website:

    ```javascript
    import MyApp from 'my-app';

    $(function() {
      let App = MyApp.create({ autoboot: false });

      let options = {
        // Override the router's location adapter to prevent it from updating
        // the URL in the address bar
        location: 'none',

        // Override the default `rootElement` on the app to render into a
        // specific `div` on the page
        rootElement: '#demo'
      };

      // Start the app at the special demo URL
      App.visit('/demo', options);
    });
    ```

    Or perhaps you might want to boot two instances of your app on the same
    page for a split-screen multiplayer experience:

    ```javascript
    import MyApp from 'my-app';

    $(function() {
      let App = MyApp.create({ autoboot: false });

      let sessionId = MyApp.generateSessionID();

      let player1 = App.visit(`/matches/join?name=Player+1&session=${sessionId}`, { rootElement: '#left', location: 'none' });
      let player2 = App.visit(`/matches/join?name=Player+2&session=${sessionId}`, { rootElement: '#right', location: 'none' });

      Promise.all([player1, player2]).then(() => {
        // Both apps have completed the initial render
        $('#loading').fadeOut();
      });
    });
    ```

    Do note that each app instance maintains their own registry/container, so
    they will run in complete isolation by default.

    #### Server-Side Rendering (also known as FastBoot)

    This setup allows you to run your Ember app in a server environment using
    Node.js and render its content into static HTML for SEO purposes.

    ```javascript
    const HTMLSerializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

    function renderURL(url) {
      let dom = new SimpleDOM.Document();
      let rootElement = dom.body;
      let options = { isBrowser: false, document: dom, rootElement: rootElement };

      return MyApp.visit(options).then(instance => {
        try {
          return HTMLSerializer.serialize(rootElement.firstChild);
        } finally {
          instance.destroy();
        }
      });
    }
    ```

    In this scenario, because Ember does not have access to a global `document`
    object in the Node.js environment, you must provide one explicitly. In practice,
    in the non-browser environment, the stand-in `document` object only needs to
    implement a limited subset of the full DOM API. The `SimpleDOM` library is known
    to work.

    Since there is no DOM access in the non-browser environment, you must also
    specify a DOM `Element` object in the same `document` for the `rootElement` option
    (as opposed to a selector string like `"body"`).

    See the documentation on the `isBrowser`, `document` and `rootElement` properties
    on `ApplicationInstance.BootOptions` for details.

    #### Server-Side Resource Discovery

    This setup allows you to run the routing layer of your Ember app in a server
    environment using Node.js and completely disable rendering. This allows you
    to simulate and discover the resources (i.e. AJAX requests) needed to fulfill
    a given request and eagerly "push" these resources to the client.

    ```app/initializers/network-service.js
    import BrowserNetworkService from 'app/services/network/browser';
    import NodeNetworkService from 'app/services/network/node';

    // Inject a (hypothetical) service for abstracting all AJAX calls and use
    // the appropriate implementation on the client/server. This also allows the
    // server to log all the AJAX calls made during a particular request and use
    // that for resource-discovery purpose.

    export function initialize(application) {
      if (window) { // browser
        application.register('service:network', BrowserNetworkService);
      } else { // node
        application.register('service:network', NodeNetworkService);
      }
    };

    export default {
      name: 'network-service',
      initialize: initialize
    };
    ```

    ```app/routes/post.js
    import Route from '@ember/routing/route';
    import { service } from '@ember/service';

    // An example of how the (hypothetical) service is used in routes.

    export default class IndexRoute extends Route {
      @service network;

      model(params) {
        return this.network.fetch(`/api/posts/${params.post_id}.json`);
      }

      afterModel(post) {
        if (post.isExternalContent) {
          return this.network.fetch(`/api/external/?url=${post.externalURL}`);
        } else {
          return post;
        }
      }
    }
    ```

    ```javascript
    // Finally, put all the pieces together

    function discoverResourcesFor(url) {
      return MyApp.visit(url, { isBrowser: false, shouldRender: false }).then(instance => {
        let networkService = instance.lookup('service:network');
        return networkService.requests; // => { "/api/posts/123.json": "..." }
      });
    }
    ```

    @public
    @method visit
    @param url {String} The initial URL to navigate to
    @param options {ApplicationInstance.BootOptions}
    @return {Promise<ApplicationInstance, Error>}
  */
  visit(url: string, options: BootOptions) {
    assert(
      'You cannot visit this application since it has already been destroyed',
      !this.isDestroyed
    );

    assert('You cannot visit this application since it is being destroyed', !this.isDestroying);

    return this.boot().then(() => {
      let instance = this.buildInstance();

      return instance
        .boot(options)
        .then(() => instance.visit(url))
        .catch((error) => {
          run(instance, 'destroy');
          throw error;
        });
    });
  }
}

function commonSetupRegistry(registry: Registry) {
  registry.register('router:main', Router);
  registry.register('-view-registry:main', {
    create() {
      return dictionary(null);
    },
  });

  registry.register('route:basic', Route);
  registry.register('event_dispatcher:main', EventDispatcher);

  registry.register('location:hash', HashLocation);
  registry.register('location:history', HistoryLocation);
  registry.register('location:none', NoneLocation);

  registry.register(P`-bucket-cache:main`, {
    create() {
      return new BucketCache();
    },
  });

  registry.register('service:router', RouterService);
}

export { Application as default, _loaded, onLoad, runLoadHooks };
