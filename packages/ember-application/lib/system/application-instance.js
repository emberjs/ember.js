/**
@module ember
@submodule ember-application
*/

import Ember from 'ember-metal';
import { deprecate } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import EmberObject from 'ember-runtime/system/object';
import run from 'ember-metal/run_loop';
import { computed } from 'ember-metal/computed';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';
import DOMHelper from 'ember-htmlbars/system/dom-helper';
import Registry from 'container/registry';
import RegistryProxy, { buildFakeRegistryWithDeprecations } from 'ember-runtime/mixins/registry_proxy';
import Renderer from 'ember-metal-views/renderer';
import assign from 'ember-metal/assign';
import environment from 'ember-metal/environment';
import jQuery from 'ember-views/system/jquery';


let BootOptions;

/**
  The `ApplicationInstance` encapsulates all of the stateful aspects of a
  running `Application`.

  At a high-level, we break application boot into two distinct phases:

  * Definition time, where all of the classes, templates, and other
    dependencies are loaded (typically in the browser).
  * Run time, where we begin executing the application once everything
    has loaded.

  Definition time can be expensive and only needs to happen once since it is
  an idempotent operation. For example, between test runs and FastBoot
  requests, the application stays the same. It is only the state that we want
  to reset.

  That state is what the `ApplicationInstance` manages: it is responsible for
  creating the container that contains all application state, and disposing of
  it once the particular test run or FastBoot request has finished.

  @public
  @class Ember.ApplicationInstance
  @extends Ember.Object
  @uses RegistryProxyMixin
  @uses ContainerProxyMixin
*/

let ApplicationInstance = EmberObject.extend(RegistryProxy, ContainerProxy, {
  /**
    The `Application` for which this is an instance.

    @property {Ember.Application} application
    @private
  */
  application: null,

  /**
    The DOM events for which the event dispatcher should listen.

    By default, the application's `Ember.EventDispatcher` listens
    for a set of standard DOM events, such as `mousedown` and
    `keyup`, and delegates them to your application's `Ember.View`
    instances.

    @private
    @property {Object} customEvents
  */
  customEvents: null,

  /**
    The root DOM element of the Application as an element or a
    [jQuery-compatible selector
    string](http://api.jquery.com/category/selectors/).

    @private
    @property {String|DOMElement} rootElement
  */
  rootElement: null,

  init() {
    this._super(...arguments);

    var application = get(this, 'application');

    if (!isEnabled('ember-application-visit')) {
      set(this, 'rootElement', get(application, 'rootElement'));
    }

    // Create a per-instance registry that will use the application's registry
    // as a fallback for resolving registrations.
    var applicationRegistry = get(application, '__registry__');
    var registry = this.__registry__ = new Registry({
      fallback: applicationRegistry
    });
    registry.normalizeFullName = applicationRegistry.normalizeFullName;
    registry.makeToString = applicationRegistry.makeToString;

    // Create a per-instance container from the instance's registry
    this.__container__ = registry.container();

    // Register this instance in the per-instance registry.
    //
    // Why do we need to register the instance in the first place?
    // Because we need a good way for the root route (a.k.a ApplicationRoute)
    // to notify us when it has created the root-most view. That view is then
    // appended to the rootElement, in the case of apps, to the fixture harness
    // in tests, or rendered to a string in the case of FastBoot.
    this.register('-application-instance:main', this, { instantiate: false });

    if (!isEnabled('ember-registry-container-reform')) {
      this.container = this.__container__;
      this.registry = this.__registry__;
    }

    this._booted = false;
  },

  /**
    Initialize the `Ember.ApplicationInstance` and return a promise that resolves
    with the instance itself when the boot process is complete.

    The primary task here is to run any registered instance initializers.

    See the documentation on `BootOptions` for the options it takes.

    @private
    @method boot
    @param options
    @return {Promise<Ember.ApplicationInstance,Error>}
  */
  boot(options = {}) {
    if (this._bootPromise) { return this._bootPromise; }

    this._bootPromise = new Ember.RSVP.Promise(resolve => resolve(this._bootSync(options)));

    return this._bootPromise;
  },

  /**
    Unfortunately, a lot of existing code assumes booting an instance is
    synchronous – specifically, a lot of tests assumes the last call to
    `app.advanceReadiness()` or `app.reset()` will result in a new instance
    being fully-booted when the current runloop completes.

    We would like new code (like the `visit` API) to stop making this assumption,
    so we created the asynchronous version above that returns a promise. But until
    we have migrated all the code, we would have to expose this method for use
    *internall* in places where we need to boot an instance synchronously.

    @private
  */
  _bootSync(options) {
    if (this._booted) { return this; }

    if (isEnabled('ember-application-visit')) {
      options = new BootOptions(options);

      let registry = this.__registry__;
      let environment = options.toEnvironment();

      set(this, '_environment', environment);

      registry.register('-environment:main', environment, { instantiate: false });

      registry.register('renderer:-dom', {
        create() {
          return new Renderer(new DOMHelper(options.document), options.interactive);
        }
      });

      if (options.rootElement) {
        set(this, 'rootElement', options.rootElement);
      } else {
        set(this, 'rootElement', get(this.application, 'rootElement'));
      }

      if (options.location) {
        let router = get(this, 'router');
        set(router, 'location', options.location);
      }

      this.application.runInstanceInitializers(this);

      if (options.interactive) {
        this.setupEventDispatcher();
      }
    } else {
      this.application.runInstanceInitializers(this);

      if (environment.hasDOM) {
        this.setupEventDispatcher();
      }
    }

    this._booted = true;

    return this;
  },

  router: computed(function() {
    return this.lookup('router:main');
  }).readOnly(),

  /**
    This hook is called by the root-most Route (a.k.a. the ApplicationRoute)
    when it has finished creating the root View. By default, we simply take the
    view and append it to the `rootElement` specified on the Application.

    In cases like FastBoot and testing, we can override this hook and implement
    custom behavior, such as serializing to a string and sending over an HTTP
    socket rather than appending to DOM.

    @param view {Ember.View} the root-most view
    @private
  */
  didCreateRootView(view) {
    view.appendTo(this.rootElement);
  },

  /**
    Tells the router to start routing. The router will ask the location for the
    current URL of the page to determine the initial URL to start routing to.
    To start the app at a specific URL, call `handleURL` instead.

    @private
  */
  startRouting() {
    var router = get(this, 'router');
    router.startRouting(isResolverModuleBased(this));
    this._didSetupRouter = true;
  },

  /**
    @private

    Sets up the router, initializing the child router and configuring the
    location before routing begins.

    Because setup should only occur once, multiple calls to `setupRouter`
    beyond the first call have no effect.
  */
  setupRouter() {
    if (this._didSetupRouter) { return; }
    this._didSetupRouter = true;

    var router = get(this, 'router');
    router.setupRouter(isResolverModuleBased(this));
  },

  /**
    Directs the router to route to a particular URL. This is useful in tests,
    for example, to tell the app to start at a particular URL.

    @param url {String} the URL the router should route to
    @private
  */
  handleURL(url) {
    var router = get(this, 'router');

    this.setupRouter();
    return router.handleURL(url);
  },

  /**
    @private
  */
  setupEventDispatcher() {
    var dispatcher = this.lookup('event_dispatcher:main');
    var applicationCustomEvents = get(this.application, 'customEvents');
    var instanceCustomEvents = get(this, 'customEvents');

    var customEvents = assign({}, applicationCustomEvents, instanceCustomEvents);
    dispatcher.setup(customEvents, this.rootElement);

    return dispatcher;
  },

  /**
    @private
  */
  willDestroy() {
    this._super(...arguments);
    run(this.__container__, 'destroy');
  }
});

if (isEnabled('ember-application-visit')) {
  ApplicationInstance.reopen({
    /**
      Returns the current URL of the app instance. This is useful when your
      app does not update the browsers URL bar (i.e. it uses the `'none'`
      location adapter).

      @public
      @return {String} the current URL
    */
    getURL() {
      let router = get(this, 'router');
      return get(router, 'url');
    },

    // `instance.visit(url)` should eventually replace `instance.handleURL()`;
    // the test helpers can probably be switched to use this implementation too

    /**
      Navigate the instance to a particular URL. This is useful in tests, for
      example, or to tell the app to start at a particular URL. This method
      returns a promise that resolves with the app instance when the transition
      is complete, or rejects if the transion was aborted due to an error.

      @public
      @param url {String} the destination URL
      @return {Promise}
    */
    visit(url) {
      this.setupRouter();

      let router = get(this, 'router');

      let handleResolve = () => {
        // Resolve only after rendering is complete
        return new Ember.RSVP.Promise((resolve) => {
          // TODO: why is this necessary? Shouldn't 'actions' queue be enough?
          // Also, aren't proimses supposed to be async anyway?
          run.next(null, resolve, this);
        });
      };

      let handleReject = (error) => {
        if (error.error) {
          throw error.error;
        } else if (error.name === 'TransitionAborted' && router.router.activeTransition) {
          return router.router.activeTransition.then(handleResolve, handleReject);
        } else if (error.name === 'TransitionAborted') {
          throw new Error(error.message);
        } else {
          throw error;
        }
      };

      // Keeps the location adapter's internal URL in-sync
      get(router, 'location').setURL(url);

      return router.handleURL(url).then(handleResolve, handleReject);
    }
  });

  /**
    A list of boot-time configuration options for customizing the behavior of
    an `Ember.ApplicationInstance`.

    This is an interface class that exists purely to document the available
    options; you do not need to construct it manually. Simply pass a regular
    JavaScript object containing the desired options into methods that require
    one of these options object:

    ```javascript
    MyApp.visit("/", { location: "none", rootElement: "#container" });
    ```

    Not all combinations of the supported options are valid. See the documentation
    on `Ember.Application#visit` for the supported configurations.

    Internal, experimental or otherwise unstable flags are marked as private.

    @class BootOptions
    @namespace @Ember.ApplicationInstance
    @public
  */
  BootOptions = function BootOptions(options) {
    options = options || {};

    /**
      Provide a specific instance of jQuery. This is useful in conjunction with
      the `document` option, as it allows you to use a copy of `jQuery` that is
      appropiately bound to the foriegn `document` (e.g. a jsdom).

      This is highly experimental and support very incomplete at the moment.

      @property jQuery
      @type Object
      @default auto-detected
      @private
    */
    this.jQuery = jQuery;

    /**
      Interactive mode: whether we need to set up event delegation and invoke
      lifecycle callbacks on Components.

      @property interactive
      @type boolean
      @default auto-detected
      @private
    */
    this.interactive = environment.hasDOM;

    /**
      Run in a full browser environment.

      When this flag is set to `false`, it will disable most browser-specific
      and interactive features. Specifically:

      * It does not use `jQuery` to append the root view; the `rootElement`
        (either specified as a subsequent option or on the applicatio itself)
        must already be an `Element` in the given `document` (as opposed to a
        string selector).

      * It does not set up an `EventDispatcher`.

      * It does not run any `Component` lifecycle hooks (such as `didInsertElement`).

      * It sets the `location` option to `"none"`. (If you would like to use
        the location adapter specified in the app's router instead, you can also
        specify `{ location: null }` to specifically opt-out.)

      @property browser
      @type boolean
      @default auto-detected
      @public
    */
    if (options.browser !== undefined) {
      this.browser = !!options.browser;
    } else {
      this.browser = environment.hasDOM;
    }

    if (!this.browser) {
      this.jQuery = null;
      this.interactive = false;
      this.location = 'none';
    }

    /**
      Disable rendering completely.

      When this flag is set to `true`, it will disable the entire rendering
      pipeline. Essentially, this puts the app into "routing-only" mode. No
      templates will be rendered, and no Components will be created.

      @property render
      @type boolean
      @default true
      @public
    */
    if (options.render !== undefined) {
      this.render = !!options.render;
    } else {
      this.render = true;
    }

    if (!this.render) {
      this.jQuery = null;
      this.interactive = false;
    }

    /**
      If present, render into the given `Document` object instead of the
      global `window.document` object.

      In practice, this is only useful in non-browser environment or in
      non-interactive mode, because Ember's `jQuery` dependency is
      implicitly bound to the current document, causing event delegation
      to not work properly when the app is rendered into a foreign
      document object (such as an iframe's `contentDocument`).

      In non-browser mode, this could be a "`Document`-like" object as
      Ember only interact with a small subset of the DOM API in non-
      interactive mode. While the exact requirements have not yet been
      formalized, the `SimpleDOM` library's implementation is known to
      work.

      @property document
      @type Document
      @default the global `document` object
      @public
    */
    if (options.document) {
      this.document = options.document;
    } else {
      this.document = document;
    }

    /**
      If present, overrides the application's `rootElement` property on
      the instance. This is useful for testing environment, where you
      might want to append the root view to a fixture area.

      In non-browser mode, because Ember does not have access to jQuery,
      this options must be specified as a DOM `Element` object instead of
      a selector string.

      See the documentation on `Ember.Applications`'s `rootElement` for
      details.

      @property rootElement
      @type String|Element
      @default null
      @public
     */
    if (options.rootElement) {
      this.rootElement = options.rootElement;
    }

    /**
      If present, overrides the router's `location` property with this
      value. This is useful for environments where trying to modify the
      URL would be inappropriate.

      @property location
      @type string
      @default null
      @public
    */
    if (options.location !== undefined) {
      this.location = options.location;
    }

    if (options.jQuery !== undefined) {
      this.jQuery = options.jQuery;
    }

    if (options.interactive !== undefined) {
      this.interactive = !!options.interactive;
    }
  };

  BootOptions.prototype.toEnvironment = function() {
    let env = assign({}, environment);
    env.hasDOM = this.browser;
    env.options = this;
    return env;
  };
}

function isResolverModuleBased(applicationInstance) {
  return !!applicationInstance.application.__registry__.resolver.moduleBasedResolver;
}

if (isEnabled('ember-registry-container-reform')) {
  Object.defineProperty(ApplicationInstance.prototype, 'container', {
    configurable: true,
    enumerable: false,
    get() {
      var instance = this;
      return {
        lookup() {
          deprecate(
            'Using `ApplicationInstance.container.lookup` is deprecated. Please use `ApplicationInstance.lookup` instead.',
            false, { id: 'ember-application.app-instance-container', until: '3.0.0' }
          );
          return instance.lookup(...arguments);
        }
      };
    }
  });

  Object.defineProperty(ApplicationInstance.prototype, 'registry', {
    configurable: true,
    enumerable: false,
    get() {
      return buildFakeRegistryWithDeprecations(this, 'ApplicationInstance');
    }
  });
}

export default ApplicationInstance;
