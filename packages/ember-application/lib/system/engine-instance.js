/**
@module @ember/engine
*/

import { guidFor } from 'ember-utils';
import {
  Object as EmberObject,
  ContainerProxyMixin,
  RegistryProxyMixin,
  RSVP
} from 'ember-runtime';
import { assert, Error as EmberError } from 'ember-debug';
import { run } from 'ember-metal';
import { Registry, privatize as P } from 'container';
import { getEngineParent, setEngineParent } from './engine-parent';

/**
  The `EngineInstance` encapsulates all of the stateful aspects of a
  running `Engine`.

  @public
  @class EngineInstance
  @extends EmberObject
  @uses RegistryProxyMixin
  @uses ContainerProxyMixin
*/

const EngineInstance = EmberObject.extend(RegistryProxyMixin, ContainerProxyMixin, {
  /**
    The base `Engine` for which this is an instance.

    @property {Ember.Engine} engine
    @private
  */
  base: null,

  init() {
    this._super(...arguments);

    guidFor(this);

    let base = this.base;

    if (!base) {
      base = this.application;
      this.base = base;
    }

    // Create a per-instance registry that will use the application's registry
    // as a fallback for resolving registrations.
    let registry = this.__registry__ = new Registry({
      fallback: base.__registry__
    });

    // Create a per-instance container from the instance's registry
    this.__container__ = registry.container({ owner: this });

    this._booted = false;
  },

  /**
    Initialize the `Ember.EngineInstance` and return a promise that resolves
    with the instance itself when the boot process is complete.

    The primary task here is to run any registered instance initializers.

    See the documentation on `BootOptions` for the options it takes.

    @private
    @method boot
    @param options {Object}
    @return {Promise<Ember.EngineInstance,Error>}
  */
  boot(options) {
    if (this._bootPromise) { return this._bootPromise; }

    this._bootPromise = new RSVP.Promise(resolve => resolve(this._bootSync(options)));

    return this._bootPromise;
  },

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
  _bootSync(options) {
    if (this._booted) { return this; }

    assert('An engine instance\'s parent must be set via `setEngineParent(engine, parent)` prior to calling `engine.boot()`.', getEngineParent(this));

    this.cloneParentDependencies();

    this.setupRegistry(options);

    this.base.runInstanceInitializers(this);

    this._booted = true;

    return this;
  },

  setupRegistry(options = this.__container__.lookup('-environment:main')) {
    this.constructor.setupRegistry(this.__registry__, options);
  },

  /**
   Unregister a factory.

   Overrides `RegistryProxy#unregister` in order to clear any cached instances
   of the unregistered factory.

   @public
   @method unregister
   @param {String} fullName
   */
  unregister(fullName) {
    this.__container__.reset(fullName);
    this._super(...arguments);
  },

  /**
    Build a new `Ember.EngineInstance` that's a child of this instance.

    Engines must be registered by name with their parent engine
    (or application).

    @private
    @method buildChildEngineInstance
    @param name {String} the registered name of the engine.
    @param options {Object} options provided to the engine instance.
    @return {EngineInstance,Error}
  */
  buildChildEngineInstance(name, options = {}) {
    let Engine = this.lookup(`engine:${name}`);

    if (!Engine) {
      throw new EmberError(`You attempted to mount the engine '${name}', but it is not registered with its parent.`);
    }

    let engineInstance = Engine.buildInstance(options);

    setEngineParent(engineInstance, this);

    return engineInstance;
  },

  /**
    Clone dependencies shared between an engine instance and its parent.

    @private
    @method cloneParentDependencies
  */
  cloneParentDependencies() {
    let parent = getEngineParent(this);

    let registrations = [
      'route:basic',
      'service:-routing',
      'service:-glimmer-environment'
    ];

    registrations.forEach(key => this.register(key, parent.resolveRegistration(key)));

    let env = parent.lookup('-environment:main');
    this.register('-environment:main', env, { instantiate: false });

    let singletons = [
      'router:main',
      P`-bucket-cache:main`,
      '-view-registry:main',
      `renderer:-${env.isInteractive ? 'dom' : 'inert'}`,
      'service:-document',
    ];

    if (env.isInteractive) {
      singletons.push('event_dispatcher:main');
    }

    singletons.forEach(key => this.register(key, parent.lookup(key), { instantiate: false }));

    this.inject('view', '_environment', '-environment:main');
    this.inject('route', '_environment', '-environment:main');
  }
});

EngineInstance.reopenClass({
  /**
   @private
   @method setupRegistry
   @param {Registry} registry
   @param {BootOptions} options
   */
  setupRegistry(registry, options) {
    // when no options/environment is present, do nothing
    if (!options) { return; }

    registry.injection('view', '_environment', '-environment:main');
    registry.injection('route', '_environment', '-environment:main');

    if (options.isInteractive) {
      registry.injection('view', 'renderer', 'renderer:-dom');
      registry.injection('component', 'renderer', 'renderer:-dom');
    } else {
      registry.injection('view', 'renderer', 'renderer:-inert');
      registry.injection('component', 'renderer', 'renderer:-inert');
    }
  }
});

export default EngineInstance;
