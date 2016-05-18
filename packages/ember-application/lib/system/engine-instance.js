/**
@module ember
@submodule ember-application
*/

import EmberObject from 'ember-runtime/system/object';
import EmberError from 'ember-metal/error';
import Registry from 'container/registry';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';
import RegistryProxy from 'ember-runtime/mixins/registry_proxy';
import { getEngineParent, setEngineParent } from 'ember-application/system/engine-parent';
import { assert } from 'ember-metal/debug';
import run from 'ember-metal/run_loop';
import RSVP from 'ember-runtime/ext/rsvp';
import isEnabled from 'ember-metal/features';

/**
  The `EngineInstance` encapsulates all of the stateful aspects of a
  running `Engine`.

  @public
  @class Ember.EngineInstance
  @extends Ember.Object
  @uses RegistryProxyMixin
  @uses ContainerProxyMixin
  @category ember-application-engines
*/

const EngineInstance = EmberObject.extend(RegistryProxy, ContainerProxy, {
  /**
    The base `Engine` for which this is an instance.

    @property {Ember.Engine} engine
    @private
  */
  base: null,

  init() {
    this._super(...arguments);

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
  boot(options = {}) {
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

    this.base.runInstanceInitializers(this);

    this._booted = true;

    return this;
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
    @private
  */
  willDestroy() {
    this._super(...arguments);
    run(this.__container__, 'destroy');
  }
});

if (isEnabled('ember-application-engines')) {
  EngineInstance.reopen({
    /**
      Build a new `Ember.EngineInstance` that's a child of this instance.

      Engines must be registered by name with their parent engine
      (or application).

      @private
      @method buildChildEngineInstance
      @param name {String} the registered name of the engine.
      @param options {Object} options provided to the engine instance.
      @return {Ember.EngineInstance,Error}
    */
    buildChildEngineInstance(name, options = {}) {
      let Engine = this.lookup(`engine:${name}`);

      if (!Engine) {
        throw new EmberError(`You attempted to mount the engine '${name}', but it is not registered with its parent.`);
      }

      let engineInstance = Engine.buildInstance(options);

      setEngineParent(engineInstance, this);

      return engineInstance;
    }
  });
}

export default EngineInstance;
