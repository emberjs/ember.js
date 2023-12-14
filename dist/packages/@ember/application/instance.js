/**
@module @ember/application
*/
import { get, set } from '@ember/object';
import * as environment from '@ember/-internals/browser-environment';
import EngineInstance from '@ember/engine/instance';
import { renderSettled } from '@ember/-internals/glimmer';
import { assert } from '@ember/debug';
import Router from '@ember/routing/router';
import { EventDispatcher } from '@ember/-internals/views';
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
  @class ApplicationInstance
  @extends EngineInstance
*/
class ApplicationInstance extends EngineInstance {
  constructor() {
    super(...arguments);
    /**
      The root DOM element of the Application as an element or a
      CSS selector.
             @private
      @property {String|DOMElement} rootElement
    */
    this.rootElement = null;
  }
  init(properties) {
    super.init(properties);
    this.application._watchInstance(this);
    // Register this instance in the per-instance registry.
    //
    // Why do we need to register the instance in the first place?
    // Because we need a good way for the root route (a.k.a ApplicationRoute)
    // to notify us when it has created the root-most view. That view is then
    // appended to the rootElement, in the case of apps, to the fixture harness
    // in tests, or rendered to a string in the case of FastBoot.
    this.register('-application-instance:main', this, {
      instantiate: false
    });
  }
  /**
    Overrides the base `EngineInstance._bootSync` method with concerns relevant
    to booting application (instead of engine) instances.
       This method should only contain synchronous boot concerns. Asynchronous
    boot concerns should eventually be moved to the `boot` method, which
    returns a promise.
       Until all boot code has been made asynchronous, we need to continue to
    expose this method for use *internally* in places where we need to boot an
    instance synchronously.
       @private
  */
  _bootSync(options) {
    if (this._booted) {
      return this;
    }
    options = new _BootOptions(options);
    this.setupRegistry(options);
    if (options.rootElement) {
      this.rootElement = options.rootElement;
    } else {
      this.rootElement = this.application.rootElement;
    }
    if (options.location) {
      set(this.router, 'location', options.location);
    }
    this.application.runInstanceInitializers(this);
    if (options.isInteractive) {
      this.setupEventDispatcher();
    }
    this._booted = true;
    return this;
  }
  setupRegistry(options) {
    this.constructor.setupRegistry(this.__registry__, options);
  }
  get router() {
    if (!this._router) {
      let router = this.lookup('router:main');
      assert('expected an instance of Router', router instanceof Router);
      this._router = router;
    }
    return this._router;
  }
  /**
    This hook is called by the root-most Route (a.k.a. the ApplicationRoute)
    when it has finished creating the root View. By default, we simply take the
    view and append it to the `rootElement` specified on the Application.
       In cases like FastBoot and testing, we can override this hook and implement
    custom behavior, such as serializing to a string and sending over an HTTP
    socket rather than appending to DOM.
       @param view {Ember.View} the root-most view
    @deprecated
    @private
  */
  didCreateRootView(view) {
    view.appendTo(this.rootElement);
  }
  /**
    Tells the router to start routing. The router will ask the location for the
    current URL of the page to determine the initial URL to start routing to.
    To start the app at a specific URL, call `handleURL` instead.
       @private
  */
  startRouting() {
    this.router.startRouting();
  }
  /**
    Sets up the router, initializing the child router and configuring the
    location before routing begins.
       Because setup should only occur once, multiple calls to `setupRouter`
    beyond the first call have no effect.
       This is commonly used in order to confirm things that rely on the router
    are functioning properly from tests that are primarily rendering related.
       For example, from within [ember-qunit](https://github.com/emberjs/ember-qunit)'s
    `setupRenderingTest` calling `this.owner.setupRouter()` would allow that
    rendering test to confirm that any `<LinkTo></LinkTo>`'s that are rendered
    have the correct URL.
       @public
  */
  setupRouter() {
    this.router.setupRouter();
  }
  /**
    Directs the router to route to a particular URL. This is useful in tests,
    for example, to tell the app to start at a particular URL.
       @param url {String} the URL the router should route to
    @private
  */
  handleURL(url) {
    this.setupRouter();
    return this.router.handleURL(url);
  }
  /**
    @private
  */
  setupEventDispatcher() {
    let dispatcher = this.lookup('event_dispatcher:main');
    assert('expected EventDispatcher', dispatcher instanceof EventDispatcher);
    let applicationCustomEvents = get(this.application, 'customEvents');
    let instanceCustomEvents = get(this, 'customEvents');
    let customEvents = Object.assign({}, applicationCustomEvents, instanceCustomEvents);
    assert('[BUG] Tried to set up dispatcher with an invalid root element', this.rootElement === null || typeof this.rootElement === 'string' || this.rootElement instanceof Element);
    dispatcher.setup(customEvents, this.rootElement);
    return dispatcher;
  }
  /**
    Returns the current URL of the app instance. This is useful when your
    app does not update the browsers URL bar (i.e. it uses the `'none'`
    location adapter).
       @public
    @return {String} the current URL
  */
  getURL() {
    return this.router.url;
  }
  // `instance.visit(url)` should eventually replace `instance.handleURL()`;
  // the test helpers can probably be switched to use this implementation too
  /**
    Navigate the instance to a particular URL. This is useful in tests, for
    example, or to tell the app to start at a particular URL. This method
    returns a promise that resolves with the app instance when the transition
    is complete, or rejects if the transition was aborted due to an error.
       @public
    @param url {String} the destination URL
    @return {Promise<ApplicationInstance>}
  */
  visit(url) {
    this.setupRouter();
    let bootOptions = this.__container__.lookup('-environment:main');
    let router = this.router;
    let handleTransitionResolve = () => {
      if (!bootOptions.options.shouldRender) {
        // No rendering is needed, and routing has completed, simply return.
        return this;
      } else {
        // Ensure that the visit promise resolves when all rendering has completed
        return renderSettled().then(() => this);
      }
    };
    let handleTransitionReject = error => {
      if (error.error && error.error instanceof Error) {
        throw error.error;
      } else if (error.name === 'TransitionAborted' && router._routerMicrolib.activeTransition) {
        return router._routerMicrolib.activeTransition.then(handleTransitionResolve, handleTransitionReject);
      } else if (error.name === 'TransitionAborted') {
        throw new Error(error.message);
      } else {
        throw error;
      }
    };
    let location = get(router, 'location');
    assert('location has been initialized', typeof location !== 'string');
    // Keeps the location adapter's internal URL in-sync
    location.setURL(url);
    // getURL returns the set url with the rootURL stripped off
    return router.handleURL(location.getURL()).then(handleTransitionResolve, handleTransitionReject);
  }
  willDestroy() {
    super.willDestroy();
    this.application._unwatchInstance(this);
  }
  /**
   @private
   @method setupRegistry
   @param {Registry} registry
   @param {BootOptions} options
  */
  static setupRegistry(registry, options = {}) {
    let coptions = options instanceof _BootOptions ? options : new _BootOptions(options);
    registry.register('-environment:main', coptions.toEnvironment(), {
      instantiate: false
    });
    registry.register('service:-document', coptions.document, {
      instantiate: false
    });
    super.setupRegistry(registry, coptions);
  }
}
/**
  A list of boot-time configuration options for customizing the behavior of
  an `ApplicationInstance`.

  This is an interface class that exists purely to document the available
  options; you do not need to construct it manually. Simply pass a regular
  JavaScript object containing the desired options into methods that require
  one of these options object:

  ```javascript
  MyApp.visit("/", { location: "none", rootElement: "#container" });
  ```

  Not all combinations of the supported options are valid. See the documentation
  on `Application#visit` for the supported configurations.

  Internal, experimental or otherwise unstable flags are marked as private.

  @class BootOptions
  @namespace ApplicationInstance
  @public
*/
class _BootOptions {
  constructor(options = {}) {
    /**
      If present, overrides the router's `location` property with this
      value. This is useful for environments where trying to modify the
      URL would be inappropriate.
             @property location
      @type string
      @default null
      @public
    */
    this.location = null;
    this.isInteractive = Boolean(environment.hasDOM); // This default is overridable below
    this._renderMode = options._renderMode;
    if (options.isBrowser !== undefined) {
      this.isBrowser = Boolean(options.isBrowser);
    } else {
      this.isBrowser = Boolean(environment.hasDOM);
    }
    if (!this.isBrowser) {
      this.isInteractive = false;
      this.location = 'none';
    }
    if (options.shouldRender !== undefined) {
      this.shouldRender = Boolean(options.shouldRender);
    } else {
      this.shouldRender = true;
    }
    if (!this.shouldRender) {
      this.isInteractive = false;
    }
    if (options.document) {
      this.document = options.document;
    } else {
      this.document = typeof document !== 'undefined' ? document : null;
    }
    if (options.rootElement) {
      this.rootElement = options.rootElement;
    }
    // Set these options last to give the user a chance to override the
    // defaults from the "combo" options like `isBrowser` (although in
    // practice, the resulting combination is probably invalid)
    if (options.location !== undefined) {
      this.location = options.location;
    }
    if (options.isInteractive !== undefined) {
      this.isInteractive = Boolean(options.isInteractive);
    }
  }
  toEnvironment() {
    // Do we really want to assign all of this!?
    return {
      ...environment,
      // For compatibility with existing code
      hasDOM: this.isBrowser,
      isInteractive: this.isInteractive,
      _renderMode: this._renderMode,
      options: this
    };
  }
}
export default ApplicationInstance;