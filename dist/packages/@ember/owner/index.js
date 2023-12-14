/**
  Ember’s dependency injection system is built on the idea of an "owner": an
  object responsible for managing items which can be registered and looked up
  with the system.

  This module does not provide any concrete instances of owners. Instead, it
  defines the core type, `Owner`, which specifies the public API contract for an
  owner. The primary concrete implementations of `Owner` are `EngineInstance`,
  from `@ember/engine/instance`, and its `ApplicationInstance` subclass, from
  `@ember/application/instance`.

  Along with `Owner` itself, this module provides a number of supporting types
  related to Ember's DI system:

  - `Factory`, Ember's primary interface for something which can create class
    instances registered with the DI system.

  - `FactoryManager`, an interface for inspecting a `Factory`'s class.

  - `Resolver`, an interface defining the contract for the object responsible
    for mapping string names to the corresponding classes. For example, when you
    write `@service('session')`, a resolver is responsible to map that back to
    the `Session` service class in your codebase. Normally, this is handled for
    you automatically with `ember-resolver`, which is the main implementor of
    this interface.

  For more details on each, see their per-item docs.

  @module @ember/owner
  @public
*/
// We need to provide a narrower public interface to `getOwner` so that we only
// expose the `Owner` type, *not* our richer `InternalOwner` type and its
// various bits of private API.
import { getOwner as internalGetOwner } from '@ember/-internals/owner';
// NOTE: this documentation appears here instead of at the definition site so
// it can appear correctly in both API docs and for TS, while providing a richer
// internal representation for Ember's own usage.
/**
  Framework objects in an Ember application (components, services, routes, etc.)
  are created via a factory and dependency injection system. Each of these
  objects is the responsibility of an "owner", which handled its
  instantiation and manages its lifetime.

  `getOwner` fetches the owner object responsible for an instance. This can
  be used to lookup or resolve other class instances, or register new factories
  into the owner.

  For example, this component dynamically looks up a service based on the
  `audioType` passed as an argument:

  ```app/components/play-audio.js
  import Component from '@glimmer/component';
  import { action } from '@ember/object';
  import { getOwner } from '@ember/application';

  // Usage:
  //
  //   <PlayAudio @audioType={{@model.audioType}} @audioFile={{@model.file}}/>
  //
  export default class extends Component {
    get audioService() {
      return getOwner(this)?.lookup(`service:${this.args.audioType}`);
    }

    @action
    onPlay() {
      this.audioService?.play(this.args.audioFile);
    }
  }
  ```

  @method getOwner
  @static
  @for @ember/owner
  @param {Object} object An object with an owner.
  @return {Object} An owner object.
  @since 2.3.0
  @public
*/
// SAFETY: the cast here is necessary, instead of using an assignment, because
// TS (not incorrectly! Nothing expressly relates them) does not see that the
// `InternalOwner` and `Owner` do actually have identical constraints on their
// relations to the `DIRegistry`.
const getOwner = internalGetOwner;
export { getOwner };
export { setOwner } from '@ember/-internals/owner';