declare module '@ember/engine/instance' {
  /**
    @module @ember/engine
    */
  import EmberObject from '@ember/object';
  import { RSVP } from '@ember/-internals/runtime';
  import { Registry } from '@ember/-internals/container';
  import { ENGINE_PARENT } from '@ember/engine/lib/engine-parent';
  import { ContainerProxyMixin, RegistryProxyMixin } from '@ember/-internals/runtime';
  import type { InternalOwner } from '@ember/-internals/owner';
  import type Owner from '@ember/-internals/owner';
  import { type FullName } from '@ember/-internals/owner';
  import Engine from '@ember/engine';
  import type Application from '@ember/application';
  import type { SimpleElement } from '@simple-dom/interface';
  export interface BootOptions {
    isBrowser?: boolean;
    shouldRender?: boolean;
    document?: Document | null;
    rootElement?: string | SimpleElement | null;
    location?: string | null;
    isInteractive?: boolean;
    _renderMode?: string;
  }
  export interface EngineInstanceOptions {
    mountPoint?: string;
    routable?: boolean;
  }
  /**
      The `EngineInstance` encapsulates all of the stateful aspects of a
      running `Engine`.

      @public
      @class EngineInstance
      @extends EmberObject
      @uses RegistryProxyMixin
      @uses ContainerProxyMixin
    */
  interface EngineInstance extends RegistryProxyMixin, ContainerProxyMixin, InternalOwner, Owner {}
  const EngineInstance_base: Readonly<typeof EmberObject> &
    (new (owner?: Owner | undefined) => EmberObject) &
    import('@ember/object/mixin').default;
  class EngineInstance extends EngineInstance_base {
    /**
         @private
         @method setupRegistry
         @param {Registry} registry
         @param {BootOptions} options
         */
    static setupRegistry(_registry: Registry, _options?: BootOptions): void;
    /**
          The base `Engine` for which this is an instance.
      
          @property {Engine} engine
          @private
        */
    base: Engine;
    application: Application;
    mountPoint?: string;
    routable?: boolean;
    [ENGINE_PARENT]?: EngineInstance;
    _booted: boolean;
    init(properties: object | undefined): void;
    _bootPromise: RSVP.Promise<this> | null;
    /**
          Initialize the `EngineInstance` and return a promise that resolves
          with the instance itself when the boot process is complete.
      
          The primary task here is to run any registered instance initializers.
      
          See the documentation on `BootOptions` for the options it takes.
      
          @public
          @method boot
          @param options {Object}
          @return {Promise<EngineInstance,Error>}
        */
    boot(options?: BootOptions): Promise<this>;
    /**
          Unfortunately, a lot of existing code assumes booting an instance is
          synchronous – specifically, a lot of tests assume the last call to
          `app.advanceReadiness()` or `app.reset()` will result in a new instance
          being fully-booted when the current runloop completes.
      
          We would like new code (like the `visit` API) to stop making this
          assumption, so we created the asynchronous version above that returns a
          promise. But until we have migrated all the code, we would have to expose
          this method for use *internally* in places where we need to boot an instance
          synchronously.
      
          @private
        */
    _bootSync(options?: BootOptions): this;
    setupRegistry(options?: BootOptions): void;
    /**
         Unregister a factory.
      
         Overrides `RegistryProxy#unregister` in order to clear any cached instances
         of the unregistered factory.
      
         @public
         @method unregister
         @param {String} fullName
         */
    unregister(fullName: FullName): void;
    /**
          Build a new `EngineInstance` that's a child of this instance.
      
          Engines must be registered by name with their parent engine
          (or application).
      
          @private
          @method buildChildEngineInstance
          @param name {String} the registered name of the engine.
          @param options {Object} options provided to the engine instance.
          @return {EngineInstance,Error}
        */
    buildChildEngineInstance(name: string, options?: EngineInstanceOptions): EngineInstance;
    /**
          Clone dependencies shared between an engine instance and its parent.
      
          @private
          @method cloneParentDependencies
        */
    cloneParentDependencies(): void;
  }
  export default EngineInstance;
}
