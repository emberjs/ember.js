import InternalMutableEnumerable from '@ember/enumerable/mutable-internal';
import { DeprecatedMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

/**
@module ember
*/

/**
  The methods in this mixin have been moved to MutableArray. This mixin has
  been intentionally preserved to avoid breaking MutableEnumerable.detect
  checks until the community migrates away from them.

  @class MutableEnumerable
  @namespace Ember
  @uses Enumerable
  @private
  @deprecated Use native arrays and array methods instead.
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MutableEnumerable extends InternalMutableEnumerable {}
const MutableEnumerable = DeprecatedMixin.create(InternalMutableEnumerable, {
  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `MutableEnumerable` mixin is deprecated. Use native arrays and array methods instead.',
      DEPRECATIONS.DEPRECATE_MUTABLE_ENUMERABLE_MIXIN
    );
  },
});

export default MutableEnumerable;
