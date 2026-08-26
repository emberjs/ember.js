import Enumerable from '@ember/enumerable';
import Mixin from '@ember/object/mixin';
import { INTERNAL_MIXIN_CREATE } from '@ember/-internals/utils/lib/internal-mixin-create';
import { deprecatedMixin } from '@ember/-internals/utils/lib/deprecated-mixin';
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
  @deprecated Use native arrays and native array methods instead.
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MutableEnumerable extends Enumerable {}
const MutableEnumerable = deprecatedMixin(Mixin[INTERNAL_MIXIN_CREATE](Enumerable), () => {
  deprecateUntil(
    'The `MutableEnumerable` mixin is deprecated. Use native arrays and native array methods instead.',
    DEPRECATIONS.DEPRECATE_ENUMERABLE
  );
});

export default MutableEnumerable;
