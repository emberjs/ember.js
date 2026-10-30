import { getFactoryFor } from '@ember/-internals/container/lib/container';
import CoreObject from '@ember/object/lib/core-object';
import InternalObservable from '@ember/object/observable-internal';

/**
@module @ember/object
*/

/**
  `EmberObject` is the main base class for all Ember objects. It is a subclass
  of `CoreObject` with the `Observable` mixin applied. For details,
  see the documentation for each of these.

  @class EmberObject
  @extends CoreObject
  @uses Observable
  @public
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface EmberObject extends InternalObservable {}
class EmberObject extends CoreObject.extend(InternalObservable) {
  get _debugContainerKey() {
    let factory = getFactoryFor(this);
    return factory !== undefined && factory.fullName;
  }
}

export default EmberObject;
