/**
  @module @ember/owner

  An `Owner` is the main object responsible for managing Ember's dependency
  injection system. In normal app code, you will encounter `Owner`s via an
  `ApplicationInstance` or its superclass, `EngineInstance`, which are the two
  major implementers of the `Owner` type.

  Along with the `Owner` itself, this module provides a number of supporting
  types related to Ember's DI system:

  - `Factory`, Ember's primary interface for something which can create class
    instances registered with the DI system.

  - `FactoryManager`, an interface for inspecting a `Factory`'s class.

  - `Resolver`, an interface defining the contract for the object responsible
    for mapping string names to the corresponding classes. For example, when
    you write `@service('session')`, a resolver is responsible to map that back
    to the `Session` service class in your codebase. Normally

  For more details on each, see their per-item docs!
*/

// We need to provide a narrower public interface to `getOwner` so that we only
// expose the `Owner` type, *not* our richer `InternalOwner` type and its
// various bits of private API.
import Owner, { getOwner as internalGetOwner } from '../-internals/owner';

interface GetOwner {
  (object: object): Owner | undefined;
}

// SAFETY: this is *only* safe for public API, because we are promising more
// than we can actually *totally* guarantee we uphold otherwise. Specifically,
// users *can* do things (including abusing the `ReliablyHasOwner` type or
// corresponding interface) to get types which violate this contract. However,
// doing so is only possible if they break the public API contract! Notably, for
// our internals, we should *not* provide this.
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
      let owner = getOwner(this);
      return owner.lookup(`service:${this.args.audioType}`);
    }

    @action
    onPlay() {
      let player = this.audioService;
      player.play(this.args.audioFile);
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
const getOwner: GetOwner = internalGetOwner;
export { getOwner };

// Everything else, we can directly re-export.
export default Owner;

export {
  setOwner,
  FullName,
  RegisterOptions,
  Factory,
  FactoryManager,
  KnownForTypeResult,
  Resolver,
} from '../-internals/owner';
