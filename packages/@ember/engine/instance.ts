/**
@module @ember/engine
*/

import { Object as EmberObject, RSVP } from '@ember/-internals/runtime';
import { assert } from '@ember/debug';
import EmberError from '@ember/error';
import { Registry, privatize as P } from '@ember/-internals/container';
import { guidFor } from '@ember/-internals/utils';
import { ENGINE_PARENT, getEngineParent, setEngineParent } from './lib/engine-parent';
import RegistryProxyMixin from '@ember/-internals/runtime/lib/mixins/registry_proxy';
import ContainerProxyMixin from '@ember/-internals/runtime/lib/mixins/container_proxy';
import { isFactory } from '@ember/-internals/owner';
import Engine from '.';
import type Application from '@ember/application';
import { type BootOptions } from '@ember/application/instance';
import { type BootEnvironment } from '@ember/-internals/glimmer/lib/views/outlet';

const CEngine = Engine;

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

interface EngineInstance extends RegistryProxyMixin, ContainerProxyMixin {}
class EngineInstance extends EmberObject.extend(RegistryProxyMixin, ContainerProxyMixin) {
  /**
   @private
   @method setupRegistry
   @param {Registry} registry
   @param {BootOptions} options
   */
  static setupRegistry(_registry: Registry, _options?: BootOptions) {}

  /**
    The base `Engine` for which this is an instance.

    @property {Engine} engine
    @private
  */
  declare base: Engine;

  declare application: Application;

  declare mountPoint?: string;
  declare routable?: boolean;

  [ENGINE_PARENT]?: EngineInstance;

  _booted = false;

  init(properties: object | undefined) {
    super.init(properties);

    // Ensure the guid gets setup for this instance
    guidFor(this);

    this.base ??= this.application;

    // Create a per-instance registry that will use the application's registry
    // as a fallback for resolving registrations.
    let registry = (this.__registry__ = new Registry({
      fallback: this.base.__registry__,
    }));

    // Create a per-instance container from the instance's registry
    this.__container__ = registry.container({ owner: this });

    this._booted = false;
  }

  _bootPromise: RSVP.Promise<this> | null = null;

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
  boot(options?: BootOptions): Promise<this> {
    if (this._bootPromise) {
      return this._bootPromise;
    }

    this._bootPromise = new RSVP.Promise((resolve) => {
      resolve(this._bootSync(options));
    });

    return this._bootPromise;
  }

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
  _bootSync(options?: BootOptions): this {
    if (this._booted) {
      return this;
    }

    assert(
      "An engine instance's parent must be set via `setEngineParent(engine, parent)` prior to calling `engine.boot()`.",
      getEngineParent(this)
    );

    this.cloneParentDependencies();

    this.setupRegistry(options);

    this.base.runInstanceInitializers(this);

    this._booted = true;

    return this;
  }

  setupRegistry(
    options: BootOptions = this.__container__.lookup('-environment:main') as BootEnvironment
  ) {
    (this.constructor as typeof EngineInstance).setupRegistry(this.__registry__, options);
  }

  /**
   Unregister a factory.

   Overrides `RegistryProxy#unregister` in order to clear any cached instances
   of the unregistered factory.

   @public
   @method unregister
   @param {String} fullName
   */
  unregister(fullName: string) {
    this.__container__.reset(fullName);

    // We overwrote this method from RegistryProxyMixin.
    this.__registry__.unregister(fullName);
  }

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
  buildChildEngineInstance(name: string, options: EngineInstanceOptions = {}) {
    let Engine = this.lookup(`engine:${name}`);

    if (!Engine) {
      throw new EmberError(
        `You attempted to mount the engine '${name}', but it is not registered with its parent.`
      );
    }

    assert('expected an Engine', Engine instanceof CEngine);

    let engineInstance = Engine.buildInstance(options);

    setEngineParent(engineInstance, this);

    return engineInstance;
  }

  /**
    Clone dependencies shared between an engine instance and its parent.

    @private
    @method cloneParentDependencies
  */
  cloneParentDependencies() {
    const parent = getEngineParent(this);

    assert('expected parent', parent);

    let registrations = ['route:basic', 'service:-routing'];

    registrations.forEach((key) => {
      let registration = parent.resolveRegistration(key);
      assert('expected registration to be a factory', isFactory(registration));
      this.register(key, registration);
    });

    let env = parent.lookup('-environment:main') as Record<string, unknown>;
    this.register('-environment:main', env, { instantiate: false });

    let singletons = [
      'router:main',
      P`-bucket-cache:main`,
      '-view-registry:main',
      `renderer:-dom`,
      'service:-document',
    ];

    if (env['isInteractive']) {
      singletons.push('event_dispatcher:main');
    }

    singletons.forEach((key) => {
      // SAFETY: We already expect this to be a singleton
      let singleton = parent.lookup(key) as object;
      this.register(key, singleton, { instantiate: false });
    });
  }
}

export default EngineInstance;
