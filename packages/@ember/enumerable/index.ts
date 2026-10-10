import { DeprecatedMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import InternalEnumerable from '@ember/enumerable/-internal';

/**
@module @ember/enumerable
@private
*/

/**
  The methods in this mixin have been moved to [MutableArray](/ember/release/classes/MutableArray). This mixin has
  been intentionally preserved to avoid breaking Enumerable.detect checks
  until the community migrates away from them.

  @class Enumerable
  @private
  @deprecated Use native arrays and array methods instead.
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Enumerable extends InternalEnumerable {}
const Enumerable = DeprecatedMixin.create(InternalEnumerable, {
  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `Enumerable` mixin is deprecated. Use native arrays and array methods instead.',
      DEPRECATIONS.DEPRECATE_ENUMERABLE_MIXIN
    );
  },
});

export default Enumerable;
