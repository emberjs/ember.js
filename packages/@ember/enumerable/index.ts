import Mixin from '@ember/object/mixin';
import { INTERNAL_MIXIN_CREATE } from '@ember/-internals/utils/lib/internal-mixin-create';

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
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Enumerable {}
const Enumerable = Mixin[INTERNAL_MIXIN_CREATE]();

export default Enumerable;
