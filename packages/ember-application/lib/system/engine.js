/**
@module ember
@submodule ember-application
*/
import Namespace from 'ember-runtime/system/namespace';
import RegistryProxy from 'ember-runtime/mixins/registry_proxy';

/**
  The `Engine` class contains core functionality for both applications and
  engines.

  Each engine manages a registry that's used for dependency injection and
  exposed through `RegistryProxy`.

  Engines also manage initializers and instance initializers.

  Engines can spawn `EngineInstance` instances via `buildInstance()`.

  @class Engine
  @namespace Ember
  @extends Ember.Namespace
  @uses RegistryProxyMixin
  @public
*/

let Engine = Namespace.extend(RegistryProxy, {

});

export default Engine;
