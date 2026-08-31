import Mixin from '@ember/object/mixin';
import { INTERNAL_MIXIN_CREATE } from '@ember/-internals/utils/lib/internal-mixin-create';
import { deprecatedMixin } from '@ember/-internals/utils/lib/deprecated-mixin';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

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
  @deprecated Use native arrays and native array methods instead.
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Enumerable {}
const Enumerable = deprecatedMixin(Mixin[INTERNAL_MIXIN_CREATE](), () => {
  deprecateUntil(
    'The `Enumerable` mixin is deprecated. Use native arrays and native array methods instead.',
    DEPRECATIONS.DEPRECATE_ENUMERABLE
  );
});

export default Enumerable;
