import Enumerable from '@ember/enumerable/lib/enumerable';
import { InternalMixin } from '@ember/object/mixin-internal';
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
  @private
  @deprecated Use native arrays and array methods instead.
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MutableEnumerable extends Enumerable {}
const MutableEnumerable = InternalMixin.create(Enumerable, {
  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `MutableEnumerable` mixin is deprecated. Use native arrays and array methods instead.',
      DEPRECATIONS.DEPRECATE_MUTABLE_ENUMERABLE_MIXIN
    );
  },
});

export default MutableEnumerable;
