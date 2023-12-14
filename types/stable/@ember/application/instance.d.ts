declare module '@ember/application/instance' {
  /**
    @module @ember/application
    */
  import EngineInstance from '@ember/engine/instance';
  import type { BootOptions } from '@ember/engine/instance';
  import type Application from '@ember/application';
  import type { BootEnvironment } from '@ember/-internals/glimmer';
  import Router from '@ember/routing/router';
  import type { ViewMixin } from '@ember/-internals/views';
  import { EventDispatcher } from '@ember/-internals/views';
  import type { Registry } from '@ember/-internals/container';
  import type { SimpleElement } from '@simple-dom/interface';
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
    /**
          The `Application` for which this is an instance.
      
          @property {Application} application
          @private
        */
    application: Application;
    /**
          The root DOM element of the Application as an element or a
          CSS selector.
      
          @private
          @property {String|DOMElement} rootElement
        */
    rootElement: string | Element | SimpleElement | null;
    customEvents: Record<string, string | null> | null;
    init(properties: object | undefined): void;
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
    _bootSync(options?: BootOptions): this;
    setupRegistry(options: BootOptions): void;
    _router?: Router;
    get router(): Router;
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
    didCreateRootView(view: ViewMixin): void;
    /**
          Tells the router to start routing. The router will ask the location for the
          current URL of the page to determine the initial URL to start routing to.
          To start the app at a specific URL, call `handleURL` instead.
      
          @private
        */
    startRouting(): void;
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
    setupRouter(): void;
    /**
          Directs the router to route to a particular URL. This is useful in tests,
          for example, to tell the app to start at a particular URL.
      
          @param url {String} the URL the router should route to
          @private
        */
    handleURL(
      url: string
    ): import('router_js').InternalTransition<import('@ember/routing/route').default<unknown>>;
    /**
          @private
        */
    setupEventDispatcher(): EventDispatcher;
    /**
          Returns the current URL of the app instance. This is useful when your
          app does not update the browsers URL bar (i.e. it uses the `'none'`
          location adapter).
      
          @public
          @return {String} the current URL
        */
    getURL(): string;
    /**
          Navigate the instance to a particular URL. This is useful in tests, for
          example, or to tell the app to start at a particular URL. This method
          returns a promise that resolves with the app instance when the transition
          is complete, or rejects if the transition was aborted due to an error.
      
          @public
          @param url {String} the destination URL
          @return {Promise<ApplicationInstance>}
        */
    visit(url: string): import('rsvp').Promise<unknown>;
    willDestroy(): void;
    /**
         @private
         @method setupRegistry
         @param {Registry} registry
         @param {BootOptions} options
        */
    static setupRegistry(registry: Registry, options?: BootOptions | _BootOptions): void;
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
    /**
          Interactive mode: whether we need to set up event delegation and invoke
          lifecycle callbacks on Components.
      
          @property isInteractive
          @type boolean
          @default auto-detected
          @private
        */
    readonly isInteractive: boolean;
    /**
          @property _renderMode
          @type string
          @default undefined
          @private
        */
    readonly _renderMode?: string;
    /**
          Run in a full browser environment.
      
          When this flag is set to `false`, it will disable most browser-specific
          and interactive features. Specifically:
      
          * It does not use `jQuery` to append the root view; the `rootElement`
            (either specified as a subsequent option or on the application itself)
            must already be an `Element` in the given `document` (as opposed to a
            string selector).
      
          * It does not set up an `EventDispatcher`.
      
          * It does not run any `Component` lifecycle hooks (such as `didInsertElement`).
      
          * It sets the `location` option to `"none"`. (If you would like to use
            the location adapter specified in the app's router instead, you can also
            specify `{ location: null }` to specifically opt-out.)
      
          @property isBrowser
          @type boolean
          @default auto-detected
          @public
        */
    readonly isBrowser: boolean;
    /**
          If present, overrides the router's `location` property with this
          value. This is useful for environments where trying to modify the
          URL would be inappropriate.
      
          @property location
          @type string
          @default null
          @public
        */
    readonly location: string | null;
    /**
          Disable rendering completely.
      
          When this flag is set to `false`, it will disable the entire rendering
          pipeline. Essentially, this puts the app into "routing-only" mode. No
          templates will be rendered, and no Components will be created.
      
          @property shouldRender
          @type boolean
          @default true
          @public
        */
    readonly shouldRender: boolean;
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
    readonly document: Document | null;
    /**
          If present, overrides the application's `rootElement` property on
          the instance. This is useful for testing environment, where you
          might want to append the root view to a fixture area.
      
          In non-browser mode, because Ember does not have access to jQuery,
          this options must be specified as a DOM `Element` object instead of
          a selector string.
      
          See the documentation on `Application`'s `rootElement` for
          details.
      
          @property rootElement
          @type String|Element
          @default null
          @public
        */
    readonly rootElement?: string | SimpleElement;
    constructor(options?: BootOptions);
    toEnvironment(): BootEnvironment;
  }
  export default ApplicationInstance;
}
