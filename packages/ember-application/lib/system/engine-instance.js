/**
@module ember
@submodule ember-application
*/

import EmberObject from 'ember-runtime/system/object';
import Registry from 'container/registry';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';
import RegistryProxy from 'ember-runtime/mixins/registry_proxy';
import run from 'ember-metal/run_loop';

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

export default EngineInstance;
