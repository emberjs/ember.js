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
import Registry from 'container/registry';
import RegistryProxy, { buildFakeRegistryWithDeprecations } from 'ember-runtime/mixins/registry_proxy';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';
import assign from 'ember-metal/assign';
import environment from 'ember-metal/environment';

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
  },

  _bootOptions: null,
  _bootPromise: null,
  _booted: false,

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
  boot(options) {
    if (this._bootPromise) { return this._bootPromise; }

    let defer = new Ember.RSVP.defer();
    let promise = this._bootPromise = defer.promise;

    try {
      defer.resolve(this._bootSync(options));
    } catch(e) {
      defer.reject(e);
    }

    return promise;
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
      set(this, '_bootOptions', options);

      if (options.rootElement) {
        set(this, 'rootElement', options.rootElement);
      } else {
        set(this, 'rootElement', get(this.application, 'rootElement'));
      }

      if (options.location) {
        let router = get(this, 'router');
        set(router, 'location', options.location);
      }

      if (typeof options.didCreateRootView === 'function') {
        this.didCreateRootView = options.didCreateRootView;
      }

      this.application.runInstanceInitializers(this);

      if (options.hasDOM) {
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
    for example, to tell the app to start at a particular URL. Ensure that you
    have called `setupRouter()` before calling this method.

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
  /**
    A list of options one can pass into `boot()` to override certain behavior on
    the instance. It is currently a laundary list of whatever we happen to need to
    override in FastBoot (and tests?), but we should eventually clean this up and
    formalize it. All options are optional.

    @class BootOptions
    @namespace @Ember.ApplicationInstance
    @private
  */
  BootOptions = function BootOptions(options) {
    options = options || {};

    /**
      If present, overrides the `rootElement` property on the instance. This is useful
      for testing environment, where you might want to append the root view to a fixture
      area.

      @property rootElement
      @property {String|DOMElement} rootElement
      @default null
      @private
     */
    if (options.rootElement) {
      this.rootElement = options.rootElement;
    }

    /**
      If present, overrides the router's `location` property with this value. This
      is useful for FastBoot or testing environments, where trying to modify the URL
      would be inappropriate.

      @property location
      @type string
      @default null
      @private
    */
    this.location = options.location;

    /**
      If present, overrides the `didCreateRootView` method on the instance. See the
      documentation on `didCreateRootView` for details.

      @property didCreateRootView
      @type Function
      @default null
      @private
    */
    this.didCreateRootView = options.didCreateRootView;

    /**
      Whether this instance will be used in a browser environment; this controls
      whether we need to setup the event dispatcher.

      Delegates to `environment.hasDOM` if not specified.

      @property hasDOM
      @type boolean
      @default environment.hasDOM
      @private
    */
    if (options.hasDOM === undefined) {
      this.hasDOM = environment.hasDOM;
    } else {
      this.hasDOM = !!options.hasDOM;
    }
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
