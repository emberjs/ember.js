/**
@module ember
@submodule ember-application
*/

import EmberObject from 'ember-runtime/system/object';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';
import RegistryProxy from 'ember-runtime/mixins/registry_proxy';

/**
  The `EngineInstance` encapsulates all of the stateful aspects of a
  running `Engine`.

  @public
  @class Ember.EngineInstance
  @extends Ember.Object
  @uses RegistryProxyMixin
  @uses ContainerProxyMixin
*/

let EngineInstance = EmberObject.extend(RegistryProxy, ContainerProxy, {
  /**
    The `Engine` for which this is an instance.

    @property {Ember.Engine} engine
    @private
  */
  engine: null
});

export default EngineInstance;
