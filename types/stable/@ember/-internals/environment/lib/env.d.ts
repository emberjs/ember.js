declare module '@ember/-internals/environment/lib/env' {
  /**
      The hash of environment variables used to control various configuration
      settings. To specify your own or override default settings, add the
      desired properties to a global hash named `EmberENV` (or `ENV` for
      backwards compatibility with earlier versions of Ember). The `EmberENV`
      hash must be created before loading Ember.

      @class EmberENV
      @type Object
      @public
    */
  export const ENV: {
    ENABLE_OPTIONAL_FEATURES: boolean;
    /**
          Determines whether Ember should add to `Array`
          native object prototypes, a few extra methods in order to provide a more
          friendly API.
      
          We generally recommend leaving this option set to true however, if you need
          to turn it off, you can add the configuration property
          `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.
      
          Note, when disabled (the default configuration for Ember Addons), you will
          instead have to access all methods and functions from the Ember
          namespace.
      
          @property EXTEND_PROTOTYPES
          @type Boolean
          @default true
          @for EmberENV
          @public
        */
    EXTEND_PROTOTYPES: {
      Array: boolean;
    };
    /**
          The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
          a full stack trace during deprecation warnings.
      
          @property LOG_STACKTRACE_ON_DEPRECATION
          @type Boolean
          @default true
          @for EmberENV
          @public
        */
    LOG_STACKTRACE_ON_DEPRECATION: boolean;
    /**
          The `LOG_VERSION` property, when true, tells Ember to log versions of all
          dependent libraries in use.
      
          @property LOG_VERSION
          @type Boolean
          @default true
          @for EmberENV
          @public
        */
    LOG_VERSION: boolean;
    RAISE_ON_DEPRECATION: boolean;
    STRUCTURED_PROFILE: boolean;
    /**
          Whether to insert a `<div class="ember-view" />` wrapper around the
          application template. See RFC #280.
      
          This is not intended to be set directly, as the implementation may change in
          the future. Use `@ember/optional-features` instead.
      
          @property _APPLICATION_TEMPLATE_WRAPPER
          @for EmberENV
          @type Boolean
          @default true
          @private
        */
    _APPLICATION_TEMPLATE_WRAPPER: boolean;
    /**
          Whether to use Glimmer Component semantics (as opposed to the classic "Curly"
          components semantics) for template-only components. See RFC #278.
      
          This is not intended to be set directly, as the implementation may change in
          the future. Use `@ember/optional-features` instead.
      
          @property _TEMPLATE_ONLY_GLIMMER_COMPONENTS
          @for EmberENV
          @type Boolean
          @default false
          @private
        */
    _TEMPLATE_ONLY_GLIMMER_COMPONENTS: boolean;
    /**
          Whether to perform extra bookkeeping needed to make the `captureRenderTree`
          API work.
      
          This has to be set before the ember JavaScript code is evaluated. This is
          usually done by setting `window.EmberENV = { _DEBUG_RENDER_TREE: true };`
          before the "vendor" `<script>` tag in `index.html`.
      
          Setting the flag after Ember is already loaded will not work correctly. It
          may appear to work somewhat, but fundamentally broken.
      
          This is not intended to be set directly. Ember Inspector will enable the
          flag on behalf of the user as needed.
      
          This flag is always on in development mode.
      
          The flag is off by default in production mode, due to the cost associated
          with the the bookkeeping work.
      
          The expected flow is that Ember Inspector will ask the user to refresh the
          page after enabling the feature. It could also offer a feature where the
          user add some domains to the "always on" list. In either case, Ember
          Inspector will inject the code on the page to set the flag if needed.
      
          @property _DEBUG_RENDER_TREE
          @for EmberENV
          @type Boolean
          @default false
          @private
        */
    _DEBUG_RENDER_TREE: boolean;
    /**
          Whether the app defaults to using async observers.
      
          This is not intended to be set directly, as the implementation may change in
          the future. Use `@ember/optional-features` instead.
      
          @property _DEFAULT_ASYNC_OBSERVERS
          @for EmberENV
          @type Boolean
          @default false
          @private
        */
    _DEFAULT_ASYNC_OBSERVERS: boolean;
    /**
          Controls the maximum number of scheduled rerenders without "settling". In general,
          applications should not need to modify this environment variable, but please
          open an issue so that we can determine if a better default value is needed.
      
          @property _RERENDER_LOOP_LIMIT
          @for EmberENV
          @type number
          @default 1000
          @private
         */
    _RERENDER_LOOP_LIMIT: number;
    EMBER_LOAD_HOOKS: {
      [hook: string]: Function[];
    };
    FEATURES: {
      [feature: string]: boolean;
    };
  };
  export function getENV(): object;
}
