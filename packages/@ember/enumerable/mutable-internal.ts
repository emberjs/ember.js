import InternalEnumerable from '@ember/enumerable/-internal';
import { InternalMixin } from '@ember/object/mixin-internal';

/**
  The internal counterpart to the public `MutableEnumerable` mixin. Ember's own
  internals apply this so that they do not trigger the deprecation that the
  public mixin emits.

  @internal
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface InternalMutableEnumerable extends InternalEnumerable {}
const InternalMutableEnumerable = InternalMixin.create(InternalEnumerable);

export default InternalMutableEnumerable;
