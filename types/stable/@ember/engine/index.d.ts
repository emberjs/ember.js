declare module '@ember/engine' {
  export { getEngineParent, setEngineParent } from '@ember/engine/lib/engine-parent';
  import Namespace from '@ember/application/namespace';
  import { Registry } from '@ember/-internals/container';
  import type { ResolverClass } from '@ember/-internals/container';
  import type { EngineInstanceOptions } from '@ember/engine/instance';
  import EngineInstance from '@ember/engine/instance';
  import { RegistryProxyMixin } from '@ember/-internals/runtime';
  export interface Initializer<T> {
    name: string;
    initialize: (target: T) => void;
    before?: string | string[];
    after?: string | string[];
  }
  /**
    @module @ember/engine
    */
  /**
      The `Engine` class contains core functionality for both applications and
      engines.

      Each engine manages a registry that's used for dependency injection and
      exposed through `RegistryProxy`.

      Engines also manage initializers and instance initializers.

      Engines can spawn `EngineInstance` instances via `buildInstance()`.

      @class Engine
      @extends Ember.Namespace
      @uses RegistryProxyMixin
      @public
    */
  interface Engine extends RegistryProxyMixin {}
  const Engine_base: Readonly<typeof Namespace> &
    (new (owner?: import('@ember/owner').default | undefined) => Namespace) &
    import('@ember/object/mixin').default;
  class Engine extends Engine_base {
    static initializers: Record<string, Initializer<Engine>>;
    static instanceInitializers: Record<string, Initializer<EngineInstance>>;
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
      
          ```app/initializer/named-initializer.js
          import { debug } from '@ember/debug';
      
          export function initialize() {
            debug('Running namedInitializer!');
          }
      
          export default {
            name: 'named-initializer',
            initialize
          };
          ```
      
          * `before` and `after` are used to ensure that this initializer is ran prior
          or after the one identified by the value. This value can be a single string
          or an array of strings, referencing the `name` of other initializers.
      
          An example of ordering initializers, we create an initializer named `first`:
      
          ```app/initializer/first.js
          import { debug } from '@ember/debug';
      
          export function initialize() {
            debug('First initializer!');
          }
      
          export default {
            name: 'first',
            initialize
          };
          ```
      
          ```bash
          // DEBUG: First initializer!
          ```
      
          We add another initializer named `second`, specifying that it should run
          after the initializer named `first`:
      
          ```app/initializer/second.js
          import { debug } from '@ember/debug';
      
          export function initialize() {
            debug('Second initializer!');
          }
      
          export default {
            name: 'second',
            after: 'first',
            initialize
          };
          ```
      
          ```
          // DEBUG: First initializer!
          // DEBUG: Second initializer!
          ```
      
          Afterwards we add a further initializer named `pre`, this time specifying
          that it should run before the initializer named `first`:
      
          ```app/initializer/pre.js
          import { debug } from '@ember/debug';
      
          export function initialize() {
            debug('Pre initializer!');
          }
      
          export default {
            name: 'pre',
            before: 'first',
            initialize
          };
          ```
      
          ```bash
          // DEBUG: Pre initializer!
          // DEBUG: First initializer!
          // DEBUG: Second initializer!
          ```
      
          Finally we add an initializer named `post`, specifying it should run after
          both the `first` and the `second` initializers:
      
          ```app/initializer/post.js
          import { debug } from '@ember/debug';
      
          export function initialize() {
            debug('Post initializer!');
          }
      
          export default {
            name: 'post',
            after: ['first', 'second'],
            initialize
          };
          ```
      
          ```bash
          // DEBUG: Pre initializer!
          // DEBUG: First initializer!
          // DEBUG: Second initializer!
          // DEBUG: Post initializer!
          ```
      
          * `initialize` is a callback function that receives one argument,
            `application`, on which you can operate.
      
          Example of using `application` to register an adapter:
      
          ```app/initializer/api-adapter.js
          import ApiAdapter from '../utils/api-adapter';
      
          export function initialize(application) {
            application.register('api-adapter:main', ApiAdapter);
          }
      
          export default {
            name: 'post',
            after: ['first', 'second'],
            initialize
          };
          ```
      
          @method initializer
          @param initializer {Object}
          @public
        */
    static initializer: (this: typeof Engine, initializer: Initializer<Engine>) => void;
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
      
          ```app/initializer/named-instance-initializer.js
          import { debug } from '@ember/debug';
      
          export function initialize() {
            debug('Running named-instance-initializer!');
          }
      
          export default {
            name: 'named-instance-initializer',
            initialize
          };
          ```
      
          * `before` and `after` are used to ensure that this initializer is ran prior
          or after the one identified by the value. This value can be a single string
          or an array of strings, referencing the `name` of other initializers.
      
          * See Application.initializer for discussion on the usage of before
          and after.
      
          Example instanceInitializer to preload data into the store.
      
          ```app/initializer/preload-data.js
      
          export function initialize(application) {
              var userConfig, userConfigEncoded, store;
              // We have a HTML escaped JSON representation of the user's basic
              // configuration generated server side and stored in the DOM of the main
              // index.html file. This allows the app to have access to a set of data
              // without making any additional remote calls. Good for basic data that is
              // needed for immediate rendering of the page. Keep in mind, this data,
              // like all local models and data can be manipulated by the user, so it
              // should not be relied upon for security or authorization.
      
              // Grab the encoded data from the meta tag
              userConfigEncoded = document.querySelector('head meta[name=app-user-config]').attr('content');
      
              // Unescape the text, then parse the resulting JSON into a real object
              userConfig = JSON.parse(unescape(userConfigEncoded));
      
              // Lookup the store
              store = application.lookup('service:store');
      
              // Push the encoded JSON into the store
              store.pushPayload(userConfig);
          }
      
          export default {
            name: 'named-instance-initializer',
            initialize
          };
          ```
      
          @method instanceInitializer
          @param instanceInitializer
          @public
        */
    static instanceInitializer: (
      this: typeof Engine,
      initializer: Initializer<EngineInstance>
    ) => void;
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
    static buildRegistry(namespace: Engine): Registry;
    /**
          Set this to provide an alternate class to `DefaultResolver`
      
          @property resolver
          @public
        */
    Resolver: ResolverClass;
    init(properties: object | undefined): void;
    /**
          A private flag indicating whether an engine's initializers have run yet.
      
          @private
          @property _initializersRan
        */
    _initializersRan: boolean;
    /**
          Ensure that initializers are run once, and only once, per engine.
      
          @private
          @method ensureInitializers
        */
    ensureInitializers(): void;
    /**
          Create an EngineInstance for this engine.
      
          @public
          @method buildInstance
          @return {EngineInstance} the engine instance
        */
    buildInstance(options?: EngineInstanceOptions): EngineInstance;
    /**
          Build and configure the registry for the current engine.
      
          @private
          @method buildRegistry
          @return {Ember.Registry} the configured registry
        */
    buildRegistry(): Registry;
    /**
          @private
          @method initializer
        */
    initializer(initializer: Initializer<Engine>): void;
    /**
          @private
          @method instanceInitializer
        */
    instanceInitializer(initializer: Initializer<EngineInstance>): void;
    /**
          @private
          @method runInitializers
        */
    runInitializers(): void;
    /**
          @private
          @since 1.12.0
          @method runInstanceInitializers
        */
    runInstanceInitializers<T extends EngineInstance>(instance: T): void;
    _runInitializer<
      B extends 'initializers' | 'instanceInitializers',
      T extends B extends 'initializers' ? Engine : EngineInstance
    >(bucketName: B, cb: (name: string, initializer: Initializer<T> | undefined) => void): void;
  }
  /** @internal */
  export function buildInitializerMethod<
    B extends 'initializers' | 'instanceInitializers',
    T extends B extends 'initializers' ? Engine : EngineInstance
  >(bucketName: B, humanName: string): (this: typeof Engine, initializer: Initializer<T>) => void;
  export default Engine;
}
