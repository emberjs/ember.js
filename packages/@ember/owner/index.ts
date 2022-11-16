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

const getOwner = internalGetOwner as GetOwner;
export { getOwner };

// Everything else, we can directly re-export.
export default Owner;

export {
  setOwner,
  FullName,
  RegisterOptions,
  Factory,
  FactoryManager,
  Resolver,
} from '../-internals/owner';
