import Enumerable from '@ember/enumerable';
import { createMixin } from '@ember/object/mixin';

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
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MutableEnumerable extends Enumerable {}
const MutableEnumerable = createMixin(Enumerable);

export default MutableEnumerable;
